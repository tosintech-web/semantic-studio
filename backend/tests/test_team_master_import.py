"""
FILE: backend/tests/test_team_master_import.py
SUMMARY: Transactional master preparation, replay, no-op and authorization.
BASIC IDEA: Exercise signed source batches through the real PostgreSQL workspace.
INPUTS / INPUT SOURCES: Synthetic CSV and private authenticated team fixtures.
EXPECTED OUTPUT: Read-only previews and exactly one atomic accepted operation.
"""
import json
import pytest
from test_team_government import team, create
from test_master_import_http import MAPPING

pytestmark=pytest.mark.team_db


def prepare(team,pid):
    r=team.request('POST',f'/api/projects/{pid}/government/import/prepare',files={'file':('countries.csv',b'code,name\nAA,Alpha\n')},data={'mode':'countries','mapping':json.dumps(MAPPING),'operationNonce':'team-import'})
    assert r.status_code==200,r.text
    return {'batch':r.json()['batch'],'receipt':r.json()['receipt']}


def review(team,pid,args):
    r=team.request('POST',f'/api/projects/{pid}/documents/model/commands',json={'command':'ImportMasterBatch','args':args,'dryRun':True})
    assert r.status_code==200,r.text
    return {**args,'previewBasis':r.json()['basis']}


def test_import_preview_is_read_only_and_apply_replay_noop_undo(team):
    pid=create(team,'countries','create-import')
    before=team.workspace.repository.snapshot()
    history=team.workspace.repository.history('workspace',0,100)
    args=review(team,pid,prepare(team,pid))
    assert team.workspace.repository.snapshot()==before
    assert team.workspace.repository.history('workspace',0,100)==history
    url=f'/api/projects/{pid}/documents/model/commands'
    versions=dict(team.versions)
    body={'command':'ImportMasterBatch','args':args}
    applied=team.request('POST',url,request_id='apply-import',json=body)
    assert applied.status_code==200,applied.text
    replay=team.request('POST',url,request_id='apply-import',versions=versions,json=body)
    assert replay.status_code==200 and replay.json()==applied.json()
    args=review(team,pid,prepare(team,pid))
    before=team.workspace.repository.snapshot()
    history=team.workspace.repository.history('workspace',0,100)
    result=team.request('POST',url,request_id='noop-import',json={'command':'ImportMasterBatch','args':args})
    assert result.status_code==200 and result.json()['noop'],result.text
    assert team.workspace.repository.snapshot()==before
    assert team.workspace.repository.history('workspace',0,100)==history
    assert result.json()['state']['canUndo']
    assert team.request('POST',f'/api/projects/{pid}/documents/model/undo',request_id='undo-import').status_code==200
    assert 'Alpha' not in team.request('GET',f'/api/projects/{pid}/documents/model/source').json()['text']


def test_import_stale_versions_cannot_publish(team):
    pid=create(team,'countries','create-stale-import')
    args=review(team,pid,prepare(team,pid));versions=dict(team.versions)
    url=f'/api/projects/{pid}/documents/model/commands'
    changed=team.request('POST',url,request_id='concurrent',json={'command':'CreateCountry','args':{'names':[{'value':'Other','language':'en'}]}})
    assert changed.status_code==200,changed.text
    refused=team.request('POST',url,request_id='stale-import',versions=versions,json={'command':'ImportMasterBatch','args':args})
    assert refused.status_code==409,refused.text
    assert 'Alpha' not in team.request('GET',f'/api/projects/{pid}/documents/model/source').json()['text']


def test_import_policy_requires_editor_without_read_publication():
    from app.team.permissions import classify_route,allows
    for step in ('inspect','prepare'):
        policy,_=classify_route('POST',f'/api/projects/p/government/import/{step}')
        assert policy.operation=='edit' and not policy.shared_update
        assert not allows('viewer',policy.operation)
    assert classify_route('GET','/api/projects/p/government/import/templates/countries/csv')[0].operation=='read'


def test_accepted_import_replay_survives_receipt_key_rotation(team,monkeypatch):
    from app.government import import_receipts
    pid=create(team,'countries','create-restart-import');args=review(team,pid,prepare(team,pid));before=dict(team.versions)
    url=f'/api/projects/{pid}/documents/model/commands';body={'command':'ImportMasterBatch','args':args}
    reply=team.request('POST',url,request_id='restart-import',json=body);assert reply.status_code==200,reply.text
    monkeypatch.setattr(import_receipts,'_signer',import_receipts.SourceReceiptSigner())
    replay=team.request('POST',url,request_id='restart-import',versions=before,json=body)
    assert replay.status_code==200 and replay.json()==reply.json()
    fresh=team.request('POST',url,json={**body,'dryRun':True})
    assert fresh.status_code==422,fresh.text


@pytest.mark.parametrize('step',['inspect','prepare'])
def test_viewer_cannot_read_import_source(team,step):
    from test_team_workspace import Harness
    pid=create(team,'countries','viewer-master')
    second=Harness(team.workspace,'bob')
    try:
        second.request('GET','/api/team/versions')
        result=second.request('PATCH','/api/team/users/alice',request_id='viewer-import-role',json={'role':'viewer','disabled':False,'expectedVersion':1})
        assert result.status_code==200,result.text
        refused=team.request('POST',f'/api/projects/{pid}/government/import/{step}',files={'file':('test.csv',b'code,name\nAA,Alpha\n')},data={'mode':'countries','mapping':json.dumps(MAPPING),'operationNonce':'viewer'})
        assert refused.status_code==403,refused.text
    finally:second.client.close()
