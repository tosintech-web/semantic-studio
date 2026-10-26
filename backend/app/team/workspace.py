"""
================================================================================
FILE: backend/app/team/workspace.py
================================================================================
SUMMARY
    Connects all protected legacy HTTP handlers to transactional team state.
BASIC IDEA
    Keep mutable evaluation detached until the authoritative transaction commits.
INPUTS / INPUT SOURCES
    - Validated team service requests and private persistent storage.
EXPECTED OUTPUT
    - Durable state with explicit failure and replay semantics.
================================================================================
"""
from contextlib import asynccontextmanager
import base64
from dataclasses import asdict
from email.message import Message
import hashlib
import json
import re
from pathlib import Path
import tempfile
import threading
import time
from urllib.parse import parse_qs

from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse

from .blobs import BlobStore
from .commands import Candidate
from .context import bind_services
from .history import inverse, authorize_inverse, authorize_replayed_inverse
from .repository import RepositoryError, MissingExpectation, Conflict, InvalidRequest, StorageError
from .auth_store import AuthRefused, RequestAuth
from .rdf_codec import private_rdf_diagnostics


class TeamWorkspace:
    def __init__(self, repository, data_dir, auth_store=None):
        self.repository = repository
        self.data_dir = Path(data_dir)
        self.blobs = BlobStore(self.data_dir / "blobs")
        self.auth_store = auth_store
        self._view_lock = threading.RLock()
        self._views = {}
        self._once = {}
        self._imports_progress = {}
        self._imports_progress_lock = threading.Lock()
        self._imports_locks = {}
        from ..network_broker import ActivityLog, ACTIVITY_MAX_LIMIT
        class WorkspaceActivity(ActivityLog):
            def append(self, entry):
                with self._lock:
                    self._memory.append(entry)
                    del self._memory[:-ACTIVITY_MAX_LIMIT]
        self._activity = WorkspaceActivity(None)
        for name in ("network-activity.jsonl.1", "network-activity.jsonl"):
            resource = self.repository.read("file:" + name)
            if resource is not None:
                for line in self.blobs.get(resource.payload["blob"]).decode("utf-8").splitlines()[-ACTIVITY_MAX_LIMIT:]:
                    try:
                        entry = json.loads(line)
                    except ValueError:
                        continue
                    if isinstance(entry, dict):
                        self._activity.append(entry)

    def _prepare_candidate(self, candidate):
        # Progress and cancellation contain no authored graph state. Sharing
        # just these carriers lets polling cancel a detached in-flight import
        # without letting readers see its not-yet-committed RDF changes.
        imports = candidate.services["imports_service"]
        imports._progress = self._imports_progress
        imports._progress_lock = self._imports_progress_lock
        imports._locks = self._imports_locks
        candidate.services["broker"].activity = self._activity
        return candidate

    @property
    def auth_broker(self):
        workspace = self
        class AuthenticationBroker:
            def authentication_request(self, url, **kwargs):
                from ..network_broker import NetworkBroker
                resources, _ = workspace.repository.snapshot()
                with tempfile.TemporaryDirectory(prefix="semantic-studio-auth-policy-") as root:
                    policy = resources.get("file:network-policy.json")
                    if policy is not None:
                        Path(root, "network-policy.json").write_bytes(workspace.blobs.get(policy["blob"]))
                    broker = NetworkBroker(Path(root))
                    broker.activity = workspace._activity
                    return broker.authentication_request(url, **kwargs)
        return AuthenticationBroker()

    def _acquire_view(self, resources, versions):
        generation = tuple(sorted(versions.items()))
        with self._view_lock:
            entry = self._views.get(generation)
            if entry is None:
                directory = tempfile.TemporaryDirectory(prefix="semantic-studio-view-")
                try:
                    candidate = self._prepare_candidate(Candidate(Path(directory.name), resources, self.blobs))
                except BaseException:
                    directory.cleanup()
                    raise
                entry = {"directory": directory, "candidate": candidate, "users": 0, "retired": False}
                self._views[generation] = entry
            entry["users"] += 1
            entry["candidate"].services["broker"].policy._once = self._once
            return entry

    def _release_view(self, entry):
        with self._view_lock:
            entry["users"] -= 1
            if entry["retired"] and not entry["users"]:
                entry["directory"].cleanup()

    def _invalidate_views(self):
        with self._view_lock:
            for entry in self._views.values():
                entry["retired"] = True
                if not entry["users"]:
                    entry["directory"].cleanup()
            self._views.clear()

    @asynccontextmanager
    async def _candidate(self, resources, versions, shared):
        with private_rdf_diagnostics():
            if shared:
                with tempfile.TemporaryDirectory(prefix="semantic-studio-candidate-") as root:
                    candidate = await run_in_threadpool(Candidate, Path(root), resources, self.blobs)
                    self._prepare_candidate(candidate)
                    candidate.services["broker"].policy._once = dict(self._once)
                    yield candidate
            else:
                entry = await run_in_threadpool(self._acquire_view, resources, versions)
                try:
                    yield entry["candidate"]
                finally:
                    self._release_view(entry)

    def _states(self, body, actor, role, resources, changes=None, operation=None, *, enabled=True):
        if not enabled:
            return body
        try:
            parsed = json.loads(body)
        except (ValueError, UnicodeError):
            return body
        operation_group = self.repository.latest_operation("workspace")
        latest = ({"actor": operation_group.actor, "request_id": operation_group.request_id,
                   "operation": operation_group.operation} if operation_group else None)
        group = operation_group.entries if operation_group else []
        permitted = role in {"editor", "admin"}
        if permitted and role != "admin":
            # Advertise exactly the inverse that the next write would evaluate.
            # Pending replies use their computed payload maps; reads use audit
            # snapshots. Neither needs another directory or graph parse.
            if changes is None:
                inverse_changes = {row["key"]: json.loads(row["before_payload"]) if row["before_payload"] is not None else None for row in group}
                inverse_resources = resources
                inverse_request = latest["request_id"] if latest else None
                inverse_operation = None
            else:
                inverse_changes = {key: resources.get(key) for key in changes}
                inverse_resources = {**resources, **changes}
                inverse_request = None
                inverse_operation = operation
            try:
                authorize_inverse(self.repository, actor, inverse_request, inverse_changes, inverse_resources, role, operation=inverse_operation)
            except RepositoryError as error:
                if error.code != "forbidden":
                    raise
                permitted = False
        def decorate(value):
            if not isinstance(value, dict) or not isinstance(value.get("ontologyId"), str) or value.get("doc") not in ("model", "shapes") or type(value.get("revision")) is not int or type(value.get("dirty")) is not bool:
                return
            from ..projects import split_document_id
            split = split_document_id(value["ontologyId"])
            pid = split[0] if split is not None else ""
            related = lambda key: bool(pid and (key.startswith("file:projects/" + pid + "/") or pid in key and key.startswith(("graph:", "state:"))))
            allowed = bool(latest and latest["actor"] == actor and any(related(row["key"]) for row in group))
            if any(row["key"] == "file:projects/" + pid + "/project.json" and row["before_payload"] is None for row in group):
                allowed = False
            redo = bool(latest and latest["operation"].startswith("undo:"))
            if changes is not None:
                allowed = any(related(key) for key in changes)
                redo = bool(operation and operation.startswith("undo:"))
            value.update(canUndo=permitted and allowed and not redo, canRedo=permitted and allowed and redo)
        # Saved visual-query state and ontology JSON are authored dictionaries.
        # Only these explicit legacy document-state DTO locations are ours.
        if isinstance(parsed, dict):
            if ("label" in parsed and "revision" in parsed) or "savedAt" in parsed:
                decorate(parsed.get("state"))
            documents = parsed.get("documents")
            if isinstance(documents, list) and ("project" in parsed or "state" in parsed or set(parsed) <= {"documents", "resourceVersions"}):
                for document in documents:
                    decorate(document)
        return json.dumps(parsed, ensure_ascii=True).encode()

    def snapshot(self):
        return self.repository.snapshot()

    def close(self):
        self._invalidate_views()

    @staticmethod
    def _identity(scope, headers, body, expected):
        content_type = headers.get(b"content-type", b"").decode("latin1")
        mime = Message()
        mime["content-type"] = content_type
        if mime.get_content_type() == "multipart/form-data":
            boundary = mime.get_boundary()
            if boundary is not None:
                marker = re.escape(boundary.encode("latin1"))
                # Split only complete delimiter lines. Keep segment boundaries
                # in the fingerprint so canonicalization can never confuse a
                # delimiter with identical-looking bytes inside an RDF file.
                delimiter = rb"(?:\A|\r\n)--" + marker + rb"(?=(?:--)?[ \t]*(?:\r\n|$))"
                segments = re.split(delimiter, body)
                body = json.dumps([[len(segment), hashlib.sha256(segment).hexdigest()] for segment in segments], separators=(",", ":")).encode()
                parameters = sorted((key, value) for key, value in mime.get_params()[1:] if key.lower() != "boundary")
                content_type = json.dumps([mime.get_content_type(), parameters], ensure_ascii=True)
        elif mime.get_content_type() == "application/json":
            try:
                body = json.dumps(json.loads(body), sort_keys=True, ensure_ascii=True, separators=(",", ":")).encode()
            except (ValueError, UnicodeError):
                pass
        return {"method": scope["method"], "path": scope["path"],
                "query": base64.b64encode(scope.get("query_string", b"")).decode(),
                "body": hashlib.sha256(body).hexdigest(), "expected": expected,
                "content_type": content_type}

    def undo(self, actor, key, expected, request_id, *, authorize, redo=False):
        identity = {"key": key, "expected": expected, "redo": redo}
        def authorize_replay(tx):
            principal = authorize(tx)
            authorize_replayed_inverse(self.repository, actor, request_id, principal.role, tx=tx)
            return principal
        replay = self.repository.read_request(actor, request_id, identity, authorize=authorize_replay)
        if replay is not None:
            return replay
        changes, operation = inverse(self.repository, actor, key, expected, redo=redo)
        def final_authorize(tx):
            principal = authorize(tx)
            resources, _ = self.repository.snapshot(tx=tx)
            authorize_inverse(self.repository, actor, operation.split(':', 1)[1], changes,
                              resources, principal.role, tx=tx)
            return principal
        return self.repository.commit(actor, request_id, expected, changes, operation,
                                      identity=identity, authorize=final_authorize)

    async def handle_request(self, scope, receive, send, policy, inner_app):
        try:
            await self._request(scope, receive, send, policy, inner_app)
        except AuthRefused as error:
            code = error.code if error.code in {'auth_required', 'auth_expired', 'disabled', 'forbidden'} else 'auth_failed'
            await JSONResponse({'code': code, 'uiMessage': {'code': 'team.' + code, 'args': {}}},
                               status_code=401 if code in {'auth_required', 'auth_expired', 'disabled'} else 403,
                               headers={'Cache-Control': 'no-store'})(scope, receive, send)
        except RepositoryError as error:
            status = 403 if error.code == "forbidden" else 428 if isinstance(error, MissingExpectation) else 409 if error.code in ("revision_conflict", "request_mismatch", "undo_forbidden") else 400
            try:
                current = (await run_in_threadpool(self.repository.snapshot))[1]
            except StorageError:
                return await JSONResponse({'code': 'storage_error', 'uiMessage': {'code': 'team.config_unavailable', 'args': {}}}, status_code=503)(scope, receive, send)
            message_code = {"missing_expectation": "version_required", "storage_error": "config_unavailable"}.get(error.code, error.code)
            await JSONResponse({"code": error.code, "currentVersions": current,
                                "uiMessage": {"code": "team." + message_code, "args": {}}}, status_code=status)(scope, receive, send)
        except (StorageError, OSError, ValueError):
            await JSONResponse({"code": "storage_error", "uiMessage": {"code": "team.config_unavailable", "args": {}}}, status_code=503)(scope, receive, send)

    @staticmethod
    def _headers(scope):
        return {key.lower(): value for key, value in scope.get("headers", [])}

    async def _request(self, scope, receive, send, policy, inner_app):
        await run_in_threadpool(self.repository.storage.ensure_owner)
        actor = scope["state"]["principal"].sub
        request_auth = scope['state'].get('team_request_auth')
        if self.auth_store is None or not isinstance(request_auth, RequestAuth):
            raise AuthRefused('auth_required')
        def authorize(tx):
            principal = self.auth_store.require_current_principal(tx, token_hash=request_auth.token_hash,
                                                                  operation=request_auth.operation)
            if scope['path'].endswith(('/undo', '/redo')) and scope['path'].startswith('/api/projects/'):
                authorize_replayed_inverse(self.repository, actor, request_id, principal.role, tx=tx)
            return principal
        headers = self._headers(scope)
        shared = policy.shared_update
        chunks, total = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            maximum = scope["state"].get("team_body_limit") or 50 * 1024 * 1024
            total += len(chunk)
            if total > maximum:
                refusal = scope["state"].get("team_body_refusal") or {"code": "request_too_large", "uiMessage": {"code": "team.version_required", "args": {}}}
                return await JSONResponse(refusal, status_code=413)(scope, receive, send)
            chunks.append(chunk)
            if not message.get("more_body", False):
                break
        body = b"".join(chunks)
        expected, request_id, identity = {}, None, None
        if shared:
            try:
                request_id = headers[b"x-semantic-studio-request-id"].decode("utf-8")
                expected = json.loads(headers[b"x-semantic-studio-versions"])
            except (KeyError, UnicodeError, json.JSONDecodeError):
                raise MissingExpectation(["workspace"]) from None
            if not request_id or len(request_id) > 128 or type(expected) is not dict:
                raise InvalidRequest("request_headers")
            if "workspace" not in expected:
                raise MissingExpectation(["workspace"])
            identity = self._identity(scope, headers, body, expected)
            access = scope['path'] == '/api/team/users' or scope['path'].startswith('/api/team/users/')
            replay = None if access else await run_in_threadpool(self.repository.read_request, actor, request_id, identity, authorize=authorize)
            if replay is not None:
                return await self._send(replay["response"], send)
        resources, versions = await run_in_threadpool(self.repository.snapshot)
        versions.setdefault("workspace", None)
        path = scope["path"]
        if path == "/api/team/versions" and scope["method"] == "GET":
            return await JSONResponse({"resourceVersions": versions}, headers={"X-Semantic-Studio-Versions": json.dumps(versions)})(scope, receive, send)
        if path == "/api/team/users" or path.startswith("/api/team/users/"):
            from .auth_store import AccessConflict
            if self.auth_store is None:
                raise StorageError('writer_unavailable')
            if scope["state"]["principal"].role != "admin":
                return await JSONResponse({"code": "forbidden", "uiMessage": {"code": "team.forbidden", "args": {}}}, status_code=403)(scope, receive, send)
            if scope["method"] == "GET":
                users = await run_in_threadpool(self.auth_store.users)
                result = {"users": [asdict(user) for user in users], "resourceVersions": versions}
            else:
                try:
                    payload = json.loads(body)
                    target = path.rsplit("/", 1)[1] if path != "/api/team/users" else payload["sub"]
                    if payload.get("sub", target) != target:
                        raise InvalidRequest("user")
                    user = await run_in_threadpool(self.auth_store.change_access, actor, target,
                        expected_version=payload["expectedVersion"], role=payload["role"],
                        disabled=payload["disabled"], request_id=request_id, now=time.time, identity=identity, authorize=authorize)
                except (KeyError, TypeError, json.JSONDecodeError):
                    raise InvalidRequest("user") from None
                except AuthRefused as error:
                    code = error.code
                    result = {"code": code, "uiMessage": {"code": "team." + code, "args": {}}}
                    if isinstance(error, AccessConflict):
                        result["currentVersion"] = error.current_version
                    return await JSONResponse(result, status_code=409 if code in ("revision_conflict", "request_mismatch") else 403)(scope, receive, send)
                # AuthStore versions belong to access records, never to graph
                # resources. Return the actual graph snapshot; clients must
                # keep unsent graph forms' existing baseline for access writes.
                result = {"user": asdict(user), "resourceVersions": versions}
            return await JSONResponse(result, headers={"X-Semantic-Studio-Versions": json.dumps(versions)})(scope, receive, send)
        if shared:
            actual = {key: versions.get(key) for key in expected}
            if actual != expected:
                raise Conflict(expected, actual)
            missing = sorted(versions.keys() - expected.keys())
            if missing:
                raise MissingExpectation(missing)
        if path == "/api/team/history":
            query = parse_qs(scope.get("query_string", b"").decode())
            key = query.get("key", ["workspace"])[0]
            try:
                offset, limit = int(query.get("offset", [0])[0]), int(query.get("limit", [50])[0])
            except ValueError:
                raise InvalidRequest("pagination") from None
            if not 0 <= limit <= 100:
                raise InvalidRequest("pagination")
            history = await run_in_threadpool(self.repository.history, key, offset, limit)
            result = {"history": history, "resourceVersions": versions}
            return await JSONResponse(result, headers={"X-Semantic-Studio-Versions": json.dumps(versions)})(scope, receive, send)
        # Closing a screen never rolls an authoritative document back.
        if path.endswith("/close") and path.startswith("/api/projects/"):
            return await JSONResponse({"closed": path.split("/")[3], "resourceVersions": versions}, headers={"X-Semantic-Studio-Versions": json.dumps(versions)})(scope, receive, send)
        async with self._candidate(resources, versions, shared) as candidate:
            operation = scope["method"] + " " + getattr(policy, "template", path)
            undo = path.endswith(("/undo", "/redo")) and path.startswith("/api/projects/")
            if undo:
                from ..projects import document_id
                parts = path.split("/")
                changes, operation = await run_in_threadpool(inverse, self.repository, actor, "workspace", expected, redo=path.endswith("/redo"))
                await run_in_threadpool(authorize_inverse, self.repository, actor, operation.split(":", 1)[1], changes, resources, scope["state"]["principal"].role)
                if not any(key.startswith("file:projects/" + parts[3] + "/") or parts[3] in key and key.startswith(("graph:", "state:")) for key in changes):
                    raise RepositoryError("undo_forbidden")
                if changes.get("file:projects/" + parts[3] + "/project.json", {}) is None:
                    raise RepositoryError("undo_forbidden")
                for key, value in list(changes.items()):
                    if key.startswith("state:") and value is not None and "revision" in value:
                        changes[key] = {**value, "revision": max(resources.get(key, {}).get("revision", 0), versions.get(key) or 0) + 1}
                    elif key.startswith("state:snapshots:") and value is not None:
                        changes[key] = {**value, "generation": max(resources.get(key, {}).get("generation", 0), versions.get(key) or 0) + 1}
                inverse_resources = {key: changes.get(key, value) for key, value in resources.items() if changes.get(key, value) is not None}
                inverse_resources.update({key: value for key, value in changes.items() if value is not None})
                with tempfile.TemporaryDirectory(prefix="semantic-studio-inverse-") as root:
                    restored = await run_in_threadpool(Candidate, Path(root), inverse_resources, self.blobs)
                    from ..projects import UnknownDocument
                    documents = restored.services["editing_service"]._open.get(parts[3], {})
                    try:
                        document = restored.services["editing_service"].document(parts[3], parts[5])
                        state = document.state()
                    except UnknownDocument:
                        state = candidate.services["editing_service"].document(parts[3], parts[5]).state()
                        state.update(triples=0, dirty=False, revision=(versions.get("state:" + state["ontologyId"]) or 0) + 1)
                    latest = await run_in_threadpool(self.repository.latest_operation, "workspace")
                    prior = latest.request_result
                    previous = json.loads(base64.b64decode(prior['response']['body'])) if prior and 'response' in prior else {}
                    result = {"state": state, "revision": state["revision"],
                              "documents": [document.state() for document in documents.values()],
                              "removedDocuments": [parts[5]] if parts[5] not in documents else [],
                              "label": previous.get("label", latest.operation),
                              **({"uiMessage": previous["uiMessage"]} if "uiMessage" in previous else {})}
                    payload = await run_in_threadpool(self._states, json.dumps(result).encode(), actor, scope["state"]["principal"].role, resources, changes, operation)
                    output = self._response(200, [(b"content-type", b"application/json")], payload, versions)
            else:
                messages = []
                delivered = False
                async def candidate_receive():
                    nonlocal delivered
                    if delivered:
                        import anyio
                        await anyio.sleep_forever()
                    delivered = True
                    return {"type": "http.request", "body": body, "more_body": False}
                async def candidate_send(message):
                    messages.append(message)
                with bind_services(candidate.services):
                    await inner_app(scope, candidate_receive, candidate_send)
                start = next(message for message in messages if message["type"] == "http.response.start")
                payload = b"".join(message.get("body", b"") for message in messages if message["type"] == "http.response.body")
                if start["status"] >= 400 or not shared:
                    json_response = any(key.lower() == b"content-type" and b"application/json" in value for key, value in start.get("headers", []))
                    decorated = await run_in_threadpool(self._states, payload, actor, scope["state"]["principal"].role, resources, enabled=json_response)
                    return await self._send(self._response(start["status"], start.get("headers", []), decorated, versions), send)
                staged = await run_in_threadpool(candidate.capture)
                # Preserve lazily unloaded library graphs, but never resources
                # whose corresponding raw ontology was explicitly removed.
                for key, value in resources.items():
                    if key.startswith("graph:") and key not in staged:
                        oid = key[6:]
                        if oid in candidate.services["store"]._items:
                            staged[key] = value
                changes = {key: staged.get(key) for key in resources.keys() | staged.keys()
                           if key.startswith(("file:", "graph:", "state:")) and resources.get(key) != staged.get(key)}
                decorated = await run_in_threadpool(self._states, payload, actor, scope["state"]["principal"].role, resources, changes, operation)
                output = self._response(start["status"], start.get("headers", []), decorated, versions)
            if shared:
                changes["workspace"] = {"kind": "workspace"}
                missing = [key for key in changes if key in versions and key not in expected]
                if missing:
                    raise MissingExpectation(sorted(missing))
                # New random ids are protected by the collection workspace
                # generation; a caller cannot name their absent keys in advance.
                commit_expected = {**expected, **{key: None for key in changes if key not in versions}}
                new_versions = {**versions, **{key: (versions.get(key) or 0) + 1 for key in changes}}
                output = self._response(output["status"], [(key.encode("latin1"), value.encode("latin1")) for key, value in output["headers"]], base64.b64decode(output["body"]), new_versions)
                def final_authorize(tx):
                    principal = authorize(tx)
                    if undo:
                        current_resources, _ = self.repository.snapshot(tx=tx)
                        authorize_inverse(self.repository, actor, operation.split(':', 1)[1], changes,
                                          current_resources, principal.role, tx=tx)
                    return principal
                committed = await run_in_threadpool(self.repository.commit, actor, request_id, commit_expected, changes, operation, identity=identity, response=output, authorize=final_authorize)
                won = committed["response"] == output
                output = committed["response"]
                if won:
                    self._once = candidate.services["broker"].policy._once
                self._invalidate_views()
            await self._send(output, send)

    @staticmethod
    def _response(status, headers, body, versions):
        headers = [(key, value) for key, value in headers if key.lower() not in (b"content-length", b"x-semantic-studio-versions")]
        if any(key.lower() == b"content-type" and b"application/json" in value for key, value in headers):
            try:
                parsed = json.loads(body)
            except (ValueError, UnicodeError):
                pass
            else:
                if isinstance(parsed, dict):
                    parsed["resourceVersions"] = versions
                    body = json.dumps(parsed, ensure_ascii=True).encode()
        headers += [(b"x-semantic-studio-versions", json.dumps(versions).encode()), (b"content-length", str(len(body)).encode())]
        return {"status": status, "headers": [[key.decode("latin1"), value.decode("latin1")] for key, value in headers], "body": base64.b64encode(body).decode()}

    @staticmethod
    async def _send(response, send):
        await send({"type": "http.response.start", "status": response["status"], "headers": [(key.encode("latin1"), value.encode("latin1")) for key, value in response["headers"]]})
        await send({"type": "http.response.body", "body": base64.b64decode(response["body"])})
