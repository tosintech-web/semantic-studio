"""
================================================================================
FILE: backend/tests/test_team_rdf_codec.py
================================================================================
SUMMARY
    Lossless typed RDF persistence and malformed-input rejection.
BASIC IDEA
    Compare independent RDF terms and reject ambiguous JSON values.
INPUTS / INPUT SOURCES
    - Small in-memory graphs and typed payloads.
EXPECTED OUTPUT
    - Preserved lexical forms and namespaces without parser calls or mutation.
================================================================================
"""
from copy import deepcopy
import json

import pytest
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.namespace import XSD

from app.team.rdf_codec import decode_graph, encode_graph

S = URIRef("http://example.org/subject")
P = URIRef("http://example.org/unknown")


def test_round_trip_preserves_terms_namespaces_and_blank_identity():
    graph = Graph(bind_namespaces="none")
    graph.bind("", "http://example.org/")
    graph.bind("日本", "http://example.org/日本/")
    blank = BNode("stable-blank")
    for obj in [blank, Literal("日本語\n雪", lang="ja"), Literal("001", datatype=XSD.integer, normalize=False),
                Literal("not-integer", datatype=XSD.integer, normalize=False),
                Literal("", datatype=URIRef("http://example.org/type"), normalize=False), Literal("plain")]:
        graph.add((S, P, obj))
    graph.add((blank, P, S))
    original = set(graph)
    payload = encode_graph(graph)
    before = deepcopy(payload)
    decoded = decode_graph(json.loads(json.dumps(payload, ensure_ascii=False)))
    assert set(decoded) == original
    assert set(decoded.namespaces()) == set(graph.namespaces())
    assert (BNode("stable-blank"), P, S) in decoded
    assert Literal("001", datatype=XSD.integer, normalize=False) in decoded.objects(S, P)
    assert payload == before
    decoded.remove((S, P, None))
    assert set(graph) == original


def test_empty_graph_has_no_added_namespace_bindings():
    assert list(decode_graph(encode_graph(Graph(bind_namespaces="none"))).namespaces()) == []


def valid_payload():
    return {"version": 1, "namespaces": [["ex", "http://example.org/"]], "triples": [[
        {"type": "uri", "value": str(S)}, {"type": "uri", "value": str(P)},
        {"type": "literal", "value": "雪", "language": "ja", "datatype": None}]]}


@pytest.mark.parametrize("payload", [None, [], {}, {"version": True, "namespaces": [], "triples": []},
    {"version": 1.0, "namespaces": [], "triples": []}, {"version": 2, "namespaces": [], "triples": []},
    {"version": 1, "namespaces": {}, "triples": []}, {"version": 1, "namespaces": [], "triples": {}},
    {"version": 1, "namespaces": [], "triples": [], "extra": 1}])
def test_malformed_envelope_is_rejected(payload):
    with pytest.raises(ValueError):
        decode_graph(payload)


@pytest.mark.parametrize("term", [None, [], {}, {"type": "unknown", "value": "x"},
    {"type": "uri", "value": True}, {"type": "bnode", "value": 2}, {"type": "bnode", "value": ""},
    {"type": "uri", "value": "x", "extra": 1}, {"type": "literal", "value": "x"},
    {"type": "literal", "value": 1, "language": None, "datatype": None},
    {"type": "literal", "value": "x", "language": True, "datatype": None},
    {"type": "literal", "value": "x", "language": "", "datatype": None},
    {"type": "literal", "value": "x", "language": "bad_tag", "datatype": None},
    {"type": "literal", "value": "x", "language": "ja", "datatype": "http://example.org/type"},
    {"type": "literal", "value": "x", "language": None, "datatype": False}])
def test_malformed_terms_are_rejected_without_mutation(term):
    payload = valid_payload()
    payload["triples"][0][2] = term
    before = deepcopy(payload)
    with pytest.raises(ValueError):
        decode_graph(payload)
    assert payload == before


@pytest.mark.parametrize("position", [0, 1])
def test_literal_subject_and_predicate_are_rejected(position):
    payload = valid_payload()
    payload["triples"][0][position] = payload["triples"][0][2]
    with pytest.raises(ValueError):
        decode_graph(payload)


def test_blank_predicate_is_rejected():
    payload = valid_payload()
    payload["triples"][0][1] = {"type": "bnode", "value": "b"}
    with pytest.raises(ValueError):
        decode_graph(payload)


@pytest.mark.parametrize("field,value", [("triples", [[]]), ("triples", [[{}, {}]]),
    ("namespaces", [["ex"]]), ("namespaces", [[True, "http://example.org/"]]), ("namespaces", [["ex", False]]),
    ("namespaces", [["ex", "http://example.org/"], ["ex", "http://example.org/other/"]])])
def test_malformed_triples_and_namespaces_are_rejected(field, value):
    payload = valid_payload()
    payload[field] = value
    with pytest.raises(ValueError):
        decode_graph(payload)


def test_codec_uses_no_rdf_parser(monkeypatch):
    def refused(*args, **kwargs):
        raise AssertionError("No parser or network-capable load allowed")
    monkeypatch.setattr(Graph, "parse", refused)
    assert (S, P, Literal("雪", lang="ja")) in decode_graph(valid_payload())


def test_encoding_has_stable_namespace_and_term_order():
    graph = Graph(bind_namespaces="none")
    graph.bind("z", "http://example.org/z/")
    graph.bind("a", "http://example.org/a/")
    graph.add((S, P, Literal("z")))
    graph.add((S, P, Literal("a")))
    payload = encode_graph(graph)
    assert payload["namespaces"] == [["a", "http://example.org/a/"], ["z", "http://example.org/z/"]]
    assert [triple[2]["value"] for triple in payload["triples"]] == ["a", "z"]


def test_duplicate_namespace_iri_is_rejected_instead_of_losing_an_alias():
    payload = valid_payload()
    payload["namespaces"] = [["a", "urn:shared:"], ["b", "urn:shared:"]]
    before = deepcopy(payload)
    with pytest.raises(ValueError):
        decode_graph(payload)
    assert payload == before
