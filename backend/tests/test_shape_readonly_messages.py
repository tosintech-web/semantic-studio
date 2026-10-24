"""
================================================================================
FILE: backend/tests/test_shape_readonly_messages.py
SUMMARY
    Read-only shape explanations keep original strings and exact RDF values.
BASIC IDEA
    Exercise the actual unsupported-form branches, aligned metadata after
    deduplication and the editor's integer-precision boundary without changing RDF.
INPUTS / INPUT SOURCES
    Synthetic Turtle, technical predicates, multilingual labels and large counts.
EXPECTED OUTPUT
    Complete source facts, unchanged graphs and Turtle fallback for unsafe counts.
================================================================================
"""
import pytest
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.namespace import RDF, RDFS
from app import shapes_form
from app.messages import make_message

EX = "https://example.test/"
PREFIXES = '''@prefix ex: <https://example.test/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
'''
MODEL = Graph().parse(data=PREFIXES + 'ex:C a owl:Class . ex:p a owl:DatatypeProperty ; rdfs:label "項目 <b>{path}"@ja .', format="turtle")
NAMES = lambda node: shapes_form.pick_label_in(MODEL, node, ["ja", "en"])[0]
BASE = 'a sh:NodeShape ; sh:targetClass ex:C ; '
CASES = [
    (BASE + 'sh:or ( [ sh:path ex:p ] )', 'uses_predicate', {"predicate": "sh:or"}),
    (BASE + 'sh:property ex:R', 'rule_reference', {"rule": "ex:R"}),
    (BASE + 'sh:property [ sh:path ( ex:p ex:q ) ; sh:minCount 1 ]', 'path', {}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:qualifiedValueShape [ sh:class ex:C ] ; sh:qualifiedMinCount 1 ]', 'uses_predicate', {"predicate": "sh:qualifiedValueShape"}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:flags "i" ]', 'uses_predicate', {"predicate": "sh:flags"}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:minCount 1 ], [ sh:path ex:p ; sh:maxCount 2 ]', 'duplicate_path', {"path": [{"text": "項目 <b>{path}"}]}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:minCount -1 ]', 'predicate_value', {"predicate": "sh:minCount"}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:datatype xsd:gYear ]', 'datatype', {"datatype": "xsd:gYear"}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:class [ owl:unionOf ( ex:C ex:D ) ] ]', 'class_expression', {}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:maxInclusive ex:C ]', 'predicate_value', {"predicate": "sh:maxInclusive"}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:in "broken list" ]', 'allowed_list', {}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:in ( "2026"^^xsd:gYear ) ]', 'allowed_type', {}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:languageIn "broken list" ]', 'language_list', {}),
    ('a sh:NodeShape, owl:Class ; sh:targetClass ex:C', 'additional_types', {"types": [{"text": "owl:Class"}]}),
    ('a sh:NodeShape, ex:Other ; sh:targetClass ex:C', 'additional_types', {"types": [{"text": "ex:Other"}]}),
    ('a sh:NodeShape ; sh:targetClass ex:C, ex:D', 'multiple_targets', {"count": 2}),
    ('a sh:NodeShape ; sh:targetClass [ owl:unionOf ( ex:C ex:D ) ]', 'target_expression', {}),
    (BASE + 'sh:message "one", "two"', 'multiple_messages', {"count": 2}),
    (BASE + 'sh:property [ sh:path ex:p ; sh:minCount 1 ; sh:severity sh:Warning ]', 'rule_severity', {}),
    (BASE + 'sh:severity sh:Info', 'severity', {"severity": "sh:Info"}),
]


def read(body):
    graph = Graph().parse(data=PREFIXES + 'ex:S ' + body + ' .', format="turtle")
    before = set(graph), set(MODEL)
    shape = shapes_form.read_shape(graph, URIRef(EX + "S"), MODEL, NAMES, ["ja", "en"])
    assert (set(graph), set(MODEL)) == before
    return shape


@pytest.mark.parametrize("body,key,args", CASES)
def test_owned_readonly_reasons_add_exact_aligned_facts(body, key, args):
    shape = read(body)
    assert not shape["editable"] and all(isinstance(part, str) for part in shape["unsupported"])
    metadata = shape.get("unsupportedUiMessages")
    assert metadata is not None
    assert len(metadata) == len(shape["unsupported"])
    expected = {"code": "shape.readonly." + key, "args": args}
    assert expected in metadata
    for message in metadata: assert make_message(message["code"], **message["args"]) == message


def test_duplicate_legacy_reasons_keep_one_matching_metadata_record():
    shape = read(BASE + 'sh:or ( [ sh:path ex:p ] ) ; sh:property [ sh:path ex:p ; sh:or ( [ sh:minCount 1 ] ) ]')
    assert shape["unsupported"] == ["uses sh:or"]
    assert shape.get("unsupportedUiMessages") == [{"code": "shape.readonly.uses_predicate", "args": {"predicate": "sh:or"}}]


@pytest.mark.parametrize("predicate", ["minCount", "maxCount", "minLength", "maxLength"])
def test_valid_large_counts_stay_in_turtle_instead_of_being_rounded_in_the_form(predicate):
    safe, large = 2**53 - 1, 2**53 + 1
    assert read(BASE + f'sh:property [ sh:path ex:p ; sh:{predicate} {safe} ]')["editable"]
    shape = read(BASE + f'sh:property [ sh:path ex:p ; sh:{predicate} {large} ]')
    assert not shape["editable"]
    assert predicate not in shape["rules"][0]
    assert shape.get("unsupportedUiMessages") == [{"code": "shape.readonly.precision", "args": {"predicate": "sh:" + predicate, "value": str(large)}}]


def test_an_authored_unnamed_shape_label_stays_data():
    graph = Graph()
    node = BNode()
    graph.add((node, RDF.type, shapes_form.SH.NodeShape))
    unnamed = shapes_form.read_shape(graph, node, MODEL, NAMES, ["ja"])
    assert unnamed["name"] == "Unnamed shape"
    assert unnamed.get("nameUiMessage") == {"code": "words.validation.unnamed_shape", "args": {}}
    graph.add((node, RDFS.label, Literal("Unnamed shape", lang="en")))
    authored = shapes_form.read_shape(graph, node, MODEL, NAMES, ["ja"])
    assert authored["name"] == "Unnamed shape" and "nameUiMessage" not in authored


def test_metadata_does_not_allocate_namespaces_before_the_legacy_name_is_read():
    root = URIRef("https://unbound.test/S")
    extra = URIRef("https://other-unbound.test/Type")
    graph = Graph()
    graph.add((root, RDF.type, shapes_form.SH.NodeShape)); graph.add((root, RDF.type, extra))
    shape = shapes_form.read_shape(graph, root, MODEL, NAMES, ["ja"])
    assert shape["name"] == "ns1:S"
    assert shape["unsupported"] == ["is also a class (an implicit target)"]
    assert shape.get("unsupportedUiMessages") == [{"code": "shape.readonly.additional_types", "args": {"types": [{"text": str(extra)}]}}]
    assert not any(str(namespace) == "https://other-unbound.test/" for _, namespace in graph.namespaces())
