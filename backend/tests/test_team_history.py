"""
================================================================================
FILE: backend/tests/test_team_history.py
================================================================================
SUMMARY
    Verifies durable inverse operations restore entire multi-resource revisions.
BASIC IDEA
    Build synthetic resource groups, restart the PostgreSQL writer and test actor ownership,
    replay, concurrent changes and exact typed RDF terms across Undo and Redo.
INPUTS / INPUT SOURCES
    - Isolated repositories and synthetic RDF with unknown predicates.
EXPECTED OUTPUT
    - Complete actor-owned inverses with monotonic repository generations.
================================================================================
"""
import pytest
import time
import hashlib
from rdflib import BNode, Graph, Literal, URIRef

from app.team.rdf_codec import encode_graph, decode_graph
from app.team.repository import TeamRepository, RepositoryError, Conflict
from app.team.workspace import TeamWorkspace
from app.team.auth_store import AuthStore
from pg_support import restart_workspace

pytestmark = pytest.mark.team_db


def authorizers(repository):
    auth = AuthStore(repository.storage, bootstrap_subs=frozenset({"alice", "bob"}))
    bound = {}
    for actor in ("alice", "bob"):
        auth.identity(actor, actor + "@example.org", "example.org", now=time.time)
        token = auth.create_session(actor, now=time.time)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        bound[actor] = lambda tx, value=token_hash: auth.require_current_principal(tx, token_hash=value, operation="edit")
    return auth, bound


def test_multi_resource_inverse_restart_replay_and_redo(tmp_path, pg_repository):
    repository = pg_repository
    auth, bound = authorizers(repository)
    graph = Graph(bind_namespaces="none")
    graph.bind("ex", "https://example.org/")
    graph.add((BNode("stable-node"), URIRef("https://example.org/unknown"), Literal("001", datatype=URIRef("http://www.w3.org/2001/XMLSchema#integer"), normalize=False)))
    original = {"graph:model": {"graph": encode_graph(graph)}, "file:project.json": {"blob": "original"}}
    repository.commit("alice", "initial", {key: None for key in original}, original, "initial", authorize=bound["alice"])
    graph.add((BNode("stable-node"), URIRef("https://example.org/note"), Literal("注釈", lang="ja")))
    changed = {"graph:model": {"graph": encode_graph(graph)}, "file:project.json": {"blob": "changed"}}
    repository.commit("alice", "edit", repository.snapshot()[1], changed, "edit", authorize=bound["alice"])
    reopened = restart_workspace(TeamWorkspace(repository, tmp_path, auth_store=auth))
    expected = reopened.repository.snapshot()[1]
    result = reopened.undo("alice", "graph:model", expected, "undo", authorize=bound["alice"])
    assert reopened.repository.snapshot()[0] == original
    assert reopened.undo("alice", "graph:model", expected, "undo", authorize=bound["alice"]) == result
    reopened.undo("alice", "graph:model", reopened.repository.snapshot()[1], "redo", redo=True, authorize=bound["alice"])
    assert reopened.repository.snapshot()[0] == changed
    assert encode_graph(decode_graph(reopened.repository.read("graph:model").payload["graph"])) == changed["graph:model"]["graph"]
    assert reopened.repository.versions(original) == {key: 4 for key in original}


def test_other_actor_or_later_dependency_change_cannot_be_undone(tmp_path, pg_repository):
    repository = pg_repository
    auth, bound = authorizers(repository)
    repository.commit("alice", "a", {"model": None, "layout": None}, {"model": {"value": 1}, "layout": {"value": 1}}, "edit", authorize=bound["alice"])
    workspace = TeamWorkspace(repository, tmp_path, auth_store=auth)
    with pytest.raises(RepositoryError, match="undo_forbidden"):
        workspace.undo("bob", "model", repository.snapshot()[1], "b", authorize=bound["bob"])
    repository.commit("bob", "later", {"layout": 1}, {"layout": {"value": 2}}, "layout", authorize=bound["bob"])
    with pytest.raises(Conflict):
        workspace.undo("alice", "model", repository.snapshot()[1], "cannot-remove-bob", authorize=bound["alice"])
    assert repository.read("layout").payload == {"value": 2}


def test_replayed_inverse_rechecks_current_origin_permission(tmp_path, pg_repository):
    repository = pg_repository
    auth, bound = authorizers(repository)
    repository.commit('alice', 'initial', {'model': None}, {'model': {'v': 1}},
                      'POST /api/ontologies/upload', authorize=bound['alice'])
    repository.commit('alice', 'delete', {'model': 1}, {'model': None},
                      'DELETE /api/ontologies/test', authorize=bound['alice'])
    workspace = TeamWorkspace(repository, tmp_path, auth_store=auth)
    basis = {'model': 2}
    workspace.undo('alice', 'model', basis, 'restore', authorize=bound['alice'])
    before, audit = repository.snapshot(), repository.history('model')
    auth.change_access('bob', 'alice', expected_version=1, role='editor', disabled=False,
                       request_id='demote', now=time.time, authorize=bound['bob'])
    with pytest.raises(RepositoryError, match='forbidden'):
        workspace.undo('alice', 'model', basis, 'restore', authorize=bound['alice'])
    assert repository.snapshot() == before and repository.history('model') == audit
