"""
================================================================================
FILE: backend/tests/test_government_changes.py
SUMMARY
    Exercises atomic reorganizations, dated relationships and name history.
BASIC IDEA
    Register fictional entities, preview changes, then compare exact RDF sets
    across refusal, commit, Undo and Redo; dates test half-open projections.
INPUTS / INPUT SOURCES
    Synthetic local HTTP groups and accepted RDF snapshots.
EXPECTED OUTPUT
    Reviewed, reversible history without implicit entity creation or closure.
================================================================================
"""
from copy import deepcopy
import pytest
from rdflib import URIRef
from rdflib.namespace import RDF, SKOS
from app.editing import editing_service
from app.government.profile import GOV, ORG
from test_government_commands import client, command, setup_organization, PERIOD, SOURCES

@pytest.fixture(autouse=True)
def close():
    yield
    editing_service.close_all()


def setup():
    source, pid, country, args = setup_organization()
    entities = [command(pid, 'CreateGovernmentOrganization', {**args, 'names':[{'value':str(i),'language':'en'}]}).json()['created'] for i in range(3)]
    return source,pid,args,entities


def graph(pid):
    return set(editing_service.document(pid,'model').graph)


def relation(a,b,predicate=str(ORG.unitOf),**extra):
    return {'subject':a,'predicate':predicate,'object':b,'period':deepcopy(PERIOD),'sources':SOURCES,'description':'',**extra}


def event(args,entities,kind='merge',**extra):
    return {'kind':kind,'effectiveDate':'2020-04-01','originalIris':entities[:2],'resultingIris':entities[2:],
            'relationEdits':[],'nameEdits':[],'existenceEdits':[],'sources':SOURCES,'description':'Synthetic change',
            'referenceBasis':args['referenceBasis'],**extra}


def preview(pid,name,args):
    r=command(pid,name,args,dryRun=True)
    assert r.status_code==200,r.text
    return {**args,'previewBasis':r.json()['basis']},r.json()


@pytest.mark.parametrize('kind',['merge','split','transfer','rename','other'])
def test_reorganization_preview_exact_delta_one_undo_and_redo(kind):
    source,pid,args,entities=setup()
    body=event(args,entities,kind,originalIris=entities[:1] if kind in ('split','transfer','rename') else entities[:2],
               resultingIris=entities[1:] if kind=='split' else entities[:1] if kind in ('transfer','rename') else entities[2:])
    before,source_before=graph(pid),graph(source)
    approved,review=preview(pid,'ApplyGovernmentChange',body)
    assert graph(pid)==before
    reply=command(pid,'ApplyGovernmentChange',approved)
    assert reply.status_code==200,reply.text
    assert reply.json()['delta']==review['delta']
    after=graph(pid)
    node=URIRef(reply.json()['created'])
    assert (node,RDF.type,ORG.ChangeEvent) in after
    assert set(editing_service.document(pid,'model').graph.objects(node,ORG.originalOrganization))==set(map(URIRef,body['originalIris']))
    assert client.post(f'/api/projects/{pid}/documents/model/undo').status_code==200
    assert graph(pid)==before and graph(source)==source_before
    assert client.post(f'/api/projects/{pid}/documents/model/redo').status_code==200
    assert graph(pid)==after


def test_transfer_closes_and_opens_relation_in_one_change():
    _,pid,args,e=setup()
    first,_=preview(pid,'PutGovernmentRelation',{**relation(e[0],e[1]),'referenceBasis':args['referenceBasis']})
    old=command(pid,'PutGovernmentRelation',first).json()['created']
    end={'start':PERIOD['start'],'end':{'date':'2020-04-01','open':False}}
    start={'start':{'date':'2020-04-01','open':False},'end':PERIOD['end']}
    approved,_=preview(pid,'ApplyGovernmentChange',event(args,e,'transfer',originalIris=[e[0]],resultingIris=[e[0]],relationEdits=[relation(e[0],e[1],iri=old,period=end),relation(e[0],e[2],period=start)]))
    assert command(pid,'ApplyGovernmentChange',approved).status_code==200
    for date,parent in [('2020-03-31',e[1]),('2020-04-01',e[2])]:
        text=client.get(f'/api/projects/{pid}/government/projection?at={date}').text
        from rdflib import Graph
        projected=Graph().parse(data=text,format='turtle')
        assert set(projected.objects(URIRef(e[0]),ORG.unitOf))=={URIRef(parent)}


def test_absorption_explicitly_ends_only_absorbed_organization_and_future_name():
    _,pid,args,e=setup()
    ended={'start':PERIOD['start'],'end':{'date':'2030-04-01','open':False}}
    future={'start':{'date':'2030-04-01','open':False},'end':PERIOD['end']}
    body=event(args,e,originalIris=e[:2],resultingIris=[e[0]],effectiveDate='2030-04-01',
        existenceEdits=[{'entity':e[1],'period':ended,'sources':SOURCES}],
        nameEdits=[{'entity':e[0],'value':'Future name','language':'en','period':future,'sources':SOURCES}])
    approved,_=preview(pid,'ApplyGovernmentChange',body)
    assert command(pid,'ApplyGovernmentChange',approved).status_code==200
    for date,label,state in [('2029-01-01','0','active'),('2030-04-01','Future name','inactive')]:
        view=client.get(f'/api/projects/{pid}/government/view?at={date}').json()
        rows={r['iri']:r for r in view['organizations']['items']}
        assert rows[e[0]]['label']==label and rows[e[1]]['existenceState']==state


@pytest.mark.parametrize('patch',[{'sources':[]},{'effectiveDate':'2020-02-30'},{'originalIris':['urn:missing']},{'resultingIris':['urn:other-group']},{'originalIris':['urn:x']*101},{'relationEdits':[{}]*101}])
def test_invalid_change_is_atomic(patch):
    _,pid,args,e=setup(); before=graph(pid)
    r=command(pid,'ApplyGovernmentChange',event(args,e,**patch),dryRun=True)
    assert r.status_code==422,r.text
    assert graph(pid)==before


def test_missing_or_stale_preview_refused_without_partial_write():
    _,pid,args,e=setup(); body=event(args,e)
    assert command(pid,'ApplyGovernmentChange',body).status_code==409
    approved,_=preview(pid,'ApplyGovernmentChange',body)
    command(pid,'CreateGovernmentOrganization',{**args,'names':[{'value':'Later','language':'en'}]})
    before=graph(pid)
    assert command(pid,'ApplyGovernmentChange',approved).status_code==409
    assert graph(pid)==before


def test_cycle_rejected_supervision_allowed_and_unknown_overlap_warned():
    _,pid,args,e=setup()
    approved,_=preview(pid,'PutGovernmentRelation',{**relation(e[0],e[1]),'referenceBasis':args['referenceBasis']})
    assert command(pid,'PutGovernmentRelation',approved).status_code==200
    cycle=command(pid,'PutGovernmentRelation',{**relation(e[1],e[0]),'referenceBasis':args['referenceBasis']},dryRun=True)
    assert cycle.status_code==422,cycle.text
    _,review=preview(pid,'PutGovernmentRelation',{**relation(e[1],e[0],str(GOV.supervisedBy)),'referenceBasis':args['referenceBasis']})
    assert not review['warnings']
    unknown={'start':{'date':None,'open':False},'end':{'date':None,'open':False}}
    _,review=preview(pid,'PutGovernmentRelation',{**relation(e[0],e[1],period=unknown),'referenceBasis':args['referenceBasis']})
    assert any(p['code']=='government.relation_overlap' for p in review['warnings'])


def test_name_overlap_is_refused_case_insensitively():
    _,pid,args,e=setup()
    body={'entity':e[0],'value':'Name','language':'en','period':PERIOD,'sources':SOURCES,'referenceBasis':args['referenceBasis']}
    approved,_=preview(pid,'PutGovernmentName',body)
    assert command(pid,'PutGovernmentName',approved).status_code==200
    r=command(pid,'PutGovernmentName',{**body,'value':'Other','language':'EN'},dryRun=True)
    assert r.status_code==422,r.text


def test_containment_across_countries_warns_and_foreign_group_endpoint_is_rejected():
    from test_government_commands import country
    source,pid,args,e=setup()
    other=country(source,'Another country','OTH')
    basis=client.get(f'/api/projects/{pid}/government/countries').json()['basis']
    second=command(pid,'CreateGovernmentOrganization',{**args,'countryIri':other,'referenceBasis':basis}).json()['created']
    _,review=preview(pid,'PutGovernmentRelation',{**relation(e[0],second),'referenceBasis':basis})
    assert any(w['code']=='government.cross_country' for w in review['warnings'])
    before=graph(pid)
    r=command(pid,'PutGovernmentRelation',{**relation(e[0],'urn:another-project:org'),'referenceBasis':basis},dryRun=True)
    assert r.status_code==422 and graph(pid)==before


def test_unsupported_record_annotations_are_never_silently_discarded():
    from rdflib import Literal
    from rdflib.namespace import RDFS
    _,pid,args,e=setup()
    body={**relation(e[0],e[1]),'referenceBasis':args['referenceBasis']}
    approved,_=preview(pid,'PutGovernmentRelation',body)
    iri=command(pid,'PutGovernmentRelation',approved).json()['created']
    # A generic editor may attach RDF that the dedicated record form cannot
    # represent. It must refuse rewriting rather than erase that annotation.
    editing_service.document(pid,'model').graph.add((URIRef(iri),RDFS.label,Literal('External annotation')))
    before=graph(pid)
    reply=command(pid,'PutGovernmentRelation',{**body,'iri':iri,'description':'Changed'},dryRun=True)
    assert reply.status_code==422,reply.text
    assert graph(pid)==before


def test_name_projection_replaces_matching_language_tag_case_insensitively():
    _,pid,args,e=setup()
    approved,_=preview(pid,'PutGovernmentName',{'entity':e[0],'value':'Replacement','language':'EN','period':PERIOD,'sources':SOURCES,'referenceBasis':args['referenceBasis']})
    assert command(pid,'PutGovernmentName',approved).status_code==200
    from rdflib import Graph
    projected=Graph().parse(data=client.get(f'/api/projects/{pid}/government/projection?at=2020-01-01').text,format='turtle')
    assert list(map(str,projected.objects(URIRef(e[0]),SKOS.prefLabel)))==['Replacement']
