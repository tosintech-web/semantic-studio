"""
================================================================================
FILE: backend/tests/test_team_repository.py
================================================================================
SUMMARY
    Tests durable revisions, atomic audit, deduplication and backups.
BASIC IDEA
    Exercise shared PostgreSQL writer transactions and injected SQL constraints.
INPUTS / INPUT SOURCES
    - Synthetic resources in the dedicated internal-network test database.
EXPECTED OUTPUT
    - Rejected writes leave every durable table unchanged.
================================================================================
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import threading
from types import SimpleNamespace
from pg_probe import connect
from pg_support import role_config, restart_repository
from app.team.pg_schema import describe_schema


import pytest

pytestmark = pytest.mark.team_db

from app.team.repository import (
    Conflict, InvalidRequest, MissingExpectation, RequestMismatch,
    StorageError, TeamRepository, UnsupportedSchema,
)


def commit(repo, actor, *args, **kwargs):
    def authorize(tx):
        assert tx.execute('SELECT current_user AS role').fetchone()['role'] == 'team_app'
        return SimpleNamespace(sub=actor)
    return repo.commit(actor, *args, authorize=authorize, **kwargs)


def put(repo, key="doc", expected=None, payload=None, request_id="create", actor="alice"):
    return commit(repo, actor, request_id, {key: expected},
                       {key: payload if payload is not None else {"value": 1}}, "edit")


def test_restart_defensive_copies_and_unknown_json(pg_repository):
    repo = pg_repository
    value = {"unknown": {"tags": ["日本語", None, True]}, "rdf": "_:a <urn:p> 'x'."}
    result = put(repo, payload=value)
    value["unknown"]["tags"].clear()
    repo = restart_repository(repo)
    resource = repo.read("doc")
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


def test_dependencies_and_required_expectations(pg_repository):
    repo = pg_repository
    commit(repo, "a", "initial", {"model": None, "shapes": None},
                {"model": {"n": 1}, "shapes": {"n": 1}}, "create")
    with pytest.raises(MissingExpectation) as missing:
        commit(repo, "a", "missing", {}, {"model": {}}, "edit")
    assert missing.value.keys == ["model"]
    with pytest.raises(Conflict) as conflict:
        commit(repo, "a", "stale", {"model": 1, "shapes": 2}, {"model": {}}, "edit")
    assert conflict.value.actual == {"model": 1, "shapes": 1}
    assert repo.read("model").version == 1
    assert len(repo.history("model")) == 1
    commit(repo, "a", "ok", {"model": 1, "shapes": 1}, {"model": {}}, "edit")
    assert repo.versions(["model", "shapes"]) == {"model": 2, "shapes": 1}


def test_tombstones_prevent_aba(pg_repository):
    repo = pg_repository
    put(repo)
    assert commit(repo, "alice", "delete", {"doc": 1}, {"doc": None}, "delete")["versions"] == {"doc": 2}
    assert repo.read("doc") is None
    assert repo.versions(["doc", "never"]) == {"doc": 2, "never": None}
    for version in [None, 1]:
        with pytest.raises(Conflict):
            put(repo, expected=version, request_id=f"stale-{version}")
    put(repo, expected=2, request_id="restore")
    assert repo.read("doc").version == 3
    assert [row["after_version"] for row in repo.history("doc", 1, 1)] == [2]


def test_canonical_replay_body_mismatch_and_actor_isolation(pg_repository):
    repo = pg_repository
    first = put(repo, payload={"a": 1, "b": 2})
    repo = restart_repository(repo)
    assert put(repo, payload={"b": 2, "a": 1}) == first
    assert len(repo.history("doc")) == 1
    for args in [dict(payload={"a": 2}), dict(expected=1)]:
        with pytest.raises(RequestMismatch):
            put(repo, **args)
    with pytest.raises(RequestMismatch):
        commit(repo, "alice", "create", {"doc": None}, {"doc": {"a": 1, "b": 2}}, "other")
    with pytest.raises(Conflict):
        put(repo, actor="bob", payload={"a": 1, "b": 2})
    assert put(repo, key="other", actor="bob")["versions"] == {"other": 1}
    assert repo.history("other")[0]["actor"] == "bob"


def test_shared_writer_concurrent_compare_and_swap(pg_repository):
    repo = pg_repository
    put(repo)
    barrier = threading.Barrier(2)
    def update(actor):
        other = TeamRepository(repo.storage)
        barrier.wait()
        try:
            return put(other, expected=1, actor=actor, request_id=actor, payload={"actor": actor})
        except Conflict:
            return "conflict"
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(update, ["alice", "bob"]))
    assert outcomes.count("conflict") == 1
    assert repo.read("doc").version == 2
    assert len(repo.history("doc")) == 2
    with connect(role_config()) as db:
        assert db.execute("SELECT COUNT(*) AS count FROM requests").fetchone()['count'] == 2


def test_storage_failure_rolls_back_data_audit_and_replay(pg_repository):
    repo = pg_repository
    commit(repo, "a", "seed", {"a": None, "b": None}, {"a": {}, "b": {}}, "create")
    with connect(role_config('maintenance')) as db:
        db.execute("ALTER TABLE semantic_studio.audit ADD CONSTRAINT injected_failure CHECK (key <> 'b') NOT VALID")
    with pytest.raises(StorageError):
        commit(repo, "a", "retry", {"a": 1, "b": 1}, {"a": {"x": 1}, "b": {"x": 1}}, "edit")
    assert repo.read("a").payload == {}
    assert repo.versions(["a", "b"]) == {"a": 1, "b": 1}
    assert len(repo.history("a")) == len(repo.history("b")) == 1
    with connect(role_config('maintenance')) as db:
        assert db.execute("SELECT COUNT(*) AS count FROM semantic_studio.requests").fetchone()['count'] == 1
        db.execute("ALTER TABLE semantic_studio.audit DROP CONSTRAINT injected_failure")
    commit(repo, "a", "retry", {"a": 1, "b": 1}, {"a": {"x": 1}, "b": {"x": 1}}, "edit")
    assert repo.versions(["a", "b"]) == {"a": 2, "b": 2}


@pytest.mark.parametrize("payload", [{"n": float("nan")}, {"n": float("inf")}, {"n": object()}, {1: "key"}, {"n": (1, 2)}])
def test_invalid_json_does_not_write(pg_repository, payload):
    repo = pg_repository
    with pytest.raises(InvalidRequest):
        put(repo, payload=payload)
    assert repo.read("doc") is None
    assert repo.history("doc") == []


@pytest.mark.parametrize("version", [True, False, 1.0, "1", 0, -1])
def test_versions_are_strict_positive_integers(pg_repository, version):
    repo = pg_repository
    with pytest.raises(InvalidRequest):
        put(repo, expected=version)
    assert repo.versions(["doc"]) == {"doc": None}


def test_backup_is_consistent_and_never_overwrites(pg_repository, tmp_path):
    from app.team.pg_archive import backup, restore
    from app.team.pg_storage import PgStorage
    from app.team.maintenance_io import MaintenanceError
    from test_team_maintenance import fresh_target
    repo = pg_repository
    put(repo)
    blobs = tmp_path / 'source'
    blobs.mkdir()
    archive = tmp_path / 'backup'
    reader = PgStorage(role_config('backup'), on_fatal=lambda kind: None)
    try:
        backup(reader, blobs, archive)
        before = {str(p.relative_to(archive)): p.read_bytes() for p in archive.rglob('*') if p.is_file()}
        put(repo, expected=1, request_id='later')
        expected_history = repo.history('doc')[1:]
        with pytest.raises(MaintenanceError):
            backup(reader, blobs, archive)
        assert {str(p.relative_to(archive)): p.read_bytes() for p in archive.rglob('*') if p.is_file()} == before
        with fresh_target(repo) as target:
            restore(target, archive, tmp_path / 'restored')
        from test_team_maintenance import app_repository
        with app_repository() as restored:
            assert restored.read('doc').version == 1
            assert restored.history('doc') == expected_history
    finally:
        reader.close()


@pytest.mark.parametrize("kind", ["future", "unversioned", "incomplete"])
def test_unknown_schema_is_refused_without_modification(pg_schema, kind):
    from app.team.pg_storage import PgStorage
    sql = {'future': 'UPDATE semantic_studio.team_schema SET version=99',
           'unversioned': 'DROP TABLE semantic_studio.team_schema',
           'incomplete': 'ALTER TABLE semantic_studio.resources RENAME COLUMN key TO wrong'}[kind]
    storage = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    try:
        with connect(role_config('maintenance')) as db:
            db.execute(sql)
        with storage.read_snapshot() as tx:
            before = describe_schema(tx)
        with pytest.raises(UnsupportedSchema):
            TeamRepository(storage)
        with storage.read_snapshot() as tx:
            assert describe_schema(tx) == before
    finally:
        storage.close()


def test_request_record_failure_rolls_back_entire_commit(pg_repository):
    repo = pg_repository
    with connect(role_config('maintenance')) as db:
        db.execute('ALTER TABLE semantic_studio.requests ADD CONSTRAINT injected_failure CHECK(false)')
    with pytest.raises(StorageError):
        put(repo)
    assert repo.read('doc') is None
    assert repo.history('doc') == []
    assert repo.versions(['doc']) == {'doc': None}
    with connect(role_config('maintenance')) as db:
        db.execute('ALTER TABLE semantic_studio.requests DROP CONSTRAINT injected_failure')
    assert put(repo)['versions'] == {'doc': 1}


def test_auth_extension_tables_keep_repository_usable(pg_repository):
    from app.team.auth_store import AuthStore
    repo = pg_repository
    put(repo)
    AuthStore(repo.storage, bootstrap_subs=frozenset({'owner'})).identity('owner', 'owner@example.org', 'example.org', now=0)
    assert repo.read('doc').version == 1
    assert put(repo, expected=1, request_id='next')['versions'] == {'doc': 2}


@pytest.mark.parametrize("defect", [
    "requests_missing_pk", "requests_reversed_pk", "resources_missing_pk",
    "audit_noninteger_pk", "audit_desc_pk", "requests_nullable_hash",
    "version_missing_check", "audit_missing_index", "audit_wrong_index",
    "audit_unique_index", "audit_partial_index",
])
def test_incompatible_structural_schema_is_refused_without_modification(pg_repository, defect):
    changes = {
        'requests_missing_pk': ['ALTER TABLE semantic_studio.requests DROP CONSTRAINT requests_pkey'],
        'requests_reversed_pk': ['ALTER TABLE semantic_studio.requests DROP CONSTRAINT requests_pkey', 'ALTER TABLE semantic_studio.requests ADD PRIMARY KEY(request_id,actor)'],
        'resources_missing_pk': ['ALTER TABLE semantic_studio.resources DROP CONSTRAINT resources_pkey'],
        'audit_noninteger_pk': ['ALTER TABLE semantic_studio.audit ALTER COLUMN id DROP IDENTITY', 'ALTER TABLE semantic_studio.audit ALTER COLUMN id TYPE text USING id::text'],
        # PostgreSQL primary keys have no rowid alias: missing identity is the
        # corresponding failure to allocate a durable audit integer automatically.
        'audit_desc_pk': ['ALTER TABLE semantic_studio.audit ALTER COLUMN id DROP IDENTITY'],
        'requests_nullable_hash': ['ALTER TABLE semantic_studio.requests ALTER COLUMN body_hash DROP NOT NULL'],
        'version_missing_check': ['ALTER TABLE semantic_studio.resources DROP CONSTRAINT resources_version_check'],
        'audit_missing_index': ['DROP INDEX semantic_studio.audit_key_id'],
        'audit_wrong_index': ['DROP INDEX semantic_studio.audit_key_id', 'CREATE INDEX audit_key_id ON semantic_studio.audit(id,key)'],
        'audit_unique_index': ['DROP INDEX semantic_studio.audit_key_id', 'CREATE UNIQUE INDEX audit_key_id ON semantic_studio.audit(key,id DESC)'],
        'audit_partial_index': ['DROP INDEX semantic_studio.audit_key_id', "CREATE INDEX audit_key_id ON semantic_studio.audit(key,id DESC) WHERE key <> ''"],
    }
    with connect(role_config('maintenance')) as db:
        for sql in changes[defect]:
            db.execute(sql)
    with pg_repository.storage.read_snapshot() as tx:
        before = describe_schema(tx)
    with pytest.raises(UnsupportedSchema):
        TeamRepository(pg_repository.storage)
    with pg_repository.storage.read_snapshot() as tx:
        assert describe_schema(tx) == before
