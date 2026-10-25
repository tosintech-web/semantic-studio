"""
================================================================================
FILE: backend/app/team/auth_store.py
SUMMARY
    Durable, server-owned identities, one-use login attempts and opaque sessions.
BASIC IDEA
    SQLite transactions serialize replay consumption and administrator changes.
    Bearer values are hashed before storage; authorization uses the current user
    row, never a role copied into a browser token. Google claims are verified by
    the authentication service before it calls identity().
INPUTS / INPUT SOURCES
    Verified sub/email/domain, explicit bootstrap subjects, opaque browser values
    and an injected Unix clock. The repository owns the SQLite connection policy.
EXPECTED OUTPUT
    Principals, expiring sessions and credential-free success/failure audits,
    or structured refusals without credentials.
================================================================================
"""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
import hashlib
import hmac
import json
import math
from pathlib import Path
import secrets

from .repository import TeamRepository

ABSOLUTE_SECONDS = 3600
IDLE_SECONDS = 1800
LOGIN_SECONDS = 300
ROLES = frozenset({"viewer", "editor", "admin"})

# Schema text is checked on reopen, before any extension writes occur.
_AUTH_SCHEMA = (
    """CREATE TABLE team_auth_schema (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL)""",
    """CREATE TABLE team_users (
                    sub TEXT PRIMARY KEY, email TEXT NOT NULL, domain TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('viewer','editor','admin')),
                    disabled INTEGER NOT NULL CHECK(disabled IN (0,1)),
                    version INTEGER NOT NULL CHECK(version > 0)
                )""",
    """CREATE TABLE team_sessions (
                    token_hash TEXT PRIMARY KEY, sub TEXT NOT NULL REFERENCES team_users(sub),
                    created REAL NOT NULL, last_seen REAL NOT NULL
                )""",
    """CREATE TABLE team_login_attempts (
                    state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL,
                    nonce TEXT NOT NULL, verifier TEXT NOT NULL, created REAL NOT NULL
                )""",
    """CREATE TABLE team_auth_events (
                    id INTEGER PRIMARY KEY, actor TEXT, target TEXT,
                    operation TEXT NOT NULL, timestamp REAL NOT NULL,
                    before_payload TEXT, after_payload TEXT
                )""",
    """CREATE TABLE team_access_requests (
                    actor TEXT NOT NULL, request_id TEXT NOT NULL,
                    body_hash TEXT NOT NULL, result TEXT NOT NULL,
                    PRIMARY KEY(actor, request_id)
                )""",
)


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
    return value


def _clock(now) -> float:
    if isinstance(now, bool) or not isinstance(now, (int, float)) or not math.isfinite(now) or now < 0:
        raise ValueError("Invalid authentication clock")
    return float(now)


def _principal(row) -> Principal:
    return Principal(row["sub"], row["email"], row["domain"], row["role"], bool(row["disabled"]), row["version"])


class AuthStore:
    def __init__(self, path: Path, *, bootstrap_subs: frozenset[str]):
        self.path = Path(path)
        self.bootstrap_subs = frozenset(_text(sub) for sub in bootstrap_subs)
        self.repository = TeamRepository(self.path)
        with self.repository.connection() as db:
            # Separate namespaces let auth and versioned RDF share one backup
            # without claiming that login-attempt rows are RDF mutations.
            db.execute("BEGIN IMMEDIATE")
            names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'team_*'")}
            expected = {statement.split()[2] for statement in _AUTH_SCHEMA}
            if not names:
                for statement in _AUTH_SCHEMA:
                    db.execute(statement)
                db.execute("INSERT INTO team_auth_schema VALUES(1,1)")
            else:
                if names != expected:
                    raise AuthRefused("config_unavailable")
                for statement in _AUTH_SCHEMA:
                    actual = db.execute("SELECT sql FROM sqlite_master WHERE name=?", (statement.split()[2],)).fetchone()[0]
                    if " ".join(actual.split()) != " ".join(statement.split()):
                        raise AuthRefused("config_unavailable")
                versions = list(db.execute("SELECT id,version FROM team_auth_schema"))
                if len(versions) != 1 or tuple(versions[0]) != (1, 1):
                    raise AuthRefused("config_unavailable")
            db.commit()

    @contextmanager
    def _transaction(self):
        with self.repository.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()

    @staticmethod
    def _event(db, operation: str, now: float, *, actor=None, target=None, before=None, after=None):
        db.execute(
            "INSERT INTO team_auth_events(actor,target,operation,timestamp,before_payload,after_payload) VALUES (?,?,?,?,?,?)",
            (actor, target, operation, now, json.dumps(before) if before is not None else None,
             json.dumps(after) if after is not None else None),
        )

    def record_failure(self, *, now: float) -> None:
        now = _clock(now)
        # Failed authentication has no trusted principal. Keep the durable
        # event finite rather than carrying provider claims or bearer values.
        with self._transaction() as db:
            self._event(db, "login_failed", now)

    def identity(self, sub: str, email: str, domain: str, *, now: float) -> Principal:
        sub, email, domain, now = _text(sub), _text(email), _text(domain), _clock(now)
        with self._transaction() as db:
            row = db.execute("SELECT * FROM team_users WHERE sub=?", (sub,)).fetchone()
            if row is None:
                role = "admin" if sub in self.bootstrap_subs else "viewer"
                db.execute("INSERT INTO team_users VALUES(?,?,?,?,0,1)", (sub, email, domain, role))
                self._event(db, "identity_created", now, actor=sub, target=sub, after={"role": role})
            elif row["disabled"]:
                raise AuthRefused("disabled")
            elif row["email"] != email or row["domain"] != domain:
                db.execute("UPDATE team_users SET email=?, domain=?, version=version+1 WHERE sub=?", (email, domain, sub))
                self._event(db, "identity_updated", now, actor=sub, target=sub)
            return _principal(db.execute("SELECT * FROM team_users WHERE sub=?", (sub,)).fetchone())

    def begin_login(self, *, now: float) -> LoginAttempt:
        now = _clock(now)
        attempt = LoginAttempt(*(secrets.token_urlsafe(32) for _ in range(4)))
        with self._transaction() as db:
            db.execute("DELETE FROM team_login_attempts WHERE created<=?", (now - LOGIN_SECONDS,))
            if db.execute("SELECT count(*) FROM team_login_attempts").fetchone()[0] >= 1000:
                raise AuthRefused("auth_failed")
            db.execute("INSERT INTO team_login_attempts VALUES(?,?,?,?,?)", (_hash(attempt.state), _hash(attempt.browser_cookie), attempt.nonce, attempt.code_verifier, now))
        return attempt

    def consume_login(self, state: str, browser_cookie: str, *, now: float) -> LoginState:
        now = _clock(now)
        state_hash, browser_hash = _hash(_text(state)), _hash(_text(browser_cookie))
        with self._transaction() as db:
            row = db.execute("SELECT * FROM team_login_attempts WHERE state_hash=?", (state_hash,)).fetchone()
            if row is None or not hmac.compare_digest(row["browser_hash"], browser_hash) or not row["created"] <= now < row["created"] + LOGIN_SECONDS:
                raise AuthRefused()
            db.execute("DELETE FROM team_login_attempts WHERE state_hash=?", (state_hash,))
            return LoginState(row["nonce"], row["verifier"])

    def create_session(self, sub: str, *, now: float) -> str:
        sub, now = _text(sub), _clock(now)
        token = secrets.token_urlsafe(32)
        with self._transaction() as db:
            row = db.execute("SELECT * FROM team_users WHERE sub=?", (sub,)).fetchone()
            if row is None or row["disabled"]:
                raise AuthRefused()
            db.execute("DELETE FROM team_sessions WHERE created<=? OR last_seen<=?", (now - ABSOLUTE_SECONDS, now - IDLE_SECONDS))
            db.execute("INSERT INTO team_sessions VALUES(?,?,?,?)", (_hash(token), sub, now, now))
            self._event(db, "login", now, actor=sub, target=sub)
        return token

    def authenticate(self, token: str, *, now: float) -> SessionView:
        now = _clock(now)
        token_hash = _hash(_text(token))
        with self._transaction() as db:
            row = db.execute("SELECT * FROM team_sessions WHERE token_hash=?", (token_hash,)).fetchone()
            if row is None or not row["last_seen"] <= now < min(row["created"] + ABSOLUTE_SECONDS, row["last_seen"] + IDLE_SECONDS):
                raise AuthRefused("auth_expired")
            user = db.execute("SELECT * FROM team_users WHERE sub=?", (row["sub"],)).fetchone()
            if user is None or user["disabled"]:
                raise AuthRefused("disabled")
            db.execute("UPDATE team_sessions SET last_seen=? WHERE token_hash=?", (now, token_hash))
            # The browser can fetch this derived value after authenticating but
            # cannot derive it from the stored hash or a foreign-page response.
            csrf = hmac.new(token.encode(), b"semantic-studio:csrf:v1", hashlib.sha256).hexdigest()
            return SessionView(_principal(user), csrf, row["created"] + ABSOLUTE_SECONDS)

    def revoke(self, token: str, *, now: float) -> None:
        now = _clock(now)
        token_hash = _hash(_text(token))
        with self._transaction() as db:
            row = db.execute("SELECT sub FROM team_sessions WHERE token_hash=?", (token_hash,)).fetchone()
            if row:
                db.execute("DELETE FROM team_sessions WHERE token_hash=?", (token_hash,))
                self._event(db, "logout", now, actor=row["sub"], target=row["sub"])

    def users(self) -> list[Principal]:
        with self.repository.connection() as db:
            return [_principal(row) for row in db.execute("SELECT * FROM team_users ORDER BY sub")]

    def events(self, *, offset: int = 0, limit: int = 50) -> list[dict]:
        if type(offset) is not int or offset < 0 or type(limit) is not int or not 1 <= limit <= 100:
            raise ValueError("Invalid event page")
        with self.repository.connection() as db:
            return [dict(row) for row in db.execute("SELECT * FROM team_auth_events ORDER BY id DESC LIMIT ? OFFSET ?", (limit, offset))]

    def change_access(self, actor: str, target: str, *, expected_version: int, role: str,
                      disabled: bool, request_id: str, now: float) -> Principal:
        actor, target, request_id, now = _text(actor), _text(target), _text(request_id, maximum=128), _clock(now)
        if role not in ROLES or type(disabled) is not bool or type(expected_version) is not int or expected_version < 1:
            raise AuthRefused()
        fingerprint = _hash(json.dumps([target, expected_version, role, disabled], separators=(",", ":")))
        with self._transaction() as db:
            admin = db.execute("SELECT * FROM team_users WHERE sub=?", (actor,)).fetchone()
            if admin is None or admin["disabled"] or admin["role"] != "admin":
                raise AuthRefused("forbidden")
            replay = db.execute("SELECT * FROM team_access_requests WHERE actor=? AND request_id=?", (actor, request_id)).fetchone()
            if replay:
                if not hmac.compare_digest(replay["body_hash"], fingerprint):
                    raise AuthRefused("request_mismatch")
                return Principal(**json.loads(replay["result"]))
            row = db.execute("SELECT * FROM team_users WHERE sub=?", (target,)).fetchone()
            if row is None:
                raise AuthRefused()
            if row["version"] != expected_version:
                raise AccessConflict(row["version"])
            if row["role"] == "admin" and not row["disabled"] and (role != "admin" or disabled):
                count = db.execute("SELECT count(*) FROM team_users WHERE role='admin' AND disabled=0").fetchone()[0]
                if count <= 1:
                    raise AuthRefused("last_admin")
            before = _principal(row)
            db.execute("UPDATE team_users SET role=?,disabled=?,version=version+1 WHERE sub=?", (role, int(disabled), target))
            if disabled:
                db.execute("DELETE FROM team_sessions WHERE sub=?", (target,))
            result = _principal(db.execute("SELECT * FROM team_users WHERE sub=?", (target,)).fetchone())
            self._event(db, "access_changed", now, actor=actor, target=target, before=asdict(before), after=asdict(result))
            db.execute("INSERT INTO team_access_requests VALUES(?,?,?,?)", (actor, request_id, fingerprint, json.dumps(asdict(result))))
            return result
