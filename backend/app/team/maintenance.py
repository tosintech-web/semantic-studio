"""
================================================================================
FILE: backend/app/team/maintenance.py
SUMMARY
    Explicit local-to-team migration and coherent private backup and recovery.
BASIC IDEA
    Read local originals without rewriting them. Build a fresh destination in a
    private sibling, copy immutable blobs referenced by one SQLite backup, then
    publish the completed directory. Recovery invalidates sessions and pending
    logins before the destination becomes visible. Historical blob references
    count too: an Undo after recovery still needs its original bytes.
INPUTS / INPUT SOURCES
    Operator-selected local libraries, SQLite team areas and new destinations.
EXPECTED OUTPUT
    Machine-readable counts or finite diagnostic codes; never source contents,
    credentials, overwritten destinations or partial published recoveries.
================================================================================
"""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sqlite3
import tempfile
import uuid

from rdflib import Graph

from .rdf_codec import decode_graph, encode_graph
from .repository import TeamRepository
from .commands import resource_path


class MaintenanceError(Exception):
    def __init__(self, code="maintenance_failed"):
        self.code = code
        super().__init__(code)


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
                resource_path(root, relative)
            except ValueError:
                raise MaintenanceError("invalid_source_path")
            result[relative] = path
        elif not path.is_dir():
            raise MaintenanceError("special_file_refused")
    return result


def _local(source: Path):
    files = _files(source)
    # Refuse accidentally selecting a team database or credential directory as
    # a local library. Unknown ordinary files are retained as opaque originals.
    for name in files:
        if (name.endswith((".sqlite", ".db", ".sqlite-wal", ".sqlite-shm"))
                or PurePosixPath(name).parts[0] in {"sessions", "tokens", ".aws"}):
            raise MaintenanceError("not_local_library")
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
                text = (path.parent / doc["file"]).read_text(encoding="utf-8")
                graph = Graph().parse(data=text, format="turtle", publicID=manifest["baseIri"])
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
                graph = Graph().parse(data=data, format=meta["format"])
            graphs[oid] = encode_graph(graph)
            ontologies += 1
    report = dict(files=len(files), projects=projects, ontologies=ontologies,
                  statements=sum(len(g["triples"]) for g in graphs.values()))
    return files, graphs, states, report


def inspect_local(source: Path) -> dict:
    try:
        return _local(Path(source))[3]
    except MaintenanceError:
        raise
    except Exception:
        raise MaintenanceError("invalid_local_library") from None


@contextmanager
def _destination(destination):
    destination = Path(destination).absolute()
    if destination.exists() or destination.is_symlink():
        raise MaintenanceError("destination_exists")
    if not destination.parent.is_dir():
        raise MaintenanceError("destination_parent_missing")
    stage = Path(tempfile.mkdtemp(prefix=".team-maintenance-", dir=destination.parent))
    try:
        os.chmod(stage, 0o700)
        yield stage
        # Publish a complete directory in one filesystem operation. A concurrent
        # maintenance operation targeting this path is serialized by its own
        # exclusive reservation, never by replacing a completed destination.
        reservation = destination.parent / (".team-publish-" + hashlib.sha256(destination.name.encode()).hexdigest() + ".lock")
        try:
            descriptor = os.open(reservation, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            raise MaintenanceError("destination_busy") from None
        try:
            os.close(descriptor)
            if destination.exists() or destination.is_symlink():
                raise MaintenanceError("destination_exists")
            stage.rename(destination)
        finally:
            reservation.unlink(missing_ok=True)
    except MaintenanceError:
        raise
    except Exception:
        raise MaintenanceError() from None
    finally:
        shutil.rmtree(stage, ignore_errors=True)


def migrate(source: Path, destination: Path | None = None, *, dry_run=False) -> dict:
    try:
        if destination is not None:
            _separate_destination(source, destination)
        files, graphs, states, report = _local(Path(source))
        if destination is not None and (Path(destination).exists() or Path(destination).is_symlink()):
            raise MaintenanceError("destination_exists")
        if dry_run:
            return {**report, "dryRun": True}
        if destination is None:
            raise MaintenanceError("destination_required")
        with _destination(destination) as stage:
            from .auth_store import AuthStore
            from .blobs import BlobStore
            blobs = BlobStore(stage / "blobs")
            changes = {"file:" + name: {"blob": blobs.put(path.read_bytes())} for name, path in files.items()}
            changes.update({"graph:" + oid: {"graph": graph} for oid, graph in graphs.items()})
            changes.update({"state:" + oid: state for oid, state in states.items()})
            changes["workspace"] = {"schema": 1}
            repo = TeamRepository(stage / "team.sqlite")
            repo.commit("migration", "migration-" + uuid.uuid4().hex,
                        {key: None for key in changes}, changes, "migrate")
            AuthStore(repo.path, bootstrap_subs=frozenset())
        return {**report, "dryRun": False}
    except MaintenanceError:
        raise
    except Exception:
        raise MaintenanceError("migration_failed") from None


def _blob_references(value):
    if isinstance(value, dict):
        if "blob" in value:
            digest = value["blob"]
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                raise MaintenanceError("invalid_blob_reference")
            yield digest
        if "graph" in value:
            decode_graph(value["graph"])
        for child in value.values():
            yield from _blob_references(child)
    elif isinstance(value, list):
        for child in value:
            yield from _blob_references(child)


def _copy_snapshot(source: Path, stage: Path, *, invalidate=False) -> dict:
    source = Path(source)
    database = source / "team.sqlite"
    if not database.is_file() or database.is_symlink():
        raise MaintenanceError("invalid_source")
    # Opening the live source read-only avoids initialization or migrations.
    with sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True) as live:
        target = sqlite3.connect(stage / "team.sqlite")
        try:
            live.backup(target)
        finally:
            target.close()
    repo = TeamRepository(stage / "team.sqlite")
    references = set()
    with repo.connection() as db:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise MaintenanceError("corrupt_database")
        for table, columns in (("resources", ("payload",)), ("audit", ("before_payload", "after_payload"))):
            for row in db.execute("SELECT key," + ",".join(columns) + " FROM " + table):
                if row[0].startswith("file:"):
                    resource_path(stage, row[0][5:])
                for value in row[1:]:
                    if value is not None:
                        references.update(_blob_references(json.loads(value)))
        resources = db.execute("SELECT count(*) FROM resources WHERE payload IS NOT NULL").fetchone()[0]
        if invalidate:
            db.execute("BEGIN IMMEDIATE")
            tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            for table in ("team_sessions", "team_login_attempts"):
                if table in tables:
                    db.execute("DELETE FROM " + table)
            db.commit()
    (stage / "blobs").mkdir()
    for digest in sorted(references):
        blob = source / "blobs" / digest
        if not blob.is_file() or blob.is_symlink() or (source / "blobs").is_symlink():
            raise MaintenanceError("missing_blob")
        content = blob.read_bytes()
        if hashlib.sha256(content).hexdigest() != digest:
            raise MaintenanceError("corrupt_blob")
        (stage / "blobs" / digest).write_bytes(content)
    return {"resources": resources, "blobs": len(references)}


def backup(source: Path, destination: Path) -> dict:
    _separate_destination(source, destination)
    with _destination(destination) as stage:
        return _copy_snapshot(source, stage)


def restore(source: Path, destination: Path) -> dict:
    _separate_destination(source, destination)
    with _destination(destination) as stage:
        return _copy_snapshot(source, stage, invalidate=True)


def _separate_destination(source, destination):
    if Path(destination).resolve().is_relative_to(Path(source).resolve()):
        raise MaintenanceError("destination_inside_source")
