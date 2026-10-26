"""
================================================================================
FILE: backend/app/team/auth_store.py
SUMMARY
    Durable, server-owned identities, one-use login attempts and opaque sessions.
BASIC IDEA
    PostgreSQL's shared writer gate serializes replay and administrator changes.
    Bearer values are hashed before storage; authorization uses the current user
    row, never a role copied into a browser token. Google claims are verified by
    the authentication service before it calls identity().
INPUTS / INPUT SOURCES
    Verified sub/email/domain, explicit bootstrap subjects, opaque browser values
    and an injected Unix clock. PgStorage owns the sole writer and bounded read snapshots.
EXPECTED OUTPUT
    Principals, expiring sessions and credential-free success/failure audits,
    or structured refusals without credentials.
================================================================================
"""
from __future__ import annotations

from contextlib import contextmanager
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
import hashlib
import hmac
import json
import math
import time
import re
import secrets

from .repository import TeamRepository, _json
from .pg_storage import PgStorage, WriteTx

ABSOLUTE_SECONDS = 3600
IDLE_SECONDS = 1800
LOGIN_SECONDS = 300
ROLES = frozenset({"viewer", "editor", "admin"})

class AuthRefused(Exception):
    """The HTTP boundary translates this finite code, not exception text."""

    def __init__(self, code: str = "auth_failed"):
        self.code = code
        super().__init__(code)


class AccessConflict(AuthRefused):
    def __init__(self, current_version: int):
        self.current_version = current_version
        super().__init__("revision_conflict")


@dataclass(frozen=True)
class Principal:
    sub: str
    email: str
    domain: str
    role: str
    disabled: bool
    version: int


@dataclass(frozen=True)
class LoginAttempt:
    state: str = field(repr=False)
    browser_cookie: str = field(repr=False)
    nonce: str = field(repr=False)
    code_verifier: str = field(repr=False)


@dataclass(frozen=True)
class LoginState:
    nonce: str = field(repr=False)
    code_verifier: str = field(repr=False)


@dataclass(frozen=True)
class SessionView:
    principal: Principal
    csrf_token: str = field(repr=False)
    expires_at: float


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _text(value, *, maximum=1024) -> str:
    if not isinstance(value, str) or not value or len(value) > maximum or "\x00" in value:
        raise AuthRefused()
    try:
        value.encode("utf-8")
    except UnicodeError:
        raise AuthRefused() from None
    return value


def _clock(now) -> float:
    now = now() if callable(now) else now
    if isinstance(now, bool) or not isinstance(now, (int, float)) or not math.isfinite(now) or now < 0:
        raise ValueError("Invalid authentication clock")
    return float(now)


def _principal(row) -> Principal:
    return Principal(row["sub"], row["email"], row["domain"], row["role"], bool(row["disabled"]), row["version"])


@dataclass(frozen=True)
class RequestAuth:
    token_hash: str = field(repr=False)
    operation: str


class AuthStore:
    def __init__(self, storage: PgStorage, *, bootstrap_subs: frozenset[str]):
        self.storage = storage
        self.bootstrap_subs = frozenset(_text(sub) for sub in bootstrap_subs)
        self.repository = TeamRepository(storage)

    @contextmanager
    def _transaction(self):
        with self.storage.write_transaction() as tx:
            yield tx

    @staticmethod
    def _event(tx, operation: str, now: float, *, actor=None, target=None, before=None, after=None):
        tx.execute(
            "INSERT INTO team_auth_events(actor,target,operation,timestamp,before_payload,after_payload) VALUES (%s,%s,%s,%s,%s,%s)",
            (actor, target, operation, now, _json(before, "auth_event") if before is not None else None,
             _json(after, "auth_event") if after is not None else None),
        )

    def record_failure(self, *, now) -> None:
        with self._transaction() as tx:
            self._event(tx, "login_failed", _clock(now))

    def identity(self, sub: str, email: str, domain: str, *, now) -> Principal:
        sub, email, domain = _text(sub), _text(email), _text(domain)
        with self._transaction() as tx:
            now = _clock(now)
            row = tx.execute("SELECT * FROM team_users WHERE sub=%s", (sub,)).fetchone()
            if row is None:
                role = "admin" if sub in self.bootstrap_subs else "viewer"
                tx.execute("INSERT INTO team_users VALUES(%s,%s,%s,%s,false,1)", (sub, email, domain, role))
                self._event(tx, "identity_created", now, actor=sub, target=sub, after={"role": role})
            elif row["disabled"]:
                raise AuthRefused("disabled")
            elif row["email"] != email or row["domain"] != domain:
                tx.execute("UPDATE team_users SET email=%s,domain=%s,version=version+1 WHERE sub=%s", (email, domain, sub))
                self._event(tx, "identity_updated", now, actor=sub, target=sub)
            return _principal(tx.execute("SELECT * FROM team_users WHERE sub=%s", (sub,)).fetchone())

    def begin_login(self, *, now) -> LoginAttempt:
        attempt = LoginAttempt(*(secrets.token_urlsafe(32) for _ in range(4)))
        with self._transaction() as tx:
            now = _clock(now)
            tx.execute("DELETE FROM team_login_attempts WHERE created<=%s", (now - LOGIN_SECONDS,))
            if tx.execute("SELECT count(*) AS count FROM team_login_attempts").fetchone()["count"] >= 1000:
                raise AuthRefused()
            tx.execute("INSERT INTO team_login_attempts VALUES(%s,%s,%s,%s,%s)", (_hash(attempt.state), _hash(attempt.browser_cookie), attempt.nonce, attempt.code_verifier, now))
        return attempt

    def consume_login(self, state: str, browser_cookie: str, *, now) -> LoginState:
        state_hash, browser_hash = _hash(_text(state)), _hash(_text(browser_cookie))
        with self._transaction() as tx:
            now = _clock(now)
            row = tx.execute("SELECT * FROM team_login_attempts WHERE state_hash=%s", (state_hash,)).fetchone()
            if row is None or not hmac.compare_digest(row["browser_hash"], browser_hash) or not row["created"] <= now < row["created"] + LOGIN_SECONDS:
                raise AuthRefused()
            tx.execute("DELETE FROM team_login_attempts WHERE state_hash=%s", (state_hash,))
            return LoginState(row["nonce"], row["verifier"])

    def create_session(self, sub: str, *, now) -> str:
        sub = _text(sub)
        token = secrets.token_urlsafe(32)
        with self._transaction() as tx:
            now = _clock(now)
            row = tx.execute("SELECT * FROM team_users WHERE sub=%s", (sub,)).fetchone()
            if row is None or row["disabled"]:
                raise AuthRefused()
            tx.execute("DELETE FROM team_sessions WHERE created<=%s OR last_seen<=%s", (now - ABSOLUTE_SECONDS, now - IDLE_SECONDS))
            tx.execute("INSERT INTO team_sessions VALUES(%s,%s,%s,%s)", (_hash(token), sub, now, now))
            self._event(tx, "login", now, actor=sub, target=sub)
        return token

    @staticmethod
    def bind_request(token: str, operation: str) -> RequestAuth:
        from .permissions import allows
        if not allows('admin', operation):
            raise AuthRefused('forbidden')
        return RequestAuth(_hash(_text(token)), operation)

    @staticmethod
    def _session_user(tx, token_hash: str, now: float):
        row = tx.execute("SELECT * FROM team_sessions WHERE token_hash=%s", (token_hash,)).fetchone()
        if row is None or not row["last_seen"] <= now < min(row["created"] + ABSOLUTE_SECONDS, row["last_seen"] + IDLE_SECONDS):
            raise AuthRefused("auth_expired")
        user = tx.execute("SELECT * FROM team_users WHERE sub=%s", (row["sub"],)).fetchone()
        if user is None or user["disabled"]:
            raise AuthRefused("disabled")
        return _principal(user), row

    def require_current_principal(self, tx: WriteTx, *, token_hash: str, operation: str,
                                  now: float | Callable[[],float] = time.time) -> Principal:
        from .permissions import allows
        if not isinstance(tx, WriteTx) or not re.fullmatch(r'[0-9a-f]{64}', _text(token_hash, maximum=64)):
            raise AuthRefused()
        principal, _ = self._session_user(tx, token_hash, _clock(now))
        if not allows(principal.role, operation):
            raise AuthRefused('forbidden')
        return principal

    def authenticate(self, token: str, *, now: float | Callable[[], float], touch: bool = True) -> SessionView:
        token_hash = _hash(_text(token))
        context = self._transaction() if touch else self.storage.read_snapshot()
        with context as tx:
            # Sampling follows the actual mutex AND advisory gate, not arrival
            # time. Polls use a short read only and cannot extend idle lifetime.
            now = _clock(now)
            principal, row = self._session_user(tx, token_hash, now)
            if touch:
                tx.execute("UPDATE team_sessions SET last_seen=%s WHERE token_hash=%s", (now, token_hash))
            csrf = hmac.new(token.encode(), b"semantic-studio:csrf:v1", hashlib.sha256).hexdigest()
            return SessionView(principal, csrf, row["created"] + ABSOLUTE_SECONDS)

    def revoke(self, token: str, *, now) -> None:
        token_hash = _hash(_text(token))
        with self._transaction() as tx:
            now = _clock(now)
            row = tx.execute("SELECT sub FROM team_sessions WHERE token_hash=%s", (token_hash,)).fetchone()
            if row:
                tx.execute("DELETE FROM team_sessions WHERE token_hash=%s", (token_hash,))
                self._event(tx, "logout", now, actor=row["sub"], target=row["sub"])

    def users(self) -> list[Principal]:
        with self.storage.read_snapshot() as tx:
            return [_principal(row) for row in tx.execute("SELECT * FROM team_users ORDER BY sub").fetchall()]

    def events(self, *, offset: int = 0, limit: int = 50) -> list[dict]:
        if type(offset) is not int or not 0 <= offset <= 9223372036854775807 or type(limit) is not int or not 1 <= limit <= 100:
            raise ValueError("Invalid event page")
        with self.storage.read_snapshot() as tx:
            return [dict(row) for row in tx.execute("SELECT * FROM team_auth_events ORDER BY id DESC LIMIT %s OFFSET %s", (limit, offset)).fetchall()]

    def change_access(self, actor: str, target: str, *, expected_version: int, role: str,
                      disabled: bool, request_id: str, now, authorize: Callable[[WriteTx],Principal],
                      identity: dict | None = None) -> Principal:
        actor, target, request_id = _text(actor), _text(target), _text(request_id, maximum=128)
        if (not isinstance(role, str) or role not in ROLES or type(disabled) is not bool
                or type(expected_version) is not int or not 1 <= expected_version <= 9223372036854775807):
            raise AuthRefused()
        fingerprint = _hash(_json([target, expected_version, role, disabled] if identity is None else identity, 'access_request'))
        with self._transaction() as tx:
            now = _clock(now)
            principal = authorize(tx)
            if getattr(principal, 'sub', None) != actor:
                raise AuthRefused('forbidden')
            admin = tx.execute("SELECT * FROM team_users WHERE sub=%s", (actor,)).fetchone()
            if admin is None or admin["disabled"] or admin["role"] != "admin":
                raise AuthRefused("forbidden")
            if tx.execute("SELECT 1 FROM requests WHERE actor=%s AND request_id=%s", (actor, request_id)).fetchone():
                raise AuthRefused("request_mismatch")
            replay = tx.execute("SELECT * FROM team_access_requests WHERE actor=%s AND request_id=%s", (actor, request_id)).fetchone()
            if replay:
                if not hmac.compare_digest(replay["body_hash"], fingerprint):
                    raise AuthRefused("request_mismatch")
                return Principal(**json.loads(replay["result"]))
            row = tx.execute("SELECT * FROM team_users WHERE sub=%s", (target,)).fetchone()
            if row is None:
                raise AuthRefused()
            if row["version"] != expected_version:
                raise AccessConflict(row["version"])
            if row["role"] == "admin" and not row["disabled"] and (role != "admin" or disabled):
                count = tx.execute("SELECT count(*) AS count FROM team_users WHERE role='admin' AND disabled=false").fetchone()['count']
                if count <= 1:
                    raise AuthRefused("last_admin")
            if row['version'] == 9223372036854775807:
                raise AuthRefused('config_unavailable')
            before = _principal(row)
            tx.execute("UPDATE team_users SET role=%s,disabled=%s,version=version+1 WHERE sub=%s", (role, disabled, target))
            if disabled:
                tx.execute("DELETE FROM team_sessions WHERE sub=%s", (target,))
            result = _principal(tx.execute("SELECT * FROM team_users WHERE sub=%s", (target,)).fetchone())
            self._event(tx, "access_changed", now, actor=actor, target=target, before=asdict(before), after=asdict(result))
            tx.execute("INSERT INTO team_access_requests VALUES(%s,%s,%s,%s)", (actor, request_id, fingerprint, _json(asdict(result), 'access_result')))
        return result
