"""
================================================================================
FILE: backend/tests/test_team_access.py
SUMMARY
    Explicit route coverage, three-role authorization and CSRF boundary.
BASIC IDEA
    Real sessions and a recording downstream handler expose request bypasses.
INPUTS / INPUT SOURCES
    Existing route tables, synthetic identities and HTTPS requests.
EXPECTED OUTPUT
    Default deny, narrow public paths and workspace-only shared mutations.
================================================================================
"""
import time
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse
from app.team.runtime import TeamRuntime
from app.team.middleware import TeamMiddleware
from app.team.permissions import classify_route, ROUTE_POLICIES, allows
from app.routers import ontologies, queries, projects, data, network, examples
from app.routers.auth import create_auth_router, SESSION_COOKIE
from test_team_runtime import configuration

ORIGIN='https://studio.example.org'
GUARD={'Origin':ORIGIN,'X-Semantic-Studio':'1'}


def test_all_existing_routes_classified():
    from app.main import app
    def pairs(routes):
        for route in routes:
            if hasattr(route, 'original_router'):
                yield from pairs(route.original_router.routes)
            elif getattr(route, 'path', '').startswith('/api/'):
                for method in route.methods:
                    yield method, route.path
    actual = set(pairs(app.routes))
    actual.update(pairs(create_auth_router(None, None, None).routes))
    declared = {(policy.method, policy.template) for policy in ROUTE_POLICIES}
    assert actual <= declared, actual - declared
    assert classify_route('POST', '/api/new-route') is None


@pytest.mark.parametrize('role,operation,expected',[(role,op,role=='admin' or op in ('read','compute') or role=='editor' and op=='edit') for role in ('viewer','editor','admin') for op in ('read','compute','edit','admin')])
def test_role_matrix(role,operation,expected):
    assert allows(role,operation) is expected


@pytest.fixture
def boundary(tmp_path):
    runtime=TeamRuntime(configuration(tmp_path))
    runtime.start()
    class PassThroughWorkspace:
        async def handle_request(self,scope,receive,send,policy,app):
            await app(scope,receive,send)
    runtime.workspace=PassThroughWorkspace()
    app=FastAPI()
    app.state.team=runtime
    app.include_router(create_auth_router(runtime.config,runtime.auth_store,runtime.identity, clock=lambda: time.time()))
    @app.api_route('/{path:path}',methods=['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'])
    async def record(request:Request,path:str):
        if path == 'api/health':
            callback = getattr(runtime, '_test_health_callback', None)
            if callback is not None:
                callback()
        principal=getattr(request.state,'principal',None)
        return {'reached':path,'sub':principal.sub if principal else None}
    app.add_middleware(TeamMiddleware,runtime=runtime,public_static_paths=frozenset({'/','/index.html','/assets/app.js'}))
    with TestClient(app,base_url=ORIGIN,follow_redirects=False) as client:
        yield client,runtime
    runtime.close()


def session(client,runtime,role):
    user=runtime.auth_store.identity('member','member@example.org','example.org',now=time.time())
    if role!='viewer':
        runtime.auth_store.identity('owner','owner@example.org','example.org',now=time.time())
        user=runtime.auth_store.change_access('owner','member',expected_version=user.version,role=role,disabled=False,request_id='access',now=time.time())
    token=runtime.auth_store.create_session(user.sub,now=time.time())
    client.cookies.set(SESSION_COOKIE,token)
    return {**GUARD,'X-Semantic-Studio-CSRF':runtime.auth_store.authenticate(token,now=time.time()).csrf_token}


@pytest.mark.parametrize('method,path',[('GET','/api/ontologies'),('HEAD','/api/ontologies/a/source'),('GET','/api/projects/p/export'),('GET','/api/ontologies/a/documentation'),('GET','/api/%6fntologies'),('GET','/docs'),('GET','/openapi.json'),('GET','/data/private.ttl'),('GET','/assets/private.ttl')])
def test_no_unauthenticated_leaks(boundary,method,path):
    client,_=boundary
    response=client.request(method,path)
    assert response.status_code in (401,403,404)
    assert 'reached' not in response.text


@pytest.mark.parametrize('path',['/','/index.html','/assets/app.js','/api/health','/api/auth/status'])
def test_explicit_public_paths(boundary,path):
    assert boundary[0].get(path).status_code==200


@pytest.mark.parametrize('role',['viewer','editor','admin'])
def test_read_and_compute_roles(boundary,role):
    client,runtime=boundary
    headers=session(client,runtime,role)
    assert client.get('/api/ontologies').json()['sub']=='member'
    assert client.post('/api/ontologies/o/sparql',headers=headers).status_code==200
    assert client.delete('/api/projects/p/reasoning',headers=headers).status_code==200


@pytest.mark.parametrize('headers',[{}, {'Origin':ORIGIN}, {**GUARD,'X-Semantic-Studio-CSRF':'wrong'}, {**GUARD,'Origin':'null'}])
def test_csrf_required_on_unsafe_methods(boundary,headers):
    client,runtime=boundary
    session(client,runtime,'viewer')
    response=client.post('/api/ontologies/o/sparql',headers=headers)
    assert response.status_code==403
    assert response.json()['code']=='csrf'


def test_forged_proxy_headers_ignored(boundary):
    client,runtime=boundary
    headers=session(client,runtime,'viewer')
    assert client.get('/api/ontologies',headers={'Host':'evil.example.org','X-Forwarded-Host':'studio.example.org'}).status_code==400
    headers.update({'Origin':'https://evil.example.org','X-Forwarded-Proto':'https','X-Forwarded-Host':'studio.example.org'})
    assert client.post('/api/ontologies/o/sparql',headers=headers).status_code==403


@pytest.mark.parametrize('role,method,path,status',[('viewer','POST','/api/projects',403),('editor','DELETE','/api/projects/p',403),('viewer','POST','/api/network/grants',403),('editor','POST','/api/projects',428),('admin','DELETE','/api/projects/p',428)])
def test_role_and_version_requirements(boundary,role,method,path,status):
    client,runtime=boundary
    response=client.request(method,path,headers=session(client,runtime,role))
    assert response.status_code==status
    assert 'uiMessage' in response.json()


def test_no_legacy_shared_mutation(boundary):
    client,runtime=boundary
    runtime.workspace=None
    headers=session(client,runtime,'editor')
    headers.update({'X-Semantic-Studio-Versions':'{"library":0}','X-Semantic-Studio-Request-Id':'one'})
    assert client.post('/api/projects',headers=headers).status_code==503


def test_hook_wraps_read_compute_and_shared_update(boundary):
    client,runtime=boundary
    headers=session(client,runtime,'editor')
    calls=[]
    class Workspace:
        async def handle_request(self,scope,receive,send,policy,app):
            calls.append((policy.operation,scope['state']['team_path_params'],scope['state']['principal'].sub))
            await JSONResponse({'workspace':True})(scope,receive,send)
    runtime.workspace=Workspace()
    headers.update({'X-Semantic-Studio-Versions':'{"library":0}','X-Semantic-Studio-Request-Id':'one'})
    assert client.get('/api/ontologies/o/source').json()=={'workspace':True}
    assert client.post('/api/ontologies/o/sparql',headers=headers).json()=={'workspace':True}
    assert client.post('/api/projects',headers=headers).json()=={'workspace':True}
    assert calls==[('read',{'oid':'o'},'member'),('compute',{'oid':'o'},'member'),('edit',{},'member')]


def test_unknown_route_default_deny(boundary):
    client,runtime=boundary
    session(client,runtime,'admin')
    assert client.get('/api/new-route').status_code==403
    assert client.get('/api/ontologies/o/source/').status_code==403


def test_disabled_user_refused_next_request(boundary):
    client,runtime=boundary
    session(client,runtime,'viewer')
    user=next(user for user in runtime.auth_store.users() if user.sub=='member')
    runtime.auth_store.identity('owner','owner@example.org','example.org',now=time.time())
    runtime.auth_store.change_access('owner','member',expected_version=user.version,role='viewer',disabled=True,request_id='stop',now=time.time())
    assert client.get('/api/ontologies').status_code==401


def test_open_close_cannot_run_without_transactional_workspace(boundary):
    client,runtime=boundary
    runtime.workspace=None
    headers=session(client,runtime,'viewer')
    assert client.post('/api/projects/p/open',headers=headers).status_code==503
    assert client.post('/api/projects/p/close',headers=headers,json={'discard':True}).status_code==503


@pytest.mark.parametrize('extra',[
    [('Origin',ORIGIN),('Origin',ORIGIN),('X-Semantic-Studio','1')],
    [('Origin',ORIGIN),('X-Semantic-Studio','1'),('X-Semantic-Studio','1')],
])
def test_duplicate_guard_headers_refused(boundary,extra):
    client,runtime=boundary
    valid=session(client,runtime,'viewer')
    response=client.post('/api/ontologies/o/sparql',headers=extra+[('X-Semantic-Studio-CSRF',valid['X-Semantic-Studio-CSRF'])])
    assert response.status_code==403


@pytest.mark.parametrize('versions',['null','[]','{}','{"library":true}','{"library":-1}','{"library":"0"}'])
def test_malformed_version_headers_never_dispatch(boundary,versions):
    client,runtime=boundary
    headers=session(client,runtime,'editor')
    headers.update({'X-Semantic-Studio-Versions':versions,'X-Semantic-Studio-Request-Id':'request'})
    assert client.post('/api/projects',headers=headers).status_code==428


def test_unconnected_read_cannot_reach_legacy_services(boundary):
    client,runtime=boundary
    session(client,runtime,'viewer')
    runtime.workspace=None
    assert client.get('/api/ontologies').status_code==503


def test_absent_resource_version_can_reach_workspace(boundary):
    client,runtime=boundary
    headers=session(client,runtime,'editor')
    headers.update({'X-Semantic-Studio-Versions':'{"workspace":null}','X-Semantic-Studio-Request-Id':'first'})
    assert client.post('/api/projects',headers=headers).status_code==200


@pytest.mark.parametrize('path', ['/api/auth/status', '/api/team/versions'])
def test_background_polls_cannot_extend_idle_expiry(boundary, monkeypatch, path):
    client, runtime = boundary
    now = [100.0]
    monkeypatch.setattr('app.team.middleware.time.time', lambda: now[0])
    session(client, runtime, 'viewer')
    for elapsed in (600, 1200, 1799):
        now[0] = 100.0 + elapsed
        response = client.get(path)
        assert response.status_code == 200
        if path.endswith('status'):
            assert response.json()['authenticated'] is True
    now[0] = 1900.0
    response = client.get(path)
    if path.endswith('status'):
        assert response.json()['authenticated'] is False
    else:
        assert response.status_code == 401


def test_user_api_request_refreshes_idle_deadline(boundary, monkeypatch):
    client, runtime = boundary
    now = [100.0]
    monkeypatch.setattr('app.team.middleware.time.time', lambda: now[0])
    session(client, runtime, 'viewer')
    now[0] = 1800.0
    assert client.get('/api/ontologies').status_code == 200
    now[0] = 1900.0
    assert client.get('/api/team/versions').status_code == 200
    now[0] = 3600.0
    assert client.get('/api/team/versions').status_code == 401


def test_sqlite_writer_wait_cannot_block_public_health(boundary, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    import threading

    client, runtime = boundary
    session(client, runtime, 'viewer')
    writer_ready = threading.Event()
    release_writer = threading.Event()
    authentication_started = threading.Event()
    order = []
    original = runtime.auth_store.authenticate

    def authenticate(*args, **kwargs):
        authentication_started.set()
        result = original(*args, **kwargs)
        order.append('authenticated')
        return result

    def health():
        order.append('health')
        release_writer.set()

    def held_writer():
        with runtime.repository.connection() as connection:
            connection.execute('BEGIN IMMEDIATE')
            writer_ready.set()
            # This timeout only breaks a deadlock on a broken implementation;
            # correctness is the event ordering below, never elapsed duration.
            release_writer.wait(timeout=5)
            connection.rollback()

    monkeypatch.setattr(runtime.auth_store, 'authenticate', authenticate)
    runtime._test_health_callback = health
    with ThreadPoolExecutor(max_workers=3) as workers:
        writer = workers.submit(held_writer)
        try:
            assert writer_ready.wait(timeout=5)
            authenticated = workers.submit(client.get, '/api/ontologies')
            assert authentication_started.wait(timeout=5)
            liveness = workers.submit(client.get, '/api/health')
            assert liveness.result(timeout=15).status_code == 200
            assert authenticated.result(timeout=15).status_code == 200
            writer.result(timeout=5)
            assert order == ['health', 'authenticated']
        finally:
            release_writer.set()
            writer.result(timeout=5)
