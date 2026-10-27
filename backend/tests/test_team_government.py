"""
================================================================================
FILE: backend/tests/test_team_government.py
SUMMARY
    Proves country-reference authority across transactional team writes.
BASIC IDEA
    Use the dedicated PostgreSQL workspace harness, including real session and
    commit authorization, to check stale reads, replay and one-step Undo.
INPUTS / INPUT SOURCES
    Isolated PostgreSQL, private synthetic sessions and synthetic domain groups.
EXPECTED OUTPUT
    Read-only country authority participates in CAS without being overwritten.
================================================================================
"""
import pytest

from app.team.workspace import TeamWorkspace
from test_team_workspace import Harness

PERIOD = {"start": {"date": None, "open": True}, "end": {"date": None, "open": True}}


@pytest.fixture
def team(tmp_path, pg_repository):
    from app.routers.government import router
    instance = Harness(TeamWorkspace(pg_repository, tmp_path))
    instance.app.include_router(router)
    yield instance
    instance.client.close()
    instance.workspace.close()


def create(team, template, request_id, **fields):
    response = team.request("POST", "/api/projects", request_id=request_id,
                            json={"name": "Synthetic group", "template": template, **fields})
    assert response.status_code == 200, response.text
    return response.json()["id"]


def setup_groups(team):
    source = create(team, "countries", "country-group")
    response = team.request("POST", f"/api/projects/{source}/documents/model/commands", request_id="country",
                            json={"command": "CreateCountry", "args": {"names": [{"value": "Synthetic country", "language": "en"}]}})
    assert response.status_code == 200, response.text
    country = response.json()["created"]
    target = create(team, "government-organizations", "organization-group", domainProfile={
        "id": "government-organizations-v1", "version": 1, "countryProjectId": source})
    response = team.request("GET", f"/api/projects/{target}/government/countries")
    assert response.status_code == 200, response.text
    args = {"names": [{"value": "Synthetic ministry", "language": "en"}], "kind": "Organization", "identifier": "M",
            "existencePeriod": PERIOD, "countryPeriod": PERIOD, "countryIri": country,
            "sources": [{"kind": "text", "value": "Synthetic reference"}], "referenceBasis": response.json()["basis"]}
    return source, target, args


def test_country_snapshot_participates_in_team_conflict_check(team):
    source, target, args = setup_groups(team)
    stale = dict(team.versions)
    response = team.request("POST", f"/api/projects/{source}/documents/model/commands", request_id="change-country",
                            json={"command": "CreateCountry", "args": {"names": [{"value": "Later country", "language": "en"}]}})
    assert response.status_code == 200, response.text
    rejected = team.request("POST", f"/api/projects/{target}/documents/model/commands", request_id="stale-create", versions=stale,
                            json={"command": "CreateGovernmentOrganization", "args": args})
    assert rejected.status_code == 409, rejected.text
    source_text = team.request("GET", f"/api/projects/{target}/documents/model/source").json()["text"]
    assert "Synthetic ministry" not in source_text


def test_lost_response_replay_has_one_organization_and_one_undo(team):
    source, target, args = setup_groups(team)
    before = dict(team.versions)
    url = f"/api/projects/{target}/documents/model/commands"
    response = team.request("POST", url, request_id="register", json={"command": "CreateGovernmentOrganization", "args": args})
    assert response.status_code == 200, response.text
    replay = team.request("POST", url, request_id="register", versions=before, json={"command": "CreateGovernmentOrganization", "args": args})
    assert replay.status_code == 200, replay.text
    assert replay.json()["created"] == response.json()["created"]
    view = team.request("GET", f"/api/projects/{target}/government/view?at=2020-04-01").json()
    assert view["organizations"]["total"] == 1
    source_before = team.request("GET", f"/api/projects/{source}/documents/model/source").json()["text"]
    undone = team.request("POST", f"/api/projects/{target}/documents/model/undo", request_id="undo-register")
    assert undone.status_code == 200, undone.text
    assert team.request("GET", f"/api/projects/{target}/government/view?at=2020-04-01").json()["organizations"]["total"] == 0
    assert team.request("GET", f"/api/projects/{source}/documents/model/source").json()["text"] == source_before


def test_demoted_viewer_cannot_replay_registration(team):
    source, target, args = setup_groups(team)
    initial = dict(team.versions)
    url = f"/api/projects/{target}/documents/model/commands"
    response = team.request("POST", url, request_id="register", json={"command": "CreateGovernmentOrganization", "args": args})
    assert response.status_code == 200, response.text
    second = Harness(team.workspace, "bob")
    try:
        second.request("GET", "/api/team/versions")
        demoted = second.request("PATCH", "/api/team/users/alice", request_id="demote-alice", json={"role": "viewer", "disabled": False, "expectedVersion": 1})
        assert demoted.status_code == 200, demoted.text
        replay = team.request("POST", url, request_id="register", versions=initial, json={"command": "CreateGovernmentOrganization", "args": args})
        assert replay.status_code == 403, replay.text
        fresh = team.request("POST", url, request_id="viewer-create", json={"command": "CreateGovernmentOrganization", "args": args})
        assert fresh.status_code == 403, fresh.text
    finally:
        second.client.close()


def test_profile_preview_does_not_commit_workspace_or_audit(team):
    source, target, args = setup_groups(team)
    before_resources, before_versions = team.workspace.repository.snapshot()
    before_history = team.workspace.repository.history("workspace", 0, 100)
    response = team.request("PATCH", f"/api/projects/{target}", request_id="preview-profile", json={"domainProfile": None, "dryRun": True})
    assert response.status_code == 200, response.text
    assert team.workspace.repository.snapshot() == (before_resources, before_versions)
    assert team.workspace.repository.history("workspace", 0, 100) == before_history


def test_source_change_after_evaluation_is_caught_at_commit(team, monkeypatch):
    source, target, args = setup_groups(team)
    second = Harness(team.workspace, "bob")
    original_commit = team.workspace.repository.commit
    fired = False

    def commit(*positional, **keywords):
        nonlocal fired
        if not fired:
            fired = True
            second.request("GET", "/api/team/versions")
            changed = second.request("POST", f"/api/projects/{source}/documents/model/commands", request_id="concurrent-country",
                                     json={"command": "CreateCountry", "args": {"names": [{"value": "Concurrent country", "language": "en"}]}})
            assert changed.status_code == 200, changed.text
        return original_commit(*positional, **keywords)

    monkeypatch.setattr(team.workspace.repository, "commit", commit)
    try:
        rejected = team.request("POST", f"/api/projects/{target}/documents/model/commands", request_id="register-race",
                                json={"command": "CreateGovernmentOrganization", "args": args})
        assert rejected.status_code == 409, rejected.text
        assert "Synthetic ministry" not in team.request("GET", f"/api/projects/{target}/documents/model/source").json()["text"]
    finally:
        second.client.close()
