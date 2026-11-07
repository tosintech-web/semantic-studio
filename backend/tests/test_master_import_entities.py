"""
FILE: backend/tests/test_master_import_entities.py
SUMMARY: Non-destructive country and organization batch planning.
BASIC IDEA: Compare literal RDF expectations with a detached proposed graph.
INPUTS / INPUT SOURCES: Synthetic S0 graphs and actual parsed/mapped CSV rows.
EXPECTED OUTPUT: Stable identities, preserved unmapped terms and explicit ambiguity.
"""
from types import SimpleNamespace
from rdflib import Graph,Literal,URIRef
from rdflib.namespace import RDF,SKOS,DCTERMS
from app.editing import Context
from app.government.profile import GOV,ORG
from app.government.import_tabular import read_master_table
from app.government.import_mapping import map_master_rows
from app.government.import_plan import plan_master_import


def context(mode='countries',graph=None):
    ctx=Context(graph if graph is not None else Graph(),{'id':'prj-000000000001','baseIri':'urn:example:','primaryLanguage':'en','domainProfile':{'id':'countries-v1' if mode=='countries' else 'government-organizations-v1','version':1}},lambda:None)
    return ctx


def batch(data,columns,mode='countries',defaults=None):
    table=read_master_table(data,'test.csv',{})
    mapping={'columns':columns,'defaults':defaults or {}}
    mapped=map_master_rows(table,mode,mapping,[p['rowId'] for p in table.positions])
    assert not mapped['issues']
    return {'version':1,'source':{'sha256':'a'*64,'filename':'test.csv','options':{}},'mode':mode,'mapping':mapping,'selectedRows':mapped['selectedRows'],'operationNonce':'test','intents':mapped['intents']}

COLUMNS=[{'column':0,'field':'code','op':'set'},{'column':1,'field':'names','language':'ja','op':'set'}]

def test_country_patch_preserves_unmapped_values():
    ctx=context();iri=URIRef('urn:test:jp')
    for triple in [(iri,RDF.type,GOV.Country),(iri,GOV.countryCode,Literal('JP')),(iri,SKOS.prefLabel,Literal('Japan',lang='en')),(iri,SKOS.prefLabel,Literal('日本',lang='ja')),(iri,DCTERMS.source,Literal('A'))]:ctx.graph.add(triple)
    original=set(ctx.graph)
    plan=plan_master_import(ctx,batch('code,name,alias,source\nJP,日本国,にほん,B\n'.encode(),COLUMNS+[{'column':2,'field':'aliases','language':'ja','op':'append'},{'column':3,'field':'sources','op':'append'}]))
    assert plan.ready
    assert set(ctx.graph)==original
    assert (iri,SKOS.prefLabel,Literal('Japan',lang='en')) in plan.candidate
    assert (iri,SKOS.prefLabel,Literal('日本',lang='ja')) not in plan.candidate
    assert (iri,SKOS.prefLabel,Literal('日本国',lang='ja')) in plan.candidate
    assert set(plan.candidate.objects(iri,DCTERMS.source))=={Literal('A'),Literal('B')}
    ctx.graph=plan.candidate
    again=plan_master_import(ctx,batch('code,name,alias,source\nJP,日本国,にほん,B\n'.encode(),COLUMNS+[{'column':2,'field':'aliases','language':'ja','op':'append'},{'column':3,'field':'sources','op':'append'}]))
    assert again.noop


def test_ambiguous_code_never_becomes_new_entity():
    ctx=context()
    for number in range(2):
        node=URIRef(f'urn:test:{number}');ctx.graph.add((node,RDF.type,GOV.Country));ctx.graph.add((node,GOV.countryCode,Literal('JP')))
    plan=plan_master_import(ctx,batch(b'code,name\nJP,Name\n',COLUMNS))
    assert not plan.ready
    assert any(row['status']=='needs-review' for row in plan.rows)


def test_defaults_apply_only_to_new_entities():
    ctx=context();iri=URIRef('urn:test:old')
    for t in [(iri,RDF.type,GOV.Country),(iri,GOV.countryCode,Literal('OLD')),(iri,SKOS.prefLabel,Literal('Old',lang='en')),(iri,DCTERMS.description,Literal('Keep'))]:ctx.graph.add(t)
    plan=plan_master_import(ctx,batch(b'code,name\nOLD,Old\nNEW,New\n',COLUMNS,defaults={'description':'Default'}))
    assert plan.ready
    assert (iri,DCTERMS.description,Literal('Keep')) in plan.candidate
    new=next(plan.candidate.subjects(GOV.countryCode,Literal('NEW')))
    assert (new,DCTERMS.description,Literal('Default')) in plan.candidate


def test_new_organization_resolves_country_beyond_first_page():
    ctx=context('organizations');countries=Graph()
    for number in range(51):
        iri=URIRef(f'urn:country:{number}');countries.add((iri,RDF.type,GOV.Country));countries.add((iri,GOV.countryCode,Literal(str(number))))
    ctx.country_reference=SimpleNamespace(graph=countries,basis={'sourceToken':'test'})
    columns=COLUMNS+[{'column':2,'field':'countryCode','op':'set'},{'column':3,'field':'orgKind','op':'set'},{'column':4,'field':'sources','op':'append'}]
    b=batch(b'code,name,country,kind,source\nORG,Office,50,Organization,Gazette\n',columns,'organizations',{'existenceStart':'open','existenceEnd':'open','affiliationStart':'open','affiliationEnd':'open'})
    p=plan_master_import(ctx,b)
    assert p.ready
    assert (None,GOV.object,URIRef('urn:country:50')) in p.candidate
    assert len(set(p.candidate.subjects(RDF.type,ORG.Organization)))==1


def test_duplicate_input_keys_and_missing_country_refuse_whole_plan():
    p=plan_master_import(context(),batch(b'code,name\nJP,A\nJP,B\n',COLUMNS))
    assert not p.ready


def test_multiple_alias_columns_replace_one_language_as_a_single_set():
    ctx=context();node=URIRef('urn:country:AA')
    for triple in [(node,RDF.type,GOV.Country),(node,GOV.countryCode,Literal('AA')),(node,SKOS.prefLabel,Literal('Alpha',lang='en')),(node,SKOS.altLabel,Literal('Old',lang='ja')),(node,SKOS.altLabel,Literal('Keep',lang='en'))]:ctx.graph.add(triple)
    columns=[{'column':0,'field':'code','op':'set'},{'column':1,'field':'aliases','language':'ja','op':'replace'},{'column':2,'field':'aliases','language':'JA','op':'replace'}]
    plan=plan_master_import(ctx,batch(b'code,alias1,alias2\nAA,First,Second\n',columns))
    assert plan.ready
    assert set(plan.candidate.objects(node,SKOS.altLabel))=={Literal('First',lang='ja'),Literal('Second',lang='ja'),Literal('Keep',lang='en')}


def test_period_edit_without_existing_record_cannot_succeed_silently():
    ctx=context('organizations');node=URIRef('urn:org:AA')
    for triple in [(node,RDF.type,ORG.Organization),(node,ORG.identifier,Literal('AA')),(node,SKOS.prefLabel,Literal('Alpha',lang='en'))]:ctx.graph.add(triple)
    ctx.country_reference=SimpleNamespace(graph=Graph(),basis={'sourceToken':'test'})
    for field in ('existenceStart','affiliationStart'):
        columns=[{'column':0,'field':'code','op':'set'},{'column':1,'field':field,'op':'set'}]
        plan=plan_master_import(ctx,batch(b'code,start\nAA,2030-01-01\n',columns,'organizations'))
        assert not plan.ready
        assert plan.rows[0]['status'] in ('error','needs-review')


def test_new_name_defaults_fill_only_missing_languages_and_never_existing_items():
    ctx=context();old=URIRef('urn:country:OLD')
    for t in [(old,RDF.type,GOV.Country),(old,GOV.countryCode,Literal('OLD')),(old,SKOS.prefLabel,Literal('Existing',lang='en'))]:ctx.graph.add(t)
    columns=COLUMNS+[{'column':2,'field':'aliases','language':'ja','op':'append'}]
    defaults={'names':[{'value':'Fallback','language':'en'},{'value':'Unused','language':'JA'}],
              'aliases':[{'value':'Default alias','language':'en'},{'value':'Unused alias','language':'JA'}]}
    p=plan_master_import(ctx,batch(b'code,name,alias\nNEW,Source,Source alias\nOLD,Updated,Old alias\n',columns,defaults=defaults))
    assert p.ready
    new=next(p.candidate.subjects(GOV.countryCode,Literal('NEW')))
    assert set(p.candidate.objects(new,SKOS.prefLabel))=={Literal('Source',lang='ja'),Literal('Fallback',lang='en')}
    assert set(p.candidate.objects(new,SKOS.altLabel))=={Literal('Source alias',lang='ja'),Literal('Default alias',lang='en')}
    assert (old,SKOS.prefLabel,Literal('Existing',lang='en')) in p.candidate
    assert (old,SKOS.altLabel,Literal('Default alias',lang='en')) not in p.candidate


def test_malformed_name_default_is_reported_instead_of_crashing_preview():
    p=plan_master_import(context(),batch(b'code,name\nNEW,\n',COLUMNS,defaults={'names':[{'value':'Missing language'}]}))
    assert not p.ready
    assert p.rows[0]['status']=='error'


def test_normalized_key_evidence_survives_beyond_the_inspection_sample():
    data=('code,name\n'+''.join(f'C{i},Name {i}\n' for i in range(20))+' JP ,Japan\n').encode()
    prepared=batch(data,COLUMNS)
    plan=plan_master_import(context(),prepared)
    assert plan.ready
    row=plan.result()['rows'][20]
    assert row['normalizations']==[{'field':'code','column':0,'raw':' JP ','value':'JP'}]
    assert (URIRef(row['entityIri']),GOV.countryCode,Literal('JP')) in plan.candidate
