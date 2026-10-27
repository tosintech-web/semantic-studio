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


def test_change_preview_is_read_only_then_replay_and_undo_are_atomic(team):
    source,target,args=setup_groups(team)
    url=f'/api/projects/{target}/documents/model/commands'
    registered=team.request('POST',url,request_id='register-for-change',json={'command':'CreateGovernmentOrganization','args':args})
    assert registered.status_code==200,registered.text
    iri=registered.json()['created']
    body={'kind':'rename','effectiveDate':'2030-01-01','originalIris':[iri],'resultingIris':[iri],
          'relationEdits':[],'nameEdits':[{'entity':iri,'value':'Future','language':'en','period':{'start':{'date':'2030-01-01','open':False},'end':PERIOD['end']},'sources':args['sources']}],
          'existenceEdits':[],'sources':args['sources'],'description':'Synthetic rename','referenceBasis':args['referenceBasis']}
    before=team.workspace.repository.snapshot()
    review=team.request('POST',url,request_id='preview-change',json={'command':'ApplyGovernmentChange','args':body,'dryRun':True})
    assert review.status_code==200,review.text
    assert team.workspace.repository.snapshot()==before
    approved={**body,'previewBasis':review.json()['basis']}
    versions=dict(team.versions)
    reply=team.request('POST',url,request_id='apply-change',json={'command':'ApplyGovernmentChange','args':approved})
    assert reply.status_code==200,reply.text
    replay=team.request('POST',url,request_id='apply-change',versions=versions,json={'command':'ApplyGovernmentChange','args':approved})
    assert replay.status_code==200 and replay.json()==reply.json()
    source_before=team.request('GET',f'/api/projects/{source}/documents/model/source').json()['text']
    assert team.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()['organizations']['items'][0]['label']=='Future'
    assert team.request('POST',f'/api/projects/{target}/documents/model/undo',request_id='undo-change').status_code==200
    assert team.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()['organizations']['items'][0]['label']=='Synthetic ministry'
    assert team.request('GET',f'/api/projects/{source}/documents/model/source').json()['text']==source_before


def test_change_preview_cannot_commit_after_another_editor_changes_target(team):
    _,target,args=setup_groups(team)
    url=f'/api/projects/{target}/documents/model/commands'
    reply=team.request('POST',url,request_id='register-base',json={'command':'CreateGovernmentOrganization','args':args})
    assert reply.status_code==200,reply.text
    iri=reply.json()['created']
    body={'entity':iri,'value':'Future','language':'en','period':PERIOD,'sources':args['sources'],'referenceBasis':args['referenceBasis']}
    review=team.request('POST',url,request_id='review-name',json={'command':'PutGovernmentName','args':body,'dryRun':True})
    assert review.status_code==200,review.text
    second=Harness(team.workspace,'bob')
    try:
        second.request('GET','/api/team/versions')
        changed=second.request('POST',url,request_id='other-editor',json={'command':'CreateGovernmentOrganization','args':{**args,'names':[{'value':'Later','language':'en'}]}})
        assert changed.status_code==200,changed.text
        team.request('GET','/api/team/versions')
        refused=team.request('POST',url,request_id='apply-stale-review',json={'command':'PutGovernmentName','args':{**body,'previewBasis':review.json()['basis']}})
        assert refused.status_code==409,refused.text
    finally:
        second.client.close()


@pytest.mark.parametrize('flag',['true',1])
def test_malformed_history_preview_never_commits_or_audits(team,flag):
    _,target,args=setup_groups(team)
    url=f'/api/projects/{target}/documents/model/commands'
    reply=team.request('POST',url,request_id='register-boolean',json={'command':'CreateGovernmentOrganization','args':args})
    assert reply.status_code==200,reply.text
    body={'entity':reply.json()['created'],'value':'Name','language':'en','period':PERIOD,'sources':args['sources'],'referenceBasis':args['referenceBasis']}
    before=team.workspace.repository.snapshot()
    history=team.workspace.repository.history('workspace',0,100)
    response=team.request('POST',url,request_id='malformed-preview',json={'command':'PutGovernmentName','args':body,'dryRun':flag})
    assert response.status_code==422,response.text
    assert team.workspace.repository.snapshot()==before
    assert team.workspace.repository.history('workspace',0,100)==history


def changed_team(team):
    source,target,args=setup_groups(team)
    url=f'/api/projects/{target}/documents/model/commands'
    registered=team.request('POST',url,request_id='registered-history-base',json={'command':'CreateGovernmentOrganization','args':args})
    assert registered.status_code==200,registered.text
    iri=registered.json()['created']
    body={'kind':'rename','effectiveDate':'2030-01-01','originalIris':[iri],'resultingIris':[iri],
          'relationEdits':[],'nameEdits':[{'entity':iri,'value':'Future ministry','language':'en','period':{'start':{'date':'2030-01-01','open':False},'end':PERIOD['end']},'sources':args['sources']}],
          'existenceEdits':[],'sources':args['sources'],'description':'Synthetic history','referenceBasis':args['referenceBasis']}
    review=team.request('POST',url,request_id='review-persistent-history',json={'command':'ApplyGovernmentChange','args':body,'dryRun':True})
    assert review.status_code==200,review.text
    response=team.request('POST',url,request_id='apply-persistent-history',json={'command':'ApplyGovernmentChange','args':{**body,'previewBasis':review.json()['basis']}})
    assert response.status_code==200,response.text
    return source,target,args,iri,response.json()['created']


def test_government_history_and_one_step_undo_survive_real_writer_restart(team):
    from app.routers.government import router
    source,target,args,iri,change=changed_team(team)
    before=team.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()
    source_text=team.request('GET',f'/api/projects/{source}/documents/model/source').json()['text']
    restarted=team.restarted();restarted.app.include_router(router)
    try:
        after=restarted.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()
        assert after['basis']==before['basis'] and after['referenceBasis']==before['referenceBasis']
        assert after['changes']['items'][0]['iri']==change and after['organizations']['items'][0]['iri']==iri
        assert after['organizations']['items'][0]['label']=='Future ministry'
        undone=restarted.request('POST',f'/api/projects/{target}/documents/model/undo',request_id='undo-after-restart')
        assert undone.status_code==200,undone.text
        final=restarted.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()
        assert final['changes']['total']==0 and final['names']['total']==0
        assert final['organizations']['items'][0]['label']=='Synthetic ministry'
        assert restarted.request('GET',f'/api/projects/{source}/documents/model/source').json()['text']==source_text
    finally:
        restarted.client.close()


def test_government_backup_restore_retains_profiles_rdf_and_recomputes_country_basis(team,tmp_path):
    from app.team.pg_archive import backup,restore
    from app.team.pg_storage import PgStorage
    from app.team.pg_schema import ensure_schema
    from app.team.repository import TeamRepository
    from app.routers.government import router
    from pg_support import role_config,reset_test_schema
    source,target,args,iri,change=changed_team(team)
    before=team.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()
    snapshot=team.workspace.repository.snapshot()
    archive=tmp_path/'private-generation'
    backup_storage=PgStorage(role_config('backup'),on_fatal=lambda kind:None)
    try:
        backup(backup_storage,team.workspace.blobs.root,archive)
    finally:
        backup_storage.close()
    team.workspace.close();team.workspace.repository.storage.close();reset_test_schema()
    maintenance=PgStorage(role_config('maintenance'),on_fatal=lambda kind:None)
    destination=tmp_path/'restored-government'
    try:
        ensure_schema(maintenance);restore(maintenance,archive,destination)
    finally:
        maintenance.close()
    storage=PgStorage(role_config(),on_fatal=lambda kind:None)
    recovered=None
    try:
        storage.start_writer();workspace=TeamWorkspace(TeamRepository(storage),destination)
        assert workspace.repository.snapshot()==snapshot
        recovered=Harness(workspace);recovered.app.include_router(router)
        after=recovered.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()
        assert after['basis']==before['basis'] and after['referenceBasis']==before['referenceBasis']
        assert after['changes']['items'][0]['iri']==change and after['organizations']['items'][0]['iri']==iri
        profiles={p['id']:p['domainProfile'] for p in recovered.request('GET','/api/projects').json()}
        assert profiles[target]['countryProjectId']==source and profiles[source]['id']=='countries-v1'
        undone=recovered.request('POST',f'/api/projects/{target}/documents/model/undo',request_id='undo-restored-history')
        assert undone.status_code==200,undone.text
        assert recovered.request('GET',f'/api/projects/{target}/government/view?at=2030-01-01').json()['changes']['total']==0
        changed=recovered.request('POST',f'/api/projects/{source}/documents/model/commands',request_id='country-after-restore',json={'command':'CreateCountry','args':{'names':[{'value':'Later country','language':'en'}]}})
        assert changed.status_code==200,changed.text
        refreshed=recovered.request('GET',f'/api/projects/{target}/government/countries').json()
        assert refreshed['basis']!=before['referenceBasis']
        refused=recovered.request('POST',f'/api/projects/{target}/documents/model/commands',request_id='stale-after-restore',json={'command':'CreateGovernmentOrganization','args':args})
        assert refused.status_code==409,refused.text
        assert recovered.request('GET',f'/api/projects/{target}/government/countries').json()['total']==2
    finally:
        if recovered:
            recovered.client.close();recovered.workspace.close()
        storage.close()
