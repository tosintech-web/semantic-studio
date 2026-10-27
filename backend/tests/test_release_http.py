"""
FILE: backend/tests/test_release_http.py
SUMMARY
    Release HTTP permissions, browser guards and stable approved downloads.
BASIC IDEA
    Send real requests through the existing team middleware and workspace.
INPUTS / INPUT SOURCES
    Real isolated PostgreSQL sessions and synthetic project RDF.
EXPECTED OUTPUT
    Explicit refusals, review-bound commits and unchanged replay envelopes.
"""
import json, time
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
from app.team.middleware import TeamMiddleware
from app.routers.auth import SESSION_COOKIE
from app.main import request_body_limit
from test_team_workspace import harness
from test_team_releases import seed,META
from test_team_auth_store import access

pytestmark=pytest.mark.team_db
ORIGIN='https://studio.example.org'

@pytest.fixture
def boundary(harness):
    pid,service=seed(harness)
    runtime=SimpleNamespace(config=SimpleNamespace(public_origin=ORIGIN),auth_store=harness.workspace.auth_store,workspace=harness.workspace)
    app=TeamMiddleware(harness.app,runtime=runtime,body_limit=request_body_limit)
    with TestClient(app,base_url=ORIGIN) as c:
        c.cookies.set(SESSION_COOKIE,harness.token)
        csrf=runtime.auth_store.authenticate(harness.token,now=time.time).csrf_token
        yield harness,pid,c,{'Origin':ORIGIN,'X-Semantic-Studio':'1','X-Semantic-Studio-CSRF':csrf}

def test_preview_approve_download_replay(boundary):
    h,pid,c,headers=boundary; url=f'/api/projects/{pid}'
    preview=c.post(url+'/release-preview',headers=headers,json=META)
    assert preview.status_code==200,preview.text
    body={**META,'previewDigest':preview.json()['previewDigest']}
    headers={**headers,'X-Semantic-Studio-Request-Id':'approve','X-Semantic-Studio-Versions':json.dumps(preview.json()['basis']['resourceVersions'])}
    approved=c.post(url+'/releases',headers=headers,json=body)
    assert approved.status_code==201,approved.text
    replay=c.post(url+'/releases',headers=headers,json=body)
    assert replay.content==approved.content and replay.status_code==201
    rid=approved.json()['releaseId']
    package=c.get(url+f'/releases/{rid}/package')
    assert package.status_code==200 and package.content.startswith(b'PK')
    assert c.head(url+f'/releases/{rid}/package').content==b''
    assert c.get(url+'/releases').json()['total']==1
    assert c.get(url+'/releases?offset=-1').status_code==422
    assert c.post(url+'/release-preview',headers=headers,json={'source':'x'*70000,'license':'x'}).status_code==413
    assert c.post(url+'/release-preview',json=META).status_code==403

@pytest.mark.parametrize('role,status',[('viewer',403),('editor',200),('admin',200)])
def test_role_matrix(boundary,role,status):
    h,pid,c,headers=boundary
    auth=h.workspace.auth_store
    user=auth.identity('member','member@example.org','example.org',now=time.time)
    if role!='viewer': access(auth,'alice','member',expected_version=user.version,role=role,disabled=False,request_id='access-role',now=time.time)
    token=auth.create_session('member',now=time.time)
    c.cookies.set(SESSION_COOKIE,token)
    headers={**headers,'X-Semantic-Studio-CSRF':auth.authenticate(token,now=time.time).csrf_token}
    response=c.post(f'/api/projects/{pid}/release-preview',headers=headers,json=META)
    assert response.status_code==status,response.text
    headers.update({'X-Semantic-Studio-Request-Id':'approve','X-Semantic-Studio-Versions':json.dumps(h.versions)})
    if role!='admin': assert c.post(f'/api/projects/{pid}/releases',headers=headers,json=META).status_code==403
