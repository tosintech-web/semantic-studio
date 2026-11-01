"""
================================================================================
FILE: backend/app/routers/government.py
SUMMARY
    Government read views and bounded, read-only master-import preparation.
BASIC IDEA
    Validate HTTP parameters, then delegate to snapshot-based domain read views.
    All mutations remain ordinary project editing commands.
INPUTS / INPUT SOURCES
    Issued project IDs, explicit dates and bounded search/page parameters.
EXPECTED OUTPUT
    Paged JSON and dated Turtle, or existing structured HTTP refusal metadata.
================================================================================
"""
from fastapi import APIRouter, Depends, Query, Response, Request
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


async def _import_form(request: Request,pid: str):
    from ..government.profile import parse_profile,DomainError
    from .data import _file_bytes
    from ..government.import_http import FORM_LIMIT
    with _errors():
        if parse_profile(editing_service.projects.manifest(pid).get('domainProfile')) is None:
            raise DomainError('Choose a supported master.',code='government.invalid_profile')
        # The form context closes every spooled upload even when a field or
        # duplicate option is refused before the chosen file is read.
        async with request.form(max_files=1,max_fields=6,max_part_size=FORM_LIMIT) as form:
            allowed={'file','mode','options','mapping','selectedRows','operationNonce'}
            if set(form)-allowed or any(len(form.getlist(k))!=1 for k in form):raise DomainError('Choose one file and one value per option.')
            if sum(len(str(v).encode()) for k,v in form.multi_items() if k!='file')>FORM_LIMIT:raise DomainError('Import options exceed 32 KiB.')
            file=form.get('file')
            if file is None or not hasattr(file,'read'):raise DomainError('Choose a CSV or Excel file.')
            data=await _file_bytes(file)
            return {k:v for k,v in form.items() if k!='file'},data,file.filename or ''



@router.post('/import/inspect')
async def inspect_master_import(pid: str,request: Request):
    from starlette.concurrency import run_in_threadpool
    from .data import _bounded
    from ..government.import_http import inspect_source,json_form
    form,data,filename=await _import_form(request,pid)
    with _errors():
        return await run_in_threadpool(_bounded,inspect_source,editing_service,pid,data,filename,form.get('mode'),json_form(form.get('options'),{}))


@router.post('/import/prepare')
async def prepare_master_import(pid: str,request: Request):
    from starlette.concurrency import run_in_threadpool
    from .data import _bounded
    from ..government.import_http import prepare_source,json_form
    from ..government.import_context import request_owner
    form,data,filename=await _import_form(request,pid)
    with _errors():
        nonce=form.get('operationNonce');owner=request_owner(request,pid,nonce)
        return await run_in_threadpool(_bounded,prepare_source,editing_service,pid,data,filename,form.get('mode'),json_form(form.get('options'),{}),json_form(form.get('mapping'),{}),json_form(form.get('selectedRows'),None),nonce,owner)


@router.get('/import/templates/{mode}/{format}')
def master_import_template(pid: str,mode: str,format: str):
    from ..government.import_templates import template
    from ..government.import_http import check_profile
    with _errors():
        check_profile(editing_service,pid,mode)
        data=template(mode,format)
        media='text/csv; charset=utf-8' if format=='csv' else 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return Response(data,media_type=media,headers={'Content-Disposition':f'attachment; filename="{mode}.{format}"'})
