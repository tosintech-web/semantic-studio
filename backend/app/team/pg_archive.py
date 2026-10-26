"""
================================================================================
FILE: backend/app/team/pg_archive.py
SUMMARY
    Coherent private PostgreSQL generations including historical immutable blobs.
BASIC IDEA
    Stream eight known tables from one read-only snapshot. Restore validated
    rows to an empty database after copying all blobs; clear sessions/logins.
    A durable data-directory marker fences every incomplete/unknown import.
INPUTS / INPUT SOURCES
    Dedicated backup/maintenance storage, blob roots and versioned directories.
EXPECTED OUTPUT
    Exact rows/history/bytes or finite failures; no external SQL or old DB reader.
================================================================================
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import re
import tempfile

from .commands import resource_path
from .maintenance_io import (MaintenanceError, archive_destination, copy_hashed,
                             fsync_directory, import_destination, regular_file, separate)
from .pg_schema import CATALOG_PATH, SCHEMA_VERSION, ddl_fingerprint, ensure_schema, _validate
from .rdf_codec import decode_graph

TABLE_ORDER = ('resources', 'audit', 'requests', 'team_users', 'team_sessions',
               'team_login_attempts', 'team_auth_events', 'team_access_requests')
MAX_ROW_BYTES = 256 * 1024 * 1024
MAX_ARCHIVE_BYTES = 64 * 1024 * 1024 * 1024
MAX_MANIFEST_BYTES = 16 * 1024 * 1024
MAX_FILES = 1_000_000
MAX_ROWS = 10_000_000
MAX_DEPTH = 1000
_REFERENCE = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
_COLUMNS = {table: tuple(sorted((row for row in _REFERENCE['catalog']['columns']
                                if row['table_name'] == table), key=lambda row: row['position'])) for table in TABLE_ORDER}


def _json(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('ascii')


def _loads(data):
    def invalid(_value):
        raise MaintenanceError('archive_invalid')
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise MaintenanceError('archive_invalid')
            result[key] = value
        return result
    try:
        value = json.loads(data, parse_constant=invalid, object_pairs_hook=unique)
        pending = [(value, 0)]
        while pending:
            node, depth = pending.pop()
            if depth > MAX_DEPTH:
                raise MaintenanceError('archive_limit')
            if isinstance(node, dict):
                pending.extend((child, depth + 1) for child in node.values())
            elif isinstance(node, list):
                pending.extend((child, depth + 1) for child in node)
        return value
    except (ValueError, UnicodeError, RecursionError):
        raise MaintenanceError('archive_invalid') from None


def _payload(value):
    parsed = _loads(value)
    if type(parsed) is not dict:
        raise MaintenanceError('invalid_resource')
    return parsed


def resource_references(key, value):
    """Only the file-resource outer blob field is a storage reference."""
    if key.startswith('file:'):
        try:
            resource_path(Path('/data'), key[5:])
        except ValueError:
            raise MaintenanceError('archive_path') from None
    if value is None:
        return set()
    payload = _payload(value)
    if key.startswith('file:'):
        digest = payload.get('blob')
        if not isinstance(digest, str) or not re.fullmatch('[0-9a-f]{64}', digest):
            raise MaintenanceError('invalid_blob_reference')
        return {digest}
    if key.startswith('graph:'):
        try:
            decode_graph(payload['graph'])
        except (KeyError, ValueError, TypeError):
            raise MaintenanceError('invalid_resource') from None
    # User JSON may contain arbitrary blob/graph keys. They are not files or
    # typed RDF unless the authoritative resource key declares that meaning.
    return set()


def validate_row(table, row):
    columns = _COLUMNS[table]
    if type(row) is not dict or set(row) != {column['name'] for column in columns}:
        raise MaintenanceError('archive_schema')
    for column in columns:
        value, kind = row[column['name']], column['type']
        if value is None:
            if column['not_null']:
                raise MaintenanceError('archive_invalid')
            continue
        if kind == 'text':
            if not isinstance(value, str) or '\0' in value:
                raise MaintenanceError('archive_invalid')
            try:
                value.encode('utf-8')
            except UnicodeError:
                raise MaintenanceError('archive_invalid') from None
        elif kind in {'smallint', 'integer', 'bigint'}:
            if type(value) is not int or not -9223372036854775808 <= value <= 9223372036854775807:
                raise MaintenanceError('archive_invalid')
        elif kind == 'boolean':
            if type(value) is not bool:
                raise MaintenanceError('archive_invalid')
        elif kind == 'double precision':
            if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
                raise MaintenanceError('archive_invalid')
        else:
            raise MaintenanceError('archive_schema')
    for name in ('id', 'version', 'before_version', 'after_version'):
        if name in row and row[name] is not None and row[name] < 1:
            raise MaintenanceError('archive_invalid')
    if table == 'team_users' and row['role'] not in {'viewer', 'editor', 'admin'}:
        raise MaintenanceError('archive_invalid')
    if table == 'team_sessions' and row['last_seen'] < row['created']:
        raise MaintenanceError('archive_invalid')
    for name in ('token_hash', 'state_hash', 'browser_hash', 'body_hash'):
        if name in row and not re.fullmatch('[0-9a-f]{64}', row[name]):
            raise MaintenanceError('archive_invalid')
    references = set()
    if table == 'resources':
        if not row['key']:
            raise MaintenanceError('archive_invalid')
        references |= resource_references(row['key'], row['payload'])
    elif table == 'audit':
        for name in ('before_payload', 'after_payload'):
            references |= resource_references(row['key'], row[name])
    elif table in {'requests', 'team_access_requests'}:
        _payload(row['result'])
    elif table == 'team_auth_events':
        for name in ('before_payload', 'after_payload'):
            if row[name] is not None:
                _payload(row[name])
    return references


def _hash_file(path):
    digest, count = hashlib.sha256(), 0
    with regular_file(path) as stream:
        while chunk := stream.read(1024 * 1024):
            count += len(chunk)
            if count > MAX_ARCHIVE_BYTES:
                raise MaintenanceError('archive_limit')
            digest.update(chunk)
    return digest.hexdigest(), count


def _write_json(path, value, limit):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'wb') as stream:
        count = 0
        for part in json.JSONEncoder(ensure_ascii=True, sort_keys=True, allow_nan=False).iterencode(value):
            data = part.encode('ascii')
            count += len(data)
            if count > limit:
                raise MaintenanceError('archive_limit')
            stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())


def backup(storage, blob_root, destination):
    try:
        if storage.config.role != 'backup':
            raise MaintenanceError('role_required')
        blob_root = Path(blob_root)
        separate(blob_root, destination)
        if blob_root.is_symlink() or not blob_root.is_dir():
            raise MaintenanceError('invalid_source')
        with archive_destination(destination) as stage:
            (stage / 'tables').mkdir(mode=0o700)
            (stage / 'blobs').mkdir(mode=0o700)
            manifest = {'version': 1, 'schema': {'version': SCHEMA_VERSION, 'fingerprint': ddl_fingerprint()}, 'tables': {}, 'blobs': {}}
            references, total, resources = set(), 0, 0
            with storage.export_snapshot() as snapshot:
                _validate(snapshot)
                for table in TABLE_ORDER:
                    path = stage / 'tables' / (table + '.ndjson')
                    digest, count, length = hashlib.sha256(), 0, 0
                    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    with os.fdopen(descriptor, 'wb') as stream:
                        for row in snapshot.iter_rows(table):
                            references |= validate_row(table, row)
                            if table == 'resources' and row['payload'] is not None:
                                resources += 1
                            data = _json(row) + b'\n'
                            count += 1
                            length += len(data)
                            total += len(data)
                            if len(data) > MAX_ROW_BYTES or count > MAX_ROWS or total > MAX_ARCHIVE_BYTES:
                                raise MaintenanceError('archive_limit')
                            stream.write(data)
                            digest.update(data)
                        stream.flush()
                        os.fsync(stream.fileno())
                    manifest['tables'][table] = {'file': 'tables/' + table + '.ndjson', 'rows': count, 'bytes': length, 'sha256': digest.hexdigest()}
            # The read snapshot has fixed all references; immutable blobs have
            # no GC, so copying never blocks the application writer afterward.
            if len(references) + 9 > MAX_FILES:
                raise MaintenanceError('archive_limit')
            for digest in sorted(references):
                source = blob_root / digest
                actual_hash, length = _hash_file(source)
                total += length
                if actual_hash != digest or total > MAX_ARCHIVE_BYTES:
                    raise MaintenanceError('archive_corrupt')
                copy_hashed(source, stage / 'blobs' / digest, expected_hash=digest, expected_bytes=length)
                manifest['blobs'][digest] = {'file': 'blobs/' + digest, 'bytes': length, 'sha256': digest}
            _write_json(stage / 'manifest.json', manifest, MAX_MANIFEST_BYTES)
            for directory in (stage / 'tables', stage / 'blobs', stage):
                fsync_directory(directory)
        return {'resources': resources, 'blobs': len(references), 'tables': len(TABLE_ORDER)}
    except MaintenanceError:
        raise
    except Exception:
        raise MaintenanceError('backup_failed') from None


def _read_manifest(archive):
    if archive.is_symlink() or not archive.is_dir():
        raise MaintenanceError('invalid_source')
    with regular_file(archive / 'manifest.json') as stream:
        data = stream.read(MAX_MANIFEST_BYTES + 1)
    if len(data) > MAX_MANIFEST_BYTES:
        raise MaintenanceError('archive_limit')
    manifest = _loads(data)
    if (type(manifest) is not dict or set(manifest) != {'version', 'schema', 'tables', 'blobs'}
            or type(manifest['version']) is not int or manifest['version'] != 1
            or type(manifest['schema']) is not dict or type(manifest['schema'].get('version')) is not int
            or manifest['schema'] != {'version': SCHEMA_VERSION, 'fingerprint': ddl_fingerprint()}
            or type(manifest['tables']) is not dict or set(manifest['tables']) != set(TABLE_ORDER)
            or type(manifest['blobs']) is not dict):
        raise MaintenanceError('archive_schema')
    expected = {'manifest.json': None}
    for table, entry in manifest['tables'].items():
        if type(entry) is not dict or set(entry) != {'file', 'rows', 'bytes', 'sha256'} or entry['file'] != 'tables/' + table + '.ndjson':
            raise MaintenanceError('archive_path')
        if type(entry['rows']) is not int or not 0 <= entry['rows'] <= MAX_ROWS:
            raise MaintenanceError('archive_limit')
        expected[entry['file']] = entry
    for digest, entry in manifest['blobs'].items():
        if (not isinstance(digest, str) or not re.fullmatch('[0-9a-f]{64}', digest)
                or type(entry) is not dict or set(entry) != {'file', 'bytes', 'sha256'}
                or entry['file'] != 'blobs/' + digest or entry['sha256'] != digest):
            raise MaintenanceError('archive_path')
        expected[entry['file']] = entry
    if len(expected) > MAX_FILES:
        raise MaintenanceError('archive_limit')
    for entry in expected.values():
        if entry is not None and (type(entry['bytes']) is not int or not 0 <= entry['bytes'] <= MAX_ARCHIVE_BYTES
                or not isinstance(entry['sha256'], str) or not re.fullmatch('[0-9a-f]{64}', entry['sha256'])):
            raise MaintenanceError('archive_invalid')
    if sum(entry['bytes'] for entry in expected.values() if entry) > MAX_ARCHIVE_BYTES:
        raise MaintenanceError('archive_limit')
    found = set()
    for path in archive.rglob('*'):
        if path.is_symlink():
            raise MaintenanceError('symlink_refused')
        relative = path.relative_to(archive).as_posix()
        if path.is_file():
            if relative not in expected:
                raise MaintenanceError('archive_path')
            found.add(relative)
        elif not path.is_dir() or relative not in {'tables', 'blobs'}:
            raise MaintenanceError('archive_path')
        if len(found) > MAX_FILES:
            raise MaintenanceError('archive_limit')
    if found != set(expected):
        raise MaintenanceError('archive_corrupt')
    return manifest, expected


def _table_rows(root, table, entry):
    digest, count, length = hashlib.sha256(), 0, 0
    with regular_file(root / entry['file']) as stream:
        while data := stream.readline(MAX_ROW_BYTES + 1):
            count += 1
            length += len(data)
            if len(data) > MAX_ROW_BYTES or count > entry['rows'] or length > entry['bytes']:
                raise MaintenanceError('archive_limit')
            if not data.endswith(b'\n'):
                raise MaintenanceError('archive_corrupt')
            digest.update(data)
            row = _loads(data)
            validate_row(table, row)
            yield row
    if count != entry['rows'] or length != entry['bytes'] or digest.hexdigest() != entry['sha256']:
        raise MaintenanceError('archive_corrupt')


def require_empty(storage):
    if storage.config.role != 'maintenance':
        raise MaintenanceError('role_required')
    ensure_schema(storage)
    storage.start_writer()
    with storage.write_transaction() as tx:
        for table in TABLE_ORDER:
            if tx.execute('SELECT 1 FROM semantic_studio.' + table + ' LIMIT 1').fetchone():
                raise MaintenanceError('database_not_empty')


def restore(storage, archive, destination):
    try:
        archive = Path(archive)
        separate(archive, destination)
        manifest, expected = _read_manifest(archive)
        # Freeze untrusted input into this process's private stage and recheck
        # its hashes. SQL never reads a mutable external archive file later.
        with tempfile.TemporaryDirectory(prefix='semantic-studio-restore-', ignore_cleanup_errors=True) as temporary:
            stage = Path(temporary)
            (stage / 'tables').mkdir(mode=0o700)
            (stage / 'blobs').mkdir(mode=0o700)
            for relative, entry in expected.items():
                if entry is not None:
                    copy_hashed(archive / relative, stage / relative, expected_hash=entry['sha256'], expected_bytes=entry['bytes'])
            references = set()
            for table in TABLE_ORDER:
                for row in _table_rows(stage, table, manifest['tables'][table]):
                    references |= validate_row(table, row)
            if references != set(manifest['blobs']):
                raise MaintenanceError('archive_corrupt')
            require_empty(storage)
            with import_destination(destination) as root:
                (root / 'blobs').mkdir(mode=0o700)
                for digest, entry in manifest['blobs'].items():
                    copy_hashed(stage / entry['file'], root / 'blobs' / digest, expected_hash=digest, expected_bytes=entry['bytes'])
                fsync_directory(root / 'blobs')
                with storage.write_transaction() as tx:
                    for table in TABLE_ORDER:
                        columns = tuple(column['name'] for column in _COLUMNS[table])
                        override = ' OVERRIDING SYSTEM VALUE' if table in {'audit', 'team_auth_events'} else ''
                        sql = 'INSERT INTO semantic_studio.' + table + '(' + ','.join(columns) + ')' + override + ' VALUES (' + ','.join(['%s'] * len(columns)) + ')'
                        for row in _table_rows(stage, table, manifest['tables'][table]):
                            tx.execute(sql, tuple(row[column] for column in columns))
                    # Validate even credentials against the real FK/unique/
                    # CHECK constraints, then remove them before COMMIT. No
                    # restored session or pending login is ever made visible.
                    tx.execute('DELETE FROM semantic_studio.team_sessions')
                    tx.execute('DELETE FROM semantic_studio.team_login_attempts')
                    for table in ('audit', 'team_auth_events'):
                        tx.execute("SELECT setval(pg_get_serial_sequence(%s,'id'),coalesce(max(id),1),count(*)>0) FROM semantic_studio." + table, ('semantic_studio.' + table,))
                # A COMMIT exception above leaves the marker regardless of the
                # actual outcome. Only a known success reaches verification.
                with storage.read_snapshot() as tx:
                    _validate(tx)
                    for table in TABLE_ORDER:
                        count = tx.execute('SELECT count(*) AS count FROM semantic_studio.' + table).fetchone()['count']
                        wanted = 0 if table in {'team_sessions', 'team_login_attempts'} else manifest['tables'][table]['rows']
                        if count != wanted:
                            raise MaintenanceError('archive_corrupt')
                storage.ensure_owner()
        return {'tables': len(TABLE_ORDER), 'blobs': len(manifest['blobs']), 'sessionsInvalidated': True}
    except MaintenanceError:
        raise
    except Exception:
        raise MaintenanceError('restore_failed') from None
