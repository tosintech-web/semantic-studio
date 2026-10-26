"""
================================================================================
FILE: backend/tests/test_pg_archive.py
SUMMARY
    PostgreSQL generation archives preserve snapshots, opaque values and blobs.
BASIC IDEA
    Back up a live writer through the read-only role; restore to a test-owned
    empty schema/new data directory and verify history but no revived sessions.
INPUTS / INPUT SOURCES
    Synthetic resources, auth facts, immutable bytes and controlled failures.
EXPECTED OUTPUT
    Coherent private generations or a fenced incomplete destination, no SQL input.
================================================================================
"""
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import hashlib
import json

import pytest

from app.team.auth_store import AuthStore, AuthRefused
from app.team.blobs import BlobStore
from app.team.maintenance import MaintenanceError
from app.team.pg_archive import backup, restore
from app.team.pg_schema import ensure_schema
from app.team.pg_storage import PgStorage, StorageError, WriteTx
from app.team.repository import TeamRepository
from pg_support import reset_test_schema, role_config
from rdflib import Graph, BNode, URIRef, Literal
from app.team.rdf_codec import encode_graph

pytestmark = pytest.mark.team_db


def rows(archive, table):
    return [json.loads(line) for line in (archive / 'tables' / (table + '.ndjson')).read_text().splitlines()]


@pytest.fixture
def populated(pg_repository, tmp_path):
    repo = pg_repository
    auth = AuthStore(repo.storage, bootstrap_subs=frozenset({'owner'}))
    auth.identity('owner', 'owner@example.org', 'example.org', now=100)
    token = auth.create_session('owner', now=100)
    attempt = auth.begin_login(now=100)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    def authorize(tx):
        return auth.require_current_principal(tx, token_hash=token_hash, operation='admin', now=110)
    root = tmp_path / 'source'
    blobs = BlobStore(root / 'blobs')
    content = b'# original\r\n@prefix ex: <https://example.org/> .\r\n'
    digest = blobs.put(content)
    opaque = {'lexical': '001', 'label': '日本語😀', 'nul': '\0', 'unknown': {'blob': 'authored-value'}}
    changes = {'file:sample.ttl': {'blob': digest, 'unknown': {'blob': 'not-a-reference'}},
               'opaque': opaque, 'workspace': {'schema': 1}}
    graph = Graph(bind_namespaces='none')
    graph.bind('ex', 'https://example.org/')
    graph.add((BNode('stable-node'), URIRef('https://example.org/unknown'),
               Literal('001', datatype=URIRef('http://www.w3.org/2001/XMLSchema#integer'), normalize=False)))
    graph.add((BNode('stable-node'), URIRef('https://example.org/name'), Literal('合成', lang='ja')))
    changes['graph:synthetic'] = {'graph': encode_graph(graph), 'unknown': opaque['unknown']}
    repo.commit('owner', 'seed', {key: None for key in changes}, changes, 'seed', authorize=authorize)
    return repo, auth, authorize, root, digest, content, opaque, token, attempt


def capture(populated, destination):
    storage = PgStorage(role_config('backup'), on_fatal=lambda kind: None)
    try:
        return backup(storage, populated[3] / 'blobs', destination)
    finally:
        storage.close()


def fresh_target(populated):
    # Unit recovery uses a fresh logical target in the disposable test DB.
    # The two-project/source-stays-live deployment test belongs to Task 8.
    populated[0].storage.close()
    reset_test_schema()
    storage = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    ensure_schema(storage)
    return storage


def test_pg_backup_keeps_single_snapshot_and_history_blobs(populated, tmp_path):
    repo, _, authorize, _, digest, content, *_ = populated
    repo.commit('owner', 'delete', {'file:sample.ttl': 1}, {'file:sample.ttl': None}, 'delete', authorize=authorize)
    repo.commit('owner', 'pair', {'a': None, 'b': None}, {'a': {'n': 0}, 'b': {'n': 0}}, 'pair', authorize=authorize)
    def writer():
        for value in range(1, 20):
            repo.commit('owner', f'pair-{value}', {'a': value, 'b': value}, {'a': {'n': value}, 'b': {'n': value}}, 'pair', authorize=authorize)
    archive = tmp_path / 'archive'
    with ThreadPoolExecutor(max_workers=1) as pool:
        writing = pool.submit(writer)
        capture(populated, archive)
        writing.result()
    resources = {row['key']: row for row in rows(archive, 'resources')}
    assert resources['a']['payload'] == resources['b']['payload']
    assert resources['a']['version'] == resources['b']['version']
    assert len([row for row in rows(archive, 'audit') if row['key'] == 'a']) == resources['a']['version']
    assert (archive / 'blobs' / digest).read_bytes() == content


def test_pg_archive_preserves_opaque_json_and_bytes(populated, tmp_path):
    archive = tmp_path / 'archive'
    capture(populated, archive)
    resource = next(row for row in rows(archive, 'resources') if row['key'] == 'opaque')
    assert json.loads(resource['payload']) == populated[6]
    typed = next(row for row in rows(archive, 'resources') if row['key'] == 'graph:synthetic')
    assert json.loads(typed['payload']) == populated[0].read('graph:synthetic').payload
    assert (archive / 'blobs' / populated[4]).read_bytes() == populated[5]
    manifest = json.loads((archive / 'manifest.json').read_text())
    assert len(manifest['tables']) == 8 and 'team_schema' not in manifest['tables']


def test_pg_restore_keeps_history_but_revokes_login(populated, tmp_path):
    repo, _, _, _, digest, content, opaque, token, attempt = populated
    before, history = repo.snapshot(), repo.history('workspace')
    archive = tmp_path / 'archive'
    capture(populated, archive)
    target = fresh_target(populated)
    destination = tmp_path / 'restored'
    try:
        restore(target, archive, destination)
    finally:
        target.close()
    app = PgStorage(role_config(), on_fatal=lambda kind: None)
    try:
        app.start_writer()
        recovered = TeamRepository(app)
        assert recovered.snapshot() == before
        assert recovered.history('workspace') == history
        assert recovered.read('opaque').payload == opaque
        assert (destination / 'blobs' / digest).read_bytes() == content
        auth = AuthStore(app, bootstrap_subs=frozenset({'owner'}))
        with pytest.raises(AuthRefused):
            auth.authenticate(token, now=102)
        with pytest.raises(AuthRefused):
            auth.consume_login(attempt.state, attempt.browser_cookie, now=102)
        new_token = auth.create_session('owner', now=200)
        new_hash = hashlib.sha256(new_token.encode()).hexdigest()
        recovered.commit('owner', 'new', {'workspace': 1}, {'workspace': {}}, 'edit',
                         authorize=lambda tx: auth.require_current_principal(tx, token_hash=new_hash, operation='edit', now=201))
        assert recovered.history('workspace')[0]['id'] > history[0]['id']
    finally:
        app.close()


@pytest.mark.parametrize('failure', ['insert', 'commit-unknown'])
def test_pg_restore_failure_never_publishes_destination(populated, tmp_path, monkeypatch, failure):
    archive = tmp_path / 'archive'
    capture(populated, archive)
    original_manifest = (archive / 'manifest.json').read_bytes()
    original_source = (populated[3] / 'blobs' / populated[4]).read_bytes()
    target = fresh_target(populated)
    destination = tmp_path / 'incomplete'
    if failure == 'insert':
        execute = WriteTx.execute
        def fail_insert(tx, sql, parameters=None):
            if sql.startswith('INSERT INTO semantic_studio.requests'):
                raise OSError('synthetic restore failure')
            return execute(tx, sql, parameters)
        monkeypatch.setattr(WriteTx, 'execute', fail_insert)
    else:
        transaction = target.write_transaction
        @contextmanager
        def unknown_commit():
            with transaction() as tx:
                yield tx
                importing = tx.execute('SELECT EXISTS (SELECT 1 FROM semantic_studio.resources) AS importing').fetchone()['importing']
            if importing:
                raise StorageError('db_connection')
        monkeypatch.setattr(target, 'write_transaction', unknown_commit)
    try:
        with pytest.raises(MaintenanceError):
            restore(target, archive, destination)
    finally:
        target.close()
    assert (destination / '.team-import-incomplete').is_file()
    assert (archive / 'manifest.json').read_bytes() == original_manifest
    assert (populated[3] / 'blobs' / populated[4]).read_bytes() == original_source
    from test_pg_runtime import configuration
    from app.team.runtime import TeamRuntime
    runtime = TeamRuntime(configuration(destination))
    with pytest.raises(ValueError, match='team_storage_not_ready'):
        runtime.start()


def test_corrupt_backup_never_publishes_archive(populated, tmp_path):
    (populated[3] / 'blobs' / populated[4]).write_bytes(b'corrupt')
    destination = tmp_path / 'archive'
    with pytest.raises(MaintenanceError):
        capture(populated, destination)
    assert not destination.exists()


@pytest.mark.parametrize('damage', ['schema-bool', 'duplicate-key', 'bad-tombstone', 'unknown-table', 'escaped-path', 'oversize'])
def test_restore_rejects_forged_generation_before_destination(populated, tmp_path, damage):
    archive = tmp_path / 'archive'
    capture(populated, archive)
    manifest_file = archive / 'manifest.json'
    manifest = json.loads(manifest_file.read_text())
    if damage == 'schema-bool':
        manifest['schema']['version'] = True
    elif damage == 'unknown-table':
        manifest['tables']['unknown;SELECT'] = manifest['tables']['resources']
    elif damage == 'escaped-path':
        manifest['tables']['resources']['file'] = '../private'
    elif damage == 'oversize':
        from app.team.pg_archive import MAX_ARCHIVE_BYTES
        manifest['tables']['resources']['bytes'] = MAX_ARCHIVE_BYTES + 1
    else:
        table = archive / 'tables/resources.ndjson'
        if damage == 'duplicate-key':
            lines = table.read_bytes().splitlines(keepends=True)
            lines[0] = b'{"version":0,' + lines[0][1:]
            data = b''.join(lines)
        else:
            data = table.read_bytes() + (json.dumps({'key': 'file:C:/escape', 'version': 1, 'payload': None}) + '\n').encode()
            manifest['tables']['resources']['rows'] += 1
        table.write_bytes(data)
        manifest['tables']['resources'].update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    manifest_file.write_text(json.dumps(manifest))
    target = fresh_target(populated)
    destination = tmp_path / 'rejected'
    try:
        with pytest.raises(MaintenanceError):
            restore(target, archive, destination)
        assert not destination.exists()
        with target.read_snapshot() as tx:
            assert tx.execute('SELECT count(*) AS count FROM semantic_studio.resources').fetchone()['count'] == 0
    finally:
        target.close()


def test_discarded_sessions_are_constraint_checked_before_restore_success(populated, tmp_path):
    archive = tmp_path / 'archive'
    capture(populated, archive)
    path = archive / 'tables/team_sessions.ndjson'
    record = rows(archive, 'team_sessions')[0]
    record['sub'] = 'missing-user'
    data = (json.dumps(record) + '\n').encode()
    path.write_bytes(data)
    manifest_path = archive / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['tables']['team_sessions'].update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    manifest_path.write_text(json.dumps(manifest))
    target = fresh_target(populated)
    destination = tmp_path / 'invalid-session'
    try:
        with pytest.raises(MaintenanceError):
            restore(target, archive, destination)
        if destination.exists():
            assert (destination / '.team-import-incomplete').is_file()
        with target.read_snapshot() as tx:
            assert tx.execute('SELECT count(*) AS count FROM semantic_studio.team_sessions').fetchone()['count'] == 0
    finally:
        target.close()
