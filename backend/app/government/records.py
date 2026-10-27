"""
================================================================================
FILE: backend/app/government/records.py
SUMMARY
    Reads dated government records and builds detached, date-specific views.
BASIC IDEA
    Missing dates are unknown, while explicit open bounds mean unbounded.
    Unsupported RDF remains untouched and read-only. A projection contains only
    determinate relationships and annotates organizational existence separately.
INPUTS / INPUT SOURCES
    Accepted project RDF, strict ISO dates and typed period payloads.
EXPECTED OUTPUT
    Immutable record DTOs, three-valued periods and a detached projection graph.
================================================================================
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
import re
from typing import Literal as StateLiteral

from rdflib import Graph, Literal, URIRef
from rdflib.namespace import DCTERMS, OWL, RDF, RDFS, SKOS, XSD

from .profile import GOV, ORG

RELATION_PREDICATES = frozenset((GOV.inCountry, ORG.unitOf, ORG.subOrganizationOf, GOV.supervisedBy, GOV.cooperatesWith))
ORGANIZATION_TYPES = frozenset((ORG.Organization, ORG.FormalOrganization, ORG.OrganizationalUnit))
RECORD_TYPES = frozenset((GOV.RelationRecord, GOV.NameRecord, GOV.ExistenceRecord))
PERIOD_PREDICATES = frozenset((GOV.validFrom, GOV.validUntil, GOV.openStart, GOV.openEnd))
COMMON_PREDICATES = PERIOD_PREDICATES | {RDF.type, DCTERMS.source}
State = StateLiteral["active", "inactive", "uncertain"]


@dataclass(frozen=True)
class Bound:
    date: date | None = None
    open: bool = False


@dataclass(frozen=True)
class Period:
    start: Bound = field(default_factory=Bound)
    end: Bound = field(default_factory=Bound)


@dataclass(frozen=True)
class Source:
    kind: str
    value: str


@dataclass(frozen=True)
class RelationRecord:
    iri: str
    subject: str | None
    predicate: str | None
    object: str | None
    period: Period
    sources: tuple[Source, ...]
    description: str = ""
    unsupported: tuple[str, ...] = ()


@dataclass(frozen=True)
class NameRecord:
    iri: str
    entity: str | None
    value: str | None
    language: str | None
    period: Period
    sources: tuple[Source, ...]
    unsupported: tuple[str, ...] = ()


@dataclass(frozen=True)
class ExistenceRecord:
    iri: str
    entity: str | None
    period: Period
    sources: tuple[Source, ...]
    unsupported: tuple[str, ...] = ()


@dataclass(frozen=True)
class Problem:
    code: str
    severity: str
    iri: str
    args: dict = field(default_factory=dict)


@dataclass
class Projection:
    graph: Graph
    uncertain: list[RelationRecord]
    diagnostics: list[Problem]


def parse_date(value: str) -> date:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("Use an exact ISO calendar date")
    return date.fromisoformat(value)


def parse_period(raw: dict) -> Period:
    if not isinstance(raw, dict) or set(raw) != {"start", "end"}:
        raise ValueError("A period needs start and end bounds")
    bounds = []
    for key in ("start", "end"):
        item = raw[key]
        if not isinstance(item, dict) or set(item) != {"date", "open"} or type(item["open"]) is not bool:
            raise ValueError("Choose a date, an open bound, or an unknown bound")
        when = None if item["date"] is None else parse_date(item["date"])
        if when is not None and item["open"]:
            raise ValueError("A dated bound cannot also be open")
        bounds.append(Bound(when, item["open"]))
    period = Period(*bounds)
    if period.start.date is not None and period.end.date is not None and period.start.date >= period.end.date:
        raise ValueError("A period ends after its start")
    return period


def period_json(period: Period) -> dict:
    return {key: {"date": bound.date.isoformat() if bound.date is not None else None, "open": bound.open}
            for key, bound in (("start", period.start), ("end", period.end))}


def period_state(period: Period, at: date) -> State:
    # A known exclusion dominates an unknown opposite bound: an organization
    # not yet created is not uncertain merely because its end is unknown.
    if period.start.date is not None and at < period.start.date:
        return "inactive"
    if period.end.date is not None and at >= period.end.date:
        return "inactive"
    if any(bound.date is None and not bound.open for bound in (period.start, period.end)):
        return "uncertain"
    return "active"


def period_statements(node: URIRef, period: Period) -> set:
    result = set()
    for bound, dated, opened in ((period.start, GOV.validFrom, GOV.openStart), (period.end, GOV.validUntil, GOV.openEnd)):
        if bound.date is not None:
            result.add((node, dated, Literal(bound.date.isoformat(), datatype=XSD.date)))
        elif bound.open:
            result.add((node, opened, Literal(True)))
    return result


def _one(graph, node, predicate, problems, *, required=False, kind=None):
    values = list(graph.objects(node, predicate))
    if len(values) > 1 or (required and not values):
        problems.append(str(predicate))
        return None
    if not values:
        return None
    value = values[0]
    if kind is not None and not isinstance(value, kind):
        problems.append(str(predicate))
        return None
    return value


def _period(graph, node, problems):
    raw = {}
    for key, dated, opened in (("start", GOV.validFrom, GOV.openStart), ("end", GOV.validUntil, GOV.openEnd)):
        when = _one(graph, node, dated, problems, kind=Literal)
        flag = _one(graph, node, opened, problems, kind=Literal)
        if when is not None and when.datatype != XSD.date:
            problems.append(str(dated))
        if flag is not None and (flag.datatype != XSD.boolean or str(flag) not in {"true", "false", "1", "0"}):
            problems.append(str(opened))
        raw[key] = {"date": str(when) if when is not None else None, "open": flag.toPython() is True if flag is not None else False}
    try:
        return parse_period(raw)
    except ValueError:
        problems.append("period")
        return Period()


def _common(graph, node, record_type, allowed):
    problems = []
    if not isinstance(node, URIRef):
        problems.append("named-record")
    if set(graph.objects(node, RDF.type)) - {record_type, OWL.NamedIndividual}:
        problems.append("record-type")
    problems.extend(str(p) for p in set(graph.predicates(node)) - COMMON_PREDICATES - allowed)
    sources = []
    for value in sorted(graph.objects(node, DCTERMS.source), key=lambda v: v.n3()):
        if isinstance(value, URIRef):
            sources.append(Source("iri", str(value)))
        elif isinstance(value, Literal) and value.language is None and value.datatype in (None, XSD.string):
            sources.append(Source("text", str(value)))
        else:
            problems.append("source")
    if not sources:
        problems.append("source")
    return problems, tuple(sources), _period(graph, node, problems)


def read_relations(graph: Graph) -> list[RelationRecord]:
    records = []
    for node in sorted(set(graph.subjects(RDF.type, GOV.RelationRecord)), key=str):
        problems, sources, period = _common(graph, node, GOV.RelationRecord, {GOV.subject, GOV.predicate, GOV.object, DCTERMS.description})
        ends = [_one(graph, node, p, problems, required=True, kind=URIRef) for p in (GOV.subject, GOV.predicate, GOV.object)]
        if ends[1] is not None and ends[1] not in RELATION_PREDICATES:
            problems.append("predicate")
        description = _one(graph, node, DCTERMS.description, problems, kind=Literal)
        records.append(RelationRecord(str(node), *(str(e) if e is not None else None for e in ends),
                                      period, sources, str(description) if description is not None else "", tuple(sorted(set(problems)))))
    return records


def read_names(graph: Graph) -> list[NameRecord]:
    records = []
    for node in sorted(set(graph.subjects(RDF.type, GOV.NameRecord)), key=str):
        problems, sources, period = _common(graph, node, GOV.NameRecord, {GOV.entity, GOV.nameValue})
        entity = _one(graph, node, GOV.entity, problems, required=True, kind=URIRef)
        value = _one(graph, node, GOV.nameValue, problems, required=True, kind=Literal)
        if value is not None and value.datatype not in (None, RDF.langString, XSD.string):
            problems.append("name-value")
        records.append(NameRecord(str(node), str(entity) if entity is not None else None,
                                  str(value) if value is not None else None, value.language if value is not None else None,
                                  period, sources, tuple(sorted(set(problems)))))
    return records


def read_existence(graph: Graph) -> list[ExistenceRecord]:
    records = []
    for node in sorted(set(graph.subjects(RDF.type, GOV.ExistenceRecord)), key=str):
        problems, sources, period = _common(graph, node, GOV.ExistenceRecord, {GOV.entity})
        entity = _one(graph, node, GOV.entity, problems, required=True, kind=URIRef)
        records.append(ExistenceRecord(str(node), str(entity) if entity is not None else None, period, sources, tuple(sorted(set(problems)))))
    return records


def organizations(graph: Graph) -> list[URIRef]:
    return sorted({s for t in ORGANIZATION_TYPES for s in graph.subjects(RDF.type, t) if isinstance(s, URIRef)}, key=str)


def existence_states(graph: Graph, *, at: date) -> dict[str, State]:
    records = read_existence(graph)
    grouped = {}
    for record in records:
        grouped.setdefault(record.entity, []).append(record)
    return {str(entity): period_state(grouped[str(entity)][0].period, at)
            if len(grouped.get(str(entity), [])) == 1 and not grouped[str(entity)][0].unsupported else "uncertain"
            for entity in organizations(graph)}


def project_at(graph: Graph, *, at: date) -> Projection:
    if len(graph) > 100_000:
        raise ValueError("The projection supports at most 100000 statements")
    projected = Graph()
    for prefix, namespace in graph.namespaces():
        projected.bind(prefix, namespace)
    record_nodes = {s for t in RECORD_TYPES for s in graph.subjects(RDF.type, t)}
    for statement in graph:
        if statement[0] not in record_nodes:
            projected.add(statement)
    states = existence_states(graph, at=at)
    for entity, state in states.items():
        projected.remove((URIRef(entity), GOV.existenceState, None))
        projected.add((URIRef(entity), GOV.existenceState, Literal(state)))
    uncertain, diagnostics = [], []
    for record in read_relations(graph):
        if record.unsupported:
            diagnostics.append(Problem("government.record_unsupported", "warning", record.iri))
            continue
        state = period_state(record.period, at)
        if state == "uncertain":
            uncertain.append(record)
        elif state == "active":
            if any(states.get(end) == "inactive" for end in (record.subject, record.object)):
                diagnostics.append(Problem("government.inactive_endpoint", "warning", record.iri))
            else:
                projected.add((URIRef(record.subject), URIRef(record.predicate), URIRef(record.object)))
    # Group before replacing labels so two overlapping names are reported,
    # rather than letting iteration order choose a historical name.
    names = {}
    for record in read_names(graph):
        if record.unsupported:
            diagnostics.append(Problem("government.record_unsupported", "warning", record.iri))
        elif period_state(record.period, at) == "active":
            names.setdefault((record.entity, (record.language or "").casefold()), []).append(record)
    for (entity, language), choices in names.items():
        if len(choices) != 1:
            diagnostics.append(Problem("government.name_overlap", "warning", entity))
            continue
        for value in list(projected.objects(URIRef(entity), SKOS.prefLabel)):
            if isinstance(value, Literal) and (value.language or "").casefold() == language:
                projected.remove((URIRef(entity), SKOS.prefLabel, value))
        projected.add((URIRef(entity), SKOS.prefLabel, Literal(choices[0].value, lang=choices[0].language)))
    return Projection(projected, uncertain, diagnostics)
