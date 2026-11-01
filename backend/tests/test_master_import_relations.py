"""
FILE: backend/tests/test_master_import_relations.py
SUMMARY: Explicit record identity and row-order-independent relation import.
BASIC IDEA: Resolve all operations against S0 before constructing the candidate.
INPUTS / INPUT SOURCES: Synthetic organization graphs and mapped relation tables.
EXPECTED OUTPUT: Stable records, whole-candidate checks and no mixed-target writes.
"""
import pytest
from types import SimpleNamespace
from rdflib import Graph,URIRef,Literal
from rdflib.namespace import RDF,DCTERMS
from app.government.profile import GOV,ORG
from app.government.records import parse_period,period_statements
from app.government.import_plan import plan_master_import
from test_master_import_entities import context,batch

R=URIRef('urn:record:r');A=URIRef('urn:org:a');B=URIRef('urn:org:b');C=URIRef('urn:org:c')
COLS=[{'column':i,'field':f,'op':'append' if f=='sources' else 'set'} for i,f in enumerate(['action','recordIri','subjectCode','predicate','objectCode','relationStart','relationEnd','sources'])]
HEADER='action,record,subject,predicate,object,start,end,source\n'

def setup():
    ctx=context('organizations');ctx.country_reference=SimpleNamespace(graph=Graph(),basis={'sourceToken':'test'})
    for node,code in [(A,'A'),(B,'B'),(C,'C')]:
        ctx.graph.add((node,RDF.type,ORG.Organization));ctx.graph.add((node,ORG.identifier,Literal(code)))
    for t in [(R,RDF.type,GOV.RelationRecord),(R,GOV.subject,A),(R,GOV.predicate,ORG.unitOf),(R,GOV.object,B),(R,DCTERMS.source,Literal('Old'))]:ctx.graph.add(t)
    for t in period_statements(R,parse_period({'start':{'date':None,'open':True},'end':{'date':None,'open':True}})):ctx.graph.add(t)
    return ctx


def test_relation_reimport_preserves_record_identity():
    ctx=setup();data=(HEADER+f'add,,A,{ORG.unitOf},B,open,open,New\n').encode()
    p=plan_master_import(ctx,batch(data,COLS,'relations'))
    assert p.ready
    assert set(p.candidate.subjects(RDF.type,GOV.RelationRecord))=={R}
    assert set(p.candidate.objects(R,DCTERMS.source))=={Literal('Old'),Literal('New')}
    ctx.graph=p.candidate
    assert plan_master_import(ctx,batch(data,COLS,'relations')).noop


@pytest.mark.parametrize('action',['correct','end'])
@pytest.mark.parametrize('reverse',[False,True])
def test_same_record_mixed_actions_rejected_in_both_orders(action,reverse):
    ctx=setup();rows=[f'add,,A,{ORG.unitOf},B,open,open,New',f'{action},{R},A,{ORG.unitOf},{"C" if action=="correct" else ""},,2030-04-01,']
    if reverse:rows.reverse()
    p=plan_master_import(ctx,batch((HEADER+'\n'.join(rows)+'\n').encode(),COLS,'relations'))
    assert not p.ready
    assert all(row['status']=='error' for row in p.rows)
    assert set(ctx.graph.objects(R,GOV.object))=={B}


def test_close_and_add_are_validated_as_one_candidate():
    ctx=setup();data=(HEADER+f'end,{R},A,{ORG.unitOf},,,2030-04-01,\nadd,,A,{ORG.unitOf},C,2030-04-01,open,New\n').encode()
    p=plan_master_import(ctx,batch(data,COLS,'relations'))
    assert p.ready
    assert (R,GOV.object,B) in p.candidate
    assert len(set(p.candidate.subjects(RDF.type,GOV.RelationRecord)))==2
    assert set(p.candidate.objects(R,DCTERMS.source))=={Literal('Old')}


def test_unknown_record_owner_or_predicate_refused():
    ctx=setup();data=(HEADER+f'correct,{R},B,{ORG.unitOf},C,,2030-04-01,\n').encode()
    p=plan_master_import(ctx,batch(data,COLS,'relations'))
    assert not p.ready
