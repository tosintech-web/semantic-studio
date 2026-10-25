"""
================================================================================
FILE: backend/tests/test_team_auth_store.py
SUMMARY
    Exercise durable login/session identity and administrator access changes.
BASIC IDEA
    Real SQLite files, explicit clocks and two store instances expose replay,
    revocation, restart and concurrent last-administrator failures.
INPUTS / INPUT SOURCES
    Synthetic verified identities and temporary directories only.
EXPECTED OUTPUT
    No first-user privilege, no stored bearer secrets, exact expiry and audit.
================================================================================
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sqlite3

import pytest

from app.team.auth_store import AccessConflict, AuthRefused, AuthStore


@pytest.fixture
def auth(tmp_path):
    return AuthStore(tmp_path / "team.sqlite", bootstrap_subs=frozenset({"owner"}))


def test_first_login_does_not_bootstrap_an_unlisted_identity(auth):
    first = auth.identity("member", "member@example.org", "example.org", now=100)
    assert (first.sub, first.role, first.version) == ("member", "viewer", 1)
    owner = auth.identity("owner", "owner@example.org", "example.org", now=101)
    assert owner.role == "admin"


def test_sub_survives_email_change_and_demotion_is_not_rebootstrapped(auth):
    auth.identity("owner", "old@example.org", "example.org", now=100)
    auth.identity("second", "second@example.org", "example.org", now=100)
    auth.change_access("owner", "second", expected_version=1, role="admin", disabled=False, request_id="add-admin", now=101)
    auth.change_access("second", "owner", expected_version=1, role="editor", disabled=False, request_id="demote", now=102)
    principal = auth.identity("owner", "new@example.org", "example.org", now=103)
    assert (principal.sub, principal.email, principal.role) == ("owner", "new@example.org", "editor")


def test_cookie_and_nonce_state_are_bound_and_consumed_once(auth):
    attempt = auth.begin_login(now=100)
    assert len(attempt.state) >= 32 and len(attempt.browser_cookie) >= 32
    with pytest.raises(AuthRefused):
        auth.consume_login(attempt.state, "different-browser", now=101)
    consumed = auth.consume_login(attempt.state, attempt.browser_cookie, now=102)
    assert consumed.nonce == attempt.nonce
    assert consumed.code_verifier == attempt.code_verifier
    with pytest.raises(AuthRefused):
        auth.consume_login(attempt.state, attempt.browser_cookie, now=103)


def test_login_expires_at_exactly_five_minutes(auth):
    attempt = auth.begin_login(now=100)
    with pytest.raises(AuthRefused):
        auth.consume_login(attempt.state, attempt.browser_cookie, now=400)


def test_login_state_replay_is_atomic_across_instances(auth):
    attempt = auth.begin_login(now=100)
    other = AuthStore(auth.path, bootstrap_subs=frozenset({"owner"}))
    def consume(store):
        try:
            store.consume_login(attempt.state, attempt.browser_cookie, now=101)
            return "accepted"
        except AuthRefused:
            return "refused"
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(consume, [auth, other])) == ["accepted", "refused"]


def test_session_restarts_and_idle_extends_but_absolute_expiry_does_not(auth):
    auth.identity("member", "member@example.org", "example.org", now=100)
    token = auth.create_session("member", now=100)
    other = AuthStore(auth.path, bootstrap_subs=frozenset({"owner"}))
    view = other.authenticate(token, now=1899)
    assert view.principal.sub == "member"
    assert view.expires_at == 3700
    assert other.authenticate(token, now=3698).principal.role == "viewer"
    with pytest.raises(AuthRefused):
        other.authenticate(token, now=3700)


def test_idle_expiry_at_thirty_minutes_and_logout(auth):
    auth.identity("member", "member@example.org", "example.org", now=100)
    token = auth.create_session("member", now=100)
    with pytest.raises(AuthRefused):
        auth.authenticate(token, now=1900)
    token = auth.create_session("member", now=2000)
    auth.revoke(token, now=2001)
    auth.revoke(token, now=2002)
    with pytest.raises(AuthRefused):
        auth.authenticate(token, now=2003)


def test_session_latest_role_and_disable_are_checked_on_each_request(auth):
    auth.identity("owner", "owner@example.org", "example.org", now=100)
    auth.identity("member", "member@example.org", "example.org", now=100)
    token = auth.create_session("member", now=100)
    auth.change_access("owner", "member", expected_version=1, role="editor", disabled=False, request_id="promote", now=101)
    assert auth.authenticate(token, now=102).principal.role == "editor"
    auth.change_access("owner", "member", expected_version=2, role="editor", disabled=True, request_id="stop", now=103)
    with pytest.raises(AuthRefused):
        auth.authenticate(token, now=104)
    # Re-enabling an account must not resurrect its old browser sessions.
    auth.change_access("owner", "member", expected_version=3, role="viewer", disabled=False, request_id="enable", now=105)
    with pytest.raises(AuthRefused):
        auth.authenticate(token, now=106)


def test_session_requires_a_registered_enabled_identity(auth):
    with pytest.raises(AuthRefused):
        auth.create_session("absent", now=100)


def test_last_active_admin_and_non_admin_access_change_are_refused(auth):
    auth.identity("owner", "owner@example.org", "example.org", now=100)
    auth.identity("member", "member@example.org", "example.org", now=100)
    with pytest.raises(AuthRefused) as refusal:
        auth.change_access("owner", "owner", expected_version=1, role="viewer", disabled=False, request_id="last", now=101)
    assert refusal.value.code == "last_admin"
    with pytest.raises(AuthRefused):
        auth.change_access("member", "member", expected_version=1, role="admin", disabled=False, request_id="escalate", now=101)
    assert auth.users()[0].sub in {"member", "owner"}
    assert next(p for p in auth.users() if p.sub == "member").role == "viewer"


def test_access_update_optimism_and_replay_do_not_duplicate_audit(auth):
    auth.identity("owner", "owner@example.org", "example.org", now=100)
    auth.identity("member", "member@example.org", "example.org", now=100)
    first = auth.change_access("owner", "member", expected_version=1, role="editor", disabled=False, request_id="once", now=101)
    assert first.version == 2
    assert auth.change_access("owner", "member", expected_version=1, role="editor", disabled=False, request_id="once", now=102) == first
    with pytest.raises(AccessConflict):
        auth.change_access("owner", "member", expected_version=1, role="admin", disabled=False, request_id="stale", now=103)
    with pytest.raises(AuthRefused) as refusal:
        auth.change_access("owner", "member", expected_version=1, role="admin", disabled=False, request_id="once", now=104)
    assert refusal.value.code == "request_mismatch"
    assert len([e for e in auth.events() if e["operation"] == "access_changed"]) == 1


def test_simultaneous_admin_demotions_cannot_remove_every_admin(auth):
    auth.identity("owner", "owner@example.org", "example.org", now=100)
    auth.identity("second", "second@example.org", "example.org", now=100)
    auth.change_access("owner", "second", expected_version=1, role="admin", disabled=False, request_id="second", now=101)
    other = AuthStore(auth.path, bootstrap_subs=frozenset({"owner"}))
    def demote(args):
        store, sub, version = args
        try:
            store.change_access(sub, sub, expected_version=version, role="viewer", disabled=False, request_id="self", now=102)
            return "accepted"
        except AuthRefused:
            return "refused"
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(demote, [(auth, "owner", 1), (other, "second", 2)])) == ["accepted", "refused"]
    assert sum(p.role == "admin" and not p.disabled for p in auth.users()) == 1


def test_database_and_repr_do_not_contain_bearer_session_or_browser_state(auth):
    auth.identity("owner", "owner@example.org", "example.org", now=100)
    attempt = auth.begin_login(now=100)
    token = auth.create_session("owner", now=100)
    session = auth.authenticate(token, now=101)
    with sqlite3.connect(auth.path) as db:
        dump = "\n".join(db.iterdump())
    for secret in (token, attempt.state, attempt.browser_cookie):
        assert secret not in dump
        assert secret not in repr(attempt)
        assert secret not in repr(session)


@pytest.mark.parametrize("role,disabled,version", [("superuser", False, 1), ("admin", 1, 1), ("admin", False, True)])
def test_invalid_access_arguments_never_change_user(auth, role, disabled, version):
    auth.identity("owner", "owner@example.org", "example.org", now=100)
    with pytest.raises((ValueError, AuthRefused)):
        auth.change_access("owner", "owner", expected_version=version, role=role, disabled=disabled, request_id="bad", now=101)
    assert auth.users()[0].role == "admin"


def test_incompatible_auth_schema_is_rejected_without_partial_initialization(tmp_path):
    from app.team.repository import TeamRepository
    path = tmp_path / "team.sqlite"
    TeamRepository(path)
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE team_users(sub TEXT PRIMARY KEY)")
        before = list(db.execute("SELECT name,sql FROM sqlite_master ORDER BY name"))
    with pytest.raises(AuthRefused):
        AuthStore(path, bootstrap_subs=frozenset({"owner"}))
    with sqlite3.connect(path) as db:
        assert list(db.execute("SELECT name,sql FROM sqlite_master ORDER BY name")) == before


def test_unknown_auth_version_is_refused(auth):
    with sqlite3.connect(auth.path) as db:
        db.execute("UPDATE team_auth_schema SET version=2")
    with pytest.raises(AuthRefused):
        AuthStore(auth.path, bootstrap_subs=frozenset({"owner"}))


def test_auth_schema_constraint_drift_is_refused(auth):
    with sqlite3.connect(auth.path) as db:
        db.execute("DROP TABLE team_sessions")
        db.execute("CREATE TABLE team_sessions (token_hash TEXT, sub TEXT, created REAL, last_seen REAL)")
    with pytest.raises(AuthRefused):
        AuthStore(auth.path, bootstrap_subs=frozenset({"owner"}))


def test_login_failure_audit_contains_only_finite_server_owned_facts(auth):
    auth.record_failure(now=123)
    events = auth.events()
    assert len(events) == 1
    event = events[0]
    assert event["operation"] == "login_failed" and event["timestamp"] == 123
    assert event["actor"] is None and event["target"] is None
    assert event["before_payload"] is None and event["after_payload"] is None
    reopened = AuthStore(auth.path, bootstrap_subs=auth.bootstrap_subs)
    assert reopened.events() == events
