"""
================================================================================
FILE: scripts/test_pg_compose_lifecycle.py
SUMMARY
    Real product-stack ownership loss, persistence and two-project restoration.
BASIC IDEA
    Keep the source app alive while a backup-only job exports one generation;
    restore into different database/blob volumes and inspect real authentication.
INPUTS / INPUT SOURCES
    Explicit Docker opt-in, synthetic users/RDF/blobs and private scratch data.
EXPECTED OUTPUT
    Fenced old writers, durable restarts, preserved history and revoked target login.
================================================================================
"""
import json
import os
from pathlib import Path
import tempfile
import time
import unittest

from scripts.pg_compose_support import Stack, SEED, SNAPSHOT, RECOVERY_VERIFY, command


@unittest.skipUnless(os.environ.get('SEMANTIC_STUDIO_COMPOSE_TESTS') == '1', 'explicit disposable Docker integration required')
class ComposeLifecycleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='ss-pg-lifecycle-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.source = Stack(Path(cls.scratch.name) / 'source', subnet='10.253.55.0/24', gateway='10.253.55.1')
        cls.addClassCleanup(cls.source.close)
        cls.source.database()
        cls.seed = json.loads(cls.source.run('app', SEED))
        cls.source.start()

    def test_pg_compose_backup_and_restore(self):
        source = self.source
        token = self.seed['token']
        self.assertTrue(source.http('/api/auth/status', token=token)[1]['authenticated'])
        before = json.loads(source.run('backup', SNAPSHOT))
        # The running source retains its existing read-only secret bind mount.
        # A new backup job must not even need the app's host secret file.
        app_secret = source.secret_directory / 'app'
        held_secret = source.secret_directory / 'app-held'
        app_secret.rename(held_secret)
        try:
            source.compose('run', '--rm', '--no-deps', '-T', 'backup')
        finally:
            held_secret.rename(app_secret)
        # The source process, writer lease and authenticated browser stay live.
        self.assertTrue(source.http('/api/auth/status', token=token)[1]['authenticated'])
        target = Stack(Path(self.scratch.name) / 'target', subnet='10.253.56.0/24', gateway='10.253.56.1',
                       archive_volume=source.name + '_team_backups')
        try:
            target.database()
            target.compose('run', '--rm', '--no-deps', '-T', 'restore')
            after = json.loads(target.run('backup', SNAPSHOT))
            self.assertEqual(before['sha256'], after['sha256'])
            self.assertEqual((after['sessions'], after['attempts']), (0, 0))
            self.assertGreater(before['sessions'], 0)
            self.assertGreater(before['attempts'], 0)
            self.assertEqual(json.loads(source.run('backup', SNAPSHOT)), before)
            self.assertTrue(source.http('/api/auth/status', token=token)[1]['authenticated'])
            self.assertTrue(json.loads(target.run('app', RECOVERY_VERIFY))['verified'])
            target.start()
            self.assertEqual(target.http('/api/projects', token=token)[0], 401)
            self.assertNotEqual(source.volume('db', '/var/lib/postgresql'), target.volume('db', '/var/lib/postgresql'))
            self.assertNotEqual(source.volume('semantic-studio-team', '/data'), target.volume('semantic-studio-team', '/data'))
            self.assertEqual(json.loads(source.run('backup', SNAPSHOT)), before)
        finally:
            target.close()

    def test_pg_compose_restart_and_owner_loss(self):
        source = self.source
        before = json.loads(source.run('backup', SNAPSHOT))
        container = source.container('semantic-studio-team')
        # Only the app role's fixed lease-holding backend is terminated. No
        # superuser TCP, production management endpoint or Docker socket exists.
        source.run('app', '''
import os,psycopg
from app.team.pg_config import load_pg_config
c=load_pg_config(os.environ,role='app')
with psycopg.connect(host='db',port=5432,dbname=c.dbname,user=c.user,
 password=c.password_file.read_text().strip(),autocommit=True) as db:
    row=db.execute("SELECT pid FROM pg_locks WHERE locktype='advisory' AND classid=1397969989 AND objid=1 AND objsubid=2 AND granted").fetchone()
    assert row is not None
    assert db.execute('SELECT pg_terminate_backend(%s)',row).fetchone()[0]
''')
        # A data request probes ownership and trips the supervisor; a public
        # liveness request alone must never wait on the failed database.
        try:
            response = source.http('/api/projects', token=self.seed['token'])
            self.assertEqual(response[0], 503)
        except OSError:
            pass
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            current = source.container('semantic-studio-team')
            if current['RestartCount'] > container['RestartCount']:
                break
            time.sleep(0.2)
        else:
            self.fail('fatal_storage_did_not_restart_app')
        source.wait_http()
        self.assertTrue(source.http('/api/auth/status', token=self.seed['token'])[1]['authenticated'])
        old_db = source.container('db')
        address = old_db['NetworkSettings']['Networks'][source.name + '_db_internal']['IPAddress']
        source.compose('stop', 'db')
        source.compose('rm', '-f', 'db')
        blocker = source.name + '-old-address'
        # Occupying the freed address is test orchestration, never a fixed app
        # endpoint. It proves recreation actually requires fresh service DNS.
        command(['docker', 'run', '-d', '--name', blocker, '--network', source.name + '_db_internal',
                 '--ip', address, '--entrypoint', 'sleep', 'semantic-studio:team', '120'])
        try:
            source.compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '60', 'db')
            new_db = source.container('db')
            self.assertNotEqual(new_db['NetworkSettings']['Networks'][source.name + '_db_internal']['IPAddress'], address)
        finally:
            command(['docker', 'rm', '-f', blocker], check=False)
        try:
            source.http('/api/projects', token=self.seed['token'])
        except OSError:
            pass
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            try:
                if source.http('/api/auth/status', token=self.seed['token'])[1].get('authenticated'):
                    break
            except (OSError, TypeError):
                pass
            time.sleep(0.2)
        else:
            self.fail('database_restart_did_not_recover_authenticated_app')
        self.assertEqual(json.loads(source.run('backup', SNAPSHOT)), before)


if __name__ == '__main__':
    unittest.main()
