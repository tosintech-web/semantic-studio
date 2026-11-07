"""
FILE: backend/tests/test_master_import_http.py
SUMMARY: Signed preparation and atomic local master import through real HTTP.
BASIC IDEA: Inspect, prepare, review, commit and Undo generated source batches.
INPUTS / INPUT SOURCES: Synthetic CSV/XLSX and isolated local project fixtures.
EXPECTED OUTPUT: Exact reviewed identities, no partial writes and stable no-op state.
"""
import json
import pytest
from rdflib import Literal
from rdflib.namespace import RDF
from app.editing import editing_service
from app.government.profile import GOV
from test_government_commands import client,create_group,command,closed

MAPPING={'columns':[{'column':0,'field':'code','op':'set'},{'column':1,'field':'names','language':'en','op':'set'}]}


def prepare(pid,data=b'code,name\nAA,Alpha\nBB,Beta\n',mapping=None):
    return client.post(f'/api/projects/{pid}/government/import/prepare',files={'file':('test.csv',data,'text/csv')},data={'mode':'countries','options':'{}','mapping':json.dumps(mapping or MAPPING),'operationNonce':'test-operation'})


def review(pid,prepared):
    return command(pid,'ImportMasterBatch',{'batch':prepared['batch'],'receipt':prepared['receipt']},dryRun=True)


def test_preview_ids_equal_apply_and_one_undo():
    pid=create_group();doc=editing_service.document(pid,'model');before=set(doc.graph)
    p=prepare(pid);assert p.status_code==200,p.text
    p=p.json();r=review(pid,p);assert r.status_code==200,r.text
    r=r.json();assert r['ready'];assert set(doc.graph)==before
    ids={row['entityIri'] for row in r['rows']}
    applied=command(pid,'ImportMasterBatch',{'batch':p['batch'],'receipt':p['receipt'],'previewBasis':r['basis']})
    assert applied.status_code==200,applied.text
    assert {str(n) for n in doc.graph.subjects(RDF.type,GOV.Country)}==ids
    assert len(doc.undo)==1
    assert client.post(f'/api/projects/{pid}/documents/model/undo').status_code==200
    assert set(doc.graph)==before


def test_prepare_receipt_binds_source_mapping_rows_and_owner():
    pid=create_group();p=prepare(pid);assert p.status_code==200,p.text
    data=p.json();data['batch']['intents'][0]['code']='TAMPERED'
    assert review(pid,data).status_code==422
    assert len(set(editing_service.document(pid,'model').graph.subjects(RDF.type,GOV.Country)))==0


def test_last_row_failure_and_stale_review_keep_s0():
    pid=create_group();doc=editing_service.document(pid,'model');before=set(doc.graph)
    p=prepare(pid,b'code,name\nAA,Alpha\nAA,Duplicate\n');assert p.status_code==200,p.text
    p=p.json();r=review(pid,p);assert r.status_code==200,r.text
    assert not r.json()['ready']
    result=command(pid,'ImportMasterBatch',{'batch':p['batch'],'receipt':p['receipt'],'previewBasis':r.json()['basis']})
    assert result.status_code==422
    assert set(doc.graph)==before
    p=prepare(pid).json();r=review(pid,p).json()
    command(pid,'CreateCountry',{'names':[{'value':'Other','language':'en'}],'code':'OTHER'})
    result=command(pid,'ImportMasterBatch',{'batch':p['batch'],'receipt':p['receipt'],'previewBasis':r['basis']})
    assert result.status_code==409


def test_reimport_noop_does_not_increment_revision_or_undo():
    pid=create_group();p=prepare(pid);assert p.status_code==200,p.text
    p=p.json();r=review(pid,p).json()
    assert command(pid,'ImportMasterBatch',{'batch':p['batch'],'receipt':p['receipt'],'previewBasis':r['basis']}).status_code==200
    doc=editing_service.document(pid,'model');revision=doc.ontology.revision;count=len(doc.undo)
    r=review(pid,p).json();assert r['noop']
    assert command(pid,'ImportMasterBatch',{'batch':p['batch'],'receipt':p['receipt'],'previewBasis':r['basis']}).status_code==200
    assert doc.ontology.revision==revision;assert len(doc.undo)==count


def test_publish_failure_restores_accepted_state(monkeypatch):
    pid=create_group();p=prepare(pid);assert p.status_code==200,p.text
    p=p.json();r=review(pid,p).json();doc=editing_service.document(pid,'model');before=set(doc.graph);revision=doc.ontology.revision
    def fail(*args):raise OSError('Synthetic publication failure')
    with monkeypatch.context() as m:
        m.setattr(editing_service,'_push',fail)
        with pytest.raises(OSError):command(pid,'ImportMasterBatch',{'batch':p['batch'],'receipt':p['receipt'],'previewBasis':r['basis']})
    assert set(doc.graph)==before;assert doc.ontology.revision==revision;assert not doc.undo


def test_template_xlsx_identifier_and_inspect_positions():
    pid=create_group();url=f'/api/projects/{pid}/government/import'
    response=client.get(url+'/templates/countries/xlsx');assert response.status_code==200,response.text
    result=client.post(url+'/inspect',files={'file':('example.xlsx',response.content)},data={'mode':'countries','options':'{}'})
    assert result.status_code==200,result.text
    assert result.json()['evidence'][0][0]['kind']=='text'
    assert client.get(url+'/templates/unknown/xlsx').status_code==422


def test_malformed_source_options_are_not_server_errors():
    pid=create_group()
    result=client.post(f'/api/projects/{pid}/government/import/prepare',files={'file':('test.csv',b'code,name\nA,Alpha\n')},data={'mode':'countries','mapping':json.dumps(MAPPING),'selectedRows':'[{}]','operationNonce':'test'})
    assert result.status_code==422


def test_undo_redo_restore_the_whole_batch():
    pid=create_group();p=prepare(pid).json();r=review(pid,p).json()
    result=command(pid,'ImportMasterBatch',{'batch':p['batch'],'receipt':p['receipt'],'previewBasis':r['basis']})
    assert result.status_code==200,result.text
    doc=editing_service.document(pid,'model');accepted=set(doc.graph)
    assert client.post(f'/api/projects/{pid}/documents/model/undo').status_code==200
    assert not list(doc.graph.subjects(RDF.type,GOV.Country))
    assert client.post(f'/api/projects/{pid}/documents/model/redo').status_code==200
    assert set(doc.graph)==accepted
