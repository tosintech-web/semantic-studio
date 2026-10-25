"""
================================================================================
FILE: backend/tests/test_team_repository.py
================================================================================
SUMMARY
    Tests durable revisions, atomic audit, deduplication and backups.
BASIC IDEA
    Exercise independent SQLite connections and a failing audit trigger.
INPUTS / INPUT SOURCES
    - Synthetic resources in temporary databases.
EXPECTED OUTPUT
    - Rejected writes leave every durable table unchanged.
================================================================================
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import sqlite3
import threading

import pytest

from app.team.repository import (
    Conflict, InvalidRequest, MissingExpectation, RequestMismatch,
    StorageError, TeamRepository, UnsupportedSchema,
)


def put(repo, key="doc", expected=None, payload=None, request_id="create", actor="alice"):
    return repo.commit(actor, request_id, {key: expected},
                       {key: payload if payload is not None else {"value": 1}}, "edit")


def test_restart_defensive_copies_and_unknown_json(tmp_path):
    path = tmp_path / "team.db"
    repo = TeamRepository(path)
    value = {"unknown": {"tags": ["日本語", None, True]}, "rdf": "_:a <urn:p> 'x'."}
    result = put(repo, payload=value)
    value["unknown"]["tags"].clear()
    resource = TeamRepository(path).read("doc")
    assert (resource.key, resource.version) == ("doc", 1)
    assert resource.payload["unknown"]["tags"] == ["日本語", None, True]
    resource.payload.clear()
    result["versions"].clear()
    history = repo.history("doc")
    assert len(history) == 1
    entry = history[0]
    assert (entry["actor"], entry["request_id"], entry["operation"]) == ("alice", "create", "edit")
    assert (entry["before_version"], entry["after_version"]) == (None, 1)
    assert entry["diff"]["after"] == repo.read("doc").payload
    assert datetime.fromisoformat(entry["timestamp"]).utcoffset().total_seconds() == 0
    entry["diff"]["after"].clear()
    assert repo.history("doc")[0]["diff"]["after"]["unknown"]["tags"] == ["日本語", None, True]


def test_dependencies_and_required_expectations(tmp_path):
    repo = TeamRepository(tmp_path / "team.db")
    repo.commit("a", "initial", {"model": None, "shapes": None},
                {"model": {"n": 1}, "shapes": {"n": 1}}, "create")
    with pytest.raises(MissingExpectation) as missing:
        repo.commit("a", "missing", {}, {"model": {}}, "edit")
    assert missing.value.keys == ["model"]
    with pytest.raises(Conflict) as conflict:
        repo.commit("a", "stale", {"model": 1, "shapes": 2}, {"model": {}}, "edit")
    assert conflict.value.actual == {"model": 1, "shapes": 1}
    assert repo.read("model").version == 1
    assert len(repo.history("model")) == 1
    repo.commit("a", "ok", {"model": 1, "shapes": 1}, {"model": {}}, "edit")
    assert repo.versions(["model", "shapes"]) == {"model": 2, "shapes": 1}


def test_tombstones_prevent_aba(tmp_path):
    repo = TeamRepository(tmp_path / "team.db")
    put(repo)
    assert repo.commit("alice", "delete", {"doc": 1}, {"doc": None}, "delete")["versions"] == {"doc": 2}
    assert repo.read("doc") is None
    assert repo.versions(["doc", "never"]) == {"doc": 2, "never": None}
    for version in [None, 1]:
        with pytest.raises(Conflict):
            put(repo, expected=version, request_id=f"stale-{version}")
    put(repo, expected=2, request_id="restore")
    assert repo.read("doc").version == 3
    assert [row["after_version"] for row in repo.history("doc", 1, 1)] == [2]


def test_canonical_replay_body_mismatch_and_actor_isolation(tmp_path):
    path = tmp_path / "team.db"
    repo = TeamRepository(path)
    first = put(repo, payload={"a": 1, "b": 2})
    assert put(TeamRepository(path), payload={"b": 2, "a": 1}) == first
    assert len(repo.history("doc")) == 1
    for args in [dict(payload={"a": 2}), dict(expected=1)]:
        with pytest.raises(RequestMismatch):
            put(repo, **args)
    with pytest.raises(RequestMismatch):
        repo.commit("alice", "create", {"doc": None}, {"doc": {"a": 1, "b": 2}}, "other")
    with pytest.raises(Conflict):
        put(repo, actor="bob", payload={"a": 1, "b": 2})
    assert put(repo, key="other", actor="bob")["versions"] == {"other": 1}
    assert repo.history("other")[0]["actor"] == "bob"


def test_separate_connections_concurrent_compare_and_swap(tmp_path):
    path = tmp_path / "team.db"
    put(TeamRepository(path))
    barrier = threading.Barrier(2)
    def update(actor):
        repo = TeamRepository(path)
        barrier.wait()
        try:
            return put(repo, expected=1, actor=actor, request_id=actor, payload={"actor": actor})
        except Conflict:
            return "conflict"
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(update, ["alice", "bob"]))
    assert outcomes.count("conflict") == 1
    repo = TeamRepository(path)
    assert repo.read("doc").version == 2
    assert len(repo.history("doc")) == 2
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT COUNT(*) FROM requests").fetchone()[0] == 2


def test_sqlite_failure_rolls_back_data_audit_and_replay(tmp_path):
    path = tmp_path / "team.db"
    repo = TeamRepository(path)
    repo.commit("a", "seed", {"a": None, "b": None}, {"a": {}, "b": {}}, "create")
    with sqlite3.connect(path) as db:
        db.execute("CREATE TRIGGER fail_audit BEFORE INSERT ON audit WHEN NEW.key = 'b' BEGIN SELECT RAISE(ABORT, 'injected'); END")
    with pytest.raises(StorageError):
        repo.commit("a", "retry", {"a": 1, "b": 1}, {"a": {"x": 1}, "b": {"x": 1}}, "edit")
    assert repo.read("a").payload == {}
    assert repo.versions(["a", "b"]) == {"a": 1, "b": 1}
    assert len(repo.history("a")) == len(repo.history("b")) == 1
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT COUNT(*) FROM requests").fetchone()[0] == 1
        db.execute("DROP TRIGGER fail_audit")
    repo.commit("a", "retry", {"a": 1, "b": 1}, {"a": {"x": 1}, "b": {"x": 1}}, "edit")
    assert repo.versions(["a", "b"]) == {"a": 2, "b": 2}


@pytest.mark.parametrize("payload", [{"n": float("nan")}, {"n": float("inf")}, {"n": object()}, {1: "key"}, {"n": (1, 2)}])
def test_invalid_json_does_not_write(tmp_path, payload):
    repo = TeamRepository(tmp_path / "team.db")
    with pytest.raises(InvalidRequest):
        put(repo, payload=payload)
    assert repo.read("doc") is None
    assert repo.history("doc") == []


@pytest.mark.parametrize("version", [True, False, 1.0, "1", 0, -1])
def test_versions_are_strict_positive_integers(tmp_path, version):
    repo = TeamRepository(tmp_path / "team.db")
    with pytest.raises(InvalidRequest):
        put(repo, expected=version)
    assert repo.versions(["doc"]) == {"doc": None}


def test_backup_is_consistent_and_never_overwrites(tmp_path):
    repo = TeamRepository(tmp_path / "team.db")
    put(repo)
    path = tmp_path / "backup.db"
    repo.backup(path)
    put(repo, expected=1, request_id="later")
    restored = TeamRepository(path)
    assert restored.read("doc").version == 1
    assert restored.history("doc") == repo.history("doc")[1:]
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    before = path.read_bytes()
    with pytest.raises(FileExistsError):
        repo.backup(path)
    assert path.read_bytes() == before


@pytest.mark.parametrize("kind", ["future", "unversioned", "incomplete"])
def test_unknown_schema_is_refused_without_modification(tmp_path, kind):
    path = tmp_path / "unknown.db"
    with sqlite3.connect(path) as db:
        if kind == "future":
            db.execute("PRAGMA user_version=99")
        elif kind == "unversioned":
            db.execute("CREATE TABLE unrelated(x)")
        else:
            db.execute("PRAGMA user_version=1")
            db.execute("CREATE TABLE resources(wrong)")
    before = path.read_bytes()
    with pytest.raises(UnsupportedSchema):
        TeamRepository(path)
    assert path.read_bytes() == before


def test_request_record_failure_rolls_back_entire_commit(tmp_path):
    path = tmp_path / "team.db"
    repo = TeamRepository(path)
    with sqlite3.connect(path) as db:
        db.execute("CREATE TRIGGER fail_request BEFORE INSERT ON requests BEGIN SELECT RAISE(ABORT, 'injected'); END")
    with pytest.raises(StorageError):
        put(repo)
    assert repo.read("doc") is None
    assert repo.history("doc") == []
    assert repo.versions(["doc"]) == {"doc": None}
    with sqlite3.connect(path) as db:
        db.execute("DROP TRIGGER fail_request")
    assert put(repo)["versions"] == {"doc": 1}


def test_auth_extension_tables_keep_repository_usable(tmp_path):
    path = tmp_path / "team.db"
    put(TeamRepository(path))
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE team_users(sub TEXT PRIMARY KEY)")
    repo = TeamRepository(path)
    assert repo.read("doc").version == 1
    assert put(repo, expected=1, request_id="next")["versions"] == {"doc": 2}


@pytest.mark.parametrize("defect", [
    "requests_missing_pk", "requests_reversed_pk", "resources_missing_pk",
    "audit_noninteger_pk", "audit_desc_pk", "requests_nullable_hash",
    "version_missing_check", "audit_missing_index", "audit_wrong_index",
    "audit_unique_index", "audit_partial_index",
])
def test_incompatible_structural_schema_is_refused_without_modification(tmp_path, defect):
    path = tmp_path / "malformed.db"
    TeamRepository(path)
    with sqlite3.connect(path) as db:
        if defect.startswith("requests_"):
            db.execute("DROP TABLE requests")
            pk = ", PRIMARY KEY(actor, request_id)"
            body_hash = "body_hash TEXT NOT NULL"
            if defect == "requests_missing_pk":
                pk = ""
            elif defect == "requests_reversed_pk":
                pk = ", PRIMARY KEY(request_id, actor)"
            else:
                body_hash = "body_hash TEXT"
            db.execute(f"CREATE TABLE requests(actor TEXT NOT NULL, request_id TEXT NOT NULL, {body_hash}, result TEXT NOT NULL{pk})")
        elif defect.startswith("resources_") or defect == "version_missing_check":
            db.execute("DROP TABLE resources")
            pk = "" if defect == "resources_missing_pk" else " PRIMARY KEY"
            check = "" if defect == "version_missing_check" else " CHECK(version > 0)"
            db.execute(f"CREATE TABLE resources(key TEXT{pk}, version INTEGER NOT NULL{check}, payload TEXT)")
        elif defect in ("audit_noninteger_pk", "audit_desc_pk"):
            db.execute("DROP TABLE audit")
            pk = "TEXT PRIMARY KEY" if defect == "audit_noninteger_pk" else "INTEGER PRIMARY KEY DESC"
            db.execute(f"CREATE TABLE audit(id {pk}, key TEXT NOT NULL, actor TEXT NOT NULL, timestamp TEXT NOT NULL, operation TEXT NOT NULL, request_id TEXT NOT NULL, before_version INTEGER, after_version INTEGER NOT NULL, before_payload TEXT, after_payload TEXT)")
            db.execute("CREATE INDEX audit_key_id ON audit(key,id DESC)")
        else:
            db.execute("DROP INDEX audit_key_id")
            if defect == "audit_wrong_index":
                db.execute("CREATE INDEX audit_key_id ON audit(id,key)")
            elif defect == "audit_unique_index":
                db.execute("CREATE UNIQUE INDEX audit_key_id ON audit(key,id DESC)")
            elif defect == "audit_partial_index":
                db.execute("CREATE INDEX audit_key_id ON audit(key,id DESC) WHERE key != ''")
    before = path.read_bytes()
    with pytest.raises(UnsupportedSchema):
        TeamRepository(path)
    assert path.read_bytes() == before
