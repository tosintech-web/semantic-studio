"""
================================================================================
FILE: backend/tests/test_team_conflicts.py
================================================================================
SUMMARY
    Exercises conflicting HTTP resource updates and atomic response replay.
BASIC IDEA
    Reuse the actual legacy-router harness to prove stale layout, manifest,
    query and policy requests cannot overwrite newer committed data.
INPUTS / INPUT SOURCES
    - Synthetic HTTP updates and injected after-commit response loss.
EXPECTED OUTPUT
    - 409 conflicts and identical durable replies without duplicate application.
================================================================================
"""
import pytest
from test_team_workspace import Harness, harness
from app.team.repository import StorageError


@pytest.mark.parametrize("kind", ["manifest", "layout", "query", "policy"])
def test_resource_families_reject_stale_bases(harness, kind):
    pid = harness.create()
    stale = dict(harness.versions)
    peer = Harness(harness.workspace, "bob")
    peer.versions = stale
    if kind == "manifest":
        method, path, first, second = "PATCH", f"/api/projects/{pid}", {"name": "First"}, {"name": "Second"}
    elif kind == "layout":
        method, path = "PUT", f"/api/projects/{pid}/documents/model/layout"
        first = {"version": 1, "nodes": {}, "collapsed": [], "hidden": []}
        from app.projects import empty_layout
        first = empty_layout()
        second = first
    elif kind == "query":
        method, path = "POST", "/api/queries"
        first = {"name": "First", "ontologyId": pid + "-model", "sparql": "SELECT * WHERE {?s ?p ?o}", "state": None, "mode": "text"}
        second = {**first, "name": "Second"}
    else:
        method, path, first, second = "PUT", "/api/network/offline", {"offline": True}, {"offline": False}
    response = harness.request(method, path, request_id="first-" + kind, json=first)
    assert response.status_code == 200, response.text
    conflict = peer.request(method, path, request_id="second-" + kind, json=second)
    assert conflict.status_code == 409, conflict.text
    assert conflict.json()["code"] == "revision_conflict"


def test_committed_but_lost_response_replays_without_second_mutation(harness, monkeypatch):
    initial = dict(harness.versions)
    commit = harness.workspace.repository.commit
    def lost_response(*args, **kwargs):
        commit(*args, **kwargs)
        raise StorageError(10)
    monkeypatch.setattr(harness.workspace.repository, "commit", lost_response)
    first = harness.request("POST", "/api/projects", request_id="lost", versions=initial, json={"name": "Synthetic"})
    assert first.status_code == 503
    assert len(harness.workspace.repository.history("workspace")) == 1
    monkeypatch.setattr(harness.workspace.repository, "commit", commit)
    retry = harness.request("POST", "/api/projects", request_id="lost", versions=initial, json={"name": "Synthetic"})
    assert retry.status_code == 200, retry.text
    assert len(harness.workspace.repository.history("workspace")) == 1
    assert len(harness.request("GET", "/api/projects").json()) == 1


def test_snapshot_generation_conflicts_and_survives_restart(harness, tmp_path):
    import json
    from test_team_workspace import command
    from app.team.workspace import TeamWorkspace
    from app.team.repository import TeamRepository
    pid = harness.create()
    target = command(harness, pid, "Person", "person").json()["created"]
    created = harness.request("POST", f"/api/projects/{pid}/data", request_id="snapshot",
        files={"file": ("synthetic.csv", b"id,name\n1,Synthetic\n", "text/csv")},
        data={"choices": json.dumps({"classIri": target, "idColumn": "id", "columns": {"name": {"as": "name"}}})})
    assert created.status_code == 200, created.text
    sid = created.json()["snapshot"]["id"]
    generation = created.json()["generation"]
    peer = Harness(harness.workspace, "bob")
    peer.versions = dict(harness.versions)
    switched = harness.request("PATCH", f"/api/projects/{pid}/data/{sid}", request_id="switch", json={"enabled": False})
    assert switched.status_code == 200, switched.text
    refused = peer.request("PATCH", f"/api/projects/{pid}/data/{sid}", request_id="stale-switch", json={"enabled": True})
    assert refused.status_code == 409
    restarted = Harness(TeamWorkspace(TeamRepository(tmp_path / "team.sqlite3"), tmp_path))
    read = restarted.request("GET", f"/api/projects/{pid}/data")
    assert read.status_code == 200, read.text
    assert read.json()["generation"] > generation
    assert read.json()["snapshots"][0]["enabled"] is False
    undone = restarted.request("POST", f"/api/projects/{pid}/documents/model/undo", request_id="undo-snapshot")
    assert undone.status_code == 200, undone.text
    after = restarted.request("GET", f"/api/projects/{pid}/data").json()
    assert after["generation"] > read.json()["generation"]
    assert after["snapshots"][0]["enabled"] is True
    source_resources, _ = restarted.workspace.repository.snapshot()
    duplicate = restarted.request("POST", f"/api/projects/{pid}/duplicate", request_id="copy-snapshot")
    assert duplicate.status_code == 200, duplicate.text
    copied = duplicate.json()["id"]
    copied_resources, _ = restarted.workspace.repository.snapshot()
    assert copied_resources["graph:snapshot:" + copied + ":" + sid] == source_resources["graph:snapshot:" + pid + ":" + sid]
    assert copied_resources["state:snapshots:" + copied] == source_resources["state:snapshots:" + pid]


def test_two_connections_publish_only_one_conflicting_candidate(harness, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    import threading
    pid = harness.create()
    peer = Harness(harness.workspace, "bob")
    peer.versions = dict(harness.versions)
    commit = harness.workspace.repository.commit
    barrier = threading.Barrier(2)
    def concurrent_commit(*args, **kwargs):
        barrier.wait(timeout=5)
        return commit(*args, **kwargs)
    monkeypatch.setattr(harness.workspace.repository, "commit", concurrent_commit)
    def rename(client, name):
        return client.request("PATCH", f"/api/projects/{pid}", request_id="concurrent", json={"name": name})
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(rename, harness, "Alice")
        second = pool.submit(rename, peer, "Bob")
        results = [first.result(), second.result()]
    assert sorted(result.status_code for result in results) == [200, 409]
    assert len(harness.workspace.repository.history("workspace")) == 2
    assert harness.request("GET", "/api/projects").json()[0]["name"] in {"Alice", "Bob"}
