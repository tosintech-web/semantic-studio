"""
================================================================================
FILE: backend/app/team/repository.py
================================================================================
SUMMARY
    Stores team resources, monotonic revisions, audit and request replay in SQLite.
BASIC IDEA
    Every operation opens its own connection. BEGIN IMMEDIATE serializes writers
    before comparing all dependency versions; data, audit and replay commit
    together. Deleted rows retain their generation so recreation cannot hide an
    intervening change. Structural schema checks refuse incompatible databases;
    JSON snapshots preserve unknown application fields.
INPUTS / INPUT SOURCES
    - A private database path and validated actor/request/resource JSON values.
EXPECTED OUTPUT
    - Detached resources, structured failures, durable history and SQLite backups.
================================================================================
"""
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import sqlite3
from typing import Iterable


class RepositoryError(Exception):
    """Domain failure carrying a stable code and structured facts."""
    def __init__(self, code: str, **details):
        self.code = code
        self.details = details
        super().__init__(code)


class InvalidRequest(RepositoryError):
    def __init__(self, field: str):
        self.field = field
        super().__init__("invalid_request", field=field)


class MissingExpectation(RepositoryError):
    def __init__(self, keys: list[str]):
        self.keys = keys
        super().__init__("missing_expectation", keys=keys)


class Conflict(RepositoryError):
    def __init__(self, expected: dict, actual: dict):
        self.expected = expected
        self.actual = actual
        super().__init__("revision_conflict", expected=expected, actual=actual)


class RequestMismatch(RepositoryError):
    def __init__(self, actor: str, request_id: str):
        self.actor = actor
        self.request_id = request_id
        super().__init__("request_mismatch", actor=actor, request_id=request_id)


class UnsupportedSchema(RepositoryError):
    def __init__(self, version: int):
        self.version = version
        super().__init__("unsupported_schema", version=version)


class StorageError(RepositoryError):
    def __init__(self, sqlite_code: int | None):
        self.sqlite_code = sqlite_code
        super().__init__("storage_error", sqlite_code=sqlite_code)


@dataclass(frozen=True)
class Resource:
    key: str
    version: int
    payload: dict


_SCHEMA = (
    "CREATE TABLE resources (key TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK(version > 0), payload TEXT)",
    "CREATE TABLE audit (id INTEGER PRIMARY KEY, key TEXT NOT NULL, actor TEXT NOT NULL, timestamp TEXT NOT NULL, operation TEXT NOT NULL, request_id TEXT NOT NULL, before_version INTEGER, after_version INTEGER NOT NULL, before_payload TEXT, after_payload TEXT)",
    "CREATE INDEX audit_key_id ON audit(key, id DESC)",
    "CREATE TABLE requests (actor TEXT NOT NULL, request_id TEXT NOT NULL, body_hash TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(actor, request_id))",
)
_COLUMNS = {
    "resources": {"key", "version", "payload"},
    "audit": {"id", "key", "actor", "timestamp", "operation", "request_id", "before_version", "after_version", "before_payload", "after_payload"},
    "requests": {"actor", "request_id", "body_hash", "result"},
}


def _text(value, field):
    if not isinstance(value, str) or not value:
        raise InvalidRequest(field)


def _json(value, field):
    # json.dumps otherwise silently coerces numeric keys and tuples, losing the
    # caller's original structure. Reject those rather than normalizing them.
    def validate(item, ancestors):
        if item is None or type(item) in (str, bool, int):
            return
        if type(item) is float:
            if not math.isfinite(item):
                raise InvalidRequest(field)
            return
        if type(item) not in (dict, list) or id(item) in ancestors:
            raise InvalidRequest(field)
        ancestors.add(id(item))
        if type(item) is dict:
            for key, child in item.items():
                if type(key) is not str:
                    raise InvalidRequest(field)
                validate(child, ancestors)
        else:
            for child in item:
                validate(child, ancestors)
        ancestors.remove(id(item))
    try:
        validate(value, set())
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False)
    except (RecursionError, ValueError, TypeError, OverflowError) as exc:
        raise InvalidRequest(field) from exc


class TeamRepository:
    def __init__(self, path: Path):
        self.path = Path(path)
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            version = db.execute("PRAGMA user_version").fetchone()[0]
            tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
            if version == 0 and not tables:
                for statement in _SCHEMA:
                    db.execute(statement)
                db.execute("PRAGMA user_version=1")
            elif version != 1 or not _COLUMNS.keys() <= tables:
                raise UnsupportedSchema(version)
            else:
                self._validate_schema(db, version)
            db.commit()

    @staticmethod
    def _validate_schema(db, version):
        # Column names alone miss the uniqueness that makes ON CONFLICT and
        # actor-scoped replay safe. Compare SQLite's parsed structures against
        # this version's fresh schema, without changing the inspected database.
        with sqlite3.connect(":memory:") as reference:
            for statement in _SCHEMA:
                reference.execute(statement)
            for table in _COLUMNS:
                actual_columns = [tuple(row) for row in db.execute(f"PRAGMA table_xinfo({table})")]
                known_columns = list(reference.execute(f"PRAGMA table_xinfo({table})"))
                if actual_columns != known_columns:
                    raise UnsupportedSchema(version)
                actual_indexes = {row[1]: tuple(row)[2:] for row in db.execute(f"PRAGMA index_list({table})")}
                known_indexes = {row[1]: tuple(row)[2:] for row in reference.execute(f"PRAGMA index_list({table})")}
                if actual_indexes != known_indexes:
                    raise UnsupportedSchema(version)
                for name in known_indexes:
                    # Index names come from the known schema, never user SQL.
                    actual = [tuple(row) for row in db.execute(f"PRAGMA index_xinfo({name})")]
                    known = list(reference.execute(f"PRAGMA index_xinfo({name})"))
                    if actual != known:
                        raise UnsupportedSchema(version)
            # SQLite exposes no parsed CHECK expressions. Version 1 owns this
            # DDL, so require its known definition (ignoring whitespace/case),
            # rather than accepting a lookalike CHECK hidden inside a comment.
            actual_sql = db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='resources'").fetchone()[0]
            known_sql = reference.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='resources'").fetchone()[0]
            if "".join(actual_sql.split()).casefold() != "".join(known_sql.split()).casefold():
                raise UnsupportedSchema(version)

    @contextmanager
    def connection(self):
        """Use this connection policy for later auth tables in the same database.

        Callers explicitly begin/commit transactions; failures always roll back.
        Extensions must keep user_version=1 and version their own schema.
        """
        db = None
        try:
            db = sqlite3.connect(self.path, timeout=30, isolation_level=None)
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA foreign_keys=ON")
            yield db
        except sqlite3.Error as exc:
            raise StorageError(getattr(exc, "sqlite_errorcode", None)) from exc
        finally:
            if db is not None:
                if db.in_transaction:
                    db.rollback()
                db.close()

    def read(self, key: str) -> Resource | None:
        _text(key, "key")
        with self.connection() as db:
            row = db.execute("SELECT version, payload FROM resources WHERE key=?", (key,)).fetchone()
        if row is None or row["payload"] is None:
            return None
        return Resource(key, row["version"], json.loads(row["payload"]))

    def versions(self, keys: Iterable[str]) -> dict[str, int | None]:
        keys = list(keys)
        for key in keys:
            _text(key, "key")
        with self.connection() as db:
            # Multiple lookups share a read snapshot, including tombstones.
            db.execute("BEGIN")
            return self._versions(db, keys)

    @staticmethod
    def _versions(db, keys):
        result = {}
        for key in keys:
            row = db.execute("SELECT version FROM resources WHERE key=?", (key,)).fetchone()
            result[key] = row[0] if row is not None else None
        return result

    def snapshot(self) -> tuple[dict, dict]:
        """Read payloads and tombstone versions in one SQLite snapshot."""
        with self.connection() as db:
            rows = db.execute("SELECT key,version,payload FROM resources").fetchall()
        return ({row["key"]: json.loads(row["payload"]) for row in rows if row["payload"] is not None},
                {row["key"]: row["version"] for row in rows})

    def read_request(self, actor: str, request_id: str, identity: dict) -> dict | None:
        digest = hashlib.sha256(_json(identity, "identity").encode("utf-8")).hexdigest()
        with self.connection() as db:
            replay = db.execute("SELECT body_hash,result FROM requests WHERE actor=? AND request_id=?", (actor, request_id)).fetchone()
        if replay is None:
            return None
        if replay["body_hash"] != digest:
            raise RequestMismatch(actor, request_id)
        return json.loads(replay["result"])

    @staticmethod
    def _access_request_exists(db, actor, request_id):
        # Auth is an optional schema extension, but request identities are a
        # single actor-scoped namespace across every shared update family.
        exists = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='team_access_requests'").fetchone()
        return bool(exists and db.execute("SELECT 1 FROM team_access_requests WHERE actor=? AND request_id=?", (actor, request_id)).fetchone())

    def commit(self, actor: str, request_id: str, expected: dict[str, int | None],
               changes: dict[str, dict | None], operation: str, *, identity: dict | None = None,
               response: dict | None = None) -> dict:
        for field, value in (("actor", actor), ("request_id", request_id), ("operation", operation)):
            _text(value, field)
        if type(expected) is not dict or type(changes) is not dict:
            raise InvalidRequest("expected_changes")
        for key, version in expected.items():
            _text(key, "key")
            if version is not None and (type(version) is not int or version < 1 or version > 9223372036854775807):
                raise InvalidRequest("expected")
        for key, payload in changes.items():
            _text(key, "key")
            if payload is not None and type(payload) is not dict:
                raise InvalidRequest("changes")
        missing = sorted(changes.keys() - expected.keys())
        if missing:
            raise MissingExpectation(missing)
        # Snapshot both caller-owned mappings before entering the transaction.
        body = _json({"expected": expected, "changes": changes, "operation": operation}, "request")
        snapshot = json.loads(body)
        expected = snapshot["expected"]
        payloads = {key: None if payload is None else _json(payload, "changes")
                    for key, payload in snapshot["changes"].items()}
        digest = hashlib.sha256((body if identity is None else _json(identity, "identity")).encode("utf-8")).hexdigest()
        response = None if response is None else json.loads(_json(response, "response"))
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            if self._access_request_exists(db, actor, request_id):
                raise RequestMismatch(actor, request_id)
            replay = db.execute("SELECT body_hash, result FROM requests WHERE actor=? AND request_id=?", (actor, request_id)).fetchone()
            if replay is not None:
                if replay["body_hash"] != digest:
                    raise RequestMismatch(actor, request_id)
                return json.loads(replay["result"])
            actual = self._versions(db, expected)
            if actual != expected:
                raise Conflict(expected, actual)
            timestamp = datetime.now(timezone.utc).isoformat()
            versions = {}
            for key in sorted(payloads):
                previous = db.execute("SELECT payload FROM resources WHERE key=?", (key,)).fetchone()
                before = previous[0] if previous is not None else None
                version = (actual[key] or 0) + 1
                if version > 9223372036854775807:
                    raise InvalidRequest("version_exhausted")
                payload = payloads[key]
                db.execute("INSERT INTO resources(key, version, payload) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET version=excluded.version, payload=excluded.payload", (key, version, payload))
                db.execute("INSERT INTO audit(key,actor,timestamp,operation,request_id,before_version,after_version,before_payload,after_payload) VALUES(?,?,?,?,?,?,?,?,?)", (key, actor, timestamp, operation, request_id, actual[key], version, before, payload))
                versions[key] = version
            result = {"request_id": request_id, "versions": versions}
            if response is not None:
                result["response"] = response
            db.execute("INSERT INTO requests(actor,request_id,body_hash,result) VALUES(?,?,?,?)", (actor, request_id, digest, _json(result, "result")))
            db.commit()
            return result

    def history(self, key: str, offset=0, limit=50) -> list[dict]:
        _text(key, "key")
        if type(offset) is not int or offset < 0 or type(limit) is not int or limit < 0 or max(offset, limit) > 9223372036854775807:
            raise InvalidRequest("pagination")
        with self.connection() as db:
            rows = db.execute("SELECT * FROM audit WHERE key=? ORDER BY id DESC LIMIT ? OFFSET ?", (key, limit, offset)).fetchall()
        result = []
        for row in rows:
            entry = dict(row)
            entry["diff"] = {"before": json.loads(entry.pop("before_payload") or "null"), "after": json.loads(entry.pop("after_payload") or "null")}
            result.append(entry)
        return result

    def backup(self, path: Path):
        path = Path(path)
        # Exclusive creation prevents accidentally replacing a backup or the live
        # database. SQLite's backup API takes the consistent source snapshot.
        with path.open("xb"):
            pass
        try:
            with self.connection() as source:
                target = sqlite3.connect(path)
                try:
                    source.backup(target)
                finally:
                    target.close()
        except BaseException:
            path.unlink(missing_ok=True)
            raise
