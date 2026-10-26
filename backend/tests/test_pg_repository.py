"""
================================================================================
FILE: backend/tests/test_pg_repository.py
SUMMARY
    Atomic PostgreSQL resources, audit, tombstones and actor-scoped replay.
BASIC IDEA
    Real constraint failures roll back whole commits; competing requests share
    the one writer. Canonical TEXT preserves opaque JSON values and spelling.
INPUTS / INPUT SOURCES
    Synthetic typed JSON and the dedicated PostgreSQL repository fixture.
EXPECTED OUTPUT
    Durable CAS/replay semantics and mandatory in-transaction authorization.
================================================================================
"""
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
import threading

import pytest

from app.team.pg_storage import StorageError
from app.team.repository import Conflict, InvalidRequest, RequestMismatch
from pg_probe import connect
from pg_support import role_config

pytestmark = pytest.mark.team_db


def authorize(tx):
    assert tx.execute('SELECT current_user AS role').fetchone()['role'] == 'team_app'
    return SimpleNamespace(sub='actor')


def commit(repo, request_id, expected, changes, **kwargs):
    return repo.commit('actor', request_id, expected, changes, 'edit', authorize=authorize, **kwargs)


def test_pg_commit_is_atomic_under_injected_failure(pg_repository):
    repo = pg_repository
    before = repo.snapshot()
    with connect(role_config('maintenance')) as db:
        db.execute("ALTER TABLE semantic_studio.resources ADD CONSTRAINT injected_failure CHECK(key <> 'z')")
    with pytest.raises(StorageError) as caught:
        commit(repo, 'failed', {'a': None, 'z': None}, {'a': {'v': 1}, 'z': {'v': 2}})
    assert caught.value.sqlstate == '23514'
    assert repo.snapshot() == before
    assert repo.history('a') == [] and repo.history('z') == []
    assert repo.read_request('actor', 'failed', {}, authorize=authorize) is None


def test_pg_cas_one_winner_and_tombstone_aba(pg_repository):
    repo = pg_repository
    barrier = threading.Barrier(2)
    def update(request_id):
        barrier.wait()
        try:
            commit(repo, request_id, {'resource': None}, {'resource': {'id': request_id}})
            return 'ok'
        except Conflict:
            return 'conflict'
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(update, ['first', 'second'])) == ['conflict', 'ok']
    commit(repo, 'delete', {'resource': 1}, {'resource': None})
    assert repo.read('resource') is None and repo.versions(['resource']) == {'resource': 2}
    with pytest.raises(Conflict):
        commit(repo, 'stale', {'resource': None}, {'resource': {}})
    assert commit(repo, 'recreate', {'resource': 2}, {'resource': {}})['versions'] == {'resource': 3}


def test_pg_replay_canonical_json_is_lossless(pg_repository):
    repo = pg_repository
    payload = {'lexical': '001', 'unknown': {'label': '日本語😀', 'nul': '\0', 'empty': []}}
    response = {'body': payload, 'headers': {'content-type': 'application/json'}}
    first = commit(repo, 'replay', {'resource': None}, {'resource': payload}, response=response)
    assert repo.read('resource').payload == payload
    assert commit(repo, 'replay', {'resource': None}, {'resource': payload}, response=response) == first
    with pytest.raises(RequestMismatch):
        commit(repo, 'replay', {'resource': None}, {'resource': {}})
    assert len(repo.history('resource')) == 1
    assert repo.history('resource')[0]['diff']['after'] == payload


def test_authorization_is_required_on_both_commit_and_replay(pg_repository):
    repo = pg_repository
    commit(repo, 'replay', {'resource': None}, {'resource': {}})
    def refused(tx):
        raise PermissionError('synthetic revoked identity')
    with pytest.raises(PermissionError):
        repo.commit('actor', 'replay', {'resource': None}, {'resource': {}}, 'edit', authorize=refused)
    with pytest.raises(TypeError):
        repo.commit('actor', 'missing-auth', {'resource': 1}, {'resource': {}}, 'edit')
    with pytest.raises(InvalidRequest):
        repo.commit('other', 'wrong-actor', {'resource': 1}, {'resource': {}}, 'edit', authorize=authorize)


@pytest.mark.parametrize('key', ['bad\0key', 'bad\ud800key'])
def test_identifiers_reject_unrepresentable_text(pg_repository, key):
    with pytest.raises(InvalidRequest):
        commit(pg_repository, 'invalid', {key: None}, {key: {}})


def test_latest_operation_keeps_group_and_versions_in_one_snapshot(pg_repository, monkeypatch):
    from app.team.pg_storage import ReadTx
    repo = pg_repository
    commit(repo, 'group', {'a': None, 'b': None}, {'a': {'v': 1}, 'b': {'v': 1}})
    execute = ReadTx.execute
    injected = []
    def interleave(tx, sql, parameters=None):
        cursor = execute(tx, sql, parameters)
        if sql.startswith('SELECT actor,request_id,operation FROM audit') and not injected:
            injected.append(True)
            commit(repo, 'concurrent', {'a': 1}, {'a': {'v': 2}})
        return cursor
    monkeypatch.setattr(ReadTx, 'execute', interleave)
    group = repo.latest_operation('a')
    assert group.request_id == 'group'
    assert group.versions == {'a': 1, 'b': 1}
    assert [entry['key'] for entry in group.entries] == ['a', 'b']
    assert group.request_result['versions'] == {'a': 1, 'b': 1}
    assert repo.versions(['a', 'b']) == {'a': 2, 'b': 1}
