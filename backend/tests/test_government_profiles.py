"""
================================================================================
FILE: backend/tests/test_government_profiles.py
SUMMARY
    Proves domain templates, fixed identities and explicit profile changes.
BASIC IDEA
    Use real project files and HTTP requests so lost metadata, unsafe template
    substitution and implicit conversions fail at their public boundaries.
INPUTS / INPUT SOURCES
    Isolated project folders and synthetic RDF only.
EXPECTED OUTPUT
    Profiles survive ordinary operations and cannot silently change kind.
================================================================================
"""
import io
import json
import zipfile

import pytest
from fastapi.testclient import TestClient
from rdflib import Graph, Literal, Namespace, URIRef
from rdflib.namespace import OWL, RDF, SKOS

from app.editing import editing_service, project_store
from app.main import app
from app.projects import ProjectStore

GOV = Namespace("urn:semantic-studio:government:v1#")
ORG = Namespace("http://www.w3.org/ns/org#")
client = TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio": "1"})


@pytest.fixture(autouse=True)
def closed():
    yield
    editing_service.close_all()


def create(template="countries", **extra):
    reply = client.post("/api/projects", json={"name": "Synthetic groups", "template": template, **extra})
    assert reply.status_code == 200, reply.text
    return reply.json()


@pytest.mark.parametrize("template,profile", [
    ("countries", "countries-v1"), ("government-organizations", "government-organizations-v1"),
])
def test_templates_use_org_and_shared_domain_vocabulary(template, profile):
    result = create(template, name='Synthetic "group"\n日本', primaryLanguage="ja")
    assert result["domainProfile"] == {"id": profile, "version": 1}
    path = project_store.folder(result["id"])
    model = Graph().parse(path / "model.ttl", format="turtle")
    shapes = Graph().parse(path / "shapes.ttl", format="turtle")
    assert len(shapes) > 0
    assert not list(model.subjects(RDF.type, GOV.Country)), "No real countries seeded"
    assert not list(model.subjects(RDF.type, ORG.Organization))
    assert (URIRef(result["baseIri"].rstrip("#/")), SKOS.prefLabel,
            Literal('Synthetic "group" 日本', lang="ja")) in model
    assert (ORG.Organization, RDF.type, OWL.Class) not in model, "Shared definitions are not copied into each model"
    opened = client.post(f"/api/projects/{result['id']}/open")
    assert opened.status_code == 200, opened.text
    assert opened.json()["project"]["domainProfile"]["id"] == profile


def test_old_projects_have_no_implicit_profile():
    result = create("empty")
    assert "domainProfile" not in result
    assert "domainProfile" not in project_store.manifest(result["id"])


def test_country_and_org_iri_survive_rename_and_duplicate(tmp_path):
    from app.government.profile import new_entity_iri
    projects = ProjectStore(tmp_path)
    original = projects.create(name="Synthetic", template="countries")
    pid = original["id"]
    iri = new_entity_iri(original["baseIri"])
    graph = Graph().parse(projects.document_path(pid, "model"), format="turtle")
    graph.add((iri, RDF.type, GOV.Country))
    graph.add((iri, SKOS.prefLabel, Literal("Same name", lang="en")))
    graph.serialize(projects.document_path(pid, "model"), format="turtle")
    projects.rename(pid, "Renamed")
    duplicate = projects.duplicate(pid)
    copied = Graph().parse(projects.document_path(duplicate["id"], "model"), format="turtle")
    assert (iri, SKOS.prefLabel, Literal("Same name", lang="en")) in copied
    assert duplicate["domainProfile"] == {"id": "countries-v1", "version": 1}
    with zipfile.ZipFile(io.BytesIO(projects.export_zip(duplicate["id"]))) as archive:
        manifest_path = next(n for n in archive.namelist() if n.endswith("project.json"))
        assert json.loads(archive.read(manifest_path))["domainProfile"] == duplicate["domainProfile"]
    assert new_entity_iri(original["baseIri"]) != iri


def test_unknown_profile_is_preserved_read_only():
    result = create("empty")
    unknown = {"id": "future-profile", "version": 200, "extra": "keep"}
    project_store.update_manifest(result["id"], domainProfile=unknown)
    listing = client.get("/api/projects").json()
    assert next(p for p in listing if p["id"] == result["id"])["domainProfile"] == unknown
    opened = client.post(f"/api/projects/{result['id']}/open").json()
    assert opened["project"]["domainProfile"] == unknown
    from app.government.profile import parse_profile
    assert parse_profile(unknown) is None


def test_profile_kind_change_requires_explicit_detach():
    result = create()
    url = f"/api/projects/{result['id']}"
    refused = client.patch(url, json={"kind": "taxonomy"})
    assert refused.status_code == 422
    assert project_store.manifest(result["id"])["kind"] == "ontology"
    preview = client.patch(url, json={"domainProfile": None, "dryRun": True})
    assert preview.status_code == 200, preview.text
    assert preview.json()["dryRun"] is True
    assert project_store.manifest(result["id"])["domainProfile"]["id"] == "countries-v1"
    detached = client.patch(url, json={"domainProfile": None, "profileBasis": preview.json()["basis"], "kind": "taxonomy"})
    assert detached.status_code == 200, detached.text
    assert detached.json()["kind"] == "taxonomy"
    assert "domainProfile" not in detached.json()


@pytest.mark.parametrize("profile", [
    {"id": "future", "version": 1}, {"id": "countries-v1", "version": True},
    {"id": "countries-v1", "version": 2},
    {"id": "countries-v1", "version": 1, "countryProjectId": "prj-012345abcdef"},
    {"id": "government-organizations-v1", "version": 1},
])
def test_create_rejects_unknown_or_mismatched_profile(profile):
    before = {p["id"] for p in project_store.list()}
    reply = client.post("/api/projects", json={"name": "Bad", "template": "countries", "domainProfile": profile})
    assert reply.status_code == 422, reply.text
    assert {p["id"] for p in project_store.list()} == before


def test_reference_source_survives_duplicate_and_stale_profile_preview_refuses():
    country = create()
    organization = create("government-organizations", domainProfile={
        "id": "government-organizations-v1", "version": 1, "countryProjectId": country["id"],
    })
    copy = client.post(f"/api/projects/{organization['id']}/duplicate").json()
    assert copy["domainProfile"]["countryProjectId"] == country["id"]
    url = f"/api/projects/{organization['id']}"
    preview = client.patch(url, json={"domainProfile": None, "dryRun": True}).json()
    client.patch(url, json={"name": "Changed while previewing"})
    reply = client.patch(url, json={"domainProfile": None, "profileBasis": preview["basis"]})
    assert reply.status_code == 409
    assert project_store.manifest(organization["id"])["domainProfile"]["countryProjectId"] == country["id"]


def test_shared_vocabulary_is_detached_and_uses_org_classes():
    from app.government.profile import load_domain_vocabulary
    first = load_domain_vocabulary()
    assert (GOV.Country, RDF.type, OWL.Class) in first
    assert (ORG.Organization, RDF.type, OWL.Class) in first
    assert (GOV.ExistenceRecord, RDF.type, OWL.Class) in first
    first.remove((GOV.Country, None, None))
    assert (GOV.Country, RDF.type, OWL.Class) in load_domain_vocabulary()
