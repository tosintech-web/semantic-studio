"""
================================================================================
FILE: backend/tests/test_pg_auth_store.py
SUMMARY
    Live PostgreSQL authentication timing, revocation, admin and replay races.
BASIC IDEA
    Keep auth and resource updates on the same writer gate and inspect actual
    session rows. Concurrent requests must retain an enabled administrator.
INPUTS / INPUT SOURCES
    Dedicated PostgreSQL, opaque synthetic tokens and explicit test clocks.
EXPECTED OUTPUT
    One-use login state, current-session permissions, idle-safe polling and CAS.
================================================================================
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import threading

import pytest

from app.team.auth_store import AuthStore, AuthRefused
from app.team.pg_storage import WRITE_GATE_KEY
from app.team.repository import RequestMismatch
from pg_probe import connect
from pg_support import role_config

pytestmark = pytest.mark.team_db


@pytest.fixture
def auth(pg_repository):
    store = AuthStore(pg_repository.storage, bootstrap_subs=frozenset({'owner', 'second'}))
    for sub in ('owner', 'second', 'member'):
        store.identity(sub, sub + '@example.org', 'example.org', now=100)
    return store


def bound(store, token, operation='admin', now=110):
    return lambda tx: store.require_current_principal(tx, token_hash=hashlib.sha256(token.encode()).hexdigest(), operation=operation, now=now)


def test_pg_last_admin_and_login_state_race(auth):
    tokens = {sub: auth.create_session(sub, now=100) for sub in ('owner', 'second')}
    barrier = threading.Barrier(2)
    def demote(sub):
        barrier.wait()
        try:
            auth.change_access(sub, sub, expected_version=1, role='editor', disabled=False,
                               request_id='demote', now=110, authorize=bound(auth, tokens[sub]))
            return 'ok'
        except AuthRefused as error:
            return error.code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(demote, ('owner', 'second'))) == ['last_admin', 'ok']
    assert len([user for user in auth.users() if user.role == 'admin' and not user.disabled]) == 1
    attempt = auth.begin_login(now=110)
    barrier = threading.Barrier(2)
    def consume(_):
        barrier.wait()
        try:
            auth.consume_login(attempt.state, attempt.browser_cookie, now=111)
            return 'ok'
        except AuthRefused:
            return 'refused'
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(consume, range(2))) == ['ok', 'refused']


def test_pg_clock_sampled_after_writer_wait(auth):
    token = auth.create_session('owner', now=100)
    started, finished = threading.Event(), threading.Event()
    released, sampled, errors = [], [], []
    def clock():
        sampled.append(bool(released))
        return 120
    def queued():
        started.set()
        try:
            auth.authenticate(token, now=clock)
        except Exception as error:
            errors.append(type(error).__name__)
        finally:
            finished.set()
    with connect(role_config()) as gate:
        with gate.transaction():
            gate.execute('SELECT pg_advisory_xact_lock(%s,%s)', WRITE_GATE_KEY)
            thread = threading.Thread(target=queued)
            thread.start()
            assert started.wait(2)
            gate.execute('UPDATE team_sessions SET last_seen=115')
            released.append(True)
        assert finished.wait(8)
        thread.join(1)
    assert errors == [] and sampled == [True]
    with pytest.raises(AuthRefused):
        auth.authenticate(token, now=119)


def test_pg_poll_does_not_touch_idle(auth):
    token = auth.create_session('owner', now=100)
    with connect(role_config()) as db:
        before = db.execute('SELECT last_seen FROM team_sessions').fetchone()['last_seen']
    assert auth.authenticate(token, now=1899, touch=False).principal.sub == 'owner'
    with connect(role_config()) as db:
        assert db.execute('SELECT last_seen FROM team_sessions').fetchone()['last_seen'] == before
    with pytest.raises(AuthRefused, match='auth_expired'):
        auth.authenticate(token, now=1900, touch=False)


def test_pg_request_id_cannot_cross_access_and_edit(auth, pg_repository):
    token = auth.create_session('owner', now=100)
    authorize = bound(auth, token)
    auth.change_access('owner', 'member', expected_version=1, role='editor', disabled=False,
                       request_id='access-first', now=110, authorize=authorize)
    with pytest.raises(RequestMismatch):
        pg_repository.commit('owner', 'access-first', {'a': None}, {'a': {}}, 'edit', authorize=authorize)
    pg_repository.commit('owner', 'edit-first', {'a': None}, {'a': {}}, 'edit', authorize=authorize)
    with pytest.raises(AuthRefused, match='request_mismatch'):
        auth.change_access('owner', 'member', expected_version=2, role='viewer', disabled=False,
                           request_id='edit-first', now=110, authorize=authorize)
    second = auth.create_session('second', now=100)
    assert pg_repository.commit('second', 'edit-first', {'b': None}, {'b': {}}, 'edit', authorize=bound(auth, second))['versions'] == {'b': 1}


def test_revoked_session_cannot_authorize_commit(auth, pg_repository):
    token = auth.create_session('owner', now=100)
    auth.revoke(token, now=101)
    with pytest.raises(AuthRefused):
        pg_repository.commit('owner', 'revoked', {'a': None}, {'a': {}}, 'edit', authorize=bound(auth, token))
    assert pg_repository.snapshot() == ({}, {})


def test_status_read_does_not_wait_for_database_write_gate(auth):
    token = auth.create_session('owner', now=100)
    with connect(role_config()) as gate:
        with gate.transaction():
            gate.execute('SELECT pg_advisory_xact_lock(%s,%s)', WRITE_GATE_KEY)
            assert auth.authenticate(token, now=101, touch=False).principal.role == 'admin'


def test_current_role_is_read_again_after_demotion(auth, pg_repository):
    token = auth.create_session('owner', now=100)
    old_view = auth.authenticate(token, now=105)
    auth.change_access('owner', 'owner', expected_version=1, role='editor', disabled=False,
                       request_id='demote', now=110, authorize=bound(auth, token))
    assert old_view.principal.role == 'admin'
    with pytest.raises(AuthRefused, match='forbidden'):
        pg_repository.commit('owner', 'stale-role', {'a': None}, {'a': {}}, 'admin', authorize=bound(auth, token))
    assert pg_repository.snapshot() == ({}, {})
    assert pg_repository.commit('owner', 'current-role', {'a': None}, {'a': {}}, 'edit', authorize=bound(auth, token, 'edit'))['versions'] == {'a': 1}
