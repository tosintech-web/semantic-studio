"""
================================================================================
FILE: scripts/test_ci_workflow.py
SUMMARY
    Keep parallel CI coverage, required gates and performance isolation intact.
BASIC IDEA
    Inspect the workflow graph and commands, including failure propagation and
    retained test selections, rather than asserting formatting or step order.
INPUTS / INPUT SOURCES
    The committed workflow and existing budget/test commands.
EXPECTED OUTPUT
    A failed test if a lane, selection or required dependency is weakened.
================================================================================
"""
from pathlib import Path
import copy
import json
import os
import shlex
import subprocess
import sys
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]


class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = yaml.safe_load(ROOT.joinpath('.github/workflows/ci.yml').read_text())
        cls.jobs = cls.workflow['jobs']

    def commands(self, name):
        return '\n'.join(step.get('run', '') for step in self.jobs[name]['steps'])

    def gate_result(self, name, results):
        step = next(step for step in self.jobs[name]['steps']
                    if 'RESULTS' in step.get('env', {}))
        command = shlex.split(step['run'])
        command[0] = sys.executable
        return subprocess.run(command, env={**os.environ, 'RESULTS': json.dumps(results)},
                              capture_output=True, text=True, timeout=10).returncode

    def test_required_gates_actually_fail_on_each_failed_or_cancelled_dependency(self):
        for name in ('backend-linux', 'backend-windows'):
            success = {dependency: {'result': 'success'}
                       for dependency in self.jobs[name]['needs']}
            self.assertEqual(self.gate_result(name, success), 0)
            for dependency in success:
                for status in ('failure', 'cancelled', 'skipped'):
                    changed = copy.deepcopy(success)
                    changed[dependency]['result'] = status
                    self.assertNotEqual(self.gate_result(name, changed), 0)

    def test_informational_aggregate_does_not_hide_a_failed_lane(self):
        success = {name: {'result': 'success', 'outputs': {'outcome': 'success'}}
                   for name in self.jobs['budgets']['needs']}
        self.assertEqual(self.gate_result('budgets', success), 0)
        for name in success:
            # continue-on-error can expose success as the dependency result,
            # even though setup, measurement or cleanup actually failed.
            for outcome in ('failure', 'cancelled', ''):
                changed = copy.deepcopy(success)
                changed[name]['outputs']['outcome'] = outcome
                self.assertNotEqual(self.gate_result('budgets', changed), 0)
            changed = copy.deepcopy(success)
            changed[name]['outputs'] = {}
            self.assertNotEqual(self.gate_result('budgets', changed), 0)

    def test_both_native_platforms_run_every_shard_and_emit_proofs(self):
        for platform, python in [('linux', '3.12'), ('windows', '3.14')]:
            job = self.jobs[f'backend-{platform}-local']
            self.assertEqual(job['strategy']['matrix']['shard'], [1, 2, 3])
            self.assertFalse(job['strategy']['fail-fast'])
            self.assertNotIn('continue-on-error', job)
            command = self.commands(f'backend-{platform}-local')
            self.assertIn('not team_db and not perf and not network', command)
            self.assertIn('--ci-shard=${{ matrix.shard }}/3', command)
            self.assertIn('--ci-shard-output=', command)
            setup = [s for s in job['steps'] if s.get('uses', '').startswith('actions/setup-python@')]
            self.assertEqual(setup[0]['with']['python-version'], python)
            upload = [s for s in job['steps'] if s.get('uses', '').startswith('actions/upload-artifact@')]
            self.assertEqual(len(upload), 1)
            self.assertEqual(upload[0]['with']['if-no-files-found'], 'error')
            self.assertIn(f'ci-native-{platform}-', upload[0]['with']['name'])

    def test_required_gates_reject_failed_dependencies_and_missing_coverage(self):
        expected = {'linux': ['backend-linux-local', 'postgresql', 'compose-team'],
                    'windows': ['backend-windows-local']}
        for platform, needs in expected.items():
            job = self.jobs[f'backend-{platform}']
            self.assertEqual(job['needs'], needs)
            self.assertIn('always()', job['if'])
            self.assertNotIn('continue-on-error', job)
            self.assertIn('all(job["result"] == "success"', self.commands(f'backend-{platform}'))
            self.assertIn('backend/tests/ci_sharding.py', self.commands(f'backend-{platform}'))
            self.assertIn('--total 3', self.commands(f'backend-{platform}'))
            download = [s for s in job['steps'] if s.get('uses', '').startswith('actions/download-artifact@')]
            self.assertEqual(len(download), 1)
            self.assertEqual(download[0]['with']['pattern'], f'ci-native-{platform}-*')

    def test_performance_lanes_are_independent_and_keep_original_selections(self):
        selections = {'budgets-native': 'perf and not team_db and not network',
                      'budgets-frontend': 'npm run test:budgets',
                      'budgets-browser': 'driver.mjs p1',
                      'budgets-postgresql': 'perf and not network'}
        for name, selection in selections.items():
            job = self.jobs[name]
            self.assertNotIn('needs', job)
            # Every lane stays informational, while its real job status is
            # exposed so continue-on-error cannot turn a failed report green.
            self.assertTrue(job['continue-on-error'])
            self.assertEqual(job['outputs']['outcome'], '${{ steps.result.outputs.outcome }}')
            report = job['steps'][-1]
            self.assertIn('always()', report['if'])
            self.assertEqual(report['env']['JOB_STATUS'], '${{ job.status }}')
            self.assertEqual(job['env']['BUDGET_FACTOR'], '2')
            self.assertIn(selection, self.commands(name))
            self.assertNotIn('--ci-shard', self.commands(name))
        aggregate = self.jobs['budgets']
        self.assertEqual(set(aggregate['needs']), set(selections))
        self.assertTrue(aggregate['continue-on-error'])
        self.assertIn('always()', aggregate['if'])
        self.assertIn('all(job["result"] == "success"', self.commands('budgets'))
        self.assertIn('job["outputs"].get("outcome") == "success"', self.commands('budgets'))
        for name in ('backend-linux', 'backend-windows'):
            self.assertFalse(set(self.jobs[name]['needs']) & set(selections))
        self.assertIn('docker compose', self.commands('budgets-postgresql'))
        cleanup = self.jobs['budgets-postgresql']['steps'][-2]
        self.assertIn('always()', cleanup['if'])
        self.assertIn('down --remove-orphans', cleanup['run'])

    def test_other_existing_coverage_and_workflow_permissions_are_retained(self):
        self.assertEqual(self.workflow['permissions'], {'contents': 'read'})
        self.assertTrue(self.workflow['concurrency']['cancel-in-progress'])
        pg = self.jobs['postgresql']['strategy']['matrix']['include']
        self.assertEqual([x['python'] for x in pg], ['3.12', '3.14'])
        self.assertIn('team_db and not perf and not network', self.commands('postgresql'))
        for command in ('driver.mjs smoke', 'driver.mjs p1', 'driver.mjs p3',
                        'scripts.test_pg_compose_network', 'scripts.test_pg_compose_lifecycle',
                        'scripts.test_release_compose'):
            self.assertIn(command, self.commands('compose-team'))
        for command in ('npm run test:ci', 'npx tsc -b', 'npx vite build',
                        'distributionNotices.check.mjs'):
            self.assertIn(command, self.commands('frontend'))
        self.assertIn('docker build', self.commands('docker'))
        self.assertIn('scripts/check_publication.py', self.commands('publication'))
        self.assertIn('test_ci_', self.commands('backend-linux-local'))


if __name__ == '__main__':
    unittest.main()
