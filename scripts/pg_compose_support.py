"""
================================================================================
FILE: scripts/pg_compose_support.py
SUMMARY
    Host-owned disposable Compose projects for PostgreSQL boundary acceptance.
BASIC IDEA
    Generate private synthetic file secrets and invoke Docker only on the host.
    Product jobs remain inside their own network; no DB port or Docker socket.
INPUTS / INPUT SOURCES
    Explicit scratch root, private subnet and the reviewed product Compose.
EXPECTED OUTPUT
    Isolated test projects, finite failures and no credentials in process argv.
================================================================================
"""
from __future__ import annotations

import http.client
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def command(arguments, *, timeout=180, check=True, input=None, env=None):
    result = subprocess.run(arguments, capture_output=True, text=True, timeout=timeout, input=input, env=env)
    if check and result.returncode:
        # Docker/driver output can carry arbitrary configuration or data. The
        # caller can inspect its own disposable project, never a printed dump.
        raise RuntimeError('compose_acceptance_command_failed')
    return result


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


class Stack:
    def __init__(self, directory, *, subnet, gateway, port=None, archive_volume=None):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, mode=0o700)
        self.name = 'ss-pg-accept-' + secrets.token_hex(5)
        self.port = port or free_port()
        self.secret_directory = self.directory / 'secrets'
        self.secret_directory.mkdir(mode=0o700)
        for role in ('admin', 'app', 'maintenance', 'backup'):
            target = self.secret_directory / role
            target.write_text(secrets.token_urlsafe(48) + '\n')
            target.chmod(0o444)
        self.environment = {
            'COMPOSE_PROJECT_NAME': self.name,
            'TEAM_DB_SUBNET': subnet, 'TEAM_DB_GATEWAY': gateway,
            'TEAM_APP_PORT': str(self.port),
            'SEMANTIC_STUDIO_PUBLIC_ORIGIN': 'https://studio.example.org',
            'SEMANTIC_STUDIO_GOOGLE_CLIENT_ID': 'synthetic-client',
            'SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET': 'replace-me',
            'SEMANTIC_STUDIO_ALLOWED_DOMAINS': 'example.org',
            'SEMANTIC_STUDIO_BOOTSTRAP_SUBS': 'owner',
        }
        for role in ('ADMIN', 'APP', 'MAINTENANCE', 'BACKUP'):
            self.environment['TEAM_DB_' + role + '_SECRET_FILE'] = str(self.secret_directory / role.lower())
        self.env_file = self.directory / 'compose.env'
        self.env_file.write_text(''.join(key + '=' + value + '\n' for key, value in self.environment.items()))
        self.env_file.chmod(0o600)
        self.arguments = ['docker', 'compose', '--project-name', self.name, '--env-file', str(self.env_file),
                          '-f', str(ROOT / 'docker-compose.team.yml')]
        if archive_volume:
            override = self.directory / 'archive.json'
            override.write_text(json.dumps({'volumes': {'team_backups': {'external': True, 'name': archive_volume}}}))
            self.arguments += ['-f', str(override)]

    def compose(self, *arguments, **options):
        return command([*self.arguments, *arguments], env={**os.environ, **self.environment}, **options)

    def database(self):
        self.compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '60', 'db')
        self.compose('run', '--rm', '--no-deps', '-T', 'db-migrate')

    def start(self):
        self.compose('up', '-d', '--no-build', 'semantic-studio-team')
        self.wait_http()

    def wait_http(self):
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            try:
                if self.http('/api/health')[0] == 200:
                    return
            except (OSError, http.client.HTTPException):
                pass
            time.sleep(0.2)
        raise RuntimeError('compose_acceptance_app_unavailable')

    def http(self, path, *, token=None, method='GET'):
        headers = {'Host': 'studio.example.org', 'Origin': 'https://studio.example.org', 'X-Semantic-Studio': '1'}
        if token:
            headers['Cookie'] = '__Host-semantic-studio-session=' + token
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            connection.request(method, path, headers=headers)
            response = connection.getresponse()
            data = response.read()
            return response.status, json.loads(data) if data else None
        finally:
            connection.close()

    def run(self, role, source):
        service = {'app': 'semantic-studio-team', 'maintenance': 'db-migrate', 'backup': 'backup'}[role]
        return self.compose('run', '--rm', '--no-deps', '-T', '--entrypoint', 'python', service, '-', input=source).stdout

    def container(self, service):
        identity = self.compose('ps', '-a', '-q', service).stdout.strip()
        if not identity:
            raise RuntimeError('compose_acceptance_container_missing')
        return json.loads(command(['docker', 'inspect', identity]).stdout)[0]

    def volume(self, service, destination):
        return next(mount['Name'] for mount in self.container(service)['Mounts'] if mount['Destination'] == destination)

    def close(self):
        # Keep volumes and their data. This is also the operator stop contract;
        # never make ordinary cleanup synonymous with destructive down -v.
        self.compose('down', '--remove-orphans', check=False)

    def probe(self, network, address, *, user='team_app', database='semantic_studio_team', secret_role='app'):
        source = '''
import json,os
import psycopg
try:
    with psycopg.connect(host=os.environ['PROBE_HOST'],port=5432,user=os.environ['PROBE_USER'],
                         dbname=os.environ['PROBE_DATABASE'],connect_timeout=3,
                         password=open('/run/secrets/probe').read().strip()) as db:
        db.execute('SELECT 1')
    print(json.dumps({'connected':True}))
except psycopg.Error:
    print(json.dumps({'connected':False}))
'''
        result = command(['docker', 'run', '--rm', '-i', '--network', network,
                          '--mount', 'type=bind,source=' + str(self.secret_directory / secret_role) + ',target=/run/secrets/probe,readonly',
                          '-e', 'PROBE_HOST=' + address, '-e', 'PROBE_USER=' + user,
                          '-e', 'PROBE_DATABASE=' + database,
                          'semantic-studio:team', 'python', '-'], input=source)
        return json.loads(result.stdout)['connected']


PROBE = '''
import json, os
import psycopg
from app.team.pg_config import load_pg_config
c=load_pg_config(os.environ,role='app')
with psycopg.connect(host='db',port=5432,dbname=c.dbname,user=c.user,
                     password=c.password_file.read_text().strip(),connect_timeout=5) as db:
    assert db.execute('SELECT 1').fetchone()==(1,)
print(json.dumps({'connected':True}))
'''


SEED = '''
import hashlib,json,os,time
from app.team.pg_config import load_pg_config
from app.team.pg_storage import PgStorage
from app.team.auth_store import AuthStore
from app.team.repository import TeamRepository
from app.team.blobs import BlobStore
from app.team.rdf_codec import encode_graph
from rdflib import Graph, BNode, URIRef, Literal
from rdflib.namespace import XSD
from pathlib import Path
storage=PgStorage(load_pg_config(os.environ,role='app'),on_fatal=lambda kind:None)
try:
    storage.start_writer()
    auth=AuthStore(storage,bootstrap_subs=frozenset({'owner'}))
    auth.identity('owner','owner@example.org','example.org',now=time.time())
    auth.identity('member','member@example.org','example.org',now=time.time())
    token=auth.create_session('owner',now=time.time())
    auth.begin_login(now=time.time())
    digest=hashlib.sha256(token.encode()).hexdigest()
    authorize=lambda tx:auth.require_current_principal(tx,token_hash=digest,operation='admin',now=time.time)
    repo=TeamRepository(storage)
    blobs=BlobStore(Path('/data/blobs'))
    previous=blobs.put(b'history-only original\\x00\\r\\n')
    current=blobs.put(b'current original\\r\\n')
    graph=Graph()
    graph.bind('s',URIRef('urn:synthetic:'))
    graph.add((BNode('stable'),URIRef('urn:p'),Literal('001',datatype=XSD.integer,normalize=False)))
    payload={'graph':encode_graph(graph),'unknown':{'blob':'opaque-json-not-a-reference','value':'\\x00'}}
    repo.commit('owner','create',{'file:original.bin':None,'graph:synthetic':None},
                {'file:original.bin':{'blob':previous},'graph:synthetic':payload},'create',authorize=authorize)
    repo.commit('owner','replace',{'file:original.bin':1},{'file:original.bin':{'blob':current}},'edit',authorize=authorize)
    repo.commit('owner','remove',{'deleted':None},{'deleted':None},'delete',authorize=authorize)
    print(json.dumps({'token':token,'history_blob':previous,'current_blob':current}))
finally:
    storage.close()
'''


SNAPSHOT = '''
import hashlib,json,os
from app.team.pg_config import load_pg_config
from app.team.pg_storage import PgStorage
storage=PgStorage(load_pg_config(os.environ,role='backup'),on_fatal=lambda kind:None)
try:
    with storage.export_snapshot() as tx:
        tables={table: sorted(list(tx.iter_rows(table)),key=lambda row:json.dumps(row,sort_keys=True)) for table in
            ('resources','audit','requests','team_users','team_auth_events','team_access_requests')}
        sessions=list(tx.iter_rows('team_sessions'))
        attempts=list(tx.iter_rows('team_login_attempts'))
    encoded=json.dumps(tables,sort_keys=True,ensure_ascii=True).encode()
    print(json.dumps({'sha256':hashlib.sha256(encoded).hexdigest(), 'sessions':len(sessions),'attempts':len(attempts),
                      'audit_max':max(row['id'] for row in tables['audit'])}))
finally:
    storage.close()
'''


RECOVERY_VERIFY = '''
import hashlib,json,os,time
from pathlib import Path
from app.team.pg_config import load_pg_config
from app.team.pg_storage import PgStorage
from app.team.auth_store import AuthStore
from app.team.repository import TeamRepository
from app.team.blobs import BlobStore
from app.team.history import inverse
storage=PgStorage(load_pg_config(os.environ,role='app'),on_fatal=lambda kind:None)
try:
    storage.start_writer()
    repo=TeamRepository(storage)
    with storage.read_snapshot() as tx:
        audit_max=tx.execute('SELECT max(id) AS id FROM audit').fetchone()['id']
        event_max=tx.execute('SELECT max(id) AS id FROM team_auth_events').fetchone()['id']
    auth=AuthStore(storage,bootstrap_subs=frozenset({'owner'}))
    token=auth.create_session('owner',now=time.time())
    digest=hashlib.sha256(token.encode()).hexdigest()
    authorize=lambda tx:auth.require_current_principal(tx,token_hash=digest,operation='admin',now=time.time)
    blobs=BlobStore(Path('/data/blobs'))
    key='file:original.bin'
    current=repo.read(key).payload
    assert blobs.get(current['blob'])==b'current original\\r\\n'
    replay=repo.commit('owner','replace',{key:1},{key:current},'edit',authorize=authorize)
    assert replay['versions'][key]==2 and len(repo.history(key))==2
    changes,operation=inverse(repo,'owner',key,{key:2})
    repo.commit('owner','restored-undo',{key:2},changes,operation,authorize=authorize)
    assert blobs.get(repo.read(key).payload['blob'])==b'history-only original\\x00\\r\\n'
    changes,operation=inverse(repo,'owner',key,{key:3},redo=True)
    repo.commit('owner','restored-redo',{key:3},changes,operation,authorize=authorize)
    assert repo.read(key).payload==current and repo.read(key).version==4
    assert repo.history(key)[0]['id']>audit_max
    assert auth.events()[0]['id']>event_max
    print(json.dumps({'verified':True}))
finally:
    storage.close()
'''


def prepare_browser(directory, port):
    stack = Stack(Path(directory) / ('compose-' + secrets.token_hex(3)),
                  subnet='10.253.57.0/24', gateway='10.253.57.1', port=int(port))
    override = stack.directory / 'browser.json'
    override.write_text(json.dumps({'services': {'semantic-studio-team': {
        'command': ['python', '/fixture/team_browser_server.py', '/data/browser-fixture', '8000'],
        'environment': {'PYTHONPATH': '/app', 'TEAM_BROWSER_BIND_HOST': '0.0.0.0', 'TEAM_BROWSER_PUBLIC_PORT': str(port)},
        'volumes': [str(ROOT / 'backend/tests/team_browser_server.py') + ':/fixture/team_browser_server.py:ro'],
    }}}))
    stack.arguments += ['-f', str(override)]
    try:
        stack.database()
    except Exception:
        stack.close()
        raise
    return {'arguments': stack.arguments, 'project': stack.name, 'environment': stack.environment}


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] != 'prepare-browser':
        raise SystemExit('compose_acceptance_arguments_invalid')
    print(json.dumps(prepare_browser(sys.argv[2], int(sys.argv[3]))))
