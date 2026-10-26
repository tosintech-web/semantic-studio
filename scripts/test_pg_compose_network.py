"""
================================================================================
FILE: scripts/test_pg_compose_network.py
SUMMARY
    Verify the product Compose database boundary and real session denials.
BASIC IDEA
    Inspect the declared topology before running opt-in Docker acceptance on
    disposable projects. No database host port, socket mount or privileged job.
INPUTS / INPUT SOURCES
    Product Compose and dedicated synthetic integration credentials.
EXPECTED OUTPUT
    Role-isolated internal networking, including host/other-network refusal.
================================================================================
"""
from pathlib import Path
import os
import subprocess
import tempfile
import unittest
import json
import socket
import struct
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import yaml
from scripts.pg_compose_support import Stack, PROBE, command

ROOT = Path(__file__).resolve().parents[1]


class ComposeDefinitionTests(unittest.TestCase):
    def setUp(self):
        self.compose = yaml.safe_load(ROOT.joinpath('docker-compose.team.yml').read_text())

    def test_database_is_internal_only_and_never_published(self):
        db = self.compose['services'].get('db')
        self.assertIsNotNone(db, 'dedicated_database_service_required')
        self.assertEqual(db['networks'], ['db_internal'])
        self.assertFalse(db.get('ports'))
        self.assertNotIn('network_mode', db)
        self.assertTrue(self.compose['networks']['db_internal']['internal'])
        self.assertFalse(self.compose['networks']['db_internal']['enable_ipv6'])
        self.assertIn('/proc/1/comm', db['healthcheck']['test'][1])

    def test_app_and_jobs_receive_only_their_role_secrets(self):
        services = self.compose['services']
        app = services['semantic-studio-team']
        self.assertEqual(set(app['networks']), {'app_net', 'db_internal'})
        self.assertEqual(app['secrets'], ['team_db_app'])
        self.assertEqual(app['command'], ['python', '-m', 'app.team.server'])
        for name, role in [('db-migrate', 'maintenance'), ('migrate', 'maintenance'),
                           ('backup', 'backup'), ('restore', 'maintenance')]:
            service = services[name]
            self.assertEqual(service['networks'], ['db_internal'])
            self.assertEqual(service['secrets'], ['team_db_' + role])
            self.assertFalse(service.get('ports'))
            self.assertNotIn('SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET', service['environment'])
        self.assertEqual(services['db-config']['network_mode'], 'none')
        self.assertEqual(services['backup']['command'][services['backup']['command'].index('--blob-root') + 1], '/data/blobs')


@unittest.skipIf(os.name == 'nt', 'role initialization runs in the Linux PostgreSQL image')
class RoleSecretValidationTests(unittest.TestCase):
    def run_initialization(self, passwords):
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            for role, value in passwords.items():
                root.joinpath('team_db_' + role).write_bytes(value)
            script = ROOT.joinpath('docker/postgres/init-roles.sh').read_text().replace('/run/secrets/', str(root) + '/')
            root.joinpath('init.sh').write_text(script)
            binaries = root / 'bin'
            binaries.mkdir()
            psql = binaries / 'psql'
            psql.write_text('#!/bin/sh\ntouch "$PSQL_CALLED"\n')
            psql.chmod(0o755)
            env = dict(os.environ, PATH=str(binaries) + os.pathsep + os.environ['PATH'],
                       POSTGRES_DB='semantic_studio_team', PSQL_CALLED=str(root / 'called'))
            result = subprocess.run(['sh', str(root / 'init.sh')], env=env, capture_output=True)
            return result, root.joinpath('called').exists()

    def test_role_passwords_are_distinct_and_valid_before_sql(self):
        values = {role: ('synthetic-' + role).encode() + b'\n' for role in ('admin', 'app', 'maintenance', 'backup')}
        result, called = self.run_initialization(values)
        self.assertEqual(result.returncode, 0)
        self.assertTrue(called)
        for bad in (b'', b'first\nsecond\n', b'one\n\n', b'one\0two', b'\xff', b'\n', b'x' * 16385):
            with self.subTest(kind='invalid-secret'):
                result, called = self.run_initialization(dict(values, app=bad))
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(called)
                if bad.strip():
                    self.assertNotIn(bad.strip(), result.stdout + result.stderr)
        roles = list(values)
        for index, first in enumerate(roles):
            for second in roles[index + 1:]:
                result, called = self.run_initialization(dict(values, **{second: values[first]}))
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(called)
                self.assertNotIn(values[first].strip(), result.stdout + result.stderr)


@unittest.skipUnless(os.environ.get('SEMANTIC_STUDIO_COMPOSE_TESTS') == '1', 'explicit disposable Docker integration required')
class ComposeLiveNetworkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='ss-pg-network-')
        cls.addClassCleanup(cls.scratch.cleanup)
        cls.stack = Stack(Path(cls.scratch.name) / 'source', subnet='10.253.54.0/24', gateway='10.253.54.1')
        cls.addClassCleanup(cls.stack.close)
        cls.stack.database()
        cls.stack.start()

    def test_pg_compose_network_boundary(self):
        stack = self.stack
        db = stack.container('db')
        self.assertFalse(db['HostConfig']['PortBindings'])
        self.assertEqual(set(db['NetworkSettings']['Networks']), {stack.name + '_db_internal'})
        network = json.loads(command(['docker', 'network', 'inspect', stack.name + '_db_internal']).stdout)[0]
        self.assertTrue(network['Internal'])
        self.assertFalse(network['EnableIPv6'])
        self.assertTrue(json.loads(stack.run('app', PROBE))['connected'])
        address = db['NetworkSettings']['Networks'][stack.name + '_db_internal']['IPAddress']
        self.assertTrue(stack.probe(stack.name + '_db_internal', address))
        for options in ({'user':'postgres','secret_role':'admin'}, {'database':'postgres'},
                        {'user':'unlisted_role'}, {'secret_role':'backup'}):
            self.assertFalse(stack.probe(stack.name + '_db_internal', address, **options))
        # Correct app credentials were proved above. A normal host process must
        # be rejected before SCRAM starts, not merely fail on a wrong password.
        try:
            with socket.create_connection((address, 5432), timeout=3) as connection:
                parameters = b'user\0team_app\0database\0semantic_studio_team\0\0'
                connection.sendall(struct.pack('!II', 8 + len(parameters), 196608) + parameters)
                response = connection.recv(65536)
                self.assertTrue(response.startswith(b'E'), 'host_was_offered_authentication')
                self.assertIn(b'C28000\0', response)
        except OSError:
            pass  # Refusal before the PostgreSQL handshake also denies a session.
        other = stack.name + '-outside'
        command(['docker', 'network', 'create', other])
        try:
            self.assertFalse(stack.probe(other, address))
        finally:
            command(['docker', 'network', 'rm', other])
        routes = stack.compose('exec', '-T', 'db', 'cat', '/proc/net/route').stdout.splitlines()[1:]
        self.assertFalse(any(line.split()[1] == '00000000' for line in routes))
        app = stack.container('semantic-studio-team')
        self.assertEqual({mount['Destination'] for mount in app['Mounts'] if mount['Destination'].startswith('/run/secrets/')},
                         {'/run/secrets/team_db_app'})
        stack.compose('exec', '-T', '--user', 'postgres', 'db', 'sh', '-c',
                      'for file in /run/secrets/team_db_admin /run/secrets/team_db_app /run/secrets/team_db_maintenance /run/secrets/team_db_backup; do test -r "$file" || exit 1; done')

    def test_app_broker_egress_cannot_use_database_capability(self):
        stack = self.stack
        network = json.loads(command(['docker', 'network', 'inspect', stack.name + '_app_net']).stdout)[0]
        gateway = network['IPAM']['Config'][0]['Gateway']
        paths = []
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                paths.append(self.path)
                data = b'{"@context":{}}'
                self.send_response(200)
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            def log_message(self, *args):
                pass
        # A bridge-local synthetic peer gives a deterministic egress target;
        # neither public internet nor a real Google account is involved.
        server = ThreadingHTTPServer((gateway, 0), Handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            source = '''
import ipaddress,json
from app import net_guard
from app.network_broker import broker
original_resolve=net_guard.resolve_host
original_judge=net_guard.is_blocked_address
gateway=FIXTURE_GATEWAY
net_guard.resolve_host=lambda host: [ipaddress.ip_address(gateway)] if host=='synthetic-public.example' else original_resolve(host)
net_guard.is_blocked_address=lambda address: False if str(address)==gateway else original_judge(address)
response=broker.request('jsonld:context',FIXTURE_URL,reason='synthetic egress fixture',max_bytes=1024,timeout=3,user_initiated=True)
assert response.body==b'{"@context":{}}'
try:
    broker.request('jsonld:context','http://db:5432/fixture',reason='forbidden DB IRI',max_bytes=1024,timeout=3,user_initiated=True)
except net_guard.BlockedAddress:
    pass
else:
    raise AssertionError('http_broker_reached_private_database')
print(json.dumps({'fetched':True,'db_blocked':True}))
'''.replace('FIXTURE_GATEWAY', repr(gateway)).replace('FIXTURE_URL', repr(f'http://synthetic-public.example:{server.server_port}/fixture'))
            self.assertEqual(json.loads(stack.run('app', source)), {'fetched':True, 'db_blocked':True})
            self.assertEqual(paths, ['/fixture'])
        finally:
            server.shutdown()
            server.server_close()
            worker.join(5)


@unittest.skipUnless(os.environ.get('SEMANTIC_STUDIO_COMPOSE_TESTS') == '1', 'explicit disposable Docker integration required')
class InvalidRoleSecretContainerTests(unittest.TestCase):
    def test_pg_bootstrap_rejects_reused_or_invalid_passwords(self):
        with tempfile.TemporaryDirectory(prefix='ss-pg-invalid-') as directory:
            for index, bad in enumerate(('duplicate', 'empty', 'multiline')):
                with self.subTest(kind=bad):
                    stack = Stack(Path(directory) / bad, subnet=f'10.253.{58 + index}.0/24', gateway=f'10.253.{58 + index}.1')
                    override = stack.directory / 'no-restart.json'
                    override.write_text(json.dumps({'services': {'db': {'restart': 'no'}}}))
                    stack.arguments += ['-f', str(override)]
                    path = stack.secret_directory / 'app'
                    path.chmod(0o600)
                    path.write_bytes((stack.secret_directory / 'admin').read_bytes() if bad == 'duplicate' else
                                     b'' if bad == 'empty' else b'first\nsecond\n')
                    path.chmod(0o444)
                    try:
                        stack.compose('up', '-d', '--no-build', 'db')
                        deadline = __import__('time').monotonic() + 30
                        while __import__('time').monotonic() < deadline:
                            if stack.container('db')['State']['Status'] == 'exited':
                                break
                            __import__('time').sleep(0.2)
                        self.assertEqual(stack.container('db')['State']['Status'], 'exited')
                        logs = stack.compose('logs', '--no-color', 'db').stdout
                        self.assertIn('db_secret_invalid', logs)
                        for role in ('admin', 'app', 'maintenance', 'backup'):
                            value = (stack.secret_directory / role).read_text().strip()
                            if value:
                                self.assertFalse(value in logs, 'credential_in_database_logs')
                        result = stack.compose('run', '--rm', '--no-deps', '-T', 'db-migrate', check=False)
                        self.assertNotEqual(result.returncode, 0)
                    finally:
                        stack.close()


if __name__ == '__main__':
    unittest.main()
