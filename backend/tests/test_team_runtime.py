"""
================================================================================
FILE: backend/tests/test_team_runtime.py
SUMMARY
    Exclusive team startup and safe failure contracts.
BASIC IDEA
    Temporary directories prove one-owner locking and release after failure.
INPUTS / INPUT SOURCES
    Synthetic configuration, private blob roots and dedicated PostgreSQL state.
EXPECTED OUTPUT
    No silent fallback or simultaneous directory owners.
================================================================================
"""
import pytest
from app.team.config import TeamConfig
from app.team.runtime import TeamRuntime
from pg_support import role_config


def configuration(path):
    return TeamConfig(mode='team', public_origin='https://studio.example.org',
        google_client_id='synthetic', google_client_secret='replace-me',
        allowed_domains=frozenset({'example.org'}), bootstrap_subs=frozenset({'owner'}), data_dir=path, db=role_config())


def test_exclusive_ownership_and_release(pg_schema, tmp_path):
    first, second = TeamRuntime(configuration(tmp_path)), TeamRuntime(configuration(tmp_path))
    first.start()
    assert first.repository.storage is first.storage
    assert first.auth_store.storage is first.storage
    assert first.identity.config == first.config
    with pytest.raises(RuntimeError):
        second.start()
    first.close()
    second.start()
    second.close()


def test_failed_start_releases_lock(pg_schema, tmp_path):
    tmp_path.joinpath('team.db').write_bytes(b'opaque unsupported old store')
    runtime = TeamRuntime(configuration(tmp_path))
    with pytest.raises(Exception):
        runtime.start()
    tmp_path.joinpath('team.db').unlink()
    replacement = TeamRuntime(configuration(tmp_path))
    replacement.start()
    replacement.close()


def test_local_config_cannot_activate_team_runtime(tmp_path):
    with pytest.raises(ValueError):
        TeamRuntime(TeamConfig(data_dir=tmp_path))


def test_missing_config_fails_closed():
    with pytest.raises(ValueError):
        TeamConfig.from_env({'SEMANTIC_STUDIO_MODE':'team'})


def test_team_main_mounts_auth_skips_local_seed_and_closes(pg_schema, tmp_path):
    import os
    import subprocess
    import sys
    environment = dict(os.environ, SEMANTIC_STUDIO_MODE='team',
        SEMANTIC_STUDIO_PUBLIC_ORIGIN='https://studio.example.org',
        SEMANTIC_STUDIO_GOOGLE_CLIENT_ID='synthetic',
        SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET='replace-me',
        SEMANTIC_STUDIO_ALLOWED_DOMAINS='example.org',
        SEMANTIC_STUDIO_BOOTSTRAP_SUBS='owner', SEMANTIC_STUDIO_DATA_DIR=str(tmp_path / 'team'),
        STATIC_DIR=str(tmp_path / 'web'))
    static = tmp_path / 'web'
    static.joinpath('assets').mkdir(parents=True)
    static.joinpath('index.html').write_text('<html>login shell</html>')
    static.joinpath('assets/app.js').write_text('/* synthetic login UI */')
    static.joinpath('private.ttl').write_text('synthetic private RDF')
    result = subprocess.run([sys.executable, '-c', """
import sys
def refuse_sqlite(event,args):
    if event == 'sqlite3.connect':
        raise AssertionError('forbidden_storage_connection')
sys.addaudithook(refuse_sqlite)
from fastapi.testclient import TestClient
from app.main import app
from app import library_examples
assert app.openapi_url is None
assert app.docs_url is None
library_examples.seed = lambda *_: (_ for _ in ()).throw(AssertionError('team seeded local library'))
with TestClient(app, base_url='https://studio.example.org') as client:
    assert app.state.team.started
    import io, logging
    output = io.StringIO()
    logger = logging.getLogger('uvicorn.access')
    handler = logging.StreamHandler(output)
    logger.addHandler(handler)
    logger.warning('%s - "%s %s HTTP/%s" %d', '127.0.0.1', 'GET', '/api/auth/callback?code=private-code&state=private-state', '1.1', 303)
    logger.removeHandler(handler)
    assert 'private-code' not in output.getvalue()
    assert 'private-state' not in output.getvalue()
    assert '/api/auth/callback' in output.getvalue()
    assert client.get('/').status_code == 200
    assert client.get('/assets/app.js').status_code == 200
    assert client.get('/private.ttl').status_code == 401
    assert client.get('/api/health').json() == {'status':'ok'}
    assert client.get('/api/auth/status').json()['mode'] == 'team'
    assert client.get('/api/ontologies').status_code == 401
    assert client.post('/api/auth/login',headers={'Origin':'https://studio.example.org','X-Semantic-Studio':'1'}).status_code == 200
    import time
    from app.routers.auth import SESSION_COOKIE
    from app.routers import ontologies
    principal = app.state.team.auth_store.identity('owner','owner@example.org','example.org',now=time.time())
    token = app.state.team.auth_store.create_session(principal.sub,now=time.time())
    csrf = app.state.team.auth_store.authenticate(token,now=time.time()).csrf_token
    client.cookies.set(SESSION_COOKIE, token)
    class NoBodyWorkspace:
        async def handle_request(self,*args):
            raise AssertionError('oversized request reached workspace before cap')
    app.state.team.workspace = NoBodyWorkspace()
    headers = {'Origin':'https://studio.example.org','X-Semantic-Studio':'1',
        'X-Semantic-Studio-CSRF':csrf,'X-Semantic-Studio-Versions':'{"workspace":null}',
        'X-Semantic-Studio-Request-Id':'oversized',
        'Content-Length':str(ontologies.MAX_UPLOAD_BYTES + ontologies.CHUNK_BYTES + 1)}
    assert client.post('/api/ontologies/upload',headers=headers,content=b'small').status_code == 413

assert not app.state.team.started
"""], env=environment, capture_output=True, text=True, timeout=20)
    assert result.returncode == 0, result.stderr + result.stdout


def test_lock_prevents_independent_python_process(pg_schema, tmp_path):
    import subprocess
    import sys
    runtime=TeamRuntime(configuration(tmp_path))
    runtime.start()
    try:
        result=subprocess.run([sys.executable,'-c', '''
import sys
from pathlib import Path
import os
from app.team.pg_config import load_pg_config
from app.team.runtime import TeamRuntime
from app.team.config import TeamConfig
runtime=TeamRuntime(TeamConfig(mode='team',public_origin='https://studio.example.org',
    google_client_id='synthetic',google_client_secret='replace-me',allowed_domains=frozenset({'example.org'}),
    bootstrap_subs=frozenset({'owner'}),data_dir=Path(sys.argv[1]),db=load_pg_config(os.environ,role='app')))
try:
    runtime.start()
except RuntimeError:
    sys.exit(0)
sys.exit(1)
''',str(tmp_path)],capture_output=True,text=True,timeout=15)
        assert result.returncode==0,result.stderr
    finally:
        runtime.close()


def test_runtime_closes_workspace_before_releasing_ownership(pg_schema, tmp_path):
    runtime = TeamRuntime(configuration(tmp_path))
    runtime.start()
    events = []
    class Workspace:
        def close(self):
            assert runtime._lock_file is not None
            events.append('closed')
    original = runtime.workspace
    runtime.workspace = Workspace()
    try:
        runtime.close()
        assert events == ['closed']
    finally:
        original.close()
        runtime.close()


def test_team_static_distribution_links_match_generated_inventory(pg_schema, tmp_path):
    import json
    import os
    from pathlib import Path
    import shutil
    import subprocess
    import sys
    repository = Path(__file__).resolve().parents[2]
    emitted = repository / 'frontend/dist'
    web = tmp_path / 'web'
    # Consume the real generated artifact when the frontend was built. Backend
    # CI also exercises this contract using the same pinned original notices.
    if emitted.joinpath('runtime-components.json').is_file():
        shutil.copytree(emitted, web)
    else:
        web.mkdir()
        shutil.copy2(repository / 'LICENSE', web / 'LICENSE')
        web.joinpath('THIRD_PARTY_NOTICES.md').write_text('# Production notices')
        component = next(item for item in json.loads(repository.joinpath('licenses/dependency-inventory.json').read_text())['components'] if item['ecosystem'] == 'npm' and item['name'] == 'react')
        web.joinpath('runtime-components.json').write_text(json.dumps({'components': [component]}))
        for notice in component['notices']:
            target = web / notice['text']
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(repository / notice['text'], target)
    web.joinpath('private.txt').write_text('synthetic private text')
    environment = dict(os.environ, SEMANTIC_STUDIO_MODE='team',
        SEMANTIC_STUDIO_PUBLIC_ORIGIN='https://studio.example.org',
        SEMANTIC_STUDIO_GOOGLE_CLIENT_ID='synthetic',
        SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET='replace-me',
        SEMANTIC_STUDIO_ALLOWED_DOMAINS='example.org',
        SEMANTIC_STUDIO_BOOTSTRAP_SUBS='owner',
        SEMANTIC_STUDIO_DATA_DIR=str(tmp_path / 'team'), STATIC_DIR=str(web))
    result = subprocess.run([sys.executable, '-c', """
import json,os
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
manifest=json.loads(Path(os.environ['STATIC_DIR'],'runtime-components.json').read_text())
paths=['/LICENSE','/THIRD_PARTY_NOTICES.md','/runtime-components.json']
paths += ['/'+notice['text'] for component in manifest['components'] for notice in component['notices']]
with TestClient(app,base_url='https://studio.example.org') as client:
    for path in paths:
        response=client.get(path)
        assert response.status_code == 200, (path,response.status_code)
    assert client.get('/private.txt').status_code == 401
    assert client.get('/licenses/texts/'+'f'*64+'.txt').status_code == 401
"""], env=environment, capture_output=True, text=True, timeout=20)
    assert result.returncode == 0, result.stderr + result.stdout


def test_local_auth_status_bootstrap_preserves_library_and_exposes_no_login(tmp_path):
    import os
    import subprocess
    import sys
    environment = dict(os.environ, SEMANTIC_STUDIO_MODE='local',
        SEMANTIC_STUDIO_DATA_DIR=str(tmp_path / 'local'), STATIC_DIR=str(tmp_path / 'web'))
    tmp_path.joinpath('web').mkdir()
    tmp_path.joinpath('web/index.html').write_text('<html>local shell</html>')
    result = subprocess.run([sys.executable, '-c', """
import sys
def refuse_sqlite(event,args):
    if event == 'sqlite3.connect':
        raise AssertionError('forbidden_storage_connection')
sys.addaudithook(refuse_sqlite)
from fastapi.testclient import TestClient
from app.main import app
from app.store import store
with TestClient(app,base_url='http://localhost',follow_redirects=False) as client:
    before = [(ontology.id,ontology.source_bytes()) for ontology in store.list()]
    listed = client.get('/api/ontologies').json()
    response = client.get('/api/auth/status')
    assert response.status_code == 200, response.status_code
    assert response.json() == {'mode':'local','authenticated':False,'user':None,'csrf':None}
    assert response.headers['cache-control'] == 'no-store'
    assert client.get('/api/ontologies').json() == listed
    assert [(ontology.id,ontology.source_bytes()) for ontology in store.list()] == before
    for method,path in [('POST','/api/auth/login'),('GET','/api/auth/callback'),('POST','/api/auth/logout')]:
        rejected = client.request(method,path,headers={'X-Semantic-Studio':'1'})
        assert rejected.status_code in (404,405), (path,rejected.status_code)
    assert not hasattr(app.state,'team')
    import sys
    assert 'app.team.auth_store' not in sys.modules
"""], env=environment, capture_output=True, text=True, timeout=20)
    assert result.returncode == 0, result.stderr + result.stdout
