"""
================================================================================
FILE: backend/tests/test_pg_workspace.py
SUMMARY
    Shared HTTP candidates reauthorize and stay unpublished after writer loss.
BASIC IDEA
    Use the real shared Harness/session, then alter identity or lose ownership
    after candidate preparation and before the authoritative commit.
INPUTS / INPUT SOURCES
    Dedicated PostgreSQL, synthetic projects and controlled storage failures.
EXPECTED OUTPUT
    401/403/503 with original resource/audit state and no fake success.
================================================================================
"""
import time
import asyncio
from types import SimpleNamespace

import pytest

from pg_probe import connect
from pg_support import role_config
from test_team_workspace import Harness, harness

pytestmark = pytest.mark.team_db


def test_pg_lease_loss_fences_old_app(harness):
    storage = harness.workspace.repository.storage
    with storage.write_transaction() as tx:
        pid = tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid']
    with connect(role_config()) as probe:
        probe.execute('SELECT pg_terminate_backend(%s)', (pid,))
    response = harness.request('POST', '/api/projects', request_id='lost', json={'name': 'Lost'})
    assert response.status_code == 503


def test_pg_demotion_during_candidate_denies_commit(harness, monkeypatch):
    harness.create()
    peer = Harness(harness.workspace, 'bob')
    repo = harness.workspace.repository
    before, audit = repo.snapshot(), repo.history('workspace')
    commit = repo.commit
    def demote_then_commit(*args, **kwargs):
        auth = harness.workspace.auth_store
        request_auth = auth.bind_request(peer.token, 'admin')
        auth.change_access('bob', 'alice', expected_version=1, role='viewer', disabled=False,
                           request_id='demote-candidate', now=time.time,
                           authorize=lambda tx: auth.require_current_principal(tx, token_hash=request_auth.token_hash, operation='admin'))
        return commit(*args, **kwargs)
    monkeypatch.setattr(repo, 'commit', demote_then_commit)
    response = harness.request('POST', '/api/projects', request_id='denied', json={'name': 'Denied'})
    assert response.status_code == 403
    assert repo.snapshot() == before and repo.history('workspace') == audit


def test_pg_commit_reply_loss_replays_after_restart(harness, monkeypatch):
    from app.team.pg_storage import StorageError
    repo = harness.workspace.repository
    commit = repo.commit
    initial = dict(harness.versions)
    def lose_reply(*args, **kwargs):
        commit(*args, **kwargs)
        # The real DB has committed. Lose the application acknowledgement and
        # its writer before publishing cache/HTTP success; a fresh owner must
        # decide from durable replay rather than assume rollback or retry it.
        with repo.storage.write_transaction() as tx:
            pid = tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid']
        with connect(role_config()) as probe:
            probe.execute('SELECT pg_terminate_backend(%s)', (pid,))
        repo.storage.ensure_owner()
        raise AssertionError('terminated writer stayed available')
    monkeypatch.setattr(repo, 'commit', lose_reply)
    response = harness.request('POST', '/api/projects', request_id='lost-reply',
                               versions=initial, json={'name': 'Synthetic', 'template': 'empty'})
    assert response.status_code == 503
    restarted = harness.restarted()
    replay = restarted.request('POST', '/api/projects', request_id='lost-reply',
                               versions=initial, json={'name': 'Synthetic', 'template': 'empty'})
    assert replay.status_code == 200
    projects = restarted.request('GET', '/api/projects').json()
    assert len(projects) == 1 and projects[0]['id'] == replay.json()['id']
    assert len(restarted.workspace.repository.history('workspace')) == 1


def test_pg_health_precedes_blocked_authenticated_request(harness):
    import httpx
    from anyio.to_thread import current_default_thread_limiter
    from app.main import health
    from app.routers.auth import SESSION_COOKIE
    from app.team.middleware import TeamMiddleware
    from app.team.pg_storage import WRITE_GATE_KEY
    app = harness.app
    app.add_api_route('/api/health', health, methods=['GET'])
    runtime = SimpleNamespace(config=SimpleNamespace(public_origin='https://studio.example.org'),
                              auth_store=harness.workspace.auth_store, workspace=harness.workspace)
    middleware = TeamMiddleware(app, runtime)
    with harness.workspace.repository.storage.write_transaction() as tx:
        pid = tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid']
    order = []
    with connect(role_config()) as gate:
        gate.execute('BEGIN')
        gate.execute('SELECT pg_advisory_xact_lock(%s,%s)', WRITE_GATE_KEY)
        async def scenario():
            limiter = current_default_thread_limiter()
            previous_tokens = limiter.total_tokens
            limiter.total_tokens = 1
            try:
                transport = httpx.ASGITransport(app=middleware)
                async with httpx.AsyncClient(transport=transport, base_url='https://studio.example.org',
                                             cookies={SESSION_COOKIE: harness.token}) as client:
                    async def authenticated():
                        response = await client.get('/api/projects')
                        order.append('authenticated')
                        return response
                    waiting = asyncio.create_task(authenticated())
                    try:
                        # One worker is enough to saturate this deliberately
                        # small limiter. Observe PostgreSQL on an independent
                        # stdlib executor so the test itself cannot take the
                        # worker whose availability it is verifying.
                        for _ in range(100):
                            row = await asyncio.to_thread(lambda: gate.execute('SELECT wait_event FROM pg_stat_activity WHERE pid=%s', (pid,)).fetchone())
                            if row['wait_event'] == 'advisory':
                                break
                            await asyncio.sleep(0.01)
                        else:
                            raise AssertionError('authenticated request did not reach the database gate')
                        response = await client.get('/api/health')
                        assert response.status_code == 200
                        order.append('health')
                    finally:
                        await asyncio.to_thread(gate.execute, 'COMMIT')
                    assert (await waiting).status_code == 200
            finally:
                limiter.total_tokens = previous_tokens
        asyncio.run(scenario())
    assert order == ['health', 'authenticated']


def test_team_source_keeps_private_ill_typed_literal_out_of_logs(harness, caplog):
    pid = harness.create()
    value = 'synthetic-private-lexical'
    response = harness.request('PUT', f'/api/projects/{pid}/documents/model/source', request_id='private-source',
        json={'text': '<urn:s> <urn:p> "' + value + '"^^<http://www.w3.org/2001/XMLSchema#integer> .'})
    assert response.status_code == 200, response.text
    assert value not in caplog.text
