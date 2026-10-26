"""
================================================================================
FILE: backend/app/team/rdf_codec.py
================================================================================
SUMMARY
    Versioned typed JSON representation of RDF graphs for durable team state.
BASIC IDEA
    Construct RDF terms directly from validated data, never through a parser.
    Retain blank-node identifiers and literal lexical values, even ill-typed
    values already present in authored Turtle. Bind only supplied namespaces.
INPUTS / INPUT SOURCES
    - An rdflib Graph, or a version-1 dictionary of namespaces and typed triples.
EXPECTED OUTPUT
    - A JSON-ready dictionary or independent Graph with the same RDF terms.
================================================================================
"""
from __future__ import annotations

import json
import re
import logging
from contextlib import contextmanager
from contextvars import ContextVar
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.term import Identifier


_LANGUAGE = re.compile(r"[a-zA-Z]+(?:-[a-zA-Z0-9]+)*\Z", re.ASCII)
_PRIVATE_DIAGNOSTICS = ContextVar('team_private_rdf_diagnostics', default=False)


class _PrivateTermDiagnostics(logging.Filter):
    def filter(self, record):
        # rdflib retains ill-typed literals, but its conversion warning carries
        # authored values in exception text. Do not turn that private data into
        # a CLI/server log; other threads/contexts keep their ordinary logging.
        return not _PRIVATE_DIAGNOSTICS.get()


logging.getLogger('rdflib.term').addFilter(_PrivateTermDiagnostics())


@contextmanager
def private_rdf_diagnostics():
    token = _PRIVATE_DIAGNOSTICS.set(True)
    try:
        yield
    finally:
        _PRIVATE_DIAGNOSTICS.reset(token)


def _error() -> ValueError:
    # Payloads may contain private authored content; errors name no values.
    return ValueError("Invalid typed RDF graph payload")


def _decode_term(payload: object) -> Identifier:
    if not isinstance(payload, dict) or not isinstance(payload.get("value"), str):
        raise _error()
    kind, value = payload.get("type"), payload["value"]
    if kind in ("uri", "bnode"):
        if set(payload) != {"type", "value"} or (kind == "bnode" and not value):
            raise _error()
        return URIRef(value) if kind == "uri" else BNode(value)
    if kind != "literal" or set(payload) != {"type", "value", "language", "datatype"}:
        raise _error()
    language, datatype = payload["language"], payload["datatype"]
    if language is not None and (not isinstance(language, str) or not _LANGUAGE.fullmatch(language)):
        raise _error()
    if datatype is not None and (not isinstance(datatype, str) or not datatype):
        raise _error()
    if language is not None and datatype is not None:
        raise _error()
    # rdflib's default normalization would turn lexical "001" into "1".
    return Literal(value, lang=language, datatype=URIRef(datatype) if datatype is not None else None, normalize=False)


def _encode_term(term: Identifier) -> dict:
    if isinstance(term, URIRef):
        return {"type": "uri", "value": str(term)}
    if isinstance(term, BNode):
        return {"type": "bnode", "value": str(term)}
    if isinstance(term, Literal):
        return {"type": "literal", "value": str(term), "language": term.language,
                "datatype": str(term.datatype) if term.datatype is not None else None}
    raise _error()


def encode_graph(graph: Graph) -> dict:
    if not isinstance(graph, Graph):
        raise _error()
    triples = []
    for subject, predicate, obj in graph:
        if not isinstance(subject, (URIRef, BNode)) or not isinstance(predicate, URIRef):
            raise _error()
        triples.append([_encode_term(subject), _encode_term(predicate), _encode_term(obj)])
    # Graph iteration reflects insertion/store details, not durable content.
    triples.sort(key=lambda triple: json.dumps(triple, sort_keys=True, ensure_ascii=False))
    namespaces = sorted([[prefix, str(iri)] for prefix, iri in graph.namespaces()])
    return {"version": 1, "namespaces": namespaces, "triples": triples}


@private_rdf_diagnostics()
def decode_graph(payload: dict) -> Graph:
    if (not isinstance(payload, dict) or set(payload) != {"version", "namespaces", "triples"}
            or type(payload["version"]) is not int or payload["version"] != 1
            or not isinstance(payload["namespaces"], list) or not isinstance(payload["triples"], list)):
        raise _error()
    graph = Graph(bind_namespaces="none")
    prefixes = set()
    namespace_iris = set()
    for binding in payload["namespaces"]:
        if (not isinstance(binding, list) or len(binding) != 2
                or not all(isinstance(value, str) for value in binding)
                or binding[0] in prefixes or binding[1] in namespace_iris):
            raise _error()
        prefixes.add(binding[0])
        # rdflib stores one prefix per namespace IRI, so aliases would silently
        # disappear on re-encoding. Refuse that lossy payload at the boundary.
        namespace_iris.add(binding[1])
        graph.bind(binding[0], URIRef(binding[1]), replace=True)
    for triple in payload["triples"]:
        if not isinstance(triple, list) or len(triple) != 3:
            raise _error()
        subject, predicate, obj = (_decode_term(term) for term in triple)
        if not isinstance(subject, (URIRef, BNode)) or not isinstance(predicate, URIRef):
            raise _error()
        graph.add((subject, predicate, obj))
    return graph
