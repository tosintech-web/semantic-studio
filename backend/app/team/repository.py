"""
================================================================================
FILE: backend/app/team/repository.py
SUMMARY
    PostgreSQL resources, monotonic revisions, audit and actor-scoped replay.
BASIC IDEA
    Read consistent snapshots and serialize shared updates on the storage writer
    gate. Reauthorize before replay or CAS; commit data/audit/response together.
    Deleted resources retain versions. Canonical JSON TEXT preserves opaque data.
INPUTS / INPUT SOURCES
    Shared PgStorage, validated requests and a trusted in-transaction authorizer.
EXPECTED OUTPUT
    Detached resources, finite domain/storage failures and durable operation groups.
================================================================================
"""
from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
from typing import TYPE_CHECKING

from .pg_storage import PgStorage, ReadTx, WriteTx, StorageError

if TYPE_CHECKING:
    from .auth_store import Principal


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


@dataclass(frozen=True)
class Resource:
    key: str
    version: int
    payload: dict


def _text(value, field):
    if not isinstance(value, str) or not value or "\0" in value:
        raise InvalidRequest(field)
    try:
        value.encode("utf-8")
    except UnicodeError:
        raise InvalidRequest(field) from None


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


@dataclass(frozen=True)
class OperationGroup:
    actor: str
    request_id: str
    operation: str
    entries: tuple[dict, ...]
    versions: dict[str, int | None]
    request_result: dict | None


class TeamRepository:
    def __init__(self, storage: PgStorage):
        if not isinstance(storage, PgStorage):
            raise TypeError("PgStorage required")
        self.storage = storage
        # Construction can validate but never create/repair a schema. The
        # maintenance job is the only initializer, even for a new database.
        from .pg_schema import validate_schema
        validate_schema(storage)

    def read(self, key: str) -> Resource | None:
        _text(key, "key")
        with self.storage.read_snapshot() as tx:
            row = tx.execute("SELECT version,payload FROM resources WHERE key=%s", (key,)).fetchone()
        if row is None or row["payload"] is None:
            return None
        return Resource(key, row["version"], json.loads(row["payload"]))

    def versions(self, keys: Iterable[str]) -> dict[str, int | None]:
        keys = list(keys)
        for key in keys:
            _text(key, "key")
        with self.storage.read_snapshot() as tx:
            return self._versions(tx, keys)

    @staticmethod
    def _versions(tx, keys):
        result = {}
        for key in keys:
            row = tx.execute("SELECT version FROM resources WHERE key=%s", (key,)).fetchone()
            result[key] = row["version"] if row is not None else None
        return result

    def snapshot(self, *, tx=None) -> tuple[dict, dict]:
        def read(tx):
            rows = tx.execute("SELECT key,version,payload FROM resources").fetchall()
            return ({row["key"]: json.loads(row["payload"]) for row in rows if row["payload"] is not None},
                    {row["key"]: row["version"] for row in rows})
        if tx is not None:
            return read(tx)
        with self.storage.read_snapshot() as snapshot:
            return read(snapshot)

    @staticmethod
    def _authorize(tx, actor, authorize):
        principal = authorize(tx)
        if getattr(principal, "sub", None) != actor:
            raise InvalidRequest("authorization_actor")
        return principal

    def lookup_request(self, actor: str, request_id: str, body_hash: str, *, tx: ReadTx | WriteTx):
        for field, value in (("actor", actor), ("request_id", request_id), ("body_hash", body_hash)):
            _text(value, field)
        # Access-management requests and RDF updates share actor/request IDs.
        # Both checks occur after the common gate for every replay decision.
        if tx.execute("SELECT 1 FROM team_access_requests WHERE actor=%s AND request_id=%s", (actor, request_id)).fetchone():
            raise RequestMismatch(actor, request_id)
        row = tx.execute("SELECT body_hash,result FROM requests WHERE actor=%s AND request_id=%s", (actor, request_id)).fetchone()
        if row is None:
            return None
        if row["body_hash"] != body_hash:
            raise RequestMismatch(actor, request_id)
        return json.loads(row["result"])

    def read_request(self, actor: str, request_id: str, identity: dict, *,
                     authorize: Callable[[WriteTx], Principal]) -> dict | None:
        digest = hashlib.sha256(_json(identity, "identity").encode("utf-8")).hexdigest()
        with self.storage.write_transaction() as tx:
            self._authorize(tx, actor, authorize)
            return self.lookup_request(actor, request_id, digest, tx=tx)

    def commit(self, actor: str, request_id: str, expected: dict[str, int | None],
               changes: dict[str, dict | None], operation: str, *,
               authorize: Callable[[WriteTx], Principal], identity: dict | None = None,
               response: dict | None = None) -> dict:
        for field, value in (("actor", actor), ("request_id", request_id), ("operation", operation)):
            _text(value, field)
        if type(expected) is not dict or type(changes) is not dict:
            raise InvalidRequest("expected_changes")
        for key, version in expected.items():
            _text(key, "key")
            if version is not None and (type(version) is not int or not 1 <= version <= 9223372036854775807):
                raise InvalidRequest("expected")
        for key, payload in changes.items():
            _text(key, "key")
            if payload is not None and type(payload) is not dict:
                raise InvalidRequest("changes")
        missing = sorted(changes.keys() - expected.keys())
        if missing:
            raise MissingExpectation(missing)
        body = _json({"expected": expected, "changes": changes, "operation": operation}, "request")
        snapshot = json.loads(body)
        expected = snapshot["expected"]
        payloads = {key: None if payload is None else _json(payload, "changes")
                    for key, payload in snapshot["changes"].items()}
        digest = hashlib.sha256((body if identity is None else _json(identity, "identity")).encode("utf-8")).hexdigest()
        response = None if response is None else json.loads(_json(response, "response"))
        with self.storage.write_transaction() as tx:
            self._authorize(tx, actor, authorize)
            replay = self.lookup_request(actor, request_id, digest, tx=tx)
            if replay is not None:
                return replay
            actual = self._versions(tx, expected)
            if actual != expected:
                raise Conflict(expected, actual)
            timestamp = datetime.now(timezone.utc).isoformat()
            versions = {}
            for key in sorted(payloads):
                previous = tx.execute("SELECT payload FROM resources WHERE key=%s", (key,)).fetchone()
                before = previous["payload"] if previous is not None else None
                version = (actual[key] or 0) + 1
                if version > 9223372036854775807:
                    raise InvalidRequest("version_exhausted")
                payload = payloads[key]
                tx.execute("INSERT INTO resources(key,version,payload) VALUES(%s,%s,%s) ON CONFLICT(key) DO UPDATE SET version=excluded.version,payload=excluded.payload", (key, version, payload))
                tx.execute("INSERT INTO audit(key,actor,timestamp,operation,request_id,before_version,after_version,before_payload,after_payload) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                           (key, actor, timestamp, operation, request_id, actual[key], version, before, payload))
                versions[key] = version
            result = {"request_id": request_id, "versions": versions}
            if response is not None:
                result["response"] = response
            tx.execute("INSERT INTO requests(actor,request_id,body_hash,result) VALUES(%s,%s,%s,%s)",
                       (actor, request_id, digest, _json(result, "result")))
        # Leaving the context is the COMMIT boundary. Never publish success
        # from inside it: a lost COMMIT response must remain an unknown result.
        return result

    def history(self, key: str, offset=0, limit=50) -> list[dict]:
        _text(key, "key")
        if type(offset) is not int or offset < 0 or type(limit) is not int or limit < 0 or max(offset, limit) > 9223372036854775807:
            raise InvalidRequest("pagination")
        with self.storage.read_snapshot() as tx:
            rows = tx.execute("SELECT * FROM audit WHERE key=%s ORDER BY id DESC LIMIT %s OFFSET %s", (key, limit, offset)).fetchall()
        result = []
        for row in rows:
            entry = dict(row)
            entry["diff"] = {"before": json.loads(entry.pop("before_payload") or "null"), "after": json.loads(entry.pop("after_payload") or "null")}
            result.append(entry)
        return result

    def _operation_group(self, tx, actor, request_id):
        rows = tx.execute("SELECT * FROM audit WHERE actor=%s AND request_id=%s ORDER BY id", (actor, request_id)).fetchall()
        versions = self._versions(tx, (row["key"] for row in rows))
        return [{**row, "current_version": versions[row["key"]]} for row in rows]

    def read_operation_group(self, actor: str, request_id: str, *, tx=None) -> list[dict]:
        _text(actor, "actor")
        _text(request_id, "request_id")
        if tx is not None:
            return self._operation_group(tx, actor, request_id)
        with self.storage.read_snapshot() as snapshot:
            return self._operation_group(snapshot, actor, request_id)

    def latest_operation(self, key: str, *, tx=None) -> OperationGroup | None:
        _text(key, "key")
        def read(snapshot):
            latest = snapshot.execute("SELECT actor,request_id,operation FROM audit WHERE key=%s ORDER BY id DESC LIMIT 1", (key,)).fetchone()
            if latest is None:
                return None
            actor, request_id = latest["actor"], latest["request_id"]
            entries = self._operation_group(snapshot, actor, request_id)
            request = snapshot.execute("SELECT result FROM requests WHERE actor=%s AND request_id=%s", (actor, request_id)).fetchone()
            return OperationGroup(actor, request_id, latest["operation"], tuple(entries),
                                  {row["key"]: row["current_version"] for row in entries},
                                  json.loads(request["result"]) if request else None)
        if tx is not None:
            return read(tx)
        with self.storage.read_snapshot() as snapshot:
            return read(snapshot)
