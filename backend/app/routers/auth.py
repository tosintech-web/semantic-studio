"""
================================================================================
FILE: backend/app/routers/auth.py
SUMMARY
    Isolated team login, callback, session-status and logout HTTP routes.
BASIC IDEA
    Bind the Google flow to a secure browser cookie and one-use server state.
    Only verified identity facts reach the store; server sessions retain current
    roles. Authentication refusals persist finite, unowned failure events.
    Mutating endpoints require exact Origin and client-header checks,
    with session-bound CSRF additionally required for authenticated logout.
INPUTS / INPUT SOURCES
    Explicit team configuration, AuthStore, GoogleIdentity and injected clock.
EXPECTED OUTPUT
    Noncacheable safe JSON, secure opaque cookies and fixed callback redirects.
    Creating this router neither mounts it nor changes the local-mode runtime.
================================================================================
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict
import hmac
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

from ..messages import make_message
from ..team.auth import GoogleIdentity
from ..team.auth_store import ABSOLUTE_SECONDS, LOGIN_SECONDS, AuthRefused, AuthStore
from ..team.config import TeamConfig


SESSION_COOKIE = "__Host-semantic-studio-session"
LOGIN_COOKIE = "__Host-semantic-studio-login"
_COOKIE_FLAGS = dict(secure=True, httponly=True, samesite="lax", path="/")
_ERRORS = frozenset({"auth_required", "auth_expired", "auth_failed", "config_unavailable", "forbidden", "csrf", "disabled"})


def _refused(code: str, status: int = 403) -> JSONResponse:
    # Domain error text is never serialized; only registered finite codes cross
    # this boundary, so neither provider payloads nor query strings can escape.
    safe = code if code in _ERRORS else "auth_failed"
    return JSONResponse({"code": safe, "uiMessage": make_message("team." + safe)},
                        status_code=status, headers={"Cache-Control": "no-store"})


def _guard(request: Request, config: TeamConfig) -> bool:
    # getlist also refuses ambiguous duplicate headers instead of selecting one.
    return (request.headers.getlist("origin") == [config.public_origin]
            and request.headers.getlist("x-semantic-studio") == ["1"])


def _clear_login(response: Response) -> None:
    response.delete_cookie(LOGIN_COOKIE, **_COOKIE_FLAGS)


def create_auth_router(config: TeamConfig, store: AuthStore, identity: GoogleIdentity,
                       clock: Callable[[], float] = time.time) -> APIRouter:
    router = APIRouter(prefix="/api/auth", tags=["authentication"])

    @router.get("/status")
    def status(request: Request):
        body = {"mode": "team", "authenticated": False, "user": None, "csrf": None}
        token = request.cookies.get(SESSION_COOKIE)
        if token:
            try:
                view = store.authenticate(token, now=clock())
            except AuthRefused:
                pass
            else:
                body.update(authenticated=True, user=asdict(view.principal), csrf=view.csrf_token)
        return JSONResponse(body, headers={"Cache-Control": "no-store"})

    @router.post("/login")
    def login(request: Request):
        if not _guard(request, config):
            return _refused("csrf")
        try:
            attempt = store.begin_login(now=clock())
            url = identity.authorization_url(attempt)
        except AuthRefused as error:
            store.record_failure(now=clock())
            return _refused(error.code, 503 if error.code == "config_unavailable" else 403)
        response = JSONResponse({"url": url}, headers={"Cache-Control": "no-store"})
        response.set_cookie(LOGIN_COOKIE, attempt.browser_cookie, max_age=LOGIN_SECONDS, **_COOKIE_FLAGS)
        return response

    @router.get("/callback")
    def callback(request: Request):
        try:
            query = request.query_params
            if (len(query.getlist("state")) != 1 or len(query.getlist("code")) != 1
                    or "error" in query or not query["code"]):
                raise AuthRefused()
            browser = request.cookies.get(LOGIN_COOKIE, "")
            state = store.consume_login(query["state"], browser, now=clock())
            verified = identity.exchange(query["code"], state)
            principal = store.identity(verified["sub"], verified["email"], verified["hd"], now=clock())
            token = store.create_session(principal.sub, now=clock())
        except AuthRefused:
            store.record_failure(now=clock())
            response = RedirectResponse("/?auth=failed", status_code=303, headers={"Cache-Control": "no-store"})
        else:
            response = RedirectResponse("/", status_code=303, headers={"Cache-Control": "no-store"})
            response.set_cookie(SESSION_COOKIE, token, max_age=ABSOLUTE_SECONDS, **_COOKIE_FLAGS)
        _clear_login(response)
        return response

    @router.post("/logout")
    def logout(request: Request):
        if not _guard(request, config):
            return _refused("csrf")
        token = request.cookies.get(SESSION_COOKIE)
        if token:
            try:
                view = store.authenticate(token, now=clock())
            except AuthRefused:
                pass
            else:
                supplied = request.headers.getlist("x-semantic-studio-csrf")
                if len(supplied) != 1 or not hmac.compare_digest(supplied[0].encode(), view.csrf_token.encode()):
                    return _refused("csrf")
                store.revoke(token, now=clock())
        response = JSONResponse({"authenticated": False}, headers={"Cache-Control": "no-store"})
        response.delete_cookie(SESSION_COOKIE, **_COOKIE_FLAGS)
        return response

    return router
