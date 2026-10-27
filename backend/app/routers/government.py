"""
================================================================================
FILE: backend/app/routers/government.py
SUMMARY
    Read-only HTTP adapters for government reference choices and dated views.
BASIC IDEA
    Validate HTTP parameters, then delegate to snapshot-based domain read views.
    All mutations remain ordinary project editing commands.
INPUTS / INPUT SOURCES
    Issued project IDs, explicit dates and bounded search/page parameters.
EXPECTED OUTPUT
    Paged JSON and dated Turtle, or existing structured HTTP refusal metadata.
================================================================================
"""
from fastapi import APIRouter, Depends, Query, Response
from ..editing import editing_service
from ..government import views
from .projects import _errors

def _issued_project(pid: str):
    # Identity checks precede query validation, just as the other project
    # routes do: a missing date must not disclose an unissued project's shape.
    with _errors():
        editing_service.projects.folder(pid)


router = APIRouter(prefix="/api/projects/{pid}/government", tags=["government"], dependencies=[Depends(_issued_project)])


@router.get("/countries")
def countries(pid: str, q: str = Query("", max_length=200), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), displayLanguage: str | None = Query(None, max_length=100), iri: str | None = Query(None, max_length=4096)):
    with _errors():
        return views.countries(editing_service, pid, q, offset, limit, displayLanguage, iri)


@router.get("/view")
def view(pid: str, at: str, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), displayLanguage: str | None = Query(None, max_length=100), iri: str | None = Query(None, max_length=4096), q: str = Query("", max_length=200), recordIri: str | None = Query(None, max_length=4096), includeInactive: bool = True):
    with _errors():
        return views.view(editing_service, pid, at, offset, limit, displayLanguage, iri, q, recordIri, includeInactive)


@router.get("/projection")
def projection(pid: str, at: str):
    with _errors():
        result = views.projection(editing_service, pid, at)
        return Response(result["turtle"], media_type="text/turtle", headers={
            "X-Semantic-Studio-As-Of": result["at"], "X-Semantic-Studio-Basis": result["basis"],
            "Content-Disposition": 'attachment; filename="government-projection.ttl"'})
