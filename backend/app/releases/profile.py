"""
FILE: backend/app/releases/profile.py
SUMMARY
    The sole dictionary-v1 extraction rule, without RDF mutation.
BASIC IDEA
    Retain named-subject statements with explicitly permitted predicates and
    nonblank objects. Namespace bindings from private sources never escape.
INPUTS / INPUT SOURCES
    A project's accepted own model Graph.
EXPECTED OUTPUT
    A detached public graph, counts and explicit exclusion reasons.
"""
from dataclasses import dataclass
from rdflib import Graph, URIRef, Literal
from rdflib.namespace import RDF, RDFS, SKOS

MAX_STATEMENTS = 100_000
PROFILE_ID = 'dictionary-v1'
PROFILE_VERSION = 1
ALLOWED = frozenset((RDF.type, RDFS.label, RDFS.subClassOf, RDFS.subPropertyOf,
    RDFS.domain, RDFS.range, SKOS.prefLabel, SKOS.altLabel, SKOS.hiddenLabel,
    SKOS.definition, SKOS.broader, SKOS.narrower, SKOS.related, SKOS.inScheme,
    SKOS.topConceptOf, SKOS.hasTopConcept))

class ReleaseError(Exception):
    def __init__(self, code='invalid', status=422):
        self.code, self.status = code, status
        super().__init__(code)

@dataclass(frozen=True)
class Projection:
    graph: Graph
    entity_count: int
    statement_count: int
    excluded_by_reason: dict


def project_graph(graph: Graph) -> Projection:
    if len(graph) > MAX_STATEMENTS:
        raise ReleaseError('too_large', 413)
    public = Graph(bind_namespaces='none')
    excluded = {}
    for s, p, o in graph:
        reason = 'predicate' if p not in ALLOWED else 'blankNode' if not isinstance(s, URIRef) or not isinstance(o, (URIRef, Literal)) else None
        if reason:
            excluded[reason] = excluded.get(reason, 0) + 1
        else:
            public.add((s, p, o))
    return Projection(public, len(set(public.subjects())), len(public), excluded)
