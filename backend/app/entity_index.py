"""
================================================================================
FILE: backend/app/entity_index.py
SUMMARY
    Complete, immutable search values independently of the drawn graph budget.
BASIC IDEA
    Named subjects and pre-budget visual references form the entity set. Only
    explicitly approved name/alias/reading/identifier predicates are indexed.
    Normalized keys never replace RDF literals; tie-breaks are deterministic.
INPUTS / INPUT SOURCES
    A consistent read graph and its unbudgeted graph-node descriptors.
EXPECTED OUTPUT
    An EntityIndex and ranked matches with the complete original matched value.
================================================================================
"""
from __future__ import annotations

from dataclasses import dataclass
from types import MappingProxyType
from typing import Mapping
import unicodedata

from rdflib import Graph, Literal, Namespace, SKOS, URIRef
from .graph_builder import LABEL_PREDICATES, _local_name, node_kind, preferred_literal

V = Namespace('https://example.org/semantic-studio/crawler-organizations/vocab#')
# One URI-based correspondence. Import file formats have no role in search.
SEARCH_FIELDS = {
    **{predicate: 'name' for predicate in LABEL_PREDICATES},
    SKOS.altLabel: 'alias', SKOS.hiddenLabel: 'alias',
    V.originalName: 'alias', V.abbreviation: 'alias',
    V.nameReading: 'reading', V.searchAlias: 'search', V.sourceOrgId: 'identifier',
}
REASON_ORDER = {'name': 0, 'alias': 1, 'reading': 2, 'search': 3, 'identifier': 4}


def normalize_query(text: str) -> str:
    return unicodedata.normalize('NFKC', text).casefold().strip()


@dataclass(frozen=True)
class SearchValue:
    reason: str
    value: str
    normalized: str


@dataclass(frozen=True)
class Entity:
    iri: str
    kind: str
    reference_only: bool
    names: tuple[tuple[int, Literal], ...]
    fields: tuple[SearchValue, ...]
    degree: int = 0
    class_type: str | None = None

    def display_name(self, languages: tuple[str, ...] | None) -> str:
        value = preferred_literal(self.names, languages)
        return str(value) if value is not None else _local_name(self.iri)


@dataclass(frozen=True)
class EntityIndex:
    entities: Mapping[str, Entity]


@dataclass(frozen=True)
class EntityMatch:
    iri: str
    reason: str
    value: str
    rank: tuple[int, str, str]


def build_entity_index(graph: Graph, graph_nodes: list[dict]) -> EntityIndex:
    subjects = {s for s in graph.subjects() if isinstance(s, URIRef)}
    drawn = {node['id']: node for node in graph_nodes if isinstance(node.get('id'), str) and not node['id'].startswith('_:')}
    entities = {}
    for iri in subjects | {URIRef(iri) for iri in drawn}:
        key = str(iri)
        names = tuple((i, value) for i, predicate in enumerate(LABEL_PREDICATES)
                      for value in graph.objects(iri, predicate) if isinstance(value, Literal))
        values = {(reason, str(value)) for predicate, reason in SEARCH_FIELDS.items()
                  for value in graph.objects(iri, predicate) if isinstance(value, Literal)}
        values.add(('identifier', key))
        fields = tuple(SearchValue(reason, value, normalize_query(value)) for reason, value in sorted(values))
        # Most resources already have a kind from the full graph pass. Only
        # omitted subjects or unknown visual references need the shared reader.
        kind = drawn.get(key, {}).get('kind')
        if not kind or kind == 'other':
            kind = node_kind(graph, iri)
        entities[key] = Entity(key, kind, iri not in subjects, names, fields,
                               drawn.get(key, {}).get("degree", 0), drawn.get(key, {}).get("classType"))
    return EntityIndex(MappingProxyType(entities))


def rank_matches(index: EntityIndex, query: str, languages: tuple[str, ...] | None) -> list[EntityMatch]:
    query = normalize_query(query)
    if not query:
        return []
    matches = []
    for entity in index.entities.values():
        candidates = []
        for field in entity.fields:
            if query not in field.normalized:
                continue
            if field.reason == 'identifier':
                tier = 4
            elif field.reason == 'name':
                tier = 0 if field.normalized == query else 1 if field.normalized.startswith(query) else 3
            else:
                tier = 2 if field.normalized.startswith(query) else 3
            candidates.append((tier, REASON_ORDER[field.reason], field.value, field))
        if not candidates:
            continue
        tier, _, _, field = min(candidates, key=lambda candidate: candidate[:3])
        matches.append(EntityMatch(entity.iri, field.reason, field.value,
                                   (tier, normalize_query(entity.display_name(languages)), entity.iri)))
    return sorted(matches, key=lambda match: match.rank)
