"""
FILE: backend/tests/test_team_releases.py
SUMMARY
    Accepted project state becomes immutable, replayable approved releases.
BASIC IDEA
    Exercise real team transactions and archive references, never fake a DB.
INPUTS / INPUT SOURCES
    Dedicated PostgreSQL and synthetic project fixtures.
EXPECTED OUTPUT
    Stable release bytes, explicit conflicts and permanent approved versions.
"""
import json
import pytest
from app.releases.service import ReleaseService
from app.releases.package import validate_package, ReleaseError
from app.team.workspace import TeamWorkspace
from app.team.auth_store import AuthRefused
from app.team.repository import Conflict
from app.team.pg_archive import resource_references
from test_team_workspace import harness

pytestmark=pytest.mark.team_db
META={'source':'Synthetic','license':'CC0 synthetic data'}

def seed(h):
    pid=h.create()
    r=h.request('PUT',f'/api/projects/{pid}/documents/model/source', request_id='source',json={'text':'@prefix skos: <http://www.w3.org/2004/02/skos/core#> . <urn:test:dog> skos:prefLabel "犬"@ja .','expectedRevision':0})
    assert r.status_code==200,r.text
    return pid,ReleaseService(h.workspace.repository,h.workspace.blobs)

def approve(h,s,pid,preview=None,rid='approve',expected=None):
    preview=preview or s.preview(project_id=pid,metadata=META)
    _,versions=h.workspace.repository.snapshot(); versions.setdefault('workspace',None)
    return s.approve(actor=h.actor,project_id=pid,metadata=META,preview_digest=preview['previewDigest'],expected=versions if expected is None else expected,
        request_id=rid,identity={'request':rid},authorize=h.authorize,
        response_factory=lambda summary,v:TeamWorkspace._response(201,[(b'content-type',b'application/json')],json.dumps(summary).encode(),v))

def test_approve_uses_committed_unsaved_model(harness):
    pid,s=seed(harness)
    output=approve(harness,s,pid)
    import base64
    body=json.loads(base64.b64decode(output['body']))
    checked=validate_package(s.read_package(project_id=pid,release_id=body['releaseId']))
    assert '犬' in checked.files['dictionary.json'].decode()
    assert s.list_releases(project_id=pid,offset=0,limit=50)['total']==1

def test_stale_preview_conflicts(harness):
    pid,s=seed(harness); p=s.preview(project_id=pid,metadata=META)
    harness.request('PATCH',f'/api/projects/{pid}',request_id='rename',json={'name':'changed'})
    with pytest.raises((ReleaseError,Conflict)): approve(harness,s,pid,p)
    assert s.list_releases(project_id=pid,offset=0,limit=50)['total']==0

def test_replay_after_lost_response_has_one_release_and_audit(harness,monkeypatch):
    pid,s=seed(harness); p=s.preview(project_id=pid,metadata=META)
    _,basis=harness.workspace.repository.snapshot()
    from app.team.pg_storage import StorageError
    committed=[];real_commit=harness.workspace.repository.commit
    def lose_response(*args,**kwargs):
        result=real_commit(*args,**kwargs);committed.append(result['response'])
        raise StorageError('writer_unavailable')
    monkeypatch.setattr(harness.workspace.repository,'commit',lose_response)
    with pytest.raises(StorageError):approve(harness,s,pid,p,expected=basis)
    b=approve(harness,s,pid,p,expected=basis)
    assert committed==[b]
    assert len(harness.workspace.repository.history('workspace'))==3
    assert s.list_releases(project_id=pid,offset=0,limit=50)['total']==1

def test_approval_cannot_be_undone_even_by_admin(harness):
    pid,s=seed(harness); approve(harness,s,pid)
    harness.versions=harness.workspace.repository.snapshot()[1]
    response=harness.request('POST',f'/api/projects/{pid}/documents/model/undo',request_id='undo-release')
    assert response.status_code==409
    assert s.list_releases(project_id=pid,offset=0,limit=50)['total']==1

def test_project_deletion_keeps_release_downloadable(harness):
    pid,s=seed(harness); approve(harness,s,pid)
    row=s.list_releases(project_id=pid,offset=0,limit=50)['items'][0]
    original=s.read_package(project_id=pid,release_id=row['releaseId'])
    harness.versions=harness.workspace.repository.snapshot()[1]
    assert harness.request('DELETE',f'/api/projects/{pid}',request_id='delete').status_code==200
    assert s.read_package(project_id=pid,release_id=row['releaseId'])==original
    release=harness.workspace.repository.read('release:'+row['releaseId'])
    assert resource_references('release:'+row['releaseId'],json.dumps(release.payload))=={release.payload['packageBlob']}

def test_demoted_admin_cannot_replay(harness):
    from test_team_auth_store import access
    import time
    pid,s=seed(harness);p=s.preview(project_id=pid,metadata=META);_,basis=harness.workspace.repository.snapshot()
    approve(harness,s,pid,p,expected=basis)
    auth=harness.workspace.auth_store
    auth.identity('bob','bob@example.org','example.org',now=time.time)
    user=next(u for u in auth.users() if u.sub=='alice')
    access(auth,'bob','alice',expected_version=user.version,role='editor',disabled=False,request_id='demote',now=time.time)
    with pytest.raises(AuthRefused): approve(harness,s,pid,p,expected=basis)

def test_ordinary_edit_and_undo_preserve_release(harness):
    pid,s=seed(harness);approve(harness,s,pid)
    rid=s.list_releases(project_id=pid,offset=0,limit=50)['items'][0]['releaseId'];before=s.read_package(project_id=pid,release_id=rid)
    harness.versions=harness.workspace.repository.snapshot()[1]
    assert harness.request('PATCH',f'/api/projects/{pid}',request_id='rename',json={'name':'new'}).status_code==200
    assert harness.request('POST',f'/api/projects/{pid}/documents/model/undo',request_id='undo-rename').status_code==200
    assert s.read_package(project_id=pid,release_id=rid)==before

def test_release_backup_restore_keeps_history_blobs(harness,tmp_path):
    from app.team.pg_storage import PgStorage
    from app.team.pg_archive import backup,restore
    from app.team.pg_schema import ensure_schema
    from app.team.repository import TeamRepository
    from app.team.blobs import BlobStore
    from pg_support import role_config,reset_test_schema
    pid,s=seed(harness);approve(harness,s,pid)
    row=s.list_releases(project_id=pid,offset=0,limit=50)['items'][0];rid=row['releaseId'];before=s.read_package(project_id=pid,release_id=rid)
    storage=PgStorage(role_config('backup'),on_fatal=lambda kind:None)
    archive=tmp_path/'archive'
    try:backup(storage,harness.workspace.blobs.root,archive)
    finally:storage.close()
    harness.workspace.close();harness.workspace.repository.storage.close();reset_test_schema()
    maintenance=PgStorage(role_config('maintenance'),on_fatal=lambda kind:None)
    target=tmp_path/'restored'
    try:ensure_schema(maintenance);restore(maintenance,archive,target)
    finally:maintenance.close()
    app=PgStorage(role_config(),on_fatal=lambda kind:None)
    try:
        app.start_writer();service=ReleaseService(TeamRepository(app),BlobStore(target/'blobs'))
        assert service.read_package(project_id=pid,release_id=rid)==before
    finally:app.close()


@pytest.mark.parametrize('template',['countries','government-organizations'])
def test_government_profiles_refuse_preview_and_new_approval(harness,template):
    reply=harness.request('POST','/api/projects',request_id='domain-group',json={'name':'Synthetic domain','template':template})
    assert reply.status_code==200,reply.text
    pid=reply.json()['id'];service=ReleaseService(harness.workspace.repository,harness.workspace.blobs)
    before=harness.workspace.repository.snapshot()
    with pytest.raises(ReleaseError,match='government_release_profile_unsupported'):
        service.preview(project_id=pid,metadata=META)
    with pytest.raises(ReleaseError,match='government_release_profile_unsupported'):
        approve(harness,service,pid,preview={'previewDigest':'0'*64},rid='unsupported-domain')
    assert harness.workspace.repository.snapshot()==before


def test_profile_refusal_has_same_explicit_http_code_for_preview_and_approval(harness):
    from types import SimpleNamespace
    import base64
    from app.releases.http import dispatch_release_request
    response=harness.request('POST','/api/projects',request_id='domain-http',json={'name':'Synthetic countries','template':'countries'})
    pid=response.json()['id'];service=ReleaseService(harness.workspace.repository,harness.workspace.blobs)
    for route,body in [('release-preview',META),('releases',{**META,'previewDigest':'0'*64})]:
        scope={'method':'POST','state':{'team_path_params':{'pid':pid},'principal':SimpleNamespace(sub=harness.actor),'team_route_template':f'/api/projects/{{pid}}/{route}'}}
        output=dispatch_release_request(service,scope=scope,body=json.dumps(body).encode(),expected=harness.versions,request_id='deny-'+route,identity={'request':route},authorize=harness.authorize)
        assert output['status']==422
        payload=json.loads(base64.b64decode(output['body']))
        assert payload['code']=='government_release_profile_unsupported'
        assert payload['uiMessage']['code']=='government_release_profile_unsupported'
