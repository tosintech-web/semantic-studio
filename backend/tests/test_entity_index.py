"""
================================================================================
FILE: backend/tests/test_entity_index.py
SUMMARY
    Search coverage and ranking independently of the visualization node budget.
BASIC IDEA
    Small, hand-derived fixtures distinguish named subjects, graph references,
    undeclared instances, five explicit source fields and private annotations.
INPUTS / INPUT SOURCES
    Inline synthetic RDF only.
EXPECTED OUTPUT
    Complete mother set, stable ranking, NFKC search and intact RDF values.
================================================================================
"""
import importlib
import importlib.util
from rdflib import BNode, Graph, Literal, Namespace, RDF, RDFS, SKOS, URIRef
from app.graph_builder import node_kind

S = Namespace('https://example.org/index/')
V = Namespace('https://example.org/semantic-studio/crawler-organizations/vocab#')


def module():
    assert importlib.util.find_spec('app.entity_index') is not None, 'Entity search index is not implemented'
    return importlib.import_module('app.entity_index')


def test_mother_set_contains_subjects_and_graph_nodes_not_arbitrary_object_urls():
    graph = Graph()
    graph.add((S.label_only, RDFS.label, Literal('ラベルだけ', lang='ja')))
    graph.add((S.instance, RDF.type, S.UndeclaredClass))
    graph.add((S.instance, S.homepage, S['not-an-entity']))
    graph.add((BNode(), RDFS.label, Literal('anonymous')))
    nodes = [{'id': str(S.graph_reference), 'kind': 'class', 'label': 'Reference'}]
    index = module().build_entity_index(graph, nodes)
    assert set(index.entities) == {str(S.label_only), str(S.instance), str(S.graph_reference)}
    assert index.entities[str(S.graph_reference)].reference_only is True
    assert index.entities[str(S.instance)].kind == 'individual'
    assert node_kind(graph, S.instance) == 'individual'


def test_all_approved_fields_are_indexed_but_comments_and_original_json_are_not():
    graph = Graph()
    for prop, value in [(RDFS.label, '代表名'), (SKOS.altLabel, '別名'), (SKOS.hiddenLabel, '隠れた名前'),
                        (V.originalName, 'Original'), (V.abbreviation, 'ABBR'), (V.nameReading, 'よみ'),
                        (V.searchAlias, '検索用語'), (V.sourceOrgId, '00001'), (RDFS.comment, '内部注釈'),
                        (V.rawJSON, '原本内容')]:
        graph.add((S.a, prop, Literal(value)))
    before = set(graph)
    index = module().build_entity_index(graph, [])
    for query, reason in [('代表名', 'name'), ('別名', 'alias'), ('隠れた名前', 'alias'), ('Original', 'alias'),
                          ('ABBR', 'alias'), ('よみ', 'reading'), ('検索用語', 'search'), ('00001', 'identifier')]:
        found = module().rank_matches(index, query, ('ja',))
        assert len(found) == 1 and found[0].iri == str(S.a) and found[0].reason == reason
        assert found[0].value == query
    assert module().rank_matches(index, '内部注釈', ('ja',)) == []
    assert module().rank_matches(index, '原本内容', ('ja',)) == []
    assert set(graph) == before


def test_same_label_different_iris_and_ranking_are_stable():
    graph = Graph()
    for local, value in [('name-b', '犬'), ('name-a', '犬'), ('prefix', '犬種'), ('partial', '愛犬')]:
        graph.add((S[local], RDFS.label, Literal(value, lang='ja')))
    graph.add((S.alias, RDFS.label, Literal('別の項目', lang='ja')))
    graph.add((S.alias, SKOS.altLabel, Literal('犬', lang='ja')))
    graph.add((S['犬-identifier'], RDFS.label, Literal('識別子の項目', lang='ja')))
    index = module().build_entity_index(graph, [])
    matches = module().rank_matches(index, '犬', ('ja',))
    assert [m.iri for m in matches] == [str(S['name-a']), str(S['name-b']), str(S.prefix), str(S.alias), str(S.partial), str(S['犬-identifier'])]
    assert [m.reason for m in matches] == ['name', 'name', 'name', 'alias', 'name', 'identifier']


def test_normalization_and_same_entity_match_tie_do_not_rewrite_values():
    graph = Graph()
    graph.add((S.a, RDFS.label, Literal('ＡＢＣ', lang='ja')))
    graph.add((S.a, SKOS.altLabel, Literal('ABC alias')))
    graph.add((S.a, V.nameReading, Literal('abc reading')))
    index = module().build_entity_index(graph, [])
    assert module().normalize_query('  ＡＢＣ  ') == 'abc'
    match = module().rank_matches(index, 'abc', ('ja',))[0]
    assert match.reason == 'name' and match.value == 'ＡＢＣ'
    assert module().rank_matches(index, '   ', ('ja',)) == []
    assert (S.a, RDFS.label, Literal('ＡＢＣ', lang='ja')) in graph


def test_uri_and_source_identifier_are_last_even_when_exact():
    graph = Graph()
    graph.add((S.a, RDFS.label, Literal('00001 name')))
    graph.add((S.b, V.sourceOrgId, Literal('00001')))
    index = module().build_entity_index(graph, [])
    assert [m.iri for m in module().rank_matches(index, '00001', ('ja',))] == [str(S.a), str(S.b)]
