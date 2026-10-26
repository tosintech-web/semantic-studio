"""
================================================================================
FILE: backend/tests/test_team_maintenance.py
SUMMARY
    Exercises explicit, non-destructive migration and coherent team recovery.
BASIC IDEA
    Real private SQLite files and synthetic RDF expose missing blobs, overwrite
    attempts, and restored sessions that must never become usable again.
INPUTS / INPUT SOURCES
    Temporary local libraries, team repositories and synthetic identities.
EXPECTED OUTPUT
    Original bytes stay unchanged; backups preserve history and revoke sessions.
================================================================================
"""
import hashlib
import base64
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import pytest
from rdflib.compare import isomorphic
from rdflib import Graph

from app.team.auth_store import AuthRefused, AuthStore
from app.team.maintenance import MaintenanceError, backup, inspect_local, migrate, restore
from app.team.rdf_codec import decode_graph
from app.team.repository import TeamRepository


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


def test_dry_run_is_read_only_and_migration_retains_rdf_and_unknown_files(tmp_path):
    source = tmp_path / "local"
    pid, text = saved_local(source)
    before = bytes_of(source)
    report = inspect_local(source)
    assert report["projects"] == 1 and report["statements"] == 2
    destination = tmp_path / "team"
    assert migrate(source, destination, dry_run=True)["dryRun"] is True
    assert not destination.exists()
    assert bytes_of(source) == before
    result = migrate(source, destination)
    assert result["projects"] == 1
    repo = TeamRepository(destination / "team.sqlite")
    graph = decode_graph(repo.read(f"graph:{pid}-model").payload["graph"])
    assert isomorphic(graph, Graph().parse(data=text, format="turtle"))
    opaque = repo.read("file:unknown.bin").payload["blob"]
    assert (destination / "blobs" / opaque).read_bytes() == before["unknown.bin"]
    assert repo.history(f"graph:{pid}-model")[0]["actor"] == "migration"
    assert bytes_of(source) == before


def populated_team(root):
    root.mkdir()
    repo = TeamRepository(root / "team.sqlite")
    content = b"synthetic blob"
    digest = hashlib.sha256(content).hexdigest()
    (root / "blobs").mkdir()
    (root / "blobs" / digest).write_bytes(content)
    repo.commit("owner", "seed", {"file:sample": None, "workspace": None},
                {"file:sample": {"blob": digest}, "workspace": {"schema": 1}}, "create")
    auth = AuthStore(repo.path, bootstrap_subs=frozenset({"owner"}))
    auth.identity("owner", "owner@example.org", "example.org", now=100)
    token = auth.create_session("owner", now=101)
    attempt = auth.begin_login(now=101)
    return repo, token, attempt, digest


def test_backup_and_restore_preserve_audit_but_invalidate_all_sessions(tmp_path):
    source = tmp_path / "live"
    repo, token, attempt, digest = populated_team(source)
    archive = tmp_path / "backup"
    backup(source, archive)
    # A later live edit must not leak into the captured generation.
    repo.commit("owner", "later", {"workspace": 1}, {"workspace": {"schema": 1, "later": True}}, "edit")
    destination = tmp_path / "restored"
    restore(archive, destination)
    recovered = TeamRepository(destination / "team.sqlite")
    assert recovered.read("workspace").version == 1
    assert recovered.history("file:sample") == repo.history("file:sample")
    assert (destination / "blobs" / digest).read_bytes() == b"synthetic blob"
    auth = AuthStore(recovered.path, bootstrap_subs=frozenset({"owner"}))
    with pytest.raises(AuthRefused):
        auth.authenticate(token, now=102)
    with pytest.raises(AuthRefused):
        auth.consume_login(attempt.state, attempt.browser_cookie, now=102)
    # Recovery does not log out the running source.
    assert AuthStore(repo.path, bootstrap_subs=frozenset({"owner"})).authenticate(token, now=102).principal.sub == "owner"


@pytest.mark.parametrize("operation", [backup, restore])
def test_missing_or_corrupt_blob_refuses_recovery_without_publishing_destination(tmp_path, operation):
    source = tmp_path / "live"
    _, _, _, digest = populated_team(source)
    (source / "blobs" / digest).write_bytes(b"corrupt")
    destination = tmp_path / "copy"
    with pytest.raises(MaintenanceError):
        operation(source, destination)
    assert not destination.exists()


@pytest.mark.parametrize("operation", [migrate, backup, restore])
def test_existing_destination_is_never_overwritten(tmp_path, operation):
    source = tmp_path / "source"
    if operation is migrate:
        saved_local(source)
    else:
        populated_team(source)
    destination = tmp_path / "existing"
    destination.mkdir()
    (destination / "keep").write_bytes(b"keep")
    with pytest.raises(MaintenanceError):
        operation(source, destination)
    assert bytes_of(destination) == {"keep": b"keep"}


def test_symlinks_cannot_import_files_outside_local_directory(tmp_path):
    source = tmp_path / "local"
    source.mkdir()
    (tmp_path / "outside").write_text("private synthetic value")
    (source / "link").symlink_to(tmp_path / "outside")
    with pytest.raises(MaintenanceError):
        inspect_local(source)


def test_backup_retains_blobs_referenced_only_by_undo_history(tmp_path):
    source = tmp_path / "live"
    repo, _, _, digest = populated_team(source)
    repo.commit("owner", "delete", {"file:sample": 1}, {"file:sample": None}, "delete")
    destination = tmp_path / "backup"
    backup(source, destination)
    assert (destination / "blobs" / digest).read_bytes() == b"synthetic blob"


def test_migration_failure_leaves_source_and_destination_untouched(tmp_path, monkeypatch):
    source = tmp_path / "local"
    saved_local(source)
    before = bytes_of(source)
    def refuse(*args, **kwargs):
        raise OSError("synthetic disk failure")
    monkeypatch.setattr(TeamRepository, "commit", refuse)
    destination = tmp_path / "team"
    with pytest.raises(MaintenanceError):
        migrate(source, destination)
    assert not destination.exists()
    assert bytes_of(source) == before


def test_live_backup_keeps_multi_resource_transaction_and_history_together(tmp_path):
    source = tmp_path / "live"
    repo, _, _, _ = populated_team(source)
    repo.commit("owner", "pair", {"a": None, "b": None}, {"a": {"n": 0}, "b": {"n": 0}}, "pair")
    def writer():
        for value in range(1, 25):
            repo.commit("owner", f"pair-{value}", {"a": value, "b": value},
                        {"a": {"n": value}, "b": {"n": value}}, "pair")
    with ThreadPoolExecutor(max_workers=1) as pool:
        writing = pool.submit(writer)
        destination = tmp_path / "backup"
        backup(source, destination)
        writing.result()
    recovered = TeamRepository(destination / "team.sqlite")
    assert recovered.read("a").payload == recovered.read("b").payload
    assert recovered.read("a").version == recovered.read("b").version
    assert len(recovered.history("a")) == recovered.read("a").version


def test_cli_returns_only_finite_diagnostic_without_source_value(tmp_path):
    script = Path(__file__).resolve().parents[2] / "scripts" / "team_workspace.py"
    private_source = tmp_path / "synthetic-private-source"
    result = subprocess.run([sys.executable, str(script), "inspect-local", str(private_source)], capture_output=True, text=True)
    assert result.returncode == 2
    assert json.loads(result.stdout) == {"ok": False, "code": "invalid_source"}
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
    source = tmp_path / "selected"
    library(source)
    unselected = tmp_path / "unselected"
    script = Path(__file__).resolve().parents[2] / "scripts" / "team_workspace.py"
    result = subprocess.run([sys.executable, str(script), "inspect-local", str(source)],
                            env={**os.environ, "SEMANTIC_STUDIO_MODE": "local", "SEMANTIC_STUDIO_DATA_DIR": str(unselected)},
                            capture_output=True, text=True)
    assert result.returncode == 0, result.stdout
    assert not unselected.exists()


def test_saved_jsonld_contexts_are_replayed_without_new_network_access(tmp_path, monkeypatch):
    source = tmp_path / "local"
    oid = library(source, jsonld=True)
    from app.network_broker import broker
    def no_new_connection(*args, **kwargs):
        pytest.fail("migration attempted new network access")
    monkeypatch.setattr(broker, "request", no_new_connection)
    report = inspect_local(source)
    assert report["ontologies"] == 1 and report["statements"] == 1
    destination = tmp_path / "team"
    migrate(source, destination)
    graph = decode_graph(TeamRepository(destination / "team.sqlite").read("graph:" + oid).payload["graph"])
    assert len(graph) == 1


def test_nested_destination_never_changes_original_source(tmp_path):
    source = tmp_path / "local"
    saved_local(source)
    before = bytes_of(source)
    with pytest.raises(MaintenanceError):
        migrate(source, source / "new-team")
    assert bytes_of(source) == before


def test_invalid_cli_arguments_are_finite_json_without_echoing_values(tmp_path):
    script = Path(__file__).resolve().parents[2] / "scripts" / "team_workspace.py"
    result = subprocess.run([sys.executable, str(script), "--unknown-private-value"], capture_output=True, text=True)
    assert result.returncode == 2
    assert json.loads(result.stdout) == {"ok": False, "code": "invalid_arguments"}
    assert "unknown-private-value" not in result.stdout + result.stderr


@pytest.mark.parametrize("relative", ["C:escape", "C:/escape", "nested/C:/escape", "file.txt:stream"])
def test_team_file_keys_reject_windows_drive_and_stream_interpretations(tmp_path, relative):
    from app.team.commands import resource_path
    with pytest.raises(ValueError):
        resource_path(tmp_path, relative)


@pytest.mark.skipif(os.name == "nt", reason="These ambiguous POSIX file names cannot be created on Windows")
def test_migration_refuses_nonportable_posix_file_name_before_destination(tmp_path):
    source = tmp_path / "local"
    source.mkdir()
    (source / "C:escape").write_bytes(b"synthetic")
    before = bytes_of(source)
    with pytest.raises(MaintenanceError):
        migrate(source, tmp_path / "team")
    assert bytes_of(source) == before
    assert not (tmp_path / "team").exists()


def test_restore_refuses_nonportable_file_key_before_publishing_destination(tmp_path):
    source = tmp_path / "team"
    repo, _, _, digest = populated_team(source)
    repo.commit("owner", "invalid-portability", {"file:C:/escape": None},
                {"file:C:/escape": {"blob": digest}}, "synthetic-invalid-key")
    destination = tmp_path / "restore"
    with pytest.raises(MaintenanceError):
        restore(source, destination)
    assert not destination.exists()
