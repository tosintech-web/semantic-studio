"""
================================================================================
FILE: backend/app/government/views.py
SUMMARY
    Projects accepted government records into paged, explicitly dated read views.
BASIC IDEA
    Keep RDF traversal and authority resolution outside HTTP routers. Country
    loss never erases an organization's original reference or historical record.
INPUTS / INPUT SOURCES
    Editing service snapshots, dates, pagination and display languages.
EXPECTED OUTPUT
    Candidate pages, dated view DTOs and Turtle data with its source basis.
================================================================================
"""
import hashlib
import json
from rdflib import Literal, URIRef
from rdflib.compare import to_isomorphic
from rdflib.namespace import RDF, SKOS
from ..graph_builder import pick_label_in
from .profile import GOV, DomainError, parse_profile
from .records import existence_states, organizations, parse_date, period_json, period_state, project_at, read_existence, read_relations
from .references import country_choices, country_reference, project_snapshot

MAX_PROJECTION_STATEMENTS = 100_000


def _languages(manifest, language):
    return [language, manifest.get("primaryLanguage", "en"), *manifest.get("languages", [])] if language else [manifest.get("primaryLanguage", "en"), *manifest.get("languages", [])]


def _snapshot(service, pid, at):
    try:
        day = parse_date(at)
    except ValueError as exc:
        raise DomainError("Choose an exact date.", code="government.period_invalid") from exc
    manifest, graph = project_snapshot(service, pid)
    profile = parse_profile(manifest.get("domainProfile"))
    if profile is None or profile.id != "government-organizations-v1":
        raise DomainError("Choose a government organization group.", code="government.invalid_profile")
    if len(graph) > MAX_PROJECTION_STATEMENTS:
        raise DomainError("The dated view supports at most 100000 statements.", code="government.projection_limit", status=413)
    basis = hashlib.sha256((pid + at + str(to_isomorphic(graph).graph_digest()) + json.dumps(profile.as_dict(), sort_keys=True)).encode()).hexdigest()
    return manifest, graph, day, basis


def countries(service, pid: str, q: str = "", offset: int = 0, limit: int = 50, displayLanguage: str | None = None):
    with service.reference_lock:
        manifest = service.projects.manifest(pid)
        reference = country_reference(service, pid)
        return {**country_choices(reference.graph, query=q, offset=offset, limit=limit, languages=_languages(manifest, displayLanguage)), "basis": reference.basis}


def view(service, pid: str, at: str, offset: int = 0, limit: int = 50, displayLanguage: str | None = None):
    with service.reference_lock:
        manifest, graph, day, basis = _snapshot(service, pid, at)
        projection = project_at(graph, at=day)
        languages = _languages(manifest, displayLanguage)
        reference = None
        try:
            reference = country_reference(service, pid)
        except DomainError:
            pass  # The recorded IRI remains inspectable when its source goes away.
        basis = hashlib.sha256((basis + json.dumps(reference.basis if reference else None, sort_keys=True)).encode()).hexdigest()
        states = existence_states(graph, at=day)
        life = read_existence(graph)
        relations = read_relations(graph)
        items = []
        def name(iri):
            if reference and (URIRef(iri), RDF.type, GOV.Country) in reference.graph:
                return pick_label_in(reference.graph, URIRef(iri), languages)[0]
            return pick_label_in(projection.graph, URIRef(iri), languages)[0]
        for node in organizations(graph):
            iri = str(node)
            membership = [r for r in relations if not r.unsupported and r.subject == iri and r.predicate == str(GOV.inCountry) and period_state(r.period, day) == "active"]
            country = membership[0].object if len(membership) == 1 else None
            life_records = [r for r in life if r.entity == iri]
            items.append({"iri": iri, "label": name(iri), "kind": next(str(t).split("#")[-1] for t in sorted(graph.objects(node, RDF.type), key=str) if t in {URIRef("http://www.w3.org/ns/org#Organization"), URIRef("http://www.w3.org/ns/org#FormalOrganization"), URIRef("http://www.w3.org/ns/org#OrganizationalUnit")}),
                          "countryIri": country, "countryLabel": name(country) if country else "", "countryResolved": bool(reference and country and (URIRef(country), RDF.type, GOV.Country) in reference.graph),
                          "existenceState": states[iri], "existencePeriod": period_json(life_records[0].period) if len(life_records) == 1 else None,
                          "names": [{"value": str(value), "language": value.language or ""} for value in graph.objects(node, SKOS.prefLabel) if isinstance(value, Literal)]})
        items.sort(key=lambda row: (row["label"].casefold(), row["iri"]))
        def page(rows):
            return {"items": rows[offset:offset + limit], "total": len(rows), "offset": offset, "limit": limit}
        relation_rows = [{"iri": r.iri, "subject": r.subject, "predicate": r.predicate, "object": r.object,
                          "period": period_json(r.period), "sources": [{"kind": s.kind, "value": s.value} for s in r.sources],
                          "description": r.description, "state": period_state(r.period, day), "unsupported": list(r.unsupported),
                          "subjectLabel": name(r.subject) if r.subject else "", "objectLabel": name(r.object) if r.object else ""} for r in relations]
        return {"at": at, "basis": basis, "organizations": page(items), "relations": page(relation_rows),
                "uncertain": page([r for r in relation_rows if r["state"] == "uncertain"]),
                "diagnostics": [{"code": p.code, "severity": p.severity, "iri": p.iri, "args": p.args} for p in projection.diagnostics],
                "referenceBasis": reference.basis if reference else None}


def projection(service, pid: str, at: str):
    with service.reference_lock:
        manifest, graph, day, basis = _snapshot(service, pid, at)
        projected = project_at(graph, at=day)
        return {"turtle": projected.graph.serialize(format="turtle"), "at": at, "basis": basis}

