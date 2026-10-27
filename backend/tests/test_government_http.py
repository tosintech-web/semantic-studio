"""
================================================================================
FILE: backend/tests/test_government_http.py
SUMMARY
    Checks cross-group candidate lookup, limits and dated read endpoints.
BASIC IDEA
    Real HTTP reads must expose complete counts, preserve accepted unsaved data
    and stay read-only when the source group has not been opened in the UI.
INPUTS / INPUT SOURCES
    Synthetic country and organization projects.
EXPECTED OUTPUT
    Complete paged candidates and owner-bound, explicitly dated projections.
================================================================================
"""
import pytest
import json
from rdflib import Literal, Namespace
from rdflib.namespace import DCTERMS, OWL, RDF, SKOS

from app.editing import editing_service, project_store
from test_government_commands import client, create_group, country, setup_organization, command

GOV = Namespace("urn:semantic-studio:government:v1#")


@pytest.fixture(autouse=True)
def closed():
    yield
    editing_service.close_all()


def test_country_search_reaches_last_of_251_with_true_total():
    source = create_group()
    document = editing_service.document(source, "model")
    # Bulk fixture construction is not the production write under test. It
    # deliberately stays unsaved so lookup must read accepted in-memory RDF.
    for number in range(251):
        iri = Namespace("http://example.org/country#")[str(number)]
        document.graph.add((iri, RDF.type, GOV.Country))
        document.graph.add((iri, RDF.type, OWL.NamedIndividual))
        document.graph.add((iri, SKOS.prefLabel, Literal(f"Country {number:03}", lang="en")))
    target = create_group("government-organizations", domainProfile={"id": "government-organizations-v1", "version": 1, "countryProjectId": source})
    base = f"/api/projects/{target}/government/countries"
    page = client.get(base, params={"offset": 250, "limit": 50})
    assert page.status_code == 200, page.text
    assert page.json()["total"] == 251
    assert [row["label"] for row in page.json()["items"]] == ["Country 250"]
    search = client.get(base, params={"q": "250"}).json()
    assert search["total"] == 1
    assert search["items"][0]["iri"] == "http://example.org/country#250"
    assert search["basis"]["sourceProjectId"] == source
    assert client.get(base, params={"limit": 101}).status_code == 422
    assert client.get(base, params={"q": "x" * 201}).status_code == 422


def test_lookup_of_closed_source_does_not_open_it_or_write_files():
    source = create_group()
    iri = country(source)
    assert client.post(f"/api/projects/{source}/documents/model/save", json={"confirmRewrite": True}).status_code == 200
    assert client.post(f"/api/projects/{source}/close").status_code == 200
    assert not editing_service.is_open(source)
    target = create_group("government-organizations", domainProfile={"id": "government-organizations-v1", "version": 1, "countryProjectId": source})
    path = project_store.document_path(source, "model")
    before = path.read_bytes()
    reply = client.get(f"/api/projects/{target}/government/countries")
    assert reply.status_code == 200, reply.text
    assert reply.json()["items"][0]["iri"] == iri
    assert not editing_service.is_open(source)
    assert path.read_bytes() == before


def test_dated_view_requires_date_and_projection_has_explicit_basis():
    source, target, iri, args = setup_organization()
    assert command(target, "CreateGovernmentOrganization", args).status_code == 200
    base = f"/api/projects/{target}/government"
    assert client.get(base + "/view").status_code == 422
    reply = client.get(base + "/view", params={"at": "2020-04-01"})
    assert reply.status_code == 200, reply.text
    assert reply.json()["at"] == "2020-04-01"
    assert reply.json()["organizations"]["total"] == 1
    projection = client.get(base + "/projection", params={"at": "2020-04-01"})
    assert projection.status_code == 200, projection.text
    assert projection.headers["X-Semantic-Studio-As-Of"] == "2020-04-01"
    assert projection.headers["X-Semantic-Studio-Basis"]


@pytest.mark.parametrize('ranges,language,confirmed',[
    ([], 'en', False),
    ([('2010-01-01','2020-01-01')], 'en', False),
    ([(None,None)], 'en', False),
    ([('2030-01-01',None)], 'en', False),
    ([('2010-01-01',None),('2015-01-01',None)], 'en', False),
    ([('2010-01-01',None)], 'en', True),
    ([('2010-01-01',None)], 'ja', False),
])
def test_dated_name_certainty_matches_the_selected_language_and_unique_applicable_record(ranges,language,confirmed):
    from rdflib import URIRef
    from app.government.records import parse_period,period_statements
    _,pid,_,args=setup_organization()
    entity=command(pid,'CreateGovernmentOrganization',{**args,'names':[
        {'value':'Current English name','language':'en'},{'value':'現在の日本語名','language':'ja'}]}).json()['created']
    own=editing_service.document(pid,'model').graph
    for index,(start,end) in enumerate(ranges):
        record=URIRef(f'urn:synthetic:name:{index}')
        for statement in [(record,RDF.type,GOV.NameRecord),(record,GOV.entity,URIRef(entity)),
                          (record,GOV.nameValue,Literal(f'Historical English name {index}',lang='en')),
                          (record,DCTERMS.source,Literal('Synthetic name gazette'))]:
            own.add(statement)
        period={'start':{'date':start,'open':False},'end':{'date':end,'open':bool(start and not end)}}
        for statement in period_statements(record,parse_period(period)):
            own.add(statement)
    response=client.get(f'/api/projects/{pid}/government/view',params={'at':'2025-01-01','displayLanguage':language})
    assert response.status_code==200,response.text
    row=response.json()['organizations']['items'][0]
    assert row['nameConfirmed'] is confirmed
    assert row['label']==('Historical English name 0' if confirmed else '現在の日本語名' if language=='ja' else 'Current English name')


def test_active_country_resolution_is_independent_of_single_record_edit_fields():
    from rdflib import URIRef
    from app.government.records import parse_period,period_statements
    _,pid,country_iri,args=setup_organization()
    entity=command(pid,'CreateGovernmentOrganization',args).json()['created']
    own=editing_service.document(pid,'model').graph
    initial=next(own.subjects(GOV.subject,URIRef(entity)))
    for predicate in (GOV.validFrom,GOV.validUntil,GOV.openStart,GOV.openEnd):
        own.remove((initial,predicate,None))
    for statement in period_statements(initial,parse_period({'start':{'date':None,'open':True},'end':{'date':'2020-01-01','open':False}})):
        own.add(statement)
    record=URIRef('urn:synthetic:later-affiliation')
    for statement in [(record,RDF.type,GOV.RelationRecord),(record,GOV.subject,URIRef(entity)),
                      (record,GOV.predicate,GOV.inCountry),(record,GOV.object,URIRef(country_iri)),
                      (record,DCTERMS.source,Literal('Synthetic affiliation gazette'))]:
        own.add(statement)
    for statement in period_statements(record,parse_period({'start':{'date':'2020-01-01','open':False},'end':{'date':None,'open':True}})):
        own.add(statement)
    row=client.get(f'/api/projects/{pid}/government/view',params={'at':'2025-01-01'}).json()['organizations']['items'][0]
    assert row['formCountryIri'] is None
    assert row['countryIri']==country_iri
    assert row['activeCountryResolved'] is True


def test_country_lookup_matches_explicit_team_read_policy():
    from app.team.permissions import classify_route
    for suffix in ("countries", "view", "projection"):
        policy, _ = classify_route("GET", f"/api/projects/prj-012345abcdef/government/{suffix}")
        assert policy.operation == "read"
        assert not policy.shared_update


@pytest.mark.parametrize("chunked", [False, True])
def test_command_body_limit_is_enforced_before_mutation(chunked):
    pid = create_group()
    url = f"/api/projects/{pid}/documents/model/commands"
    payload = b" " * (256 * 1024) + json.dumps({"command": "CreateCountry", "args": {"names": [{"value": "Over limit", "language": "en"}]}}).encode()
    before = set(editing_service.document(pid, "model").graph)
    content = (payload[i:i + 4096] for i in range(0, len(payload), 4096)) if chunked else payload
    reply = client.post(url, content=content, headers={"Content-Type": "application/json"})
    assert reply.status_code == 413, reply.text
    assert set(editing_service.document(pid, "model").graph) == before


@pytest.mark.parametrize("payload", [b"not json", b"\xff", b"[]", b'{"args": {}}'])
def test_malformed_command_json_is_input_error(payload):
    pid = create_group()
    reply = client.post(f"/api/projects/{pid}/documents/model/commands", content=payload, headers={"Content-Type": "application/json"})
    assert reply.status_code == 422, reply.text


def test_projection_size_limit_is_an_explicit_refusal(monkeypatch):
    from app.government import views
    source, target, iri, args = setup_organization()
    assert command(target, "CreateGovernmentOrganization", args).status_code == 200
    monkeypatch.setattr(views, "MAX_PROJECTION_STATEMENTS", 2, raising=False)
    reply = client.get(f"/api/projects/{target}/government/projection?at=2020-04-01")
    assert reply.status_code == 413, reply.text


def test_country_name_change_updates_read_view_without_rewriting_reference():
    source, target, iri, args = setup_organization()
    assert command(target, "CreateGovernmentOrganization", args).status_code == 200
    url = f"/api/projects/{target}/government/view?at=2020-04-01"
    before = client.get(url).json()
    assert before["organizations"]["items"][0]["countryLabel"] == "Synthetic country"
    changed = command(source, "CreateCountry", {"iri": iri, "names": [{"value": "Renamed country", "language": "en"}], "code": "SYN"})
    assert changed.status_code == 200, changed.text
    after = client.get(url).json()
    assert after["organizations"]["items"][0]["countryLabel"] == "Renamed country"
    assert after["organizations"]["items"][0]["countryIri"] == iri
    assert after["basis"] != before["basis"]


def test_exact_country_detail_preserves_multilingual_names_aliases_and_sources():
    pid = create_group()
    iri = country(pid)
    country(pid, name="Other country")
    model = editing_service.document(pid, "model").graph
    from rdflib import URIRef
    from rdflib.namespace import DCTERMS
    node = URIRef(iri)
    model.add((node, SKOS.prefLabel, Literal("合成国", lang="ja")))
    model.add((node, SKOS.altLabel, Literal("Synthetic alternative", lang="en")))
    model.add((node, DCTERMS.description, Literal("Synthetic description")))
    response = client.get(f"/api/projects/{pid}/government/countries", params={"iri": iri})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    detail = response.json()["items"][0]
    assert {name["language"] for name in detail["names"]} == {"en", "ja"}
    assert detail["aliases"] == [{"value": "Synthetic alternative", "language": "en"}]
    assert detail["description"] == "Synthetic description"
    assert detail["sources"] == [{"kind": "text", "value": "Synthetic reference"}]
    assert detail["unsupported"] == []


def test_organization_detail_contains_original_unknown_period_and_shared_kind_labels():
    source, target, iri, args = setup_organization()
    unknown = {"start": {"date": None, "open": False}, "end": {"date": None, "open": False}}
    args["countryPeriod"] = unknown
    made = command(target, "CreateGovernmentOrganization", args).json()["created"]
    command(target, "CreateGovernmentOrganization", {**args, "names": [{"value": "Second", "language": "en"}]})
    response = client.get(f"/api/projects/{target}/government/view", params={"at": "2020-04-01", "iri": made})
    assert response.status_code == 200
    result = response.json()
    assert result["organizations"]["total"] == 1
    detail = result["organizations"]["items"][0]
    assert detail["formCountryIri"] == iri
    assert detail["countryResolved"] is True
    assert detail["formCountryLabel"] == "Synthetic country"
    assert detail["countryPeriod"] == unknown
    assert detail["identifier"] == "M-1"
    assert detail["sources"] == [{"kind": "text", "value": "Synthetic reference"}]
    assert detail["unsupported"] == []
    assert {kind["value"] for kind in result["kindOptions"]} == {"Organization", "FormalOrganization", "OrganizationalUnit"}
    assert next(kind for kind in result["kindOptions"] if kind["value"] == "Organization")["iri"] == "http://www.w3.org/ns/org#Organization"
    search = client.get(f"/api/projects/{target}/government/view", params={"at": "2020-04-01", "q": "Second"}).json()
    assert search["organizations"]["total"] == 1
    assert search["organizations"]["items"][0]["label"] == "Second"
    assert client.get(f"/api/projects/{target}/government/view", params={"at": "2020-04-01", "q": "x" * 201}).status_code == 422


def test_all_history_zip_includes_accepted_unsaved_records_without_saving():
    from io import BytesIO
    from zipfile import ZipFile
    from rdflib.compare import isomorphic
    from app.editing import parse_turtle
    from test_government_changes import setup, event, preview
    source,pid,args,entities=setup()
    approved,_=preview(pid,'ApplyGovernmentChange',event(args,entities))
    assert command(pid,'ApplyGovernmentChange',approved).status_code==200
    document=editing_service.document(pid,'model')
    saved=project_store.document_path(pid,'model').read_bytes()
    before=set(document.graph)
    response=client.get(f'/api/projects/{pid}/export')
    assert response.status_code==200,response.text
    with ZipFile(BytesIO(response.content)) as archive:
        manifest=json.loads(archive.read('project.json'))
        exported=parse_turtle(archive.read('model.ttl').decode(),None,manifest['baseIri'])
        assert isomorphic(exported,document.graph)
        assert manifest['domainProfile']['countryProjectId']==source
        assert any(name.endswith('/model.ttl') for name in archive.namelist())
    assert set(document.graph)==before and document.dirty
    assert project_store.document_path(pid,'model').read_bytes()==saved


def test_duplicate_preserves_unsaved_history_iris_profile_and_original_country_authority():
    from rdflib.compare import isomorphic
    from test_government_changes import setup,event,preview
    source,pid,args,entities=setup()
    approved,_=preview(pid,'ApplyGovernmentChange',event(args,entities))
    assert command(pid,'ApplyGovernmentChange',approved).status_code==200
    original=editing_service.document(pid,'model').graph
    reply=client.post(f'/api/projects/{pid}/duplicate')
    assert reply.status_code==200,reply.text
    duplicate=reply.json()['id']
    assert client.post(f'/api/projects/{duplicate}/open').status_code==200
    assert isomorphic(editing_service.document(duplicate,'model').graph,original)
    assert project_store.manifest(duplicate)['domainProfile']['countryProjectId']==source
    assert project_store.manifest(duplicate)['baseIri']==project_store.manifest(pid)['baseIri']


def test_saved_history_and_reference_basis_survive_new_local_services(tmp_path):
    from app.projects import ProjectStore
    from app.store import OntologyStore
    from app.editing import EditingService
    from app.government.views import view
    from test_government_changes import setup,event,preview
    source,pid,args,entities=setup()
    approved,_=preview(pid,'ApplyGovernmentChange',event(args,entities))
    change=command(pid,'ApplyGovernmentChange',approved).json()['created']
    before=client.get(f'/api/projects/{pid}/government/view?at=2030-01-01').json()
    for project in (source,pid):
        assert client.post(f'/api/projects/{project}/documents/model/save',json={'confirmRewrite':True}).status_code==200
    root=project_store.dir.parent
    editing_service.close_all()
    fresh=EditingService(ProjectStore(root),OntologyStore(root))
    try:
        after=view(fresh,pid,'2030-01-01')
        assert after['referenceBasis']==before['referenceBasis']
        assert {row['iri'] for row in after['organizations']['items']}==set(entities)
        assert after['changes']['items'][0]['iri']==change
    finally:
        fresh.close_all()


def test_restored_target_without_country_group_keeps_unresolved_iri_and_history(tmp_path):
    from io import BytesIO
    from zipfile import ZipFile
    from app.projects import ProjectStore
    from app.store import OntologyStore
    from app.editing import EditingService
    from app.government.views import view
    source,pid,country,args=setup_organization()
    created=command(pid,'CreateGovernmentOrganization',args).json()['created']
    data=client.get(f'/api/projects/{pid}/export').content
    root=tmp_path/'restored-library';folder=root/'projects'/pid;folder.mkdir(parents=True)
    with ZipFile(BytesIO(data)) as archive:
        archive.extractall(folder)
    fresh=EditingService(ProjectStore(root),OntologyStore(root))
    try:
        result=view(fresh,pid,'2020-01-01')
        assert result['referenceBasis'] is None
        row=result['organizations']['items'][0]
        assert row['iri']==created and row['formCountryIri']==country and not row['countryResolved']
        assert fresh.projects.manifest(pid)['domainProfile']['countryProjectId']==source
    finally:
        fresh.close_all()
