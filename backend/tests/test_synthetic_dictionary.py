"""
================================================================================
FILE: backend/tests/test_synthetic_dictionary.py
SUMMARY
    Checks the public fixture's entity coverage without private source records.
BASIC IDEA
    Query independent RDF expectations and stable triples, including edge cases.
INPUTS / INPUT SOURCES
    A deterministic generator; no files or network.
EXPECTED OUTPUT
    Exactly the requested organisations, searchable values and hard cases.
================================================================================
"""
import importlib
import importlib.util
import pytest
from rdflib import Literal, Namespace, RDF, RDFS, SKOS, URIRef

S = Namespace('https://example.org/synthetic/')
V = Namespace('https://example.org/semantic-studio/crawler-organizations/vocab#')
ORG = Namespace('http://www.w3.org/ns/org#')


def builder():
    spec = importlib.util.find_spec('tests.synthetic_dictionary')
    assert spec is not None, 'The public synthetic dictionary generator is not implemented'
    return importlib.import_module('tests.synthetic_dictionary').build_synthetic_organizations


def test_default_contains_exactly_3035_individuals_and_leading_zero_ids():
    graph = builder()()
    individuals = set(graph.subjects(RDF.type, ORG.Organization))
    assert len(individuals) == 3035
    assert all(str(s).startswith(str(S)) for s in individuals)
    assert graph.value(S['organization/00001'], V.sourceOrgId) == Literal('00001')
    assert graph.value(S['organization/03035'], V.sourceOrgId) == Literal('03035')
    assert graph.value(S['organization/00001'], V.nameReading) == Literal('ごうせいそしき00001', lang='ja')
    assert graph.value(S['organization/00001'], V.abbreviation) == Literal('S00001')
    assert graph.value(S['organization/00001'], V.originalName) == Literal('Synthetic organization 00001', lang='en')
    assert graph.value(S['organization/00001'], V.searchAlias) == Literal('合成検索00001', lang='ja')


def test_no_internal_source_predicates_and_intentional_missing_description():
    graph = builder()(3)
    assert graph.value(S['organization/00001'], RDFS.comment) is None
    assert graph.value(S['organization/00002'], RDFS.comment) == Literal('外部ファイルを使用しない合成データ。', lang='ja')
    assert not any(str(p).endswith(('rawJSON', 'internalComment', 'originalJSON')) for _, p, _ in graph)


def test_hard_cases_have_same_labels_distinct_meanings_and_undeclared_type():
    graph = builder()(1)
    dogs = set(graph.subjects(SKOS.prefLabel, Literal('犬', lang='ja')))
    assert dogs == {S['concept/dog-animal'], S['concept/dog-symbol']}
    assert len(list(graph.subjects(RDF.type, ORG.Organization))) == 1
    assert (S['label-only'], RDFS.label, Literal('ラベルだけの資源', lang='ja')) in graph
    assert (S['undeclared-instance'], RDF.type, S['UndeclaredClass']) in graph
    assert (S['UndeclaredClass'], RDF.type, None) not in graph
    assert max(len(str(v)) for v in graph.objects(None, RDFS.label)) > 200
    assert max(len(str(s)) for s in graph.subjects()) > 200


def test_generation_is_deterministic_and_size_is_checked():
    generate = builder()
    assert set(generate(3)) == set(generate(3))
    for value in [0, -1, 1.5, True, '3']:
        with pytest.raises((ValueError, TypeError)):
            generate(value)
