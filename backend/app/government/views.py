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
from collections import defaultdict
import hashlib
import json
from rdflib import Literal, URIRef
from rdflib.compare import to_isomorphic
from rdflib.namespace import RDF, SKOS
from ..graph_builder import pick_label_in
from .profile import GOV, ORG, DomainError, load_domain_vocabulary, parse_profile
from .records import existence_states, organizations, parse_date, period_json, period_state, project_at, read_existence, read_relations, read_names, read_changes
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


def countries(service, pid: str, q: str = "", offset: int = 0, limit: int = 50, displayLanguage: str | None = None, iri: str | None = None):
    with service.reference_lock:
        manifest = service.projects.manifest(pid)
        reference = country_reference(service, pid)
        return {**country_choices(reference.graph, query=q, offset=offset, limit=limit, languages=_languages(manifest, displayLanguage), exact_iri=iri), "basis": reference.basis}


def view(service, pid: str, at: str, offset: int = 0, limit: int = 50, displayLanguage: str | None = None, iri: str | None = None, q: str = "", recordIri: str | None = None, includeInactive: bool = True):
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
        names_history = read_names(graph)
        active_names = defaultdict(list)
        for record in names_history:
            if not record.unsupported and period_state(record.period, day) == 'active':
                active_names[(record.entity, record.language.casefold())].append(record.value)
        changes_history = read_changes(graph)
        items = []
        def name(iri):
            if reference and (URIRef(iri), RDF.type, GOV.Country) in reference.graph:
                return pick_label_in(reference.graph, URIRef(iri), languages)[0]
            return pick_label_in(projection.graph, URIRef(iri), languages)[0]
        needle = q.casefold()
        historical_values = defaultdict(list)
        for record in names_history:
            if record.entity and record.value:
                historical_values[record.entity].append(record.value)
        entity_matches = {}
        def matches_text(values):
            return not needle or any(needle in str(value).casefold() for value in values if value is not None)
        def matches_entity(entity):
            if not needle:
                return True
            if not entity:
                return False
            if entity not in entity_matches:
                node = URIRef(entity)
                values = [entity, name(entity), *historical_values[entity]]
                for dataset in (graph, reference.graph if reference else None):
                    if dataset is not None:
                        values.extend(str(value) for predicate in (SKOS.prefLabel, SKOS.altLabel, ORG.identifier, GOV.countryCode) for value in dataset.objects(node, predicate))
                entity_matches[entity] = matches_text(values)
            return entity_matches[entity]
        for node in organizations(graph):
            if iri is not None and str(node) != iri:
                continue
            if not includeInactive and states[str(node)] == "inactive":
                continue
            entity_iri = str(node)
            if not matches_entity(entity_iri):
                continue
            membership = [r for r in relations if not r.unsupported and r.subject == entity_iri and r.predicate == str(GOV.inCountry) and period_state(r.period, day) == "active"]
            country = membership[0].object if len(membership) == 1 else None
            life_records = [r for r in life if r.entity == entity_iri]
            all_country = [r for r in relations if r.subject == entity_iri and r.predicate == str(GOV.inCountry)]
            identifiers = list(graph.objects(node, ORG.identifier))
            label, label_language = pick_label_in(projection.graph, node, languages)
            applicable_names = active_names[(entity_iri, (label_language or '').casefold())]
            from .references import organization_field_problems
            unsupported = organization_field_problems(graph, node, life_records=life_records, country_records=all_country)
            source_records = all_country or life_records
            recorded_country = all_country[0].object if len(all_country) == 1 else None
            items.append({"iri": entity_iri, "label": label, "nameConfirmed": applicable_names == [label], "kind": next(str(t).split("#")[-1] for t in sorted(graph.objects(node, RDF.type), key=str) if t in {ORG.Organization, ORG.FormalOrganization, ORG.OrganizationalUnit}),
                          "countryIri": country, "countryLabel": name(country) if country else "",
                          "activeCountryResolved": bool(reference and country and (URIRef(country), RDF.type, GOV.Country) in reference.graph),
                          "countryResolved": bool(reference and recorded_country and (URIRef(recorded_country), RDF.type, GOV.Country) in reference.graph),
                          "existenceState": states[entity_iri], "existencePeriod": period_json(life_records[0].period) if len(life_records) == 1 else None,
                          "existenceSources": [{"kind": s.kind, "value": s.value} for s in life_records[0].sources] if len(life_records) == 1 else [],
                          "formCountryIri": recorded_country, "formCountryLabel": name(recorded_country) if recorded_country else "",
                          "countryPeriod": period_json(all_country[0].period) if len(all_country) == 1 else None,
                          "identifier": str(identifiers[0]) if identifiers else "",
                          "sources": [{"kind": s.kind, "value": s.value} for s in source_records[0].sources] if source_records else [],
                          "unsupported": unsupported,
                          "names": [{"value": str(value), "language": value.language or ""} for value in graph.objects(node, SKOS.prefLabel) if isinstance(value, Literal)]})
        items.sort(key=lambda row: (row["label"].casefold(), row["iri"]))
        def page(rows):
            return {"items": rows[offset:offset + limit], "total": len(rows), "offset": offset, "limit": limit}
        relation_rows = [{"iri": r.iri, "subject": r.subject, "predicate": r.predicate, "object": r.object,
                          "period": period_json(r.period), "sources": [{"kind": s.kind, "value": s.value} for s in r.sources],
                          "description": r.description, "state": period_state(r.period, day), "unsupported": list(r.unsupported),
                          "subjectLabel": name(r.subject) if r.subject else "", "objectLabel": name(r.object) if r.object else ""} for r in relations if (iri is None or iri in (r.subject, r.object)) and (recordIri is None or r.iri == recordIri)]
        name_rows = [{"iri": r.iri, "entity": r.entity, "entityLabel": name(r.entity) if r.entity else "", "value": r.value, "language": r.language,
                      "period": period_json(r.period), "sources": [{"kind": s.kind, "value": s.value} for s in r.sources],
                      "state": period_state(r.period, day), "unsupported": list(r.unsupported)}
                     for r in names_history if (recordIri is None or r.iri == recordIri) and (iri is None or r.entity == iri)]
        change_rows = [r for r in changes_history if (recordIri is None or r['iri'] == recordIri) and (iri is None or iri in r['originalIris'] + r['resultingIris'])]
        existence_rows = [{"iri": r.iri, "entity": r.entity, "entityLabel": name(r.entity) if r.entity else "", "period": period_json(r.period),
                           "sources": [{"kind": s.kind, "value": s.value} for s in r.sources], "unsupported": list(r.unsupported), "state": period_state(r.period, day)}
                          for r in life if (recordIri is None or r.iri == recordIri) and (iri is None or r.entity == iri)]
        def source_values(row):
            return [source['value'] for source in row['sources']]
        def period_values(row):
            return [row['period'][bound]['date'] for bound in ('start', 'end')]
        relation_rows = [row for row in relation_rows if matches_entity(row['subject']) or matches_entity(row['object']) or matches_text([row['iri'], row['description'], *source_values(row), *period_values(row)])]
        name_rows = [row for row in name_rows if matches_entity(row['entity']) or matches_text([row['iri'], row['value'], row['language'], *source_values(row), *period_values(row)])]
        change_rows = [row for row in change_rows if any(matches_entity(entity) for entity in row['originalIris'] + row['resultingIris']) or matches_text([row['iri'], row['kind'], row['effectiveDate'], row['description'], *source_values(row)])]
        existence_rows = [row for row in existence_rows if matches_entity(row['entity']) or matches_text([row['iri'], *source_values(row), *period_values(row)])]
        vocabulary = load_domain_vocabulary()
        kind_options = [{"value": str(kind).split("#")[-1], "iri": str(kind), "label": pick_label_in(vocabulary, kind, languages)[0]}
                        for kind in (ORG.Organization, ORG.FormalOrganization, ORG.OrganizationalUnit)]
        return {"at": at, "basis": basis, "organizations": page(items), "relations": page(relation_rows),
                "uncertain": page([r for r in relation_rows if r["state"] == "uncertain"]),
                "activeRelations": page([r for r in relation_rows if r["state"] == "active" and not r['unsupported'] and states.get(r['subject']) != 'inactive' and states.get(r['object']) != 'inactive']),
                "names": page(name_rows), "changes": page(change_rows), "existences": page(existence_rows),
                "diagnostics": [{"code": p.code, "severity": p.severity, "iri": p.iri, "args": p.args} for p in projection.diagnostics],
                "referenceBasis": reference.basis if reference else None, "kindOptions": kind_options}


def projection(service, pid: str, at: str):
    with service.reference_lock:
        manifest, graph, day, basis = _snapshot(service, pid, at)
        projected = project_at(graph, at=day)
        return {"turtle": projected.graph.serialize(format="turtle"), "at": at, "basis": basis}

