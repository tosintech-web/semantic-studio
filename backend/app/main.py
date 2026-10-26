"""
================================================================================
FILE: backend/app/main.py
================================================================================

SUMMARY
    This is the entry point of the Semantic Studio backend. It constructs the
    FastAPI application object, wires in the HTTP routers that expose the REST
    API, enables cross-origin requests from the dev frontend, exposes a health
    check, and — in a production/Docker build — serves the compiled frontend
    as static files from the same server. Explicit team mode adds a locked
    SQLite/auth runtime and default-deny authorization before all data routes.

BASIC IDEA
    A single FastAPI "app" object is the thing an ASGI server (uvicorn) runs.
    Everything the backend can do is attached to this object: middleware for
    CORS and for refusing oversized upload bodies, the ontology and saved-query
    routers, a health endpoint, and an optional static-file mount so one process
    can serve both the JSON API and the built web UI.

    The upload size middleware lives here rather than in the router because it
    has to run before FastAPI parses the request body. Resolving
    `UploadFile = File(...)` reads and buffers the whole multipart body, so a
    limit checked inside the endpoint reports a number after the fact instead of
    preventing anything.

INPUTS / INPUT SOURCES
    - HTTP requests arriving from the browser (the React frontend) or any API
      client, routed to the included routers.
    - Environment variable STATIC_DIR: optional override for where the built
      frontend lives. In Docker this is set to /app/static.
    - The upload cap, read from the ontologies router at request time.
    - The six router modules (ontologies, queries, network, projects, data,
      examples) which define the actual endpoints.
    - SEMANTIC_STUDIO_MODE and explicit team deployment settings, validated
      before service imports; missing team configuration stops startup.
    - The bundled examples, seeded into the local library when the server starts
      (library_examples.py, home-and-examples 5.1).

EXPECTED OUTPUT
    - A configured `app` object that uvicorn imports and runs (see the Docker
      CMD / local uvicorn command).
    - HTTP/JSON responses for API calls; static HTML/JS/CSS when the frontend
      build directory exists.
    - HTTP 413 for an upload whose declared size exceeds the cap, returned
      before the body is read. Source metadata captures the current byte cap
      beside the unchanged legacy refusal.
    - HTTP 400 or 403 for a request that did not come from the application's
      own page (local_guard.py), before any other middleware or route runs.
    - HTTP 409, 403 or 503 when the network broker needs the user's approval,
      finds the host blocked, or is offline (network_broker.py, D-066), with
      source-owned UI metadata beside the unchanged legacy detail.
================================================================================
"""

# `from __future__ import annotations` makes all type hints lazy (stored as
# strings). It lets us reference types without import-order worries and is
# harmless on modern Python.
from __future__ import annotations

# `os` is used to read the optional STATIC_DIR environment variable.
import hashlib
import json
import logging
import os
import re
from contextlib import asynccontextmanager
# `Path` gives us cross-platform filesystem path handling for locating the
# built frontend directory.
from pathlib import Path

# FastAPI is the web framework; CORSMiddleware allows the browser dev server
# on a different port to call this API; StaticFiles serves the built frontend.
from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Import the two routers that hold every API endpoint. Splitting them by topic
# (ontologies vs saved queries) keeps this file small.
from .team.config import TeamConfig

# Validate before importing services that may create a local data directory.
_config = TeamConfig.from_env(os.environ)

from .messages import detail_body
from .local_guard import LocalOnlyMiddleware
from .network_broker import ApprovalRequired, GrantScopeMiddleware, HostBlocked, Offline
from . import library_examples, tabular
from .routers import data, examples, network, ontologies, projects, queries
from .store import store


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Seed the library's examples once the server is up (home-and-examples
    5.1). Here rather than at import, so a test that builds a TestClient
    without starting the app gets the library it set up and nothing else; a
    first start parses three small files, every later one parses nothing.

    A failure is said in the server's log and the server starts anyway: the
    examples are a convenience, and a data folder that cannot take
    examples.json should not cost the person their own library. What did not
    come in can be added back from the Load dialog."""
    team = getattr(_app.state, "team", None)
    if team is not None:
        from .team.pg_storage import StorageError
        from .team.repository import UnsupportedSchema
        try:
            await run_in_threadpool(team.start)
        except (StorageError, UnsupportedSchema):
            # Uvicorn logs startup exceptions. Suppress the lower SQL/catalog
            # stack as well as its driver cause, keeping only a finite reason.
            raise RuntimeError('team_startup_failed') from None
        try:
            yield
        finally:
            await run_in_threadpool(team.close)
        return
    try:
        library_examples.seed(store)
    except Exception:  # noqa: BLE001 -- any failure here must not stop the server
        logging.getLogger("uvicorn.error").exception("The bundled examples were not added to the library")
    yield


# Create the application. The title/version surface in the auto-generated
# OpenAPI docs at /docs.
app = FastAPI(title="Semantic Studio", version="0.2.0", lifespan=lifespan,
              docs_url=None if _config.mode == "team" else "/docs",
              redoc_url=None if _config.mode == "team" else "/redoc",
              openapi_url=None if _config.mode == "team" else "/openapi.json")
if _config.mode == "team":
    from .team.runtime import TeamRuntime
    app.state.team = TeamRuntime(_config)

# During local development the frontend runs on Vite's port 5173 while this API
# runs on 8000, so the browser makes cross-origin requests. This middleware
# tells the browser those origins are allowed. In the Docker build the frontend
# is served from this same origin, so CORS is not needed there but is harmless.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if _config.mode == "team" else ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],  # permit GET/POST/DELETE/etc. from the dev frontend
    allow_headers=["*"],  # permit any request header (e.g. Content-Type)
)

@app.middleware("http")
async def refuse_oversized_bodies(request: Request, call_next):
    """Refuse a body that declares itself too large, before anything reads it.

    This has to be middleware rather than a check inside the endpoint. FastAPI
    resolves `UploadFile = File(...)` by parsing the whole multipart body
    *before* the endpoint function is entered, so by the time handler code could
    look at Content-Length the body has already been received and buffered.
    Measured: rejecting a 30 MB upload against a 1 MB limit from inside the
    handler peaked at 124 MB. Refusing here keeps it flat.

    The cap is read from the router module at call time rather than imported
    once, so it stays a single source of truth and tests can adjust it.

    Two routes take a multipart body: the upload, and the files chosen for
    unresolved imports (external-access Stage 2), whose request as a whole is
    held to the imports closure's 150 MB. Both endpoints still enforce the real
    size while reading; this is the half that runs before FastAPI buffers the
    body (D-015).

    The Turtle editor's apply (authoring-foundations) is a third: typed Turtle
    is the same input as an uploaded file and keeps the upload cap. The canvas
    layout (visual-modeling Stage 2) is a fourth, at 1 MB. A data file for
    the import wizard (csv-data-import Section 9) is a fifth, at 5 MB, on the
    four routes that take one; an edited mapping a sixth, at 1 MB. The IRIs
    a query's results send to /nodes are a seventh, at 4 MB.
    """
    limit = request_body_limit(request.method, request.url.path)
    if limit is not None and _declared(request) > limit[0]:
        return JSONResponse(status_code=413, content=limit[1])
    return await call_next(request)


# The one parameterised multipart route. Matched rather than compared, because
# the ontology id is in the path.
_IMPORT_FILES_PATH = re.compile(r"^/api/ontologies/[^/]+/imports/files$")
_SOURCE_PATH = re.compile(r"^/api/projects/[^/]+/documents/[^/]+/source$")
_LAYOUT_PATH = re.compile(r"^/api/projects/[^/]+/documents/[^/]+/layout$")
# The data wizard's file routes: inspect, preview, import and refresh.
_DATA_FILE_PATH = re.compile(r"^/api/projects/[^/]+/data(/inspect|/preview|/[^/]+/refresh)?$")
_DATA_PATCH_PATH = re.compile(r"^/api/projects/[^/]+/data/[^/]+$")
_NODES_PATH = re.compile(r"^/api/ontologies/[^/]+/nodes$")


def request_body_limit(method: str, path: str) -> tuple[int, dict] | None:
    """One cap/metadata table for local headers and team buffered reads.

    Multipart requests include the historical framing allowance. JSON limits
    stay exact; the source-body cap retains its existing upload allowance.
    """
    limit, detail = None, None
    if method == "PUT":
        if _SOURCE_PATH.match(path):
            limit = ontologies.MAX_UPLOAD_BYTES + ontologies.CHUNK_BYTES
            detail = ontologies.too_large_detail(ontologies.MAX_UPLOAD_BYTES, "SEMANTIC_STUDIO_MAX_UPLOAD_BYTES")
        elif _LAYOUT_PATH.match(path):
            limit, detail = projects.LAYOUT_MAX_BYTES, projects.layout_too_large()
    elif method == "PATCH" and _DATA_PATCH_PATH.match(path):
        limit, detail = data.PATCH_MAX_BYTES, data.mapping_too_large()
    elif method == "POST":
        if _NODES_PATH.match(path):
            limit, detail = ontologies.NODES_MAX_BYTES, ontologies.nodes_too_large()
        elif _DATA_FILE_PATH.match(path):
            limit, detail = tabular.MAX_BYTES + ontologies.CHUNK_BYTES, data.file_too_large()
        elif path == "/api/ontologies/upload":
            limit = ontologies.MAX_UPLOAD_BYTES + ontologies.CHUNK_BYTES
            detail = ontologies.too_large_detail(ontologies.MAX_UPLOAD_BYTES, "SEMANTIC_STUDIO_MAX_UPLOAD_BYTES")
        elif _IMPORT_FILES_PATH.match(path):
            limit = ontologies.imports_mod.MAX_TOTAL_BYTES + ontologies.CHUNK_BYTES
            detail = ontologies.import_files_too_large()
    return (limit, detail_body(detail)) if limit is not None else None


def _declared(request: Request) -> int:
    declared = request.headers.get("content-length")
    return int(declared) if declared and declared.isdigit() else 0


# Carries a just-once grant from the X-Semantic-Studio-Grant header to the
# broker, and spends it when the request ends. Inside local_guard, so a request
# the guard refuses never reaches it.
app.add_middleware(GrantScopeMiddleware)

# Outermost local guard (team authorization additionally wraps it below):
# Starlette makes the most recently added middleware the outermost. A request from a foreign page (DNS rebinding, or a
# cross-site form post) is refused here before CORS, the upload cap or any route
# sees it. See local_guard.py and decision D-065.
app.add_middleware(LocalOnlyMiddleware, team_config=_config if _config.mode == "team" else None)


# Attach every endpoint. `ontologies` handles loading, viewing, the graph, the
# query schema and SPARQL execution; `queries` handles the saved-query library.
app.include_router(ontologies.router)
app.include_router(queries.router)
app.include_router(network.router)
app.include_router(projects.router)
app.include_router(data.router)
app.include_router(examples.router)

if _config.mode == "team":
    from .routers.auth import create_auth_router

    class _RuntimeService:
        """Resolve started services without opening the database during import."""
        def __init__(self, name):
            self.name = name

        def __getattr__(self, attribute):
            return getattr(getattr(app.state.team, self.name), attribute)

    app.include_router(create_auth_router(_config, _RuntimeService("auth_store"),
                                          _RuntimeService("identity")))


# Message metadata is additive: old detail strings/objects remain byte-for-byte
# data values for older clients and technical detail disclosure.

@app.exception_handler(StarletteHTTPException)
async def _http_message(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    body = detail_body(exc.detail, getattr(exc, "ui_message", None))
    if "uiMessage" not in body:
        return await http_exception_handler(_request, exc)
    return JSONResponse(status_code=exc.status_code, content=body, headers=exc.headers)


# The broker's three policy decisions, mapped once for every route. They can
# surface from anywhere that parses -- an upload, a fetch, or the lazy restore
# behind a GET -- so mapping them per route would miss one. 409 carries the
# structured body the approval dialog is built from (external-access Section
# 8); the other two carry the sentence the user sees.
@app.exception_handler(ApprovalRequired)
async def _approval_required(_request: Request, exc: ApprovalRequired) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": exc.body()})


@app.exception_handler(HostBlocked)
async def _host_blocked(_request: Request, exc: HostBlocked) -> JSONResponse:
    return JSONResponse(status_code=403, content=detail_body(str(exc), getattr(exc, "ui_message", None)))


@app.exception_handler(Offline)
async def _offline(_request: Request, exc: Offline) -> JSONResponse:
    return JSONResponse(status_code=503, content=detail_body(str(exc), getattr(exc, "ui_message", None)))


# A trivial liveness probe. Deployment tooling (and our own scripts) hit this
# to confirm the server is up before doing anything else.
@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


if _config.mode == "local":
    @app.get("/api/auth/status")
    def local_auth_status() -> JSONResponse:
        # The frontend discovers its mode before rendering the library. Local
        # discovery needs neither identity services nor a session database.
        return JSONResponse(
            {"mode": "local", "authenticated": False, "user": None, "csrf": None},
            headers={"Cache-Control": "no-store"},
        )


# --- serve the built frontend in production ---------------------------------
# In a Docker image the compiled React app is copied to /app/static and
# STATIC_DIR points there; locally this falls back to frontend/dist (which only
# exists after `npm run build`). When the directory is present we mount it at
# the site root so the same server delivers both the API and the web UI. When
# it is absent (typical during backend-only development) we simply skip it and
# the Vite dev server serves the frontend instead.
static_dir = Path(os.environ.get("STATIC_DIR", Path(__file__).parent.parent.parent / "frontend" / "dist"))
if static_dir.is_dir():
    # html=True makes StaticFiles serve index.html for the root path, which is
    # what a single-page app needs.
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


def _distribution_static_paths(directory: Path) -> set[str]:
    """Expose only generated legal artifacts and hash-verified notice originals.

    The actual bundled component inventory defines notice paths. An arbitrary
    text/JSON file beside the frontend never becomes a public data endpoint.
    """
    root = directory.resolve()
    manifest = directory / "runtime-components.json"
    if not manifest.exists():
        return set()
    if manifest.is_symlink() or root not in manifest.resolve().parents:
        raise ValueError("Invalid frontend distribution inventory")
    inventory = json.loads(manifest.read_text(encoding="utf-8"))
    components = inventory.get("components")
    if not isinstance(components, list):
        raise ValueError("Invalid frontend distribution inventory")
    paths = {"/runtime-components.json"}
    for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
        item = directory / name
        if not item.is_file() or item.is_symlink() or root not in item.resolve().parents:
            raise ValueError("Missing frontend distribution notice")
        paths.add("/" + name)
    for component in components:
        notices = component.get("notices")
        if not isinstance(notices, list):
            raise ValueError("Invalid frontend distribution notices")
        for notice in notices:
            digest = notice.get("sha256")
            name = notice.get("text")
            if (not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest)
                    or name != f"licenses/texts/{digest}.txt"):
                raise ValueError("Invalid frontend notice path")
            item = directory / name
            if (not item.is_file() or item.is_symlink() or root not in item.resolve().parents
                    or hashlib.sha256(item.read_bytes()).hexdigest() != digest):
                raise ValueError("Invalid frontend notice original")
            paths.add("/" + name)
    return paths


if _config.mode == "team":
    from .team.middleware import TeamMiddleware

    # Publish only actual build artifacts, never arbitrary paths under a static
    # prefix. A data directory inside the web root must fail before serving it.
    public_static_paths = set()
    if static_dir.is_dir():
        root = static_dir.resolve()
        data_root = _config.data_dir.resolve()
        if data_root == root or root in data_root.parents or data_root in root.parents:
            raise ValueError("Team data and static directories must be separate")
        public_static_paths.update({"/", "/index.html"})
        for item in static_dir.rglob("*"):
            relative = item.relative_to(static_dir)
            if (item.is_file() and not item.is_symlink() and root in item.resolve().parents
                    and item.suffix in {".html", ".js", ".css", ".svg", ".png", ".ico", ".woff", ".woff2"}
                    and not any(part.startswith(".") for part in relative.parts)):
                public_static_paths.add("/" + relative.as_posix())
        public_static_paths.update(_distribution_static_paths(static_dir))
    # Outermost, so neither CORS nor upload/body parsing precedes authentication.
    app.add_middleware(TeamMiddleware, runtime=app.state.team,
                       public_static_paths=frozenset(public_static_paths),
                       body_limit=request_body_limit)
