"""
================================================================================
FILE: backend/app/government/import_mapping.py
SUMMARY
    Maps selected source cells to finite typed master-field intents.
BASIC IDEA
    Keep untrusted source evidence separate from accepted RDF changes.
INPUTS / INPUT SOURCES
    Explicit source bytes, typed options and user-reviewed field choices.
EXPECTED OUTPUT
    Detached import values or a refusal; no model or persistence mutations.
================================================================================
"""
from .import_models import FIELDS, KEYS, MasterMapping, issue
from ..projects import valid_lang


def map_master_rows(table,mode,mapping,selected_rows):
    mapping=MasterMapping.model_validate(mapping).model_dump(exclude_none=True)
    if mode not in FIELDS:raise ValueError('Choose a master table mode.')
    if not isinstance(selected_rows,list) or not selected_rows or any(type(x) is not int or x<1 or x>len(table.positions) for x in selected_rows) or len(set(selected_rows))!=len(selected_rows):
        raise ValueError('Choose distinct existing rows.')
    if table.table.total>2000:raise ValueError('Split this table before importing more than 2000 rows.')
    if set(mapping['defaults'])-FIELDS[mode] or set(mapping['defaults']) & KEYS:raise ValueError('Defaults cannot choose identities.')
    targets={}
    for col in mapping['columns']:
        field=col['field']
        if field not in FIELDS[mode] or col['column']>=len(table.table.columns):raise ValueError('Choose an existing column and supported field.')
        if field in {'names','aliases'} and not valid_lang(col.get('language','')):raise ValueError('Names need an explicit language.')
        if field in {'names','aliases'}:col['language']=col['language'].casefold()
        elif col.get('language') is not None:raise ValueError('Only names and aliases use a language tag.')
        tag=(field,col.get('language'))
        if col.get('delimiter') and field not in {'aliases','sources'}:raise ValueError('Only sets can use a delimiter.')
        if tag in targets and field not in {'aliases','sources'}:raise ValueError('A scalar field cannot use two columns.')
        if tag in targets and targets[tag]!=col['op']:raise ValueError('Columns for one set must use the same operation.')
        targets[tag]=col['op']
        allowed={'append','replace','clear'} if field in {'aliases','sources'} else {'set','clear'}
        if col['op'] not in allowed or col['op']=='clear' and field in KEYS|{'orgKind','countryCode','predicate','subjectCode','objectCode','action'}:raise ValueError('This operation is not allowed on that field.')
    overrides={r['rowId']:r for r in mapping['rowOverrides']}
    if len(overrides)!=len(mapping['rowOverrides']) or set(overrides)-set(selected_rows):raise ValueError('Record choices must belong to selected rows.')
    intents=[];issues=[]
    for index in sorted(selected_rows):
        row=table.positions[index-1];fields={};key='';errors=[];special={}
        for col in mapping['columns']:
            cell=table.evidence[index-1][col['column']];field=col['field'];value=cell['text'].strip();op=col['op']
            if field in KEYS and cell['kind'] not in {'text','empty'}:
                errors.append(issue(row,'Identifiers must be text cells, not numeric or formula cells.',col['column']));continue
            if not value and op!='clear':continue
            if field=='code':key=value;continue
            if field in {'action','recordIri','subjectCode','predicate','objectCode','existenceRecordIri','affiliationRecordIri'}:special[field]=value;continue
            values=[v.strip() for v in value.split(col['delimiter']) if v.strip()] if col.get('delimiter') else [value]
            if field in {'names','aliases'}:values=[{'value':v,'language':col['language']} for v in values]
            if field=='sources':values=[{'kind':col.get('sourceKind','text'),'value':v} for v in values]
            edit={'op':op,'values':[] if op=='clear' else values,**({'language':col['language']} if col.get('language') else {})}
            edits=fields.setdefault(field,[])
            previous=next((e for e in edits if e['op']==op and e.get('language')==edit.get('language')),None)
            if previous is not None:previous['values'].extend(edit['values'])
            else:edits.append(edit)
        special.update({k:v for k,v in overrides.get(index,{}).items() if k!='rowId'})
        if mode!='relations' and not key and not errors:errors.append(issue(row,'An identifier code is required.'))
        if mode=='relations' and special.get('action') not in {'add','correct','end'}:errors.append(issue(row,'Choose add, correct or end.'))
        if errors:issues.extend(errors)
        else:intents.append({'row':row,'code':key,'fields':fields,**special})
    return {'intents':intents,'issues':issues,'selectedRows':sorted(selected_rows),'defaults':mapping['defaults']}
