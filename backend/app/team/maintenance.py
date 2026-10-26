"""
================================================================================
FILE: backend/app/team/maintenance.py
SUMMARY
    Explicit local-file inspection and migration to a fresh PostgreSQL workspace.
BASIC IDEA
    Freeze source files privately and parse those exact bytes without touching
    the personal library. Publish blobs before one SQL migration transaction;
    incomplete imports remain fenced. PostgreSQL archives are a separate service.
INPUTS / INPUT SOURCES
    Operator-selected local files and a maintenance-only dedicated storage.
EXPECTED OUTPUT
    Finite reports, exact original bytes/typed RDF and one new migration audit.
================================================================================
"""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import tempfile
import threading
import uuid

import rdflib
from rdflib import Graph

from .commands import resource_path
from .maintenance_io import MaintenanceError, fsync_directory, import_destination, regular_file, separate, copy_hashed, is_legacy_store
from .pg_archive import backup, restore, require_empty, MAX_ARCHIVE_BYTES, MAX_FILES, _hash_file
from .rdf_codec import encode_graph, private_rdf_diagnostics
from .repository import _json

_PARSE_LOCK = threading.Lock()


def _parse(**kwargs):
    # Maintenance runs in an isolated CLI/job process, never a live app route.
    # Avoid importing store/editing (which initializes the personal library),
    # and retain lexical forms instead of rdflib's default numeric normalization.
    with _PARSE_LOCK:
        original = rdflib.NORMALIZE_LITERALS
        try:
            rdflib.NORMALIZE_LITERALS = False
            with private_rdf_diagnostics():
                return Graph().parse(**kwargs)
        finally:
            rdflib.NORMALIZE_LITERALS = original


def _files(root: Path) -> dict[str, Path]:
    if not root.is_dir() or root.is_symlink():
        raise MaintenanceError("invalid_source")
    result = {}
    for path in root.rglob("*"):
        if path.is_symlink():
            raise MaintenanceError("symlink_refused")
        if path.is_file():
            relative = path.relative_to(root).as_posix()
            try:
                relative.encode("utf-8")
                resource_path(root, relative)
            except (ValueError, UnicodeError):
                raise MaintenanceError("invalid_source_path")
            result[relative] = path
        elif not path.is_dir():
            raise MaintenanceError("special_file_refused")
    return result


def _local(source: Path):
    files = _source_files(source)
    graphs, states = {}, {}
    projects = 0
    for name, path in files.items():
        if re.fullmatch(r"projects/prj-[0-9a-f]{12}/project.json", name):
            manifest = json.loads(path.read_text(encoding="utf-8"))
            pid = PurePosixPath(name).parts[1]
            if manifest["id"] != pid:
                raise MaintenanceError("invalid_manifest")
            projects += 1
            for doc in manifest["documents"]:
                if doc["role"] not in {"model", "shapes"} or doc["file"] != doc["role"] + ".ttl":
                    raise MaintenanceError("invalid_manifest")
                text = (path.parent / doc["file"]).read_bytes().decode("utf-8")
                graph = _parse(data=text, format="turtle", publicID=manifest["baseIri"])
                oid = pid + "-" + doc["role"]
                graphs[oid] = encode_graph(graph)
                states[oid] = dict(last_text=text, visual_since_save=False,
                                   dirty=False, saved_text=text, revision=0)
    ontologies = 0
    for name, path in files.items():
        if re.fullmatch(r"ontologies/ont-[0-9a-f]{12}\.meta\.json", name):
            meta = json.loads(path.read_text(encoding="utf-8"))
            oid = PurePosixPath(name).name.removesuffix(".meta.json")
            if meta["id"] != oid:
                raise MaintenanceError("invalid_ontology")
            data = (path.parent / (oid + ".rdf")).read_bytes()
            # Importing the live store would create/scan the default personal
            # library in a fresh CLI process. Persisted metadata already knows
            # the successful format, so this read needs no live service.
            from ..net_guard import install_rdflib_guard, replaying_contexts
            from .context import bind_services
            contexts_path = path.parent / (oid + ".contexts.json")
            contexts = json.loads(contexts_path.read_text(encoding="utf-8")) if contexts_path.exists() else {}
            class OfflineReader:
                def request(self, *args, **kwargs):
                    raise MaintenanceError("context_missing")
            install_rdflib_guard()
            with replaying_contexts(contexts), bind_services({"broker": OfflineReader()}):
                graph = _parse(data=data, format=meta["format"])
            graphs[oid] = encode_graph(graph)
            ontologies += 1
    report = dict(files=len(files), projects=projects, ontologies=ontologies,
                  statements=sum(len(g["triples"]) for g in graphs.values()))
    return files, graphs, states, report


def _source_files(root):
    files = _files(root)
    # Names, not a database parser or magic-header reader, reject old stores
    # before any byte is opened. Unknown ordinary library files stay opaque.
    for name in files:
        if (is_legacy_store(name)
                or PurePosixPath(name).parts[0] in {'sessions', 'tokens', '.aws'}):
            raise MaintenanceError('not_local_library')
    return files


@contextmanager
def _captured_local(source):
    source = Path(source)
    files = _source_files(source)
    if len(files) > MAX_FILES:
        raise MaintenanceError('archive_limit')
    with tempfile.TemporaryDirectory(prefix='semantic-studio-local-', ignore_cleanup_errors=True) as temporary:
        stage, hashes, total = Path(temporary), {}, 0
        for name, path in files.items():
            destination = resource_path(stage, name)
            destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            digest, length = hashlib.sha256(), 0
            descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, 'wb') as output, regular_file(path) as stream:
                while chunk := stream.read(1024 * 1024):
                    total += len(chunk)
                    length += len(chunk)
                    if total > MAX_ARCHIVE_BYTES:
                        raise MaintenanceError('archive_limit')
                    digest.update(chunk)
                    output.write(chunk)
                output.flush()
                os.fsync(output.fileno())
            hashes[name] = (digest.hexdigest(), length)
        # Graphs/editor text and immutable originals are all derived from the
        # same captured bytes, so a live source edit cannot split those facts.
        captured, graphs, states, report = _local(stage)
        yield captured, graphs, states, report, hashes


def inspect_local(source: Path) -> dict:
    try:
        with _captured_local(source) as captured:
            return captured[3]
    except MaintenanceError:
        raise
    except Exception:
        raise MaintenanceError('invalid_local_library') from None


def migrate_local(storage, source: Path, destination: Path | None = None, *, dry_run=False) -> dict:
    try:
        if destination is not None:
            separate(source, destination)
            destination = Path(destination)
            if destination.is_symlink() or destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
                raise MaintenanceError('destination_exists')
        with _captured_local(source) as (files, graphs, states, report, hashes):
            if dry_run:
                return {**report, 'dryRun': True}
            if destination is None:
                raise MaintenanceError('destination_required')
            require_empty(storage)
            with import_destination(destination) as root:
                (root / 'blobs').mkdir(mode=0o700)
                changes = {}
                for name, path in files.items():
                    digest, length = hashes[name]
                    target = root / 'blobs' / digest
                    if not target.exists():
                        copy_hashed(path, target, expected_hash=digest, expected_bytes=length)
                    changes['file:' + name] = {'blob': digest}
                fsync_directory(root / 'blobs')
                changes.update({'graph:' + oid: {'graph': graph} for oid, graph in graphs.items()})
                changes.update({'state:' + oid: state for oid, state in states.items()})
                changes['workspace'] = {'schema': 1}
                request_id = 'migration-' + uuid.uuid4().hex
                timestamp = datetime.now(timezone.utc).isoformat()
                with storage.write_transaction() as tx:
                    for key, payload in sorted(changes.items()):
                        # Every imported identifier must be representable in PG
                        # TEXT; opaque JSON strings remain escaped inside TEXT.
                        key.encode('utf-8')
                        value = _json(payload, 'migration')
                        tx.execute('INSERT INTO semantic_studio.resources(key,version,payload) VALUES(%s,1,%s)', (key, value))
                        tx.execute('INSERT INTO semantic_studio.audit(key,actor,timestamp,operation,request_id,after_version,after_payload) VALUES(%s,%s,%s,%s,%s,1,%s)',
                                   (key, 'migration', timestamp, 'migration', request_id, value))
                    result = {'request_id': request_id, 'versions': {key: 1 for key in changes}}
                    source_hashes = {name: {'sha256': digest, 'bytes': length} for name, (digest, length) in hashes.items()}
                    body_hash = hashlib.sha256(_json({'operation': 'migration', 'hashes': source_hashes}, 'migration').encode()).hexdigest()
                    tx.execute('INSERT INTO semantic_studio.requests VALUES(%s,%s,%s,%s)',
                               ('migration', request_id, body_hash, _json(result, 'migration')))
                with storage.read_snapshot() as tx:
                    actual = tx.execute('SELECT count(*) AS count FROM semantic_studio.resources').fetchone()['count']
                    if actual != len(changes):
                        raise MaintenanceError('import_incomplete')
                storage.ensure_owner()
        return {**report, 'dryRun': False}
    except MaintenanceError:
        raise
    except Exception:
        raise MaintenanceError('migration_failed') from None
