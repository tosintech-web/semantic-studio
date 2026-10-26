"""
================================================================================
FILE: backend/tests/test_team_maintenance.py
SUMMARY
    Non-destructive local migration and coherent private PostgreSQL recovery.
BASIC IDEA
    Real dedicated PostgreSQL and synthetic RDF expose overwrite/corruption.
    Unit restores use a fresh logical target; separate Compose projects verify
    that a concurrently live source keeps its sessions during actual recovery.
INPUTS / INPUT SOURCES
    Temporary local files, internal DB roles and synthetic identities.
EXPECTED OUTPUT
    Original bytes/history survive, failed targets stay fenced, sessions expire.
================================================================================
"""
import hashlib
import base64
import json
import os
from pathlib import Path
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

import pytest
from rdflib.compare import isomorphic
from rdflib import Graph

from app.team.auth_store import AuthRefused, AuthStore
from app.team.maintenance import MaintenanceError, backup, inspect_local, migrate_local as migrate, restore
from app.team.pg_storage import PgStorage, WriteTx
from app.team.pg_schema import ensure_schema
from app.team.rdf_codec import decode_graph
from app.team.repository import TeamRepository
from pg_support import reset_test_schema, role_config
from pg_probe import connect


@pytest.fixture
def maintenance(pg_schema):
    storage = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    yield storage
    storage.close()


@contextmanager
def backup_storage():
    storage = PgStorage(role_config('backup'), on_fatal=lambda kind: None)
    try:
        yield storage
    finally:
        storage.close()


@contextmanager
def app_repository():
    storage = PgStorage(role_config(), on_fatal=lambda kind: None)
    try:
        storage.start_writer()
        yield TeamRepository(storage)
    finally:
        storage.close()


@contextmanager
def fresh_target(repo):
    repo.storage.close()
    reset_test_schema()
    storage = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    try:
        ensure_schema(storage)
        yield storage
    finally:
        storage.close()


def saved_local(root):
    from app.projects import ProjectStore
    store = ProjectStore(root)
    project = store.create(name="合成辞書", base_iri="https://example.org/dict#", prefix="d", template="empty")
    pid = project["id"]
    text = '@prefix d: <https://example.org/dict#> .\nd:Thing d:unknown [ d:name "合成"@ja ] .\n'
    store.document_path(pid, "model").write_text(text, encoding="utf-8")
    (root / "unknown.bin").write_bytes(b"synthetic opaque data")
    return pid, text


def bytes_of(root):
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob("*") if p.is_file()}


@pytest.mark.team_db
def test_dry_run_is_read_only_and_migration_retains_rdf_and_unknown_files(tmp_path, maintenance):
    source = tmp_path / 'local'
    pid, text = saved_local(source)
    before = bytes_of(source)
    report = inspect_local(source)
    assert report['projects'] == 1 and report['statements'] == 2
    destination = tmp_path / 'team'
    assert migrate(None, source, destination, dry_run=True)['dryRun'] is True
    assert not destination.exists() and bytes_of(source) == before
    result = migrate(maintenance, source, destination)
    maintenance.close()
    assert result['projects'] == 1
    with app_repository() as repo:
        graph = decode_graph(repo.read(f'graph:{pid}-model').payload['graph'])
        assert isomorphic(graph, Graph().parse(data=text, format='turtle'))
        opaque = repo.read('file:unknown.bin').payload['blob']
        assert (destination / 'blobs' / opaque).read_bytes() == before['unknown.bin']
        assert repo.history(f'graph:{pid}-model')[0]['actor'] == 'migration'
    assert bytes_of(source) == before


def populated_team(root, repo):
    from app.team.blobs import BlobStore
    blobs = BlobStore(root / 'blobs')
    digest = blobs.put(b'synthetic blob')
    auth = AuthStore(repo.storage, bootstrap_subs=frozenset({'owner'}))
    auth.identity('owner', 'owner@example.org', 'example.org', now=100)
    token = auth.create_session('owner', now=101)
    attempt = auth.begin_login(now=101)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    authorize = lambda tx: auth.require_current_principal(tx, token_hash=token_hash, operation='admin', now=102)
    repo.commit('owner', 'seed', {'file:sample': None, 'workspace': None},
                {'file:sample': {'blob': digest}, 'workspace': {'schema': 1}}, 'create', authorize=authorize)
    return repo, token, attempt, digest, authorize


@pytest.mark.team_db
def test_backup_and_restore_preserve_audit_but_invalidate_all_sessions(tmp_path, pg_repository):
    source, archive = tmp_path / 'live', tmp_path / 'backup'
    repo, token, attempt, digest, authorize = populated_team(source, pg_repository)
    history = repo.history('file:sample')
    with backup_storage() as storage:
        backup(storage, source / 'blobs', archive)
    repo.commit('owner', 'later', {'workspace': 1}, {'workspace': {'schema': 1, 'later': True}}, 'edit', authorize=authorize)
    assert AuthStore(repo.storage, bootstrap_subs=frozenset({'owner'})).authenticate(token, now=102).principal.sub == 'owner'
    destination = tmp_path / 'restored'
    with fresh_target(repo) as target:
        restore(target, archive, destination)
    with app_repository() as recovered:
        assert recovered.read('workspace').version == 1
        assert recovered.history('file:sample') == history
        assert (destination / 'blobs' / digest).read_bytes() == b'synthetic blob'
        auth = AuthStore(recovered.storage, bootstrap_subs=frozenset({'owner'}))
        with pytest.raises(AuthRefused):
            auth.authenticate(token, now=102)
        with pytest.raises(AuthRefused):
            auth.consume_login(attempt.state, attempt.browser_cookie, now=102)
    # Source-remains-live DURING a real different-DB restore is covered by the
    # Task 8 two-project lifecycle case; resetting this disposable schema is
    # an explicit unit-test target preparation, never product behavior.


@pytest.mark.team_db
@pytest.mark.parametrize('operation', [backup, restore], ids=['backup', 'restore'])
def test_missing_or_corrupt_blob_refuses_recovery_without_publishing_destination(tmp_path, pg_repository, operation):
    source, archive = tmp_path / 'live', tmp_path / 'archive'
    _, _, _, digest, _ = populated_team(source, pg_repository)
    destination = tmp_path / 'copy'
    if operation is backup:
        (source / 'blobs' / digest).write_bytes(b'corrupt')
        with backup_storage() as storage, pytest.raises(MaintenanceError):
            backup(storage, source / 'blobs', destination)
    else:
        with backup_storage() as storage:
            backup(storage, source / 'blobs', archive)
        (archive / 'blobs' / digest).write_bytes(b'corrupt')
        with fresh_target(pg_repository) as storage, pytest.raises(MaintenanceError):
            restore(storage, archive, destination)
    assert not destination.exists()


@pytest.mark.team_db
@pytest.mark.parametrize('operation', [migrate, backup, restore], ids=['migrate', 'backup', 'restore'])
def test_existing_destination_is_never_overwritten(tmp_path, pg_schema, operation):
    destination = tmp_path / 'existing'
    destination.mkdir()
    (destination / 'keep').write_bytes(b'keep')
    if operation is migrate:
        source = tmp_path / 'source'
        saved_local(source)
        storage = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
        try:
            with pytest.raises(MaintenanceError):
                migrate(storage, source, destination)
        finally:
            storage.close()
    else:
        source, archive = tmp_path / 'live', tmp_path / 'archive'
        with app_repository() as repo:
            populated_team(source, repo)
            if operation is backup:
                with backup_storage() as storage, pytest.raises(MaintenanceError):
                    backup(storage, source / 'blobs', destination)
            else:
                with backup_storage() as storage:
                    backup(storage, source / 'blobs', archive)
                with fresh_target(repo) as target, pytest.raises(MaintenanceError):
                    restore(target, archive, destination)
    assert bytes_of(destination) == {'keep': b'keep'}


def test_symlinks_cannot_import_files_outside_local_directory(tmp_path):
    source = tmp_path / 'local'
    source.mkdir()
    (tmp_path / 'outside').write_text('private synthetic value')
    (source / 'link').symlink_to(tmp_path / 'outside')
    with pytest.raises(MaintenanceError):
        inspect_local(source)


@pytest.mark.team_db
def test_backup_retains_blobs_referenced_only_by_undo_history(tmp_path, pg_repository):
    source = tmp_path / 'live'
    repo, _, _, digest, authorize = populated_team(source, pg_repository)
    repo.commit('owner', 'delete', {'file:sample': 1}, {'file:sample': None}, 'delete', authorize=authorize)
    destination = tmp_path / 'backup'
    with backup_storage() as storage:
        backup(storage, source / 'blobs', destination)
    assert (destination / 'blobs' / digest).read_bytes() == b'synthetic blob'


@pytest.mark.team_db
def test_migration_failure_leaves_source_and_destination_untouched(tmp_path, maintenance, monkeypatch):
    source = tmp_path / 'local'
    saved_local(source)
    before = bytes_of(source)
    execute = WriteTx.execute
    def refuse(tx, sql, parameters=None):
        if sql.startswith('INSERT INTO semantic_studio.resources'):
            raise OSError('synthetic disk failure')
        return execute(tx, sql, parameters)
    monkeypatch.setattr(WriteTx, 'execute', refuse)
    destination = tmp_path / 'team'
    with pytest.raises(MaintenanceError):
        migrate(maintenance, source, destination)
    # New SQL+blob import retains a durable fence instead of deleting evidence.
    assert (destination / '.team-import-incomplete').is_file()
    assert bytes_of(source) == before


@pytest.mark.team_db
def test_live_backup_keeps_multi_resource_transaction_and_history_together(tmp_path, pg_repository):
    source = tmp_path / 'live'
    repo, _, _, _, authorize = populated_team(source, pg_repository)
    repo.commit('owner', 'pair', {'a': None, 'b': None}, {'a': {'n': 0}, 'b': {'n': 0}}, 'pair', authorize=authorize)
    def writer():
        for value in range(1, 25):
            repo.commit('owner', f'pair-{value}', {'a': value, 'b': value}, {'a': {'n': value}, 'b': {'n': value}}, 'pair', authorize=authorize)
    destination = tmp_path / 'backup'
    with ThreadPoolExecutor(max_workers=1) as pool:
        writing = pool.submit(writer)
        with backup_storage() as storage:
            backup(storage, source / 'blobs', destination)
        writing.result()
    resources = {row['key']: row for row in map(json.loads, (destination / 'tables/resources.ndjson').read_text().splitlines())}
    audit = list(map(json.loads, (destination / 'tables/audit.ndjson').read_text().splitlines()))
    assert resources['a']['payload'] == resources['b']['payload']
    assert resources['a']['version'] == resources['b']['version']
    assert len([row for row in audit if row['key'] == 'a']) == resources['a']['version']


def test_cli_returns_only_finite_diagnostic_without_source_value(tmp_path):
    script = Path(__file__).resolve().parents[2] / 'scripts/team_workspace.py'
    private_source = tmp_path / 'synthetic-private-source'
    result = subprocess.run([sys.executable, str(script), 'inspect-local', str(private_source)], capture_output=True, text=True)
    assert result.returncode == 2
    assert json.loads(result.stdout) == {'ok': False, 'code': 'invalid_source'}
    assert str(private_source) not in result.stdout + result.stderr


def library(source, *, jsonld=False):
    folder = source / "ontologies"
    folder.mkdir(parents=True)
    oid = "ont-123456789abc"
    meta = {"id": oid, "name": "synthetic", "source": "file", "format": "json-ld" if jsonld else "turtle"}
    (folder / f"{oid}.meta.json").write_text(json.dumps(meta))
    if jsonld:
        context = "https://example.org/context"
        document = {"@context": context, "@id": "https://example.org/a", "name": "合成"}
        (folder / f"{oid}.rdf").write_text(json.dumps(document))
        body = json.dumps({"@context": {"name": "https://example.org/name"}}).encode()
        (folder / f"{oid}.contexts.json").write_text(json.dumps({context: {"body": base64.b64encode(body).decode(), "contentType": "application/ld+json", "finalUrl": context}}))
    else:
        (folder / f"{oid}.rdf").write_text('<urn:s> <urn:p> "synthetic" .')
    return oid


def test_inspection_does_not_import_or_create_default_personal_library(tmp_path):
    source = tmp_path / 'selected'
    library(source)
    unselected = tmp_path / 'unselected'
    script = Path(__file__).resolve().parents[2] / 'scripts/team_workspace.py'
    result = subprocess.run([sys.executable, str(script), 'inspect-local', str(source)],
                            env={**os.environ, 'SEMANTIC_STUDIO_MODE': 'local', 'SEMANTIC_STUDIO_DATA_DIR': str(unselected)},
                            capture_output=True, text=True)
    assert result.returncode == 0, result.stdout
    assert not unselected.exists()


@pytest.mark.team_db
def test_saved_jsonld_contexts_are_replayed_without_new_network_access(tmp_path, maintenance, monkeypatch):
    source = tmp_path / 'local'
    oid = library(source, jsonld=True)
    from app.network_broker import broker
    def no_new_connection(*args, **kwargs):
        pytest.fail('migration attempted new network access')
    monkeypatch.setattr(broker, 'request', no_new_connection)
    report = inspect_local(source)
    assert report['ontologies'] == 1 and report['statements'] == 1
    destination = tmp_path / 'team'
    migrate(maintenance, source, destination)
    maintenance.close()
    with app_repository() as repo:
        graph = decode_graph(repo.read('graph:' + oid).payload['graph'])
        assert len(graph) == 1


def test_nested_destination_never_changes_original_source(tmp_path):
    source = tmp_path / 'local'
    saved_local(source)
    before = bytes_of(source)
    with pytest.raises(MaintenanceError):
        migrate(None, source, source / 'new-team')
    assert bytes_of(source) == before


def test_invalid_cli_arguments_are_finite_json_without_echoing_values(tmp_path):
    script = Path(__file__).resolve().parents[2] / 'scripts/team_workspace.py'
    result = subprocess.run([sys.executable, str(script), '--unknown-private-value'], capture_output=True, text=True)
    assert result.returncode == 2
    assert json.loads(result.stdout) == {'ok': False, 'code': 'invalid_arguments'}
    assert 'unknown-private-value' not in result.stdout + result.stderr


@pytest.mark.parametrize('relative', ['C:escape', 'C:/escape', 'nested/C:/escape', 'file.txt:stream'])
def test_team_file_keys_reject_windows_drive_and_stream_interpretations(tmp_path, relative):
    from app.team.commands import resource_path
    with pytest.raises(ValueError):
        resource_path(tmp_path, relative)


@pytest.mark.skipif(os.name == 'nt', reason='These ambiguous POSIX file names cannot be created on Windows')
def test_migration_refuses_nonportable_posix_file_name_before_destination(tmp_path):
    source = tmp_path / 'local'
    source.mkdir()
    (source / 'C:escape').write_bytes(b'synthetic')
    before = bytes_of(source)
    with pytest.raises(MaintenanceError):
        migrate(None, source, tmp_path / 'team')
    assert bytes_of(source) == before
    assert not (tmp_path / 'team').exists()


@pytest.mark.team_db
def test_restore_refuses_nonportable_file_key_before_publishing_destination(tmp_path, pg_repository):
    source = tmp_path / 'team'
    repo, _, _, digest, _ = populated_team(source, pg_repository)
    archive = tmp_path / 'archive'
    with backup_storage() as storage:
        backup(storage, source / 'blobs', archive)
    table = archive / 'tables/resources.ndjson'
    data = table.read_bytes() + (json.dumps({'key': 'file:C:/escape', 'version': 1,
                  'payload': json.dumps({'blob': digest})}) + '\n').encode()
    table.write_bytes(data)
    manifest_path = archive / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    entry = manifest['tables']['resources']
    entry.update(rows=entry['rows'] + 1, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    manifest_path.write_text(json.dumps(manifest))
    destination = tmp_path / 'restore'
    with fresh_target(repo) as target, pytest.raises(MaintenanceError):
        restore(target, archive, destination)
    assert not destination.exists()
