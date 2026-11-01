"""
================================================================================
FILE: scripts/test_ci_sharding.py
SUMMARY
    Prove native CI shards retain every selected test exactly once.
BASIC IDEA
    Exercise file-level partitioning and reject incomplete or altered manifests.
INPUTS / INPUT SOURCES
    Synthetic pytest node IDs and temporary JSON manifests; no application data.
EXPECTED OUTPUT
    Unit-test results for the helper used by pytest and both required CI gates.
================================================================================
"""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend' / 'tests'))
from ci_sharding import make_manifest, parse_shard, verify_manifests  # noqa: E402


NODES = [f'tests/test_{file}.py::test_case[{case}]'
         for file in 'abcdefghij' for case in range(3)]


class ShardingTests(unittest.TestCase):
    def test_cli_requires_a_valid_one_based_shard(self):
        self.assertEqual(parse_shard('2/3'), (2, 3))
        for invalid in ('', '1', '1/0', '0/3', '4/3', '-1/3', '1/2/3', 'x/3'):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                parse_shard(invalid)

    def test_every_case_has_one_owner_and_a_file_never_splits(self):
        for total in (1, 2, 3, 5):
            manifests = [make_manifest(NODES, (i, total)) for i in range(1, total + 1)]
            selected = [node for m in manifests for node in m['selected']]
            self.assertEqual(sorted(selected), sorted(NODES))
            self.assertEqual(len(selected), len(set(selected)))
            for file in 'abcdefghij':
                owners = [m['shard'] for m in manifests
                          if any(n.startswith(f'tests/test_{file}.py::') for n in m['selected'])]
                self.assertEqual(len(owners), 1)

    def test_collection_order_does_not_change_ownership(self):
        for shard in range(1, 4):
            self.assertEqual(make_manifest(NODES, (shard, 3)),
                             make_manifest(list(reversed(NODES)), (shard, 3)))

    def test_windows_and_posix_file_paths_have_the_same_owners(self):
        windows = [n.replace('tests/', 'tests\\') for n in NODES]
        for shard in range(1, 4):
            a = make_manifest(NODES, (shard, 3))['selected']
            b = make_manifest(windows, (shard, 3))['selected']
            self.assertEqual(a, [n.replace('tests\\', 'tests/') for n in b])

    def test_too_many_shards_or_duplicate_eligible_cases_are_errors(self):
        for nodes, spec in ((NODES[:1], (2, 3)), (NODES + NODES[:1], (1, 3)), ([], (1, 3))):
            with self.subTest(spec=spec), self.assertRaises(ValueError):
                make_manifest(nodes, spec)

    def manifests(self):
        return [make_manifest(NODES, (i, 3)) for i in (1, 2, 3)]

    def verify(self, manifests):
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            for i, manifest in enumerate(manifests, 1):
                (root / f'shard-{i}.json').write_text(json.dumps(manifest), encoding='utf-8')
            return verify_manifests(root, 3)

    def test_complete_manifests_prove_the_exact_case_union(self):
        self.assertEqual(self.verify(self.manifests()), len(NODES))

    def test_missing_shard_is_an_error(self):
        with self.assertRaises(ValueError):
            self.verify(self.manifests()[:2])

    def test_changed_manifest_metadata_or_coverage_is_an_error(self):
        changes = [
            ('version', 2), ('shard', 1), ('total', 2),
            ('eligible', NODES[:-1]), ('selected', []),
            ('selected', NODES), ('selected', ['tests/test_unknown.py::test_case']),
        ]
        for key, value in changes:
            manifests = self.manifests()
            manifests[1][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.verify(manifests)

    def test_duplicate_case_or_shard_is_an_error(self):
        manifests = self.manifests()
        manifests[1] = copy.deepcopy(manifests[0])
        with self.assertRaises(ValueError):
            self.verify(manifests)
        manifests = self.manifests()
        manifests[1]['selected'].append(manifests[1]['selected'][0])
        with self.assertRaises(ValueError):
            self.verify(manifests)


if __name__ == '__main__':
    unittest.main()
