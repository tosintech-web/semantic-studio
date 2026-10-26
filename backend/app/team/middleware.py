"""
================================================================================
FILE: backend/app/team/middleware.py
SUMMARY
    Default-deny team authentication, role and browser-request boundary.
BASIC IDEA
    Exact public paths precede fresh session checks. Unsafe methods require
    Origin, client header and session CSRF. Shared writes require version/request
    headers; all protected data routes use the transactional workspace dispatcher.
INPUTS / INPUT SOURCES
    ASGI path/headers, fixed configuration and current AuthStore rows.
EXPECTED OUTPUT
    Localized refusal or authorized scope facts passed to
    workspace.handle_request(scope, receive, send, policy, app).
================================================================================
"""
import hmac
import json
import time
from urllib.parse import urlsplit

from starlette.concurrency import run_in_threadpool
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.responses import JSONResponse

from ..messages import make_message
from ..routers.auth import SESSION_COOKIE
from .auth_store import AuthRefused
from .pg_storage import StorageError
from .permissions import allows, classify_route


async def refuse(scope, receive, send, code, status):
    await JSONResponse(
        {'code': code, 'uiMessage': make_message('team.' + code)},
        status_code=status, headers={'Cache-Control': 'no-store'},
    )(scope, receive, send)


class TeamMiddleware:
    def __init__(self, app, runtime, public_static_paths=frozenset(), body_limit=None):
        self.app = app
        self.runtime = runtime
        self.public_static_paths = frozenset(public_static_paths)
        self.body_limit = body_limit

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            if scope['type'] == 'websocket':
                await send({'type': 'websocket.close', 'code': 1008})
            else:
                await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        expected_host = urlsplit(self.runtime.config.public_origin).netloc.lower()
        if headers.getlist('host') != [expected_host]:
            await refuse(scope, receive, send, 'forbidden', 400)
            return
        method, path = scope['method'].upper(), scope['path']
        match = classify_route(method, path)
        if method in {'GET', 'HEAD'} and path in self.public_static_paths:
            await self.app(scope, receive, send)
            return
        if match is not None and match[0].operation == 'public':
            # Callback navigation is the narrow cross-origin exception. Login
            # independently checks exact Origin/client headers in its handler.
            await self.app(scope, receive, send)
            return
        token = Request(scope).cookies.get(SESSION_COOKIE)
        if not token:
            await refuse(scope, receive, send, 'auth_required', 401)
            return
        try:
            # Session refresh shares PostgreSQL's writer gate with graph commits.
            # A lock wait must leave the event loop free to answer health and
            # cancellation requests, just as FastAPI's synchronous routes do.
            view = await run_in_threadpool(
                self.runtime.auth_store.authenticate, token, now=time.time,
                touch=bool(match and match[0].template != '/api/team/versions'))
        except AuthRefused as error:
            code = error.code if error.code in {'disabled', 'auth_expired'} else 'auth_required'
            await refuse(scope, receive, send, code, 401)
            return
        except StorageError:
            await refuse(scope, receive, send, 'config_unavailable', 503)
            return
        if match is None:
            await refuse(scope, receive, send, 'forbidden', 403)
            return
        policy, params = match
        if not allows(view.principal.role, policy.operation):
            await refuse(scope, receive, send, 'forbidden', 403)
            return
        if method not in {'GET', 'HEAD', 'OPTIONS'}:
            csrf = headers.getlist('x-semantic-studio-csrf')
            if (headers.getlist('origin') != [self.runtime.config.public_origin]
                    or headers.getlist('x-semantic-studio') != ['1'] or len(csrf) != 1
                    or not hmac.compare_digest(csrf[0].encode(), view.csrf_token.encode())):
                await refuse(scope, receive, send, 'csrf', 403)
                return
        state = scope.setdefault('state', {})
        state.update(principal=view.principal, team_route_policy=policy,
                     team_route_template=policy.template, team_path_params=params,
                     team_request_auth=self.runtime.auth_store.bind_request(token, policy.operation))
        if policy.shared_update:
            versions = headers.getlist('x-semantic-studio-versions')
            ids = headers.getlist('x-semantic-studio-request-id')
            try:
                if len(versions) != 1 or len(ids) != 1 or not 1 <= len(ids[0]) <= 128:
                    raise ValueError
                expected = json.loads(versions[0])
                if (not isinstance(expected, dict) or not expected
                        or any(not key or version is not None and (type(version) is not int or version < 0)
                               for key, version in expected.items())):
                    raise ValueError
            except (ValueError, TypeError):
                await refuse(scope, receive, send, 'version_required', 428)
                return
            state.update(team_expected_versions=expected, team_request_id=ids[0])
        if self.body_limit is not None:
            limit = self.body_limit(method, path)
            if limit is not None:
                maximum, refusal = limit
                state.update(team_body_limit=maximum, team_body_refusal=refusal)
                declared = headers.get('content-length', '')
                if declared.isdigit() and int(declared) > maximum:
                    await JSONResponse(refusal, status_code=413)(scope, receive, send)
                    return
        # Auth routes own their lifecycle. Every data route must be staged,
        # including open/close and computations that use process-scoped services.
        # This prevents a partially wired deployment from exposing local state.
        if path.startswith('/api/auth/'):
            await self.app(scope, receive, send)
        elif self.runtime.workspace is None:
            await refuse(scope, receive, send, 'config_unavailable', 503)
        else:
            await self.runtime.workspace.handle_request(scope, receive, send, policy, self.app)
