"""
================================================================================
FILE: backend/app/government/import_http.py
SUMMARY
    Read-only source inspection and signed finite preparation.
BASIC IDEA
    Keep source preparation read-only and bind accepted operations to their owner.
INPUTS / INPUT SOURCES
    Bounded source data, canonical batches and authenticated request context.
EXPECTED OUTPUT
    Reviewable values or explicit refusals; accepted graph changes live in editing.py.
================================================================================
"""
import hashlib
import json
from .import_models import ReadOptions,MasterMapping,FIELDS
from .import_mapping import map_master_rows
from .import_tabular import read_master_table
from .import_receipts import process_signer
from .profile import DomainError,parse_profile

FORM_LIMIT=32*1024
COMMAND_LIMIT=256*1024

def json_form(raw,default):
    if raw is None:return default
    if not isinstance(raw,str) or len(raw.encode())>FORM_LIMIT:raise DomainError('Import options exceed 32 KiB.')
    try:
        def refuse_constant(value):raise ValueError('Non-finite JSON number')
        return json.loads(raw,parse_constant=refuse_constant)
    except (ValueError,TypeError) as exc:raise DomainError('Import options must be JSON.') from exc


def check_profile(service,pid,mode):
    profile=parse_profile(service.projects.manifest(pid).get('domainProfile'))
    if mode not in FIELDS or profile is None or (mode=='countries')!=(profile.id=='countries-v1'):
        raise DomainError('Choose the matching master and table mode.',code='government.invalid_profile')


def inspect_source(service,pid,data,filename,mode,options):
    check_profile(service,pid,mode)
    try:t=read_master_table(data,filename,options)
    except ValueError as exc:raise DomainError(str(exc)) from exc
    evidence=[[{**c,'originalHeader':c['originalHeader'][:256],'headerLength':len(c['originalHeader']),'headerTruncated':len(c['originalHeader'])>256,'text':c['text'][:256],'truncated':len(c['text'])>256} for c in row] for row in t.evidence[:20]]
    return {'columns':[c[:256] for c in t.table.columns],'columnLengths':[len(c) for c in t.table.columns],'positions':t.positions[:20],'evidence':evidence,'totalRows':t.table.total,'maxRows':2000,'sha256':hashlib.sha256(data).hexdigest(),'workbook':t.table.workbook,'renamed':t.table.renamed}


def prepare_source(service,pid,data,filename,mode,options,mapping,selected_rows,nonce,owner):
    check_profile(service,pid,mode)
    try:
        options=ReadOptions.model_validate(options).model_dump(exclude_none=True)
        mapping=MasterMapping.model_validate(mapping).model_dump(exclude_none=True)
        table=read_master_table(data,filename,options)
        selected_rows=[p['rowId'] for p in table.positions] if selected_rows is None else selected_rows
        mapped=map_master_rows(table,mode,mapping,selected_rows)
    except ValueError as exc:raise DomainError(str(exc)) from exc
    result={'batch':None,'receipt':None,'issues':mapped['issues'],'summary':{'selected':len(selected_rows),'excluded':max(0,table.table.total-len(selected_rows))},'requiredBytes':0}
    if mapped['issues']:return result
    batch={'version':1,'source':{'sha256':hashlib.sha256(data).hexdigest(),'filename':filename[:255],'options':options,'totalRows':table.table.total},'mode':mode,'mapping':mapping,'selectedRows':mapped['selectedRows'],'operationNonce':nonce,'intents':mapped['intents']}
    receipt=process_signer().sign(batch,owner)
    envelope={'command':'ImportMasterBatch','args':{'batch':batch,'receipt':receipt,'previewBasis':'0'*64,'reportOffset':2000,'reportLimit':50},'dryRun':True}
    from .import_plan import canonical
    size=len(json.dumps(envelope,ensure_ascii=False).encode())
    result['requiredBytes']=size
    if size>COMMAND_LIMIT:
        result['issues']=[{'code':'project.command_limit','args':{},'reason':'Select fewer rows and prepare each batch explicitly.'}]
        return result
    result.update(batch=batch,receipt=receipt)
    return result
