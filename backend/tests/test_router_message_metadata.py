"""
================================================================================
FILE: backend/tests/test_router_message_metadata.py
SUMMARY
    User-facing HTTP refusals keep their legacy payloads and expose display facts.
BASIC IDEA
    Call the real routes with isolated synthetic projects and snapshots. Missing
    resources and malformed requests must retain status/detail and change no RDF,
    revision, dirty flag or data generation while adding validated metadata.
INPUTS / INPUT SOURCES
    TestClient requests, generated Turtle/CSV and controlled remote responses.
EXPECTED OUTPUT
    Source-typed messages and unchanged failure/state contracts.
================================================================================
"""
import ast
import json
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.editing import editing_service, project_store, TurtleSyntaxError
from app.messages import make_message
from app.routers import ontologies

client=TestClient(app,base_url='http://localhost',headers={'X-Semantic-Studio':'1'})
EX='https://example.test/router-messages#'
MISSING='ont-000000000000'
MISSING_PROJECT='prj-000000000000'

@pytest.fixture
def context():
    created=client.post('/api/projects',json={'name':'架空の試験辞書','template':'empty','baseIri':EX,'prefix':'ex','primaryLanguage':'ja'})
    assert created.status_code==200,created.text
    pid=created.json()['id']
    assert client.post(f'/api/projects/{pid}/open').status_code==200
    ttl=f'<{EX}Item> a <http://www.w3.org/2002/07/owl#Class> ; <http://www.w3.org/2000/01/rdf-schema#label> "架空の項目"@ja .'
    applied=client.put(f'/api/projects/{pid}/documents/model/source',json={'text':ttl})
    assert applied.status_code==200,applied.text
    response=client.post(f'/api/projects/{pid}/data',files={'file':('synthetic.csv','id,name\none,架空の行\n'.encode(),'text/csv')},
        data={'choices':json.dumps({'classIri':EX+'Item','idColumn':'id','columns':{'name':{'as':'name'}}})})
    assert response.status_code==200,response.text
    try:yield {'pid':pid,'oid':pid+'-model','sid':response.json()['snapshot']['id']}
    finally:editing_service.close_all()

def state(context):
    with editing_service.model_reader(context['pid']) as (graph,manifest,names): triples=set(graph)
    source=client.get(f"/api/projects/{context['pid']}/documents/model/source")
    assert source.status_code==200,source.text
    return triples,source.json(),editing_service.snapshots.generation(context['pid'])

CASES=[
    ('missing_ontology','GET',f'/api/ontologies/{MISSING}/graph',{},404,f'Unknown ontology id: {MISSING}','ontology.not_found',{}),
    ('missing_query','DELETE','/api/queries/q-000000000000',{},404,'Unknown query id: q-000000000000','query.not_found',{}),
    ('missing_query_project','GET','/api/queries',{'params':{'ontology':MISSING_PROJECT+'-model'}},404,'There is no such project.','project.not_found',{}),
    ('query_name','POST','/api/queries',{'json':{'name':' ','ontologyId':'{oid}','mode':'text','sparql':'SELECT * WHERE {}'}},400,'A query name is required.','query.name_required',{}),
    ('query_builder','POST','/api/queries',{'json':{'name':'試験','ontologyId':'{oid}','mode':'visual','sparql':'SELECT * WHERE {}'}},400,'A visual query needs its builder state.','query.builder_required',{}),
    ('query_ontology','POST','/api/queries',{'json':{'name':'試験','ontologyId':MISSING,'mode':'text','sparql':'SELECT * WHERE {}'}},404,f'Unknown ontology id: {MISSING}','ontology.not_found',{}),
    ('missing_document','GET',f'/api/projects/{MISSING_PROJECT}/documents/model/source',{},404,'There is no such project or document.','project.document_not_found',{}),
    ('dirty_close','POST','/api/projects/{pid}/close',{'json':{'discard':False}},409,'This project has unsaved changes. Save them, or close with discard.','project.unsaved',{}),
    ('source_json','PUT','/api/projects/{pid}/documents/model/source',{'content':b'{'},422,'The body must be JSON: {"text": ...}.','request.source_body',{}),
    ('source_text_type','PUT','/api/projects/{pid}/documents/model/source',{'json':{'text':3}},422,'The body must be JSON: {"text": ...}.','request.source_body',{}),
    ('not_reasoned','GET','/api/projects/{pid}/reasoning',{},404,'Nothing has been reasoned in this project yet.','reasoning.not_run',{}),
    ('missing_group','GET','/api/projects/{pid}/reasoning',{'params':{'group':'future'}},404,'There is no such group.','reasoning.group_missing',{}),
    ('fact_fields','GET','/api/projects/{pid}/reasoning/why',{},422,'Name the fact: s, p and o.','reasoning.fact_required',{}),
    ('missing_fact','GET','/api/projects/{pid}/reasoning/why',{'params':{'s':EX+'absent','p':EX+'p','o':EX+'o'}},404,'That fact is not in the last result.','reasoning.fact_missing',{}),
    ('missing_data_project','GET',f'/api/projects/{MISSING_PROJECT}/data',{},404,'There is no such project or snapshot.','project.snapshot_not_found',{}),
    ('missing_snapshot','POST','/api/projects/{pid}/data/snap-000000000000/refresh',{},404,'There is no such project or snapshot.','project.snapshot_not_found',{}),
    ('data_source','POST','/api/projects/{pid}/data/inspect',{},422,'Send a file, or name a snapshot.','data.source_required',{}),
    ('data_file','POST','/api/projects/{pid}/data',{},422,'Send the file to import.','data.file_required',{}),
    ('data_new_file','POST','/api/projects/{pid}/data/{sid}/refresh',{},422,'Send the new version of the file.','data.new_file_required',{}),
    ('options_json','POST','/api/projects/{pid}/data/inspect',{'data':{'options':'{'}},422,'The options must be JSON.','request.field_json',{'field':'options'}),
    ('options_object','POST','/api/projects/{pid}/data/inspect',{'data':{'options':'[]'}},422,'The options must be an object.','request.field_object',{'field':'options'}),
    ('patch_json','PATCH','/api/projects/{pid}/data/{sid}',{'content':b'{'},422,'The body must be JSON.','request.body_json',{}),
    ('patch_object','PATCH','/api/projects/{pid}/data/{sid}',{'json':[]},422,'The body must be an object.','request.body_object',{}),
    ('patch_change','PATCH','/api/projects/{pid}/data/{sid}',{'json':{}},422,'Send enabled, choices or mapping.','data.change_required',{}),
    ('fetch_scheme','POST','/api/ontologies/fetch',{'json':{'url':'file:///synthetic.ttl'}},400,'Only http(s) URLs are supported.','fetch.web_only',{}),
    ('network_capability','POST','/api/network/grants',{'json':{'capability':'future:capability','host':'example.test','decision':'allow'}},422,'Unknown capability: future:capability','network.unknown_capability',{'capability':'future:capability'}),
    ('network_host','POST','/api/network/grants',{'json':{'capability':'ontology:fetch','host':'bad host','decision':'allow'}},422,'That is not a host name.','network.invalid_host',{}),
    ('network_grant','DELETE','/api/network/grants/not-issued',{},404,'Unknown grant: not-issued','network.grant_missing',{}),
]

@pytest.mark.parametrize('name,method,path,kwargs,status,detail,code,args',CASES,ids=[row[0] for row in CASES])
def test_actual_http_refusals_keep_details_and_do_not_mutate_documents(context,name,method,path,kwargs,status,detail,code,args):
    if name in ('missing_group','fact_fields','missing_fact'):
        response=client.post(f"/api/projects/{context['pid']}/reasoning",json={})
        assert response.status_code==200,response.text
    before=state(context)
    kwargs={key:({k:(context['oid'] if v=='{oid}' else v) for k,v in value.items()} if key=='json' and isinstance(value,dict) else value) for key,value in kwargs.items()}
    response=client.request(method,path.format(**context),**kwargs)
    assert response.status_code==status,response.text
    body=response.json();assert body['detail']==detail
    assert body.get('uiMessage') is not None,body
    assert body['uiMessage']==make_message(code,**args)
    assert state(context)==before

def test_a_remote_http_error_exposes_status_and_url_without_a_real_connection(context,monkeypatch):
    url='https://example.test/synthetic.ttl'
    monkeypatch.setattr(ontologies.broker,'request',lambda *args,**kwargs:SimpleNamespace(status=451,url=url,headers={},body=b''))
    before=state(context)
    response=client.post('/api/ontologies/fetch',json={'url':url})
    assert response.status_code==502,response.text
    assert response.json()['detail']==f'Fetching {url} failed with HTTP 451.'
    assert response.json().get('uiMessage')==make_message('fetch.http_failed',url=url,status=451)
    assert state(context)==before

def test_source_syntax_metadata_uses_the_existing_structured_line(context):
    before=state(context)
    response=client.put(f"/api/projects/{context['pid']}/documents/model/source",json={'text':'<https://example.test/a> a [ . '})
    assert response.status_code==422,response.text
    body=response.json();assert set(body['detail'])=={'line','column','message','detail'}
    assert body.get('uiMessage')==make_message('parse.syntax',format='Turtle',line=body['detail']['line'])
    assert state(context)==before

def test_source_syntax_without_a_line_has_no_misleading_line_placeholder(context,monkeypatch):
    before=state(context)
    def refused(*args,**kwargs):raise TurtleSyntaxError('Original syntax failure <img>',None,None,'Original parser trace')
    monkeypatch.setattr(editing_service,'apply_text',refused)
    response=client.put(f"/api/projects/{context['pid']}/documents/model/source",json={'text':'synthetic'})
    assert response.status_code==422,response.text
    assert response.json()['detail']=={'line':None,'column':None,'message':'Original syntax failure <img>','detail':'Original parser trace'}
    assert response.json().get('uiMessage')=={'code':'parse.syntax_without_line','args':{'format':'Turtle'}}
    assert make_message('parse.syntax_without_line',format='Turtle')==response.json()['uiMessage']
    assert state(context)==before

def test_taxonomy_reason_refusal_has_metadata_and_changes_no_data(context):
    changed=client.patch(f"/api/projects/{context['pid']}",json={'kind':'taxonomy'})
    assert changed.status_code==200,changed.text
    before=state(context)
    response=client.post(f"/api/projects/{context['pid']}/reasoning",json={})
    assert response.status_code==422,response.text
    assert response.json()['detail']=='Reasoning is for ontology projects.'
    assert response.json().get('uiMessage')==make_message('reasoning.ontology_only')
    assert state(context)==before

def test_closed_project_refusal_does_not_change_its_saved_files(context):
    pid=context['pid']
    assert client.post(f'/api/projects/{pid}/close',json={'discard':True}).status_code==200
    folder=project_store.folder(pid)
    before={p.relative_to(folder):p.read_bytes() for p in folder.rglob('*') if p.is_file()}
    response=client.get(f'/api/projects/{pid}/documents/model/source')
    assert response.status_code==409,response.text
    assert response.json()['detail']=='Open the project first.'
    assert response.json().get('uiMessage')==make_message('project.not_open')
    assert {p.relative_to(folder):p.read_bytes() for p in folder.rglob('*') if p.is_file()}==before

def test_new_literal_http_refusals_cannot_bypass_source_metadata():
    root=Path(__file__).resolve().parents[1]/'app/routers';uncoded=[]
    owned_names={'NOT_REASONED','GHE_NOT_SUPPORTED_DETAIL','CANCELLED_DETAIL'}
    for path in root.glob('*.py'):
        for node in ast.walk(ast.parse(path.read_text())):
            if not isinstance(node,ast.Call) or not isinstance(node.func,ast.Name) or node.func.id!='HTTPException':continue
            detail=next((field.value for field in node.keywords if field.arg=='detail'),None)
            direct=isinstance(detail,ast.JoinedStr) or isinstance(detail,ast.Constant) and isinstance(detail.value,str)
            direct=direct or isinstance(detail,ast.Name) and detail.id in owned_names
            if isinstance(detail,ast.Dict):
                direct=any(isinstance(key,ast.Constant) and key.value=='message' and isinstance(value,(ast.Constant,ast.JoinedStr))
                    for key,value in zip(detail.keys,detail.values))
            if direct:uncoded.append(f'{path.name}:{node.lineno}')
    assert uncoded==[],uncoded
