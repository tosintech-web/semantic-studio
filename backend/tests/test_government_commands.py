"""
================================================================================
FILE: backend/tests/test_government_commands.py
SUMMARY
    Exercises country and organization creation through real editing commands.
BASIC IDEA
    Cross-project references use reviewed snapshots; one Undo owns the complete
    organization, its existence record and its country relationship.
INPUTS / INPUT SOURCES
    Synthetic groups created through the local HTTP API.
EXPECTED OUTPUT
    Stable identities, typed references and atomic, reversible registration.
================================================================================
"""
import pytest
from fastapi.testclient import TestClient
from rdflib import Literal, URIRef
from rdflib.namespace import RDF, SKOS

from app.editing import editing_service, project_store
from app.main import app

client = TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio": "1"})
PERIOD = {"start": {"date": None, "open": True}, "end": {"date": None, "open": True}}
SOURCES = [{"kind": "text", "value": "Synthetic reference"}]


@pytest.fixture(autouse=True)
def closed():
    yield
    editing_service.close_all()


def create_group(template="countries", **extra):
    response = client.post("/api/projects", json={"name": "Synthetic", "template": template, **extra})
    assert response.status_code == 200, response.text
    project = response.json()
    assert client.post(f"/api/projects/{project['id']}/open").status_code == 200
    return project["id"]


def command(pid, name, args, **extra):
    return client.post(f"/api/projects/{pid}/documents/model/commands", json={"command": name, "args": args, **extra})


def country(pid, name="Synthetic country", code="SYN"):
    response = command(pid, "CreateCountry", {"names": [{"value": name, "language": "en"}], "code": code,
                       "sources": SOURCES, "description": ""})
    assert response.status_code == 200, response.text
    return response.json()["created"]


def setup_organization():
    source = create_group()
    iri = country(source)
    target = create_group("government-organizations", domainProfile={"id": "government-organizations-v1", "version": 1, "countryProjectId": source})
    choices = client.get(f"/api/projects/{target}/government/countries")
    assert choices.status_code == 200, choices.text
    args = {"names": [{"value": "Synthetic ministry", "language": "en"}], "kind": "Organization",
            "identifier": "M-1", "countryIri": iri, "countryPeriod": PERIOD, "existencePeriod": PERIOD,
            "sources": SOURCES, "referenceBasis": choices.json()["basis"]}
    return source, target, iri, args


def test_country_registration_uses_stable_iri_and_edit_preserves_it():
    pid = create_group()
    first = country(pid, name="Same name")
    second = country(pid, name="Same name")
    assert first != second
    reply = command(pid, "CreateCountry", {"iri": first, "names": [{"value": "Renamed", "language": "en"}],
                    "code": "CHANGED", "sources": SOURCES, "description": ""})
    assert reply.status_code == 200, reply.text
    own = editing_service.document(pid, "model").graph
    assert (URIRef(first), SKOS.prefLabel, None) in own
    assert str(next(own.objects(URIRef(first), SKOS.prefLabel))) == "Renamed"
    assert len(set(own.subjects(RDF.type, URIRef("urn:semantic-studio:government:v1#Country")))) == 2


def test_organization_registration_and_one_undo_own_all_records():
    source, target, iri, args = setup_organization()
    before = set(editing_service.document(target, "model").graph)
    source_before = set(editing_service.document(source, "model").graph)
    reply = command(target, "CreateGovernmentOrganization", args)
    assert reply.status_code == 200, reply.text
    created = reply.json()["created"]
    model = editing_service.document(target, "model").graph
    assert (URIRef(created), RDF.type, URIRef("http://www.w3.org/ns/org#Organization")) in model
    assert len(set(model.subjects(RDF.type, URIRef("urn:semantic-studio:government:v1#ExistenceRecord")))) == 1
    assert len(set(model.subjects(RDF.type, URIRef("urn:semantic-studio:government:v1#RelationRecord")))) == 1
    assert client.post(f"/api/projects/{target}/documents/model/undo").status_code == 200
    assert set(model) == before
    assert set(editing_service.document(source, "model").graph) == source_before


def test_country_changed_after_selection_refuses_without_partial_organization():
    source, target, iri, args = setup_organization()
    before = set(editing_service.document(target, "model").graph)
    country(source, name="Country added after lookup")
    reply = command(target, "CreateGovernmentOrganization", args)
    assert reply.status_code == 409, reply.text
    assert set(editing_service.document(target, "model").graph) == before


def test_non_country_target_and_wrong_profile_are_refused():
    source, target, iri, args = setup_organization()
    args["countryIri"] = "http://example.org/not-a-country"
    reply = command(target, "CreateGovernmentOrganization", args)
    assert reply.status_code == 422, reply.text
    assert command(target, "CreateCountry", {"names": [{"value": "Wrong", "language": "en"}]}).status_code == 422


def test_deleted_or_detached_source_makes_old_selection_stale():
    source, target, iri, args = setup_organization()
    preview = client.patch(f"/api/projects/{source}", json={"domainProfile": None, "dryRun": True}).json()
    detached = client.patch(f"/api/projects/{source}", json={"domainProfile": None, "profileBasis": preview["basis"]})
    assert detached.status_code == 200
    assert command(target, "CreateGovernmentOrganization", args).status_code == 409


def test_names_and_country_values_are_not_taken_from_display_language():
    source, target, iri, args = setup_organization()
    reply = client.post(f"/api/projects/{target}/documents/model/commands?lang=ja", json={"command": "CreateGovernmentOrganization", "args": args})
    assert reply.status_code == 200, reply.text
    model = editing_service.document(target, "model").graph
    label = next(model.objects(URIRef(reply.json()["created"]), SKOS.prefLabel))
    assert label.language == "en"


def test_invalid_source_iri_is_refused_as_input_not_server_error():
    pid = create_group()
    response = command(pid, "CreateCountry", {"names": [{"value": "Synthetic", "language": "en"}],
                       "sources": [{"kind": "iri", "value": "relative source"}]})
    assert response.status_code == 422, response.text


def test_registration_edit_does_not_rewrite_unsupported_existing_record():
    source, target, iri, args = setup_organization()
    response = command(target, "CreateGovernmentOrganization", args)
    assert response.status_code == 200
    args["iri"] = response.json()["created"]
    model = editing_service.document(target, "model").graph
    life = next(model.subjects(RDF.type, URIRef("urn:semantic-studio:government:v1#ExistenceRecord")))
    model.add((life, URIRef("http://example.org/extension"), Literal("Keep this")))
    before = set(model)
    response = command(target, "CreateGovernmentOrganization", args)
    assert response.status_code == 422, response.text
    assert set(model) == before


def test_reference_group_switch_preview_owns_source_basis_and_unresolved_iris():
    source, target, iri, args = setup_organization()
    assert command(target, "CreateGovernmentOrganization", args).status_code == 200
    replacement = create_group()
    profile = {"id": "government-organizations-v1", "version": 1, "countryProjectId": replacement}
    url = f"/api/projects/{target}"
    preview = client.patch(url, json={"domainProfile": profile, "dryRun": True})
    assert preview.status_code == 200
    assert preview.json()["impact"]["unresolvedCountryIris"] == [iri]
    country(replacement, name="Country changed after preview")
    reply = client.patch(url, json={"domainProfile": profile, "profileBasis": preview.json()["basis"]})
    assert reply.status_code == 409, reply.text
    assert project_store.manifest(target)["domainProfile"]["countryProjectId"] == source
