"""
================================================================================
FILE: backend/app/routers/projects.py
================================================================================

SUMMARY
    Domain template/profile requests retain explicit preview and confirmation.
    Display-language parameters choose read names without changing project languages.
    The HTTP surface for projects and editing (authoring-foundations): list,
    create, rename, duplicate, trash and export projects, and change their
    kind, ontology or taxonomy (relationships 5.1); open and close them;
    run commands, apply Turtle, undo, redo, save and recover a document; and
    the modeling canvas's view and layout (visual-modeling Stage 2); the
    SHACL shapes in the form's structure, their suggestions, and validation
    on demand (shacl-authoring 5.1 to 5.7); and reasoning on demand, its
    Stop, its pages and its reasons (axioms-and-reasoning Stage A).

BASIC IDEA
    Translated HTTP refusals carry source codes and facts while keeping the
    original status and detail payloads intact.

    Command refusals retain their original status and detail payload, adding
    validated display metadata for the current UI language, including 404/409,
    current layout byte caps and captured parse timeouts.

    Thin, like the other routers: shape the request, call projects.py or
    editing.py, and map their exceptions to status codes in one place. An id
    or document name the server did not issue is 404 whatever it looks like;
    a refused command is 422 with its sentence; a document whose project is not
    open, and closing with unsaved changes, are 409.

    Once open, a document is read through the existing /api/ontologies/{id}/…
    endpoints under its prj-<hex>-<doc> id (D-081). Only two routes here change
    a document's content: the command route and the Turtle apply route (5.4).

    The apply route reads its body in chunks under the upload cap, as the
    upload does, because typed Turtle is the same input as an uploaded file;
    main.py refuses a declared oversize before this runs (D-015 pattern).
    The layout PUT is read the same way under its own 1 MB cap: a layout is
    positions, not Turtle, and has no reason to be large.

INPUTS / INPUT SOURCES
    - HTTP requests from the frontend, every mutating one carrying the client
      header local_guard.py requires.
    - The editing and project singletons in editing.py; the library store for
      "Start a project from this".

EXPECTED OUTPUT
    - JSON project summaries, document states, command results; a zip for
      export and Turtle for a copy. A create naming a property of its kind
      that exists is 409 `{"code": "already_defined", "property",
      "message"}` (attribute-reuse 5.1); ShareDomain's dry run answers the
      reuse plan (5.2).
================================================================================
"""

from __future__ import annotations

import json
import re
from contextlib import contextmanager, nullcontext
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from ..messages import MessageText, integer_arg, make_message
from ..messages import UiHTTPException
from pydantic import BaseModel, StrictBool, ValidationError, model_validator
from starlette.concurrency import run_in_threadpool

from .. import reasoning
from ..editing import (
    AlreadyDefined,
    CommandError,
    Dirty,
    NoSuchRule,
    NotOpen,
    ReasoningRefused,
    TurtleSyntaxError,
    editing_service,
    project_store,
)
from ..projects import LAYOUT_MAX_BYTES, ProjectError, UnknownDocument, UnknownProject
from ..store import ParseError, ParseTimeout, store
from . import ontologies
from ..government.profile import DomainError
from ..government.references import metadata_locked

router = APIRouter(prefix="/api/projects", tags=["projects"])
COMMAND_MAX_BYTES = 256 * 1024


class CreateProject(BaseModel):
    name: str
    template: Optional[Literal["empty", "small", "taxonomy-empty", "taxonomy-small", "vocabulary", "countries", "government-organizations"]] = None
    domainProfile: Optional[dict] = None
    fromOntologyId: Optional[str] = None
    baseIri: Optional[str] = None
    prefix: Optional[str] = None
    primaryLanguage: str = "en"


class PatchProject(BaseModel):
    domainProfile: Optional[dict] = None
    dryRun: StrictBool = False
    profileBasis: Optional[str] = None
    name: Optional[str] = None
    languages: Optional[list[str]] = None
    # Ontology or taxonomy (D-089): the tools change, the model does not.
    kind: Optional[Literal["ontology", "taxonomy"]] = None


class CloseProject(BaseModel):
    discard: bool = False


class NewDocument(BaseModel):
    role: Literal["shapes"]


class RunCommand(BaseModel):
    command: str
    args: dict = {}
    dryRun: bool = False

    @model_validator(mode="before")
    @classmethod
    def history_preview_boolean(cls, value):
        from ..government.commands import HISTORY_COMMANDS
        if isinstance(value, dict) and value.get('command') in HISTORY_COMMANDS and 'dryRun' in value and type(value['dryRun']) is not bool:
            raise ValueError('A history preview uses a JSON boolean.')
        return value


class SaveDocument(BaseModel):
    confirmRewrite: bool = False


class Recover(BaseModel):
    action: Literal["recover", "discard"]


class Reason(BaseModel):
    includeData: bool = False
    # The imports switch the views are on (5.1): a request parameter there,
    # so the run is told it too.
    imports: bool = False


@contextmanager
def _errors():
    """The one mapping from the domain's refusals to status codes."""
    try:
        yield
    except (UnknownProject, UnknownDocument) as exc:
        raise UiHTTPException(
            status_code=404,
            detail='There is no such project or document.',
            ui_message=make_message('project.document_not_found'),
        ) from exc
    except NotOpen as exc:
        raise UiHTTPException(
            status_code=409,
            detail='Open the project first.',
            ui_message=make_message('project.not_open'),
        ) from exc
    except Dirty as exc:
        raise UiHTTPException(
            status_code=409,
            detail='This project has unsaved changes. Save them, or close with discard.',
            ui_message=make_message('project.unsaved'),
        ) from exc
    except TurtleSyntaxError as exc:
        raise UiHTTPException(
            status_code=422,
            detail={'line': exc.line, 'column': exc.column, 'message': str(exc), 'detail': exc.detail},
            ui_message=(
                make_message('parse.syntax', format='Turtle', line=exc.line)
                if exc.line is not None
                else make_message('parse.syntax_without_line', format='Turtle')
            ),
        ) from exc
    except DomainError as exc:
        raise UiHTTPException(status_code=exc.status, detail=str(exc), ui_message=exc.ui_message) from exc
    except AlreadyDefined as exc:
        # A property of that name and kind is there already (attribute-reuse
        # 5.1): the form offers to use it, so the property goes with the words.
        detail = {"code": "already_defined", "property": exc.property, "message": str(exc)}
        if exc.ui_message is not None:
            raise UiHTTPException(status_code=409, detail=detail, ui_message=exc.ui_message) from exc
        raise HTTPException(status_code=409, detail=detail) from exc
    except NoSuchRule as exc:
        # A restriction named by its content that is not there (axioms 5.10).
        if exc.ui_message is not None:
            raise UiHTTPException(status_code=404, detail=str(exc), ui_message=exc.ui_message) from exc
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (CommandError, ProjectError, ReasoningRefused) as exc:
        if getattr(exc, "ui_message", None) is not None:
            raise UiHTTPException(status_code=422, detail=str(exc), ui_message=exc.ui_message) from exc
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except reasoning.AlreadyRunning as exc:
        raise UiHTTPException(
            status_code=409,
            detail=str(exc),
            ui_message=make_message('reasoning.already_running'),
        ) from exc
    except ParseTimeout as exc:
        raise UiHTTPException(status_code=504, detail=str(exc), ui_message=exc.ui_message) from exc
    except ParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("")
def list_projects() -> list[dict]:
    """Every project, from manifests alone: no Turtle file is opened."""
    return project_store.list()


@router.post("")
@metadata_locked
def create_project(body: CreateProject) -> dict:
    with _errors():
        if body.fromOntologyId is not None and body.domainProfile is not None:
            raise UiHTTPException(status_code=422, detail="A library copy cannot choose a domain profile.", ui_message=make_message("government.invalid_profile"))
        if body.fromOntologyId is not None:
            source = store.get(body.fromOntologyId)
            if source is None or source.editable:
                raise UiHTTPException(
                    status_code=404,
                    detail='There is no such ontology in the library.',
                    ui_message=make_message('ontology.library_missing'),
                )
            # A Turtle file is copied as it is, comments and layout included;
            # any other format is written as clean Turtle. The library entry
            # itself is read and never changed.
            if source.format == "turtle":
                text = source.data_path.read_bytes().decode("utf-8", errors="replace")
                return project_store.create(
                    name=body.name, base_iri=body.baseIri, prefix=body.prefix,
                    primary_language=body.primaryLanguage, source_text=text,
                    source_name=source.name,
                )
            return project_store.create(
                name=body.name, base_iri=body.baseIri, prefix=body.prefix,
                primary_language=body.primaryLanguage, source_graph=source.ensure_loaded(),
                source_name=source.name,
            )
        return project_store.create(
            name=body.name, base_iri=body.baseIri, prefix=body.prefix,
            primary_language=body.primaryLanguage, template=body.template or "empty",
            domain_profile=body.domainProfile,
        )


@router.patch("/{pid}")
@metadata_locked
def patch_project(pid: str, body: PatchProject) -> dict:
    with _errors():
        from ..government.profile import ProfileConflict
        fields = body.model_dump(exclude_unset=True, exclude={"dryRun", "profileBasis"})
        document = None
        reference_bases, available_countries = {}, set()
        if "domainProfile" in fields:
            from ..government.references import profile_reference_snapshots
            reference_bases, available_countries = profile_reference_snapshots(editing_service, pid, fields["domainProfile"])
        if "domainProfile" in fields and editing_service.is_open(pid):
            document = editing_service.document(pid, "model")
        with document.lock if document is not None else nullcontext():
            try:
                summary = project_store.patch(pid, fields, dry_run=body.dryRun, basis=body.profileBasis, graph=document.graph if document else None, reference_bases=reference_bases, available_countries=available_countries)
            except ProfileConflict as exc:
                raise UiHTTPException(status_code=409, detail="Review the changed profile settings again.", ui_message=make_message("government.profile_stale")) from exc
        if body.dryRun:
            return summary
        editing_service.refresh_manifest(pid)
        return summary


@router.post("/{pid}/duplicate")
@metadata_locked
def duplicate_project(pid: str) -> dict:
    with _errors():
        return project_store.duplicate(pid)


@router.delete("/{pid}")
@metadata_locked
def delete_project(pid: str) -> dict:
    """Move the folder to projects/.trash/, and say where it went."""
    with _errors():
        project_store.folder(pid)
        editing_service.close(pid, discard=False)
        location = project_store.trash_project(pid)
        return {"trashed": pid, "location": location}


@router.get("/{pid}/export")
def export_project(pid: str) -> Response:
    with _errors():
        data = project_store.export_zip(pid)
        name = re.sub(r"[^A-Za-z0-9._-]+", "-", project_store.manifest(pid)["name"]).strip("-.")
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{name or "project"}.zip"'},
    )


@router.post("/{pid}/open")
def open_project(pid: str) -> dict:
    with _errors():
        return editing_service.open(pid)


@router.post("/{pid}/close")
def close_project(pid: str, body: Optional[CloseProject] = None) -> dict:
    with _errors():
        return editing_service.close(pid, discard=bool(body and body.discard))


@router.post("/{pid}/documents")
def add_document(pid: str, body: NewDocument) -> dict:
    with _errors():
        return editing_service.add_document(pid, body.role)


@router.post("/{pid}/documents/{doc}/commands", openapi_extra={"requestBody": {"required": True, "content": {"application/json": {"schema": RunCommand.model_json_schema()}}}})
async def run_command(pid: str, doc: str, request: Request, lang: Optional[str] = ontologies.LANG_PARAM) -> dict:
    """One of the commands the canvas will use (5.4). A dry run is offered for
    DeleteEntity, returning the impact summary, and for ShareDomain, returning
    the reuse plan (attribute-reuse 5.2), with nothing changed either way."""
    with _errors():
        project_store.folder(pid)
        project_store.document_file(doc)
    chunks, total = [], 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > COMMAND_MAX_BYTES:
            raise UiHTTPException(status_code=413, detail="One change is at most 256 KiB.", ui_message=make_message("project.command_limit"))
        chunks.append(chunk)
    try:
        body = RunCommand.model_validate_json(b"".join(chunks))
    except ValidationError as exc:
        if any(error["type"] == "json_invalid" for error in exc.errors()):
            raise UiHTTPException(status_code=422, detail="The body must be JSON.", ui_message=make_message("request.body_json")) from exc
        raise RequestValidationError([{**error, "loc": ("body", *error["loc"])} for error in exc.errors()]) from exc
    def work():
        with _errors():
            return editing_service.command(pid, doc, body.command, body.args, dry_run=body.dryRun, lang=lang)
    return await run_in_threadpool(work)


@router.get("/{pid}/documents/{doc}/source")
def get_source(pid: str, doc: str) -> dict:
    """The editor's text: the text last applied, or clean Turtle."""
    with _errors():
        return editing_service.source(pid, doc)


@router.put("/{pid}/documents/{doc}/source")
async def put_source(pid: str, doc: str, request: Request) -> dict:
    """Parse the text as Turtle and replace the document, as one undo step.

    Invalid Turtle changes nothing and comes back 422 with line, column and
    rdflib's message. The body is read in chunks and refused past the upload
    cap while reading, not after.
    """
    limit = ontologies.MAX_UPLOAD_BYTES
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > limit:
            raise HTTPException(
                status_code=413,
                detail=ontologies.too_large_detail(limit, "SEMANTIC_STUDIO_MAX_UPLOAD_BYTES"),
            )
        chunks.append(chunk)
    try:
        payload = json.loads(b"".join(chunks) or b"{}")
    except ValueError as exc:
        raise UiHTTPException(
            status_code=422,
            detail='The body must be JSON: {"text": ...}.',
            ui_message=make_message('request.source_body'),
        ) from exc
    text = payload.get("text") if isinstance(payload, dict) else None
    if not isinstance(text, str):
        raise UiHTTPException(
            status_code=422,
            detail='The body must be JSON: {"text": ...}.',
            ui_message=make_message('request.source_body'),
        )
    with _errors():
        return await run_in_threadpool(
            editing_service.apply_text, pid, doc, text, ontologies.PARSE_TIMEOUT_SECONDS
        )


LAYOUT_TOO_LARGE = f"A layout is at most {LAYOUT_MAX_BYTES // (1024 * 1024)} MB."


def layout_too_large() -> MessageText:
    return MessageText(LAYOUT_TOO_LARGE, "request.layout_limit", limit=integer_arg(LAYOUT_MAX_BYTES))


@router.get("/{pid}/documents/{doc}/canvas")
def get_canvas(
    pid: str,
    doc: str,
    lang: Optional[str] = ontologies.LANG_PARAM,
    inferred: bool = False,
    imports: bool = ontologies.IMPORTS_PARAM,
) -> dict:
    """What the modeling canvas draws, with the saved layout (5.4 to 5.6).
    With `inferred`, a current reasoning result's kinds and the classes
    that can never have members are added; a stale one adds nothing."""
    with _errors():
        return editing_service.canvas_view(pid, doc, lang, inferred=inferred, imports=imports)


@router.get("/{pid}/documents/{doc}/layout")
def get_layout(pid: str, doc: str) -> dict:
    with _errors():
        return editing_service.get_layout(pid, doc)


@router.put("/{pid}/documents/{doc}/layout")
async def put_layout(pid: str, doc: str, request: Request) -> dict:
    """Replace the canvas layout. Not a model change: no revision, no dirty
    flag, no undo step (D-087). Validated in projects.validate_layout."""
    payload = await ontologies.read_json_capped(request, LAYOUT_MAX_BYTES, layout_too_large())
    with _errors():
        return editing_service.put_layout(pid, doc, payload)


@router.post("/{pid}/documents/{doc}/undo")
def undo(pid: str, doc: str) -> dict:
    with _errors():
        return editing_service.undo(pid, doc)


@router.post("/{pid}/documents/{doc}/redo")
def redo(pid: str, doc: str) -> dict:
    with _errors():
        return editing_service.redo(pid, doc)


@router.post("/{pid}/documents/{doc}/save")
def save(pid: str, doc: str, body: Optional[SaveDocument] = None) -> dict:
    """Write the document to its file. Answers needsCommentsWarning, and writes
    nothing, until a commented file's rewrite is confirmed (5.6)."""
    with _errors():
        return editing_service.save(pid, doc, confirm_rewrite=bool(body and body.confirmRewrite))


@router.get("/{pid}/documents/{doc}/download")
def download(pid: str, doc: str) -> Response:
    """Save a copy as Turtle: the save format rule, the project untouched."""
    with _errors():
        text = editing_service.copy_text(pid, doc)
        name = re.sub(r"[^A-Za-z0-9._-]+", "-", project_store.manifest(pid)["name"]).strip("-.")
    return Response(
        content=text.encode("utf-8"),
        media_type="text/turtle",
        headers={"Content-Disposition": f'attachment; filename="{name or "project"}-{doc}.ttl"'},
    )


@router.post("/{pid}/recover")
def recover(pid: str, body: Recover) -> dict:
    with _errors():
        return editing_service.recover(pid, body.action, ontologies.PARSE_TIMEOUT_SECONDS)


@router.get("/{pid}/shapes")
def get_shapes(pid: str, lang: Optional[str] = ontologies.LANG_PARAM) -> dict:
    """Every shape in shapes.ttl in the form's structure, those the form
    cannot edit marked read-only with why (shacl-authoring 5.1, 5.5)."""
    with _errors():
        return editing_service.shapes_view(pid, lang)


@router.get("/{pid}/shapes/suggestions")
def get_shape_suggestions(pid: str, target: Optional[str] = None, shape: Optional[str] = None,
                          lang: Optional[str] = ontologies.LANG_PARAM) -> dict:
    """What a rule can be about for a target class, and the rules the model
    suggests that `shape` does not already have (5.4). `target` is checked
    after the project, so an id not issued is 404 like everywhere else."""
    with _errors():
        return editing_service.shape_suggestions(pid, target, shape, lang=lang)


@router.get("/{pid}/validate")
def get_validation(pid: str, lang: Optional[str] = ontologies.LANG_PARAM) -> Optional[dict]:
    """Read the last check's names in another language; never run a check."""
    with _errors():
        return editing_service.validation_reading(pid, lang)


@router.post("/{pid}/validate")
def validate(pid: str, lang: Optional[str] = ontologies.LANG_PARAM) -> dict:
    """Check the model with its unsaved changes and resolved imports against
    every shape, on demand only (5.6, D-094). Reads; changes nothing."""
    with _errors():
        return editing_service.validate(pid, lang=lang)


@router.post("/{pid}/reasoning")
def reason(pid: str, body: Optional[Reason] = None, lang: Optional[str] = ontologies.LANG_PARAM) -> dict:
    """One run of the reasoner (axioms-and-reasoning 5.2). Blocks until the
    run ends, as Validate does; 409 while another runs for the project.
    Reads; changes nothing in the model, its revision or its history."""
    body = body or Reason()
    with _errors():
        return editing_service.reason(pid, body.includeData, body.imports, lang=lang)


@router.delete("/{pid}/reasoning")
def stop_reasoning(pid: str) -> dict:
    """Stop: the run's process is killed, not asked (5.2)."""
    with _errors():
        return {"stopped": editing_service.stop_reasoning(pid)}


NOT_REASONED = "Nothing has been reasoned in this project yet."


def _last(pid: str) -> "reasoning.Outcome":
    outcome = editing_service.reasoning_result(pid)
    if outcome is None:
        raise UiHTTPException(
            status_code=404,
            detail=NOT_REASONED,
            ui_message=make_message('reasoning.not_run'),
        )
    return outcome


@router.get("/{pid}/reasoning")
def get_reasoning(
    pid: str,
    group: Optional[str] = None,
    offset: int = 0,
    about: Optional[str] = None,
    imports: bool = ontologies.IMPORTS_PARAM,
    lang: Optional[str] = ontologies.LANG_PARAM,
) -> dict:
    """The last result: whole, a page of one group, or the facts about one
    entity; each says whether it is stale for the view asking (5.3)."""
    with _errors():
        outcome = _last(pid).for_languages(editing_service.display_languages(pid, lang))
        current = editing_service.reasoning_key(pid, imports)
        if about is not None:
            return outcome.about(about, current)
        if group is not None:
            try:
                return outcome.page(group, offset, current)
            except KeyError as exc:
                raise UiHTTPException(
                    status_code=404,
                    detail='There is no such group.',
                    ui_message=make_message('reasoning.group_missing'),
                ) from exc
        return outcome.summary(current)


@router.get("/{pid}/reasoning/why")
def why(pid: str, s: Optional[str] = None, p: Optional[str] = None, o: Optional[str] = None,
        lang: Optional[str] = ontologies.LANG_PARAM) -> dict:
    """One fact's one-step reason (5.6); 404 for a fact the result does not
    hold. The fact is optional to FastAPI so that an id the server never
    issued is 404 before anything about the query is said."""
    with _errors():
        outcome = _last(pid).for_languages(editing_service.display_languages(pid, lang))
        if s is None or p is None or o is None:
            raise UiHTTPException(
                status_code=422,
                detail='Name the fact: s, p and o.',
                ui_message=make_message('reasoning.fact_required'),
            )
        reason_ = outcome.why(s, p, o)
        if reason_ is None:
            raise UiHTTPException(
                status_code=404,
                detail='That fact is not in the last result.',
                ui_message=make_message('reasoning.fact_missing'),
            )
        return reason_


@router.get("/{pid}/documents/{doc}/annotation-properties")
def annotation_properties(pid: str, doc: str) -> list[dict]:
    """The suggested annotation properties and those the document or its
    imports declare, each with a default value type (5.4.1)."""
    with _errors():
        return editing_service.annotation_properties(pid, doc)


@router.get("/{pid}/documents/{doc}/languages")
def languages(pid: str, doc: str) -> dict:
    """How many entities have no name in each project language (5.4.2)."""
    with _errors():
        return editing_service.missing_names(pid, doc)
