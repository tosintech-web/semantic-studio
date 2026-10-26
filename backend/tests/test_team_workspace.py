"""
================================================================================
FILE: backend/tests/test_team_workspace.py
================================================================================
SUMMARY
    Exercises transactional team requests through the existing project handlers.
BASIC IDEA
    Supply an authenticated scope at the workspace boundary, then assert the
    persisted results across actors, restart, replay and injected storage failure.
INPUTS / INPUT SOURCES
    - Dedicated internal PostgreSQL and synthetic projects/sessions.
EXPECTED OUTPUT
    - Atomic updates, stable HTTP replay and non-destructive screen closure.
================================================================================
"""
import json
import time
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient
from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse

from app.team.repository import TeamRepository
from app.team.workspace import TeamWorkspace
from app.team.auth_store import AuthStore, AuthRefused
from app.team.pg_storage import StorageError

pytestmark = pytest.mark.team_db


class Harness:
    def __init__(self, workspace, actor="alice"):
        from app.routers import projects, queries, network, data, ontologies, examples
        self.workspace, self.actor = workspace, actor
        if workspace.auth_store is None:
            workspace.auth_store = AuthStore(workspace.repository.storage, bootstrap_subs=frozenset({'alice', 'bob'}))
        workspace.auth_store.identity(actor, actor + '@example.org', 'example.org', now=time.time)
        self.token = workspace.auth_store.create_session(actor, now=time.time)
        self.app = FastAPI()
        for module in (projects, queries, network, data, ontologies, examples):
            self.app.include_router(module.router)
        self.client = TestClient(self, base_url="http://localhost")
        self.versions = {"workspace": None}

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        try:
            view = await run_in_threadpool(self.workspace.auth_store.authenticate, self.token, now=time.time)
        except StorageError:
            return await JSONResponse({'code': 'storage_error'}, status_code=503)(scope, receive, send)
        except AuthRefused as error:
            return await JSONResponse({'code': error.code}, status_code=401)(scope, receive, send)
        scope.setdefault("state", {})["principal"] = view.principal
        path = scope["path"]
        shared = scope["method"] not in ("GET", "HEAD") and not path.endswith(("/open", "/close", "/validate", "/reasoning"))
        from app.team.permissions import classify_route
        match = classify_route(scope['method'], path)
        operation = match[0].operation if match else 'edit'
        policy = SimpleNamespace(method=scope["method"], template=path, operation=operation, shared_update=shared)
        scope['state']['team_request_auth'] = self.workspace.auth_store.bind_request(self.token, operation)
        await self.workspace.handle_request(scope, receive, send, policy, self.app)

    def request(self, method, path, *, request_id=None, versions=None, **kwargs):
        headers = dict(kwargs.pop("headers", {}))
        if request_id:
            headers["X-Semantic-Studio-Request-Id"] = request_id
            headers["X-Semantic-Studio-Versions"] = json.dumps(self.versions if versions is None else versions)
        response = self.client.request(method, path, headers=headers, **kwargs)
        if response.headers.get("x-semantic-studio-versions"):
            self.versions = json.loads(response.headers["x-semantic-studio-versions"])
        return response

    def create(self):
        response = self.request("POST", "/api/projects", request_id="create", json={"name": "Synthetic", "template": "empty"})
        assert response.status_code == 200, response.text
        return response.json()["id"]

    def restarted(self):
        from pg_support import restart_workspace
        self.workspace = restart_workspace(self.workspace)
        return Harness(self.workspace, self.actor)

    def authorize(self, tx):
        auth = self.workspace.auth_store
        request_auth = auth.bind_request(self.token, 'admin')
        return auth.require_current_principal(tx, token_hash=request_auth.token_hash, operation='admin')


@pytest.fixture
def harness(tmp_path, pg_repository):
    instance = Harness(TeamWorkspace(pg_repository, tmp_path))
    yield instance
    instance.workspace.close()
    instance.client.close()


def test_requires_versions_and_does_not_touch_local_store(harness):
    from app.editing import project_store
    before = project_store.list()
    response = harness.request("POST", "/api/projects", json={"name": "Missing"})
    assert response.status_code == 428
    assert response.json()["code"] == "missing_expectation"
    pid = harness.create()
    assert project_store.list() == before
    assert harness.request("GET", "/api/projects").json()[0]["id"] == pid


def test_replay_keeps_generated_id_and_rejects_changed_input(harness):
    initial = dict(harness.versions)
    pid = harness.create()
    response = harness.request("POST", "/api/projects", request_id="create", versions=initial,
                               json={"name": "Synthetic", "template": "empty"})
    assert response.status_code == 200
    assert response.json()["id"] == pid
    mismatch = harness.request("POST", "/api/projects", request_id="create", versions=initial, json={"name": "Other"})
    assert mismatch.status_code == 409
    assert mismatch.json()["code"] == "request_mismatch"
    assert len(harness.request("GET", "/api/projects").json()) == 1


def test_actor_conflict_and_failed_commit_do_not_publish(harness, monkeypatch):
    pid = harness.create()
    stale = dict(harness.versions)
    second = Harness(harness.workspace, "bob")
    second.versions = stale
    assert harness.request("PATCH", f"/api/projects/{pid}", request_id="rename", json={"name": "Alice"}).status_code == 200
    conflict = second.request("PATCH", f"/api/projects/{pid}", request_id="rename", json={"name": "Bob"})
    assert conflict.status_code == 409
    assert conflict.json()["currentVersions"]
    from app.team.repository import StorageError
    monkeypatch.setattr(harness.workspace.repository, "commit", lambda *a, **kw: (_ for _ in ()).throw(StorageError("db_error")))
    failed = harness.request("PATCH", f"/api/projects/{pid}", request_id="fail", json={"name": "Lost"})
    assert failed.status_code == 503
    assert harness.request("GET", "/api/projects").json()[0]["name"] == "Alice"


def test_command_survives_restart_and_discard(harness, tmp_path):
    pid = harness.create()
    harness.request("POST", f"/api/projects/{pid}/open")
    response = harness.request("POST", f"/api/projects/{pid}/documents/model/commands", request_id="command",
                               json={"command": "CreateClass", "args": {"label": "Durable"}})
    assert response.status_code == 200, response.text
    close = harness.request("POST", f"/api/projects/{pid}/close", json={"discard": True})
    assert close.status_code == 200
    restarted = harness.restarted()
    response = restarted.request("GET", f"/api/projects/{pid}/documents/model/source")
    assert response.status_code == 200, response.text
    assert "Durable" in response.text


def command(harness, pid, label, request_id):
    return harness.request("POST", f"/api/projects/{pid}/documents/model/commands", request_id=request_id,
                           json={"command": "CreateClass", "args": {"label": label}})


def test_durable_undo_redo_and_actor_guard(harness, tmp_path):
    pid = harness.create()
    assert command(harness, pid, "First", "first").status_code == 200
    source = harness.request("POST", f"/api/projects/{pid}/open")
    assert source.json()["documents"][0]["canUndo"] is True
    restarted = harness.restarted()
    restarted.versions = harness.versions
    undone = restarted.request("POST", f"/api/projects/{pid}/documents/model/undo", request_id="undo")
    assert undone.status_code == 200, undone.text
    assert "state" in undone.json()
    assert undone.json()["state"]["canRedo"] is True
    source = restarted.request("GET", f"/api/projects/{pid}/documents/model/source")
    assert "First" not in source.json()["text"]
    redone = restarted.request("POST", f"/api/projects/{pid}/documents/model/redo", request_id="redo")
    assert redone.status_code == 200, redone.text
    assert "First" in restarted.request("GET", f"/api/projects/{pid}/documents/model/source").json()["text"]
    bob = Harness(restarted.workspace, "bob")
    bob.versions = restarted.versions
    assert command(bob, pid, "Second", "bob").status_code == 200
    restarted.versions = bob.versions
    refused = restarted.request("POST", f"/api/projects/{pid}/documents/model/undo", request_id="forbidden")
    assert refused.status_code == 409


def test_blob_failure_keeps_graph_and_history(harness, monkeypatch):
    pid = harness.create()
    before = harness.workspace.repository.snapshot()
    monkeypatch.setattr(harness.workspace.blobs, "put", lambda data: (_ for _ in ()).throw(OSError("synthetic failure")))
    response = command(harness, pid, "Lost", "blob-failure")
    assert response.status_code == 503
    assert harness.workspace.repository.snapshot() == before
    assert "Lost" not in harness.request("GET", f"/api/projects/{pid}/documents/model/source").text


def test_compute_results_survive_separate_read_requests(harness):
    pid = harness.create()
    response = harness.request("POST", f"/api/projects/{pid}/validate")
    assert response.status_code == 200, response.text
    read = harness.request("GET", f"/api/projects/{pid}/validate")
    assert read.status_code == 200
    assert read.json() is not None


def test_original_text_namespaces_bnodes_and_comment_warning_survive(harness, tmp_path):
    from app.team.rdf_codec import decode_graph
    from rdflib import BNode, Literal, URIRef
    from app.projects import document_id
    pid = harness.create()
    source = '# preserved comment\n@prefix ex: <https://example.org/> .\nex:s ex:unknown [ex:value "日本語"@ja] .\n'
    path = f"/api/projects/{pid}/documents/model"
    response = harness.request("PUT", path + "/source", request_id="source", json={"text": source})
    assert response.status_code == 200, response.text
    key = "graph:" + document_id(pid, "model")
    before = decode_graph(harness.workspace.repository.read(key).payload["graph"])
    nodes = {str(term) for triple in before for term in triple if isinstance(term, BNode)}
    restarted = harness.restarted()
    restarted.versions = harness.versions
    assert restarted.request("GET", path + "/source").json()["text"] == source
    assert command(restarted, pid, "Another", "another").status_code == 200
    after = decode_graph(harness.workspace.repository.read(key).payload["graph"])
    assert nodes <= {str(term) for triple in after for term in triple if isinstance(term, BNode)}
    assert any(obj == Literal("日本語", lang="ja") for obj in after.objects())
    assert dict(after.namespaces())["ex"] == URIRef("https://example.org/")
    # Save the authored comments first; the next visual change has to ask
    # before rewriting the persisted original, exactly as in local mode.
    harness.versions = restarted.versions
    assert harness.request("POST", path + "/undo", request_id="undo-comment").status_code == 200
    assert harness.request("POST", path + "/save", request_id="save-source").status_code == 200
    assert command(harness, pid, "Visual", "visual").status_code == 200
    warning = harness.request("POST", path + "/save", request_id="save-warning")
    assert warning.status_code == 200, warning.text
    assert warning.json()["needsCommentsWarning"] is True


def test_admin_users_are_versioned_and_last_admin_protected(harness):
    from app.team.auth_store import AuthStore
    auth = AuthStore(harness.workspace.repository.storage, bootstrap_subs=frozenset({"alice"}))
    auth.identity("alice", "alice@example.org", "example.org", now=1)
    auth.identity("bob", "bob@example.org", "example.org", now=1)
    harness.workspace.auth_store = auth
    response = harness.request("GET", "/api/team/users")
    assert response.status_code == 200, response.text
    assert len(response.json()["users"]) == 2
    patch = {"sub": "bob", "role": "editor", "disabled": False, "expectedVersion": 1}
    changed = harness.request("PATCH", "/api/team/users/bob", request_id="role", json=patch)
    assert changed.status_code == 200, changed.text
    assert changed.json()["user"]["version"] == 2
    replay = harness.request("PATCH", "/api/team/users/bob", request_id="role", json=patch)
    assert replay.status_code == 200
    assert replay.json()["user"]["version"] == 2
    denied = harness.request("PATCH", "/api/team/users/alice", request_id="last-admin",
                             json={"role": "viewer", "disabled": False, "expectedVersion": 1})
    assert denied.status_code == 403
    assert denied.json()["code"] == "last_admin"


def test_multipart_replay_ignores_generated_envelope_boundary(harness):
    initial = dict(harness.versions)
    files = {"file": ("synthetic.ttl", b'@prefix ex: <https://example.org/> . ex:s ex:p ex:o .', "text/turtle")}
    first = harness.request("POST", "/api/ontologies/upload", request_id="upload", files=files)
    assert first.status_code == 200, first.text
    retry = harness.request("POST", "/api/ontologies/upload", request_id="upload", versions=initial, files=files)
    assert retry.status_code == 200, retry.text
    assert retry.json()["id"] == first.json()["id"]


def test_versions_entrypoint_exposes_empty_collection_and_current_keys(harness):
    empty = harness.request("GET", "/api/team/versions")
    assert empty.status_code == 200
    assert empty.json()["resourceVersions"] == {"workspace": None}
    harness.create()
    current = harness.request("GET", "/api/team/versions")
    assert current.status_code == 200
    assert current.json()["resourceVersions"]["workspace"] == 1
    assert any(key.startswith("graph:") for key in current.json()["resourceVersions"])


def test_real_team_app_auth_versions_and_project_transaction(tmp_path, pg_schema):
    import os
    import subprocess
    import sys
    environment = dict(os.environ, SEMANTIC_STUDIO_MODE="team",
        SEMANTIC_STUDIO_PUBLIC_ORIGIN="https://studio.example.org",
        SEMANTIC_STUDIO_GOOGLE_CLIENT_ID="synthetic", SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET="replace-me",
        SEMANTIC_STUDIO_ALLOWED_DOMAINS="example.org", SEMANTIC_STUDIO_BOOTSTRAP_SUBS="alice",
        SEMANTIC_STUDIO_DATA_DIR=str(tmp_path / "team"), STATIC_DIR=str(tmp_path / "web"))
    result = subprocess.run([sys.executable, "-c", '''
import json,time
from fastapi.testclient import TestClient
from app.main import app
from app.routers.auth import SESSION_COOKIE
with TestClient(app,base_url="https://studio.example.org") as client:
    assert client.get("/api/team/versions").status_code == 401
    auth = app.state.team.auth_store
    auth.identity("alice","alice@example.org","example.org",now=time.time())
    token = auth.create_session("alice",now=time.time())
    client.cookies.set(SESSION_COOKIE,token)
    status = client.get("/api/auth/status").json()
    assert status["authenticated"]
    versions = client.get("/api/team/versions")
    assert versions.status_code == 200,versions.text
    headers = {"Origin":"https://studio.example.org","X-Semantic-Studio":"1",
        "X-Semantic-Studio-CSRF":status["csrf"],"X-Semantic-Studio-Request-Id":"create",
        "X-Semantic-Studio-Versions":json.dumps(versions.json()["resourceVersions"])}
    first = client.post("/api/projects",headers=headers,json={"name":"Synthetic","template":"empty"})
    assert first.status_code == 200,first.text
    retry = client.post("/api/projects",headers=headers,json={"name":"Synthetic","template":"empty"})
    assert retry.status_code == 200,retry.text
    assert first.content == retry.content
    assert len(client.get("/api/projects").json()) == 1
'''], env=environment, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr + result.stdout


def test_model_and_shapes_require_all_read_bases_and_inverse_entire_first_shape(harness):
    pid = harness.create()
    made = command(harness, pid, "Target", "target")
    assert made.status_code == 200
    target = made.json()["created"]
    initial = dict(harness.versions)
    body = {"command": "CreateShape", "args": {"target": target}}
    partial = {key: value for key, value in initial.items() if not key.startswith("graph:")}
    missing = harness.request("POST", f"/api/projects/{pid}/documents/shapes/commands", request_id="missing-model", versions=partial, json=body)
    assert missing.status_code == 428
    harness.versions = initial
    made = harness.request("POST", f"/api/projects/{pid}/documents/shapes/commands", request_id="shape", json=body)
    assert made.status_code == 200, made.text
    rows = harness.workspace.repository.history("workspace", limit=1)
    grouped = rows[0]["request_id"]
    undone = harness.request("POST", f"/api/projects/{pid}/documents/shapes/undo", request_id="undo-shape")
    assert undone.status_code == 200, undone.text
    project = harness.request("POST", f"/api/projects/{pid}/open").json()
    assert [doc["doc"] for doc in project["documents"]] == ["model"]
    redone = harness.request("POST", f"/api/projects/{pid}/documents/model/redo", request_id="redo-shape")
    assert redone.status_code == 200, redone.text
    assert any(doc["doc"] == "shapes" for doc in harness.request("POST", f"/api/projects/{pid}/open").json()["documents"])


def test_once_grant_crosses_candidate_commit_and_is_spent_on_retry(harness, tmp_path):
    from app.network_broker import broker, presented_grants, GrantScopeMiddleware, Offline
    harness.app.add_middleware(GrantScopeMiddleware)
    @harness.app.get("/api/test/decision")
    def decision():
        return {"decision": broker.policy.decide("ontology:fetch", "docs.example.org", presented_grants())}
    grant = harness.request("POST", "/api/network/grants", request_id="grant-once",
        json={"capability": "ontology:fetch", "host": "docs.example.org", "decision": "allow", "remember": False})
    assert grant.status_code == 200, grant.text
    grant_headers = {"X-Semantic-Studio-Grant": grant.json()["id"]}
    assert harness.request("GET", "/api/test/decision", headers=grant_headers).json()["decision"] == "allow"
    assert harness.request("GET", "/api/test/decision", headers=grant_headers).json()["decision"] == "ask"
    remembered = harness.request("POST", "/api/network/grants", request_id="remember",
        json={"capability": "ontology:fetch", "host": "docs.example.org", "decision": "allow", "remember": True})
    assert remembered.status_code == 200
    offline = harness.request("PUT", "/api/network/offline", request_id="offline", json={"offline": True})
    assert offline.status_code == 200
    restarted = harness.restarted()
    policy = restarted.request("GET", "/api/network/policy").json()
    assert policy["offline"] is True
    assert policy["grants"][0]["host"] == "docs.example.org"
    with pytest.raises(Offline):
        restarted.workspace.auth_broker.authentication_request("https://www.googleapis.com/oauth2/v1/certs")


def test_chunked_actual_body_limit_refuses_before_evaluation(harness):
    import asyncio
    scope = {"type": "http", "method": "POST", "path": "/api/projects", "headers": [],
             "state": {"principal": SimpleNamespace(sub="alice", role="admin"),
                       "team_request_auth": harness.workspace.auth_store.bind_request(harness.token, 'edit'),
                       "team_body_limit": 3, "team_body_refusal": {"detail": "Synthetic body cap"}}}
    chunks = iter([{"type": "http.request", "body": b"ab", "more_body": True},
                   {"type": "http.request", "body": b"cd", "more_body": False}])
    sent = []
    async def receive():
        return next(chunks)
    async def send(message):
        sent.append(message)
    async def inner(*args):
        raise AssertionError("Oversized body reached evaluation")
    asyncio.run(harness.workspace.handle_request(scope, receive, send, SimpleNamespace(shared_update=True), inner))
    assert sent[0]["status"] == 413
    assert json.loads(sent[1]["body"]) == {"detail": "Synthetic body cap"}


def test_saved_visual_query_state_is_authored_and_never_document_metadata(harness):
    pid = harness.create()
    authored = {"ontologyId": {"arbitrary": "value"}, "doc": "authored-value",
                "documents": [{"ontologyId": "authored", "doc": "model", "revision": 3, "dirty": True}]}
    response = harness.request("POST", "/api/queries", request_id="authored-state",
        json={"name": "Synthetic", "ontologyId": pid + "-model", "mode": "visual", "state": authored, "sparql": "SELECT * WHERE {?s ?p ?o}"})
    assert response.status_code == 200, response.text
    assert response.json()["state"] == authored
    assert harness.request("GET", "/api/queries?ontology=" + pid + "-model").json()[0]["state"] == authored


def test_multipart_fingerprint_preserves_boundary_prefix_in_file_bytes(harness):
    initial = dict(harness.versions)
    def envelope(boundary, value):
        data = b'@prefix ex: <https://example.org/> . ex:s ex:p """before\r\n--' + value + b'X\r\nafter""" .'
        return b'--' + boundary + b'\r\nContent-Disposition: form-data; name="file"; filename="synthetic.ttl"\r\nContent-Type: text/turtle\r\n\r\n' + data + b'\r\n--' + boundary + b'--\r\n'
    first = harness.request("POST", "/api/ontologies/upload", request_id="collision", versions=initial,
        content=envelope(b"A", b"A"), headers={"Content-Type": "multipart/form-data; boundary=A"})
    assert first.status_code == 200, first.text
    changed = harness.request("POST", "/api/ontologies/upload", request_id="collision", versions=initial,
        content=envelope(b"B", b"B"), headers={"Content-Type": "multipart/form-data; boundary=B"})
    assert changed.status_code == 409, changed.text
    assert changed.json()["code"] == "request_mismatch"


def test_team_home_counts_follow_committed_graph_without_turtle_save(harness):
    pid = harness.create()
    before = harness.request("GET", "/api/projects").json()[0]
    assert before["counts"]["classes"] == 0
    assert command(harness, pid, "Counted", "count").status_code == 200
    card = harness.request("GET", "/api/projects").json()[0]
    assert card["counts"]["classes"] == 1
    resources, _ = harness.workspace.repository.snapshot()
    source = harness.workspace.blobs.get(resources["file:projects/" + pid + "/model.ttl"]["blob"])
    assert b"Counted" not in source


def test_auth_failed_network_activity_is_visible_to_next_request(harness):
    from app.network_broker import Offline
    assert harness.request("PUT", "/api/network/offline", request_id="activity-offline", json={"offline": True}).status_code == 200
    with pytest.raises(Offline):
        harness.workspace.auth_broker.authentication_request("https://www.googleapis.com/oauth2/v1/certs")
    activity = harness.request("GET", "/api/network/activity")
    assert activity.status_code == 200
    assert activity.json()[0]["capability"] == "authentication:google"
    assert activity.json()[0]["outcome"] == "offline"


def test_access_response_does_not_leak_user_expectations_into_graph_versions(harness):
    from app.team.auth_store import AuthStore
    auth = AuthStore(harness.workspace.repository.storage, bootstrap_subs=frozenset({"alice"}))
    auth.identity("alice", "alice@example.org", "example.org", now=1)
    auth.identity("bob", "bob@example.org", "example.org", now=1)
    harness.workspace.auth_store = auth
    pid = harness.create()
    graph_basis = dict(harness.versions)
    update = harness.request("PATCH", "/api/team/users/bob", request_id="access-with-user-key",
        versions={**graph_basis, "user:bob": 1}, json={"role": "editor", "disabled": False, "expectedVersion": 1})
    assert update.status_code == 200, update.text
    assert update.json()["resourceVersions"] == graph_basis
    assert not any(key.startswith("user:") for key in harness.versions)
    assert command(harness, pid, "After access", "graph-after-access").status_code == 200
    stale = graph_basis
    update = harness.request("PATCH", "/api/team/users/bob", request_id="second-access",
        versions={**stale, "user:bob": 2}, json={"role": "viewer", "disabled": False, "expectedVersion": 2})
    assert update.status_code == 200
    assert update.json()["resourceVersions"] == harness.workspace.repository.snapshot()[1]
    refused = harness.request("POST", f"/api/projects/{pid}/documents/model/commands", request_id="stale-graph-after-access", versions=stale,
        json={"command": "CreateClass", "args": {"label": "Stale"}})
    assert refused.status_code == 409


@pytest.mark.parametrize("scenario", ["undo_deleted", "redo_deleted", "undo_import", "redo_import"])
def test_real_team_inverse_rechecks_current_role_and_destructive_effects(tmp_path, scenario, pg_schema):
    import os
    import subprocess
    import sys
    environment = dict(os.environ, SEMANTIC_STUDIO_MODE="team",
        SEMANTIC_STUDIO_PUBLIC_ORIGIN="https://studio.example.org",
        SEMANTIC_STUDIO_GOOGLE_CLIENT_ID="synthetic", SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET="replace-me",
        SEMANTIC_STUDIO_ALLOWED_DOMAINS="example.org", SEMANTIC_STUDIO_BOOTSTRAP_SUBS="alice,bob",
        SEMANTIC_STUDIO_DATA_DIR=str(tmp_path / "team"), STATIC_DIR=str(tmp_path / "web"), SYNTHETIC_SCENARIO=scenario)
    result = subprocess.run([sys.executable, "-c", '''
import json,os,time
from fastapi.testclient import TestClient
from app.main import app
from app.routers.auth import SESSION_COOKIE
with TestClient(app,base_url="https://studio.example.org") as client:
    auth = app.state.team.auth_store
    tokens = {}
    for actor in ("alice","bob"):
        auth.identity(actor,actor+"@example.org","example.org",now=time.time())
        tokens[actor] = auth.create_session(actor,now=time.time())
    def request(actor,method,path,request_id=None,**kwargs):
        client.cookies.clear()
        client.cookies.set(SESSION_COOKIE,tokens[actor])
        status = client.get("/api/auth/status").json()
        headers={"Origin":"https://studio.example.org","X-Semantic-Studio":"1","X-Semantic-Studio-CSRF":status["csrf"]}
        if request_id:
            versions=client.get("/api/team/versions").json()["resourceVersions"]
            headers.update({"X-Semantic-Studio-Request-Id":request_id,"X-Semantic-Studio-Versions":json.dumps(versions)})
        return client.request(method,path,headers=headers,**kwargs)
    project=request("alice","POST","/api/projects","create",json={"name":"Synthetic","template":"empty"})
    assert project.status_code==200,project.text
    pid=project.json()["id"]
    made=request("alice","POST",f"/api/projects/{pid}/documents/model/commands","class",json={"command":"CreateClass","args":{"label":"Person"}})
    assert made.status_code==200,made.text
    target=made.json()["created"]
    imported=request("alice","POST",f"/api/projects/{pid}/data","import",files={"file":("synthetic.csv",b"id,name\\n1,Synthetic\\n","text/csv")},data={"choices":json.dumps({"classIri":target,"idColumn":"id","columns":{"name":{"as":"name"}}})})
    assert imported.status_code==200,imported.text
    sid=imported.json()["snapshot"]["id"]
    scenario=os.environ["SYNTHETIC_SCENARIO"]
    if scenario.endswith("deleted"):
        deleted=request("alice","DELETE",f"/api/projects/{pid}/data/{sid}","delete")
        assert deleted.status_code==200,deleted.text
    endpoint="redo" if scenario.startswith("redo") else "undo"
    if endpoint=="redo":
        control=request("alice","POST",f"/api/projects/{pid}/documents/model/undo","admin-undo")
        assert control.status_code==200,control.text
    admin_open=request("alice","POST",f"/api/projects/{pid}/open")
    assert admin_open.status_code==200,admin_open.text
    admin_state=admin_open.json()["documents"][0]
    assert admin_state["canRedo" if endpoint=="redo" else "canUndo"] is True,admin_state
    demoted=request("bob","PATCH","/api/team/users/alice","demote",json={"role":"editor","disabled":False,"expectedVersion":1})
    assert demoted.status_code==200,demoted.text
    editor_open=request("alice","POST",f"/api/projects/{pid}/open")
    assert editor_open.status_code==200,editor_open.text
    assert all(not doc["canUndo"] and not doc["canRedo"] for doc in editor_open.json()["documents"]),editor_open.text
    before=app.state.team.repository.snapshot()
    audit_before=app.state.team.repository.history("workspace")
    denied=request("alice","POST",f"/api/projects/{pid}/documents/model/{endpoint}","demoted-inverse")
    assert denied.status_code==403,denied.text
    assert denied.json()["code"]=="forbidden"
    assert denied.json()["uiMessage"]=={"code":"team.forbidden","args":{}}
    assert app.state.team.repository.snapshot()==before
    assert app.state.team.repository.history("workspace")==audit_before
    promoted=request("bob","PATCH","/api/team/users/alice","promote",json={"role":"admin","disabled":False,"expectedVersion":2})
    assert promoted.status_code==200,promoted.text
    allowed=request("alice","POST",f"/api/projects/{pid}/documents/model/{endpoint}","admin-inverse")
    assert allowed.status_code==200,allowed.text
    demoted_again=request("bob","PATCH","/api/team/users/alice","demote-again",json={"role":"editor","disabled":False,"expectedVersion":3})
    assert demoted_again.status_code==200,demoted_again.text
    edited=request("alice","POST",f"/api/projects/{pid}/documents/model/commands","ordinary-edit",json={"command":"CreateClass","args":{"label":"Ordinary"}})
    assert edited.status_code==200,edited.text
    assert edited.json()["state"]["canUndo"] is True,edited.text
    ordinary_undo=request("alice","POST",f"/api/projects/{pid}/documents/model/undo","ordinary-undo")
    assert ordinary_undo.status_code==200,ordinary_undo.text
    assert ordinary_undo.json()["state"]["canRedo"] is True,ordinary_undo.text
    ordinary_redo=request("alice","POST",f"/api/projects/{pid}/documents/model/redo","ordinary-redo")
    assert ordinary_redo.status_code==200,ordinary_redo.text
'''], env=environment, capture_output=True, text=True, timeout=35)
    assert result.returncode == 0, result.stderr + result.stdout


@pytest.mark.parametrize("mode", ["visual", "source", "shape"])
@pytest.mark.parametrize("saved_newline", [b"\n", b"\r\n"], ids=["lf", "crlf"])
def test_export_and_duplicate_use_authority_before_formatting_save(harness, tmp_path, mode, monkeypatch, saved_newline):
    from io import BytesIO
    from zipfile import ZipFile
    from rdflib import Graph, Literal, URIRef
    from rdflib.compare import isomorphic
    from app.team.rdf_codec import decode_graph, encode_graph
    import rdflib
    monkeypatch.setattr(rdflib, "NORMALIZE_LITERALS", False)
    pid = harness.create()
    path = f"/api/projects/{pid}/documents/model"
    original = '# original comment\n@prefix ex: <https://example.org/> .\nex:s ex:unknown [ex:note "原文"@ja] .\nex:lexical ex:value "001"^^<http://www.w3.org/2001/XMLSchema#integer> .\n'
    applied = harness.request("PUT", path + "/source", request_id="initial-source", json={"text": original})
    assert applied.status_code == 200, applied.text
    assert harness.request("POST", path + "/save", request_id="initial-save").status_code == 200
    original_key = "file:projects/" + pid + "/model.ttl"
    saved = harness.workspace.repository.read(original_key)
    saved_bytes = harness.workspace.blobs.get(saved.payload["blob"])
    # Legacy text-mode Save may use the host's line endings. Check the full
    # authored content before using its immutable blob as byte provenance.
    assert saved_bytes.replace(b"\r\n", b"\n") == original.encode("utf-8")
    # Exercise both raw encodings on every host, including a Windows-like
    # negative control for accidental newline normalization in ZIP or copy.
    fixture_bytes = original.encode("utf-8").replace(b"\n", saved_newline)
    harness.workspace.repository.commit(harness.actor, "saved-newline", {original_key: saved.version},
        {original_key: {"blob": harness.workspace.blobs.put(fixture_bytes)}}, "fixture", authorize=harness.authorize)
    original_bytes = harness.workspace.blobs.get(harness.workspace.repository.read(original_key).payload["blob"])
    assert original_bytes == fixture_bytes
    assert original_bytes.replace(b"\r\n", b"\n") == original.encode("utf-8")
    if saved_newline == b"\r\n":
        assert original_bytes != original.encode("utf-8")
    harness.request("GET", "/api/team/versions")
    if mode == "source":
        changed = harness.request("PUT", path + "/source", request_id="new-source", json={"text": original + 'ex:next ex:unknown "Accepted" .\n'})
    else:
        changed = command(harness, pid, "Accepted", "accepted")
        if mode == "shape":
            target = changed.json()["created"]
            changed = harness.request("POST", f"/api/projects/{pid}/documents/shapes/commands", request_id="first-shape",
                json={"command": "CreateShape", "args": {"target": target}})
    assert changed.status_code == 200, changed.text
    # Emulate migrated opaque extras. The accepted typed RDF also carries a
    # non-normalized lexical form and stable blank-node identity.
    resources, versions = harness.workspace.repository.snapshot()
    graph = decode_graph(resources["graph:" + pid + "-model"]["graph"])
    changes = {"file:projects/" + pid + "/opaque.bin": {"blob": harness.workspace.blobs.put(b'\x00opaque\r\n\xff')},
               "file:projects/" + pid + "/.semantic-studio-originals/model.ttl": {"blob": harness.workspace.blobs.put(b'opaque existing original entry')}}
    expected = {**versions, **{key: None for key in changes if key not in versions}}
    harness.workspace.repository.commit(harness.actor, "opaque", expected, changes, "fixture", authorize=harness.authorize)
    harness.request("GET", "/api/team/versions")
    assert harness.request("POST", f"/api/projects/{pid}/open").status_code == 200
    candidate = next(iter(harness.workspace._views.values()))["candidate"]
    documents = candidate.services["editing_service"]._open[pid]
    live_before = {role: (encode_graph(document.graph), document.editor_state(), document.dirty, document.ontology.revision, document._clean, document.path.read_bytes()) for role, document in documents.items()}
    before = harness.workspace.repository.snapshot()
    audit = harness.workspace.repository.history("workspace")
    exported = harness.request("GET", f"/api/projects/{pid}/export")
    assert exported.status_code == 200, exported.text
    assert harness.workspace.repository.snapshot() == before
    assert harness.workspace.repository.history("workspace") == audit
    assert {role: (encode_graph(document.graph), document.editor_state(), document.dirty, document.ontology.revision, document._clean, document.path.read_bytes()) for role, document in documents.items()} == live_before
    import rdflib
    monkeypatch.setattr(rdflib, "NORMALIZE_LITERALS", False)
    with ZipFile(BytesIO(exported.content)) as archive:
        model = Graph().parse(data=archive.read("model.ttl"), format="turtle")
        assert isomorphic(model, graph)
        assert archive.read("opaque.bin") == b'\x00opaque\r\n\xff'
        assert archive.read(".semantic-studio-originals/model.ttl") == b'opaque existing original entry'
        originals = [name for name in archive.namelist() if name.endswith("/model.ttl") and name.startswith(".semantic-studio-originals-")]
        assert len(originals) == 1
        assert archive.read(originals[0]) == original_bytes
        if mode == "shape":
            shapes = decode_graph(before[0]["graph:" + pid + "-shapes"]["graph"])
            assert isomorphic(Graph().parse(data=archive.read("shapes.ttl"), format="turtle"), shapes)
    duplicate = harness.request("POST", f"/api/projects/{pid}/duplicate", request_id="duplicate")
    assert duplicate.status_code == 200, duplicate.text
    new_id = duplicate.json()["id"]
    after, _ = harness.workspace.repository.snapshot()
    assert after["graph:" + new_id + "-model"] == before[0]["graph:" + pid + "-model"]
    assert after["state:" + new_id + "-model"] == before[0]["state:" + pid + "-model"]
    assert harness.workspace.blobs.get(after["file:projects/" + new_id + "/model.ttl"]["blob"]) == original_bytes
    assert harness.workspace.blobs.get(after["file:projects/" + new_id + "/opaque.bin"]["blob"]) == b'\x00opaque\r\n\xff'
    if mode == "shape":
        assert after["graph:" + new_id + "-shapes"] == before[0]["graph:" + pid + "-shapes"]
    restarted = harness.restarted()
    assert "Accepted" in restarted.request("GET", f"/api/projects/{new_id}/documents/model/source").json()["text"]
    assert restarted.workspace.repository.read("graph:" + new_id + "-model").payload == before[0]["graph:" + pid + "-model"]


def test_real_viewer_exports_accepted_graph_without_mutation(tmp_path, pg_schema):
    import os
    import subprocess
    import sys
    environment = dict(os.environ, SEMANTIC_STUDIO_MODE="team",
        SEMANTIC_STUDIO_PUBLIC_ORIGIN="https://studio.example.org",
        SEMANTIC_STUDIO_GOOGLE_CLIENT_ID="synthetic", SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET="replace-me",
        SEMANTIC_STUDIO_ALLOWED_DOMAINS="example.org", SEMANTIC_STUDIO_BOOTSTRAP_SUBS="owner",
        SEMANTIC_STUDIO_DATA_DIR=str(tmp_path / "team"), STATIC_DIR=str(tmp_path / "web"))
    result = subprocess.run([sys.executable, "-c", '''
import json,time
from io import BytesIO
from zipfile import ZipFile
from rdflib import Graph,URIRef
from rdflib.namespace import RDF,OWL
from fastapi.testclient import TestClient
from app.main import app
from app.routers.auth import SESSION_COOKIE
with TestClient(app,base_url="https://studio.example.org") as client:
    auth=app.state.team.auth_store
    tokens={}
    for actor in ("owner","viewer"):
        auth.identity(actor,actor+"@example.org","example.org",now=time.time())
        tokens[actor]=auth.create_session(actor,now=time.time())
    def request(actor,method,path,request_id=None,**kwargs):
        client.cookies.clear()
        client.cookies.set(SESSION_COOKIE,tokens[actor])
        status=client.get("/api/auth/status").json()
        headers={"Origin":"https://studio.example.org","X-Semantic-Studio":"1","X-Semantic-Studio-CSRF":status["csrf"]}
        if request_id:
            headers.update({"X-Semantic-Studio-Request-Id":request_id,"X-Semantic-Studio-Versions":json.dumps(client.get("/api/team/versions").json()["resourceVersions"])})
        return client.request(method,path,headers=headers,**kwargs)
    made=request("owner","POST","/api/projects","create",json={"name":"Synthetic","template":"empty"})
    assert made.status_code==200,made.text
    pid=made.json()["id"]
    accepted=request("owner","POST",f"/api/projects/{pid}/documents/model/commands","class",json={"command":"CreateClass","args":{"label":"Accepted"}})
    assert accepted.status_code==200,accepted.text
    entity=accepted.json()["created"]
    before=app.state.team.repository.snapshot()
    audit=app.state.team.repository.history("workspace")
    exported=request("viewer","GET",f"/api/projects/{pid}/export")
    assert exported.status_code==200,exported.text
    with ZipFile(BytesIO(exported.content)) as archive:
        graph=Graph().parse(data=archive.read("model.ttl"),format="turtle")
        assert (URIRef(entity),RDF.type,OWL.Class) in graph
        original=archive.read(".semantic-studio-originals/model.ttl")
        assert original==app.state.team.workspace.blobs.get(before[0]["file:projects/"+pid+"/model.ttl"]["blob"])
        assert b"Accepted" not in original
    assert app.state.team.repository.snapshot()==before
    assert app.state.team.repository.history("workspace")==audit
'''], env=environment, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr + result.stdout
