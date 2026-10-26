"""
================================================================================
FILE: backend/tests/test_team_history.py
================================================================================
SUMMARY
    Verifies durable inverse operations restore entire multi-resource revisions.
BASIC IDEA
    Build synthetic resource groups, reopen SQLite and test actor ownership,
    replay, concurrent changes and exact typed RDF terms across Undo and Redo.
INPUTS / INPUT SOURCES
    - Isolated repositories and synthetic RDF with unknown predicates.
EXPECTED OUTPUT
    - Complete actor-owned inverses with monotonic repository generations.
================================================================================
"""
import pytest
from rdflib import BNode, Graph, Literal, URIRef

from app.team.rdf_codec import encode_graph, decode_graph
from app.team.repository import TeamRepository, RepositoryError, Conflict
from app.team.workspace import TeamWorkspace


def test_multi_resource_inverse_restart_replay_and_redo(tmp_path):
    repository = TeamRepository(tmp_path / "team.sqlite")
    graph = Graph(bind_namespaces="none")
    graph.bind("ex", "https://example.org/")
    graph.add((BNode("stable-node"), URIRef("https://example.org/unknown"), Literal("001", datatype=URIRef("http://www.w3.org/2001/XMLSchema#integer"), normalize=False)))
    original = {"graph:model": {"graph": encode_graph(graph)}, "file:project.json": {"blob": "original"}}
    repository.commit("alice", "initial", {key: None for key in original}, original, "initial")
    graph.add((BNode("stable-node"), URIRef("https://example.org/note"), Literal("注釈", lang="ja")))
    changed = {"graph:model": {"graph": encode_graph(graph)}, "file:project.json": {"blob": "changed"}}
    repository.commit("alice", "edit", repository.snapshot()[1], changed, "edit")
    reopened = TeamWorkspace(TeamRepository(repository.path), tmp_path)
    expected = reopened.repository.snapshot()[1]
    result = reopened.undo("alice", "graph:model", expected, "undo")
    assert reopened.repository.snapshot()[0] == original
    assert reopened.undo("alice", "graph:model", expected, "undo") == result
    reopened.undo("alice", "graph:model", reopened.repository.snapshot()[1], "redo", redo=True)
    assert reopened.repository.snapshot()[0] == changed
    assert encode_graph(decode_graph(reopened.repository.read("graph:model").payload["graph"])) == changed["graph:model"]["graph"]
    assert reopened.repository.versions(original) == {key: 4 for key in original}


def test_other_actor_or_later_dependency_change_cannot_be_undone(tmp_path):
    repository = TeamRepository(tmp_path / "team.sqlite")
    repository.commit("alice", "a", {"model": None, "layout": None}, {"model": {"value": 1}, "layout": {"value": 1}}, "edit")
    workspace = TeamWorkspace(repository, tmp_path)
    with pytest.raises(RepositoryError, match="undo_forbidden"):
        workspace.undo("bob", "model", repository.snapshot()[1], "b")
    repository.commit("bob", "later", {"layout": 1}, {"layout": {"value": 2}}, "layout")
    with pytest.raises(Conflict):
        workspace.undo("alice", "model", repository.snapshot()[1], "cannot-remove-bob")
    assert repository.read("layout").payload == {"value": 2}
