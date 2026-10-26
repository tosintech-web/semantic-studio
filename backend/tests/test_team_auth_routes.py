"""
================================================================================
FILE: backend/tests/test_team_auth_routes.py
SUMMARY
    Authentication HTTP contracts with real SQLite and synthetic identity.
BASIC IDEA
    HTTPS clients exercise browser binding, replay, expiry, cookies and CSRF.
INPUTS / INPUT SOURCES
    Temporary stores, injected clocks and fake verified identity facts.
EXPECTED OUTPUT
    Safe session responses and strictly guarded state changes.
================================================================================
"""
from urllib.parse import urlencode, urlsplit, parse_qs
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers.auth import create_auth_router
from app.team.auth_store import AuthStore, AuthRefused
from app.team.config import TeamConfig

ORIGIN = "https://studio.example.org"
GUARD = {"Origin": ORIGIN, "X-Semantic-Studio": "1"}
SESSION = "__Host-semantic-studio-session"
LOGIN = "__Host-semantic-studio-login"


class Identity:
    def __init__(self):
        self.calls = []
        self.attempt = None
        self.refuse = False
        self.bug = False

    def authorization_url(self, attempt):
        self.attempt = attempt
        return "https://accounts.example.org/auth?" + urlencode({"state": attempt.state})

    def exchange(self, code, state):
        self.calls.append((code, state))
        if self.bug:
            raise RuntimeError("programming error")
        if self.refuse:
            raise AuthRefused()
        return {"sub": "member", "email": "member@example.org", "hd": "example.org"}


@pytest.fixture
def setup(tmp_path):
    config = TeamConfig(mode="team", public_origin=ORIGIN, google_client_id="synthetic-client",
        google_client_secret="replace-me", allowed_domains=frozenset({"example.org"}),
        bootstrap_subs=frozenset({"owner"}), data_dir=tmp_path)
    store = AuthStore(tmp_path / "team.sqlite", bootstrap_subs=config.bootstrap_subs)
    identity, now = Identity(), [100.0]
    app = FastAPI()
    app.include_router(create_auth_router(config, store, identity, clock=lambda: now[0]))
    with TestClient(app, base_url=ORIGIN, follow_redirects=False) as client:
        yield client, store, identity, now


def start(client):
    response = client.post("/api/auth/login", headers=GUARD)
    assert response.status_code == 200
    return parse_qs(urlsplit(response.json()["url"]).query)["state"][0], response


def finish(client, state):
    return client.get("/api/auth/callback", params={"state": state, "code": "private-code"})


def test_public_status_is_noncacheable_and_safe_for_invalid_session(setup):
    client, _, _, _ = setup
    response = client.get("/api/auth/status")
    assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
    assert response.json() == {"mode": "team", "authenticated": False, "user": None, "csrf": None}
    client.cookies.set(SESSION, "invalid-secret")
    assert client.get("/api/auth/status").json() == response.json()
    assert "invalid-secret" not in client.get("/api/auth/status").text


def test_successful_login_has_secure_cookies_and_viewer_principal(setup):
    client, store, identity, _ = setup
    state, login = start(client)
    cookie = login.headers["set-cookie"]
    assert cookie.startswith(LOGIN + "=")
    for flag in ["HttpOnly", "Secure", "SameSite=lax", "Path=/", "Max-Age=300"]:
        assert flag in cookie
    assert "domain=" not in cookie.lower()
    response = finish(client, state)
    assert response.status_code == 303 and response.headers["location"] == "/"
    cookies = response.headers.get_list("set-cookie")
    cookie = next(item for item in cookies if item.startswith(SESSION + "="))
    for flag in ["HttpOnly", "Secure", "SameSite=lax", "Path=/", "Max-Age=3600"]:
        assert flag in cookie
    assert "domain=" not in cookie.lower()
    assert any(item.startswith(LOGIN + "=") and "Max-Age=0" in item for item in cookies)
    status = client.get("/api/auth/status").json()
    assert status["mode"] == "team" and status["authenticated"] is True
    assert status["user"] == {"sub": "member", "email": "member@example.org", "domain": "example.org", "role": "viewer", "disabled": False, "version": 1}
    assert len(status["csrf"]) >= 32 and store.users()[0].role == "viewer"
    assert identity.calls[0][1].nonce == identity.attempt.nonce
    assert identity.calls[0][1].code_verifier == identity.attempt.code_verifier
    assert "private-code" not in response.text + response.headers["location"]
    assert "replace-me" not in str(status)


@pytest.mark.parametrize("headers", [{}, {"Origin": ORIGIN}, {"X-Semantic-Studio": "1"},
    {"Origin": "https://evil.example.org", "X-Semantic-Studio": "1"},
    {"Origin": ORIGIN + "/", "X-Semantic-Studio": "1"}, {"Origin": ORIGIN, "X-Semantic-Studio": "wrong"}])
@pytest.mark.parametrize("path", ["/api/auth/login", "/api/auth/logout"])
def test_mutations_require_exact_origin_and_client_header(setup, headers, path):
    client, store, _, _ = setup
    response = client.post(path, headers=headers)
    assert response.status_code == 403 and response.json()["code"] == "csrf"
    assert response.json()["uiMessage"] == {"code": "team.csrf", "args": {}}
    assert store.users() == []


def test_callback_browser_binding_and_one_use_state(setup):
    client, _, identity, _ = setup
    state, _ = start(client)
    browser = client.cookies.get(LOGIN)
    client.cookies.clear()
    assert finish(client, state).headers["location"] == "/?auth=failed"
    assert identity.calls == []
    client.cookies.set(LOGIN, browser)
    assert finish(client, state).headers["location"] == "/"
    assert finish(client, state).headers["location"] == "/?auth=failed"
    assert len(identity.calls) == 1


@pytest.mark.parametrize("query", [{}, {"state": "x"}, {"code": "private-code"},
    {"state": "x", "code": "private-code", "error": "private-error"}])
def test_malformed_callback_has_only_safe_redirect(setup, query):
    client, store, identity, _ = setup
    response = client.get("/api/auth/callback", params=query)
    assert response.status_code == 303 and response.headers["location"] == "/?auth=failed"
    assert response.text == "" and "Max-Age=0" in response.headers["set-cookie"]
    assert store.users() == [] and identity.calls == []


def test_rejected_claims_create_no_user_and_consume_attempt(setup):
    client, store, identity, _ = setup
    identity.refuse = True
    state, _ = start(client)
    assert finish(client, state).headers["location"] == "/?auth=failed"
    assert store.users() == []
    identity.refuse = False
    assert finish(client, state).headers["location"] == "/?auth=failed"


def test_expired_login_and_session_are_safe(setup):
    client, _, identity, now = setup
    state, _ = start(client)
    now[0] += 300
    assert finish(client, state).headers["location"] == "/?auth=failed" and identity.calls == []
    state, _ = start(client)
    assert finish(client, state).headers["location"] == "/"
    now[0] += 1800
    assert client.get("/api/auth/status").json()["authenticated"] is False


def test_logout_csrf_revocation_and_idempotence(setup):
    client, store, _, now = setup
    state, _ = start(client)
    finish(client, state)
    token = client.cookies.get(SESSION)
    csrf = client.get("/api/auth/status").json()["csrf"]
    for headers in [GUARD, {**GUARD, "X-Semantic-Studio-CSRF": "wrong"}]:
        response = client.post("/api/auth/logout", headers=headers)
        assert response.status_code == 403 and response.json()["code"] == "csrf"
        assert store.authenticate(token, now=now[0]).principal.sub == "member"
    response = client.post("/api/auth/logout", headers={**GUARD, "X-Semantic-Studio-CSRF": csrf})
    assert response.status_code == 200 and "Max-Age=0" in response.headers["set-cookie"]
    with pytest.raises(AuthRefused):
        store.authenticate(token, now=now[0])
    assert client.post("/api/auth/logout", headers=GUARD).status_code == 200
    assert client.get("/api/auth/status").json()["authenticated"] is False


def test_programming_errors_propagate(setup):
    client, _, identity, _ = setup
    identity.bug = True
    state, _ = start(client)
    with pytest.raises(RuntimeError, match="programming error"):
        finish(client, state)


def test_duplicate_guard_headers_are_rejected(setup):
    client, _, identity, _ = setup
    headers = [("Origin", ORIGIN), ("Origin", ORIGIN), ("X-Semantic-Studio", "1")]
    response = client.post("/api/auth/login", headers=headers)
    assert response.status_code == 403 and identity.attempt is None


@pytest.mark.parametrize("query", [
    [("state", "one"), ("state", "two"), ("code", "private-code")],
    [("state", "one"), ("code", "private-code"), ("code", "other-code")],
])
def test_duplicate_callback_inputs_are_refused_before_exchange(setup, query):
    client, store, identity, _ = setup
    response = client.get("/api/auth/callback", params=query)
    assert response.headers["location"] == "/?auth=failed"
    assert identity.calls == [] and store.users() == []


def test_foreign_origin_cannot_logout_existing_session(setup):
    client, store, _, now = setup
    state, _ = start(client)
    finish(client, state)
    token = client.cookies.get(SESSION)
    csrf = client.get("/api/auth/status").json()["csrf"]
    response = client.post("/api/auth/logout", headers={**GUARD,
        "Origin": "https://evil.example.org", "X-Semantic-Studio-CSRF": csrf})
    assert response.status_code == 403
    assert store.authenticate(token, now=now[0]).principal.sub == "member"


def test_other_sessions_csrf_does_not_revoke_current_session(setup):
    client, store, _, now = setup
    state, _ = start(client)
    finish(client, state)
    first_csrf = client.get("/api/auth/status").json()["csrf"]
    state, _ = start(client)
    finish(client, state)
    token = client.cookies.get(SESSION)
    response = client.post("/api/auth/logout", headers={**GUARD, "X-Semantic-Studio-CSRF": first_csrf})
    assert response.status_code == 403
    assert store.authenticate(token, now=now[0]).principal.sub == "member"


def test_absolute_expiry_is_safe_despite_periodic_user_activity(setup):
    client, store, _, now = setup
    state, _ = start(client)
    finish(client, state)
    token = client.cookies.get(SESSION)
    for timestamp in [1000, 2000, 3000, 3699]:
        now[0] = timestamp
        # Real user requests refresh idle time; background status polls do not.
        store.authenticate(token, now=timestamp)
        assert client.get("/api/auth/status").json()["authenticated"] is True
    now[0] = 3700
    response = client.get("/api/auth/status")
    assert response.json() == {"mode": "team", "authenticated": False, "user": None, "csrf": None}
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("failure", ["provider", "malformed"])
def test_failed_callback_records_one_safe_audit_event(setup, failure):
    client, store, identity, _ = setup
    state, _ = start(client)
    browser = client.cookies.get(LOGIN)
    identity.refuse = True
    if failure == "provider":
        response = finish(client, state)
    else:
        response = client.get("/api/auth/callback", params={"state": "untrusted-state", "code": "private-code"})
    assert response.headers["location"] == "/?auth=failed"
    events = store.events()
    assert len(events) == 1
    assert events[0]["operation"] == "login_failed"
    assert events[0]["actor"] is None and events[0]["target"] is None
    assert events[0]["before_payload"] is None and events[0]["after_payload"] is None
    for secret in [state, browser, "private-code", "untrusted-state", identity.attempt.nonce, identity.attempt.code_verifier]:
        assert secret not in str(events)
    assert store.users() == []


def test_denied_login_attempt_is_audited_without_provider_data(setup):
    client, store, _, now = setup
    # Exercise the real store's outstanding-attempt cap rather than replacing
    # the behavior whose refusal must leave an audit record.
    with store.repository.connection() as db:
        db.executemany("INSERT INTO team_login_attempts VALUES(?,?,?,?,?)",
            [(f"state-{index}", "browser", "nonce", "verifier", now[0]) for index in range(1000)])
        db.commit()
    response = client.post("/api/auth/login", headers=GUARD)
    assert response.status_code == 403 and response.json()["code"] == "auth_failed"
    events = store.events()
    assert len(events) == 1 and events[0]["operation"] == "login_failed"
    assert events[0]["actor"] is None and events[0]["target"] is None
    assert events[0]["before_payload"] is None and events[0]["after_payload"] is None
