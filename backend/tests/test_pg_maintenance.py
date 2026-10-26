"""
================================================================================
FILE: backend/tests/test_pg_maintenance.py
SUMMARY
    Local-file migration is read-only at source and never opens a legacy DB.
BASIC IDEA
    Import only into an empty dedicated PostgreSQL target and fresh blob root.
    Inert old-store bytes are refused by filename before content is read.
INPUTS / INPUT SOURCES
    Synthetic local libraries, disposable PostgreSQL and controlled read failures.
EXPECTED OUTPUT
    Explicit migration audit and exact bytes/RDF, with no compatibility reader.
================================================================================
"""
from pathlib import Path
import os
import json
import subprocess
import sys

import pytest

from app.team.maintenance import MaintenanceError, migrate_local, inspect_local
from app.team.pg_storage import PgStorage
from pg_support import role_config


@pytest.mark.parametrize('filename', ['team.sqlite', 'team.sqlite3', 'team.db'])
def test_pg_migrate_rejects_opaque_old_store_without_opening(tmp_path, monkeypatch, filename):
    source = tmp_path / 'old'
    source.mkdir()
    legacy = source / filename
    legacy.write_bytes(b'opaque unsupported old storage')
    original_open = Path.open
    def forbid_read(path, *args, **kwargs):
        if path == legacy:
            pytest.fail('unsupported legacy database was opened')
        return original_open(path, *args, **kwargs)
    monkeypatch.setattr(Path, 'open', forbid_read)
    original_os_open = os.open
    def forbid_os_read(path, *args, **kwargs):
        if Path(path) == legacy:
            pytest.fail('unsupported legacy database was opened through os.open')
        return original_os_open(path, *args, **kwargs)
    monkeypatch.setattr(os, 'open', forbid_os_read)
    with pytest.raises(MaintenanceError):
        inspect_local(source)
    assert legacy.stat().st_size == len(b'opaque unsupported old storage')


@pytest.mark.team_db
def test_local_migration_records_only_new_migration(pg_schema, tmp_path):
    source = tmp_path / 'local'
    source.mkdir()
    (source / 'opaque.bin').write_bytes(b'original\x00bytes\r\n')
    target = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    destination = tmp_path / 'team'
    try:
        result = migrate_local(target, source, destination)
        assert result['files'] == 1 and result['dryRun'] is False
        with target.read_snapshot() as tx:
            audits = tx.execute('SELECT actor,operation FROM semantic_studio.audit').fetchall()
            assert audits and all(row == {'actor': 'migration', 'operation': 'migration'} for row in audits)
            assert tx.execute('SELECT count(*) AS count FROM semantic_studio.team_users').fetchone()['count'] == 0
        assert (source / 'opaque.bin').read_bytes() == b'original\x00bytes\r\n'
        assert not (destination / '.team-import-incomplete').exists()
    finally:
        target.close()


@pytest.mark.team_db
def test_module_cli_migrates_without_google_or_app_secret_and_keeps_lexical_form(pg_schema, tmp_path):
    source = tmp_path / 'local'
    folder = source / 'ontologies'
    folder.mkdir(parents=True)
    oid = 'ont-123456789abc'
    (folder / (oid + '.meta.json')).write_text(json.dumps({'id': oid, 'format': 'turtle', 'name': 'synthetic', 'source': 'file'}))
    content = (b'<urn:s> <urn:p> "001"^^<http://www.w3.org/2001/XMLSchema#integer> .\r\n'
               b'<urn:s> <urn:private> "synthetic-private-lexical"^^<http://www.w3.org/2001/XMLSchema#integer> .\r\n')
    (folder / (oid + '.rdf')).write_bytes(content)
    environment = {key: value for key, value in os.environ.items() if 'GOOGLE' not in key and key != 'SEMANTIC_STUDIO_PUBLIC_ORIGIN'}
    environment.update(SEMANTIC_STUDIO_DB_USER='team_maintenance',
                       SEMANTIC_STUDIO_DB_PASSWORD_FILE='/run/secrets/team_db_maintenance')
    destination = tmp_path / 'destination'
    result = subprocess.run([sys.executable, '-m', 'app.team.manage', 'migrate', '--source', str(source),
                             '--destination', str(destination)], env=environment, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)['ok'] is True
    assert str(source) not in result.stdout + result.stderr
    assert 'synthetic-private-lexical' not in result.stdout + result.stderr
    storage = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    try:
        with storage.read_snapshot() as tx:
            row = tx.execute('SELECT payload FROM semantic_studio.resources WHERE key=%s', ('graph:' + oid,)).fetchone()
            payload = json.loads(row['payload'])
            assert payload['graph']['triples'][0][2]['value'] == '001'
    finally:
        storage.close()
    assert (folder / (oid + '.rdf')).read_bytes() == content
