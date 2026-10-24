"""
================================================================================
FILE: backend/tests/test_display_languages.py
SUMMARY
    Explicit dictionary-language choices across label APIs.
BASIC IDEA
    Bilingual Library honors preferences, preserves legacy no-lang and RDF.
INPUTS / INPUT SOURCES
    Synthetic Turtle; temporary library only.
EXPECTED OUTPUT
    Stable labels and metadata; query values remain unchanged.
================================================================================
"""
import pytest
from fastapi.testclient import TestClient
from rdflib import Graph, Literal, Namespace, RDFS, SKOS
from app.main import app
from app.graph_builder import pick_label_in, _description

client = TestClient(app, base_url='http://localhost', headers={'X-Semantic-Studio': '1'})
X = Namespace('https://example.org/display/')

@pytest.fixture
def oid():
    turtle = '''@prefix x: <https://example.org/display/> .
    @prefix owl: <http://www.w3.org/2002/07/owl#> .
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
    @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
    x:Dog a owl:Class; rdfs:label "犬"@ja, "Dog"@en .
    x:dog1 a x:Dog; rdfs:label "ポチ"@ja, "Pochi"@en .
    x:foreign a owl:Class; rdfs:label "Chat"@fr .
    x:concept a skos:Concept; skos:prefLabel "Concept"@en;
        skos:definition "English definition"@en; rdfs:comment "日本語の説明"@ja .'''
    response = client.post('/api/ontologies/upload', files={'file': ('display.ttl', turtle.encode())})
    assert response.status_code == 200
    return response.json()['id']


def test_explicit_library_language_affects_graph_detail_and_search_but_not_legacy(oid):
    graph = client.get(f'/api/ontologies/{oid}/graph', params={'lang': 'ja'}).json()
    dog = next(n for n in graph['nodes'] if n['id'] == str(X.Dog))
    assert dog['label'] == '犬'
    assert dog['label_language'] == 'ja' and dog['label_fallback'] is False
    foreign = next(n for n in graph['nodes'] if n['id'] == str(X.foreign))
    assert foreign['label_language'] == 'fr' and foreign['label_fallback'] is True
    detail = client.get(f'/api/ontologies/{oid}/node', params={'iri': str(X.Dog), 'lang': 'ja'}).json()
    assert detail['label'] == '犬' and detail['label_language'] == 'ja'
    hits = client.get(f'/api/ontologies/{oid}/search', params={'q': 'Dog', 'lang': 'ja'}).json()
    assert next(n for n in hits if n['id'] == str(X.Dog))['label'] == '犬'
    legacy = client.get(f'/api/ontologies/{oid}/graph').json()
    assert next(n for n in legacy['nodes'] if n['id'] == str(X.Dog))['label'] == 'Dog'


def test_query_schema_node_and_sparql_labels_follow_explicit_language(oid):
    schema = client.get(f'/api/ontologies/{oid}/query-schema', params={'lang': 'ja'}).json()
    assert next(n for n in schema['classes'] if n['iri'] == str(X.Dog))['label'] == '犬'
    node = client.get(f'/api/ontologies/{oid}/query-node', params={'iri': str(X.dog1), 'lang': 'ja'}).json()
    assert node['label'] == 'ポチ' and node['types'][0]['label'] == '犬'
    result = client.post(f'/api/ontologies/{oid}/sparql?lang=ja', json={'query': f'SELECT ?s WHERE {{ VALUES ?s {{ <{X.dog1}> }} }}'}).json()
    cell = result['rows'][0][0]
    assert cell['value'] == str(X.dog1) and cell['label'] == 'ポチ'


def test_language_then_predicate_then_stable_literal_order():
    graph = Graph()
    for value in [Literal('Z', lang='ja-JP'), Literal('B', lang='ja'), Literal('A', lang='ja')]:
        graph.add((X.Dog, RDFS.label, value))
    graph.add((X.Dog, SKOS.prefLabel, Literal('Dog', lang='en')))
    assert pick_label_in(graph, X.Dog, ('ja',)) == ('A', 'ja')
    graph.add((X.Dog, SKOS.altLabel, Literal('別名', lang='fr')))
    assert pick_label_in(graph, X.Dog, ('fr',))[0] != '別名'


def test_description_language_precedes_predicate_with_legacy_default_unchanged(oid):
    detail = client.get(f'/api/ontologies/{oid}/node', params={'iri': str(X.concept), 'lang': 'ja'}).json()
    assert detail['explain']['description'] == {'text': '日本語の説明', 'lang': 'ja'}
    graph = Graph()
    graph.add((X.Dog, SKOS.definition, Literal('English', lang='en')))
    graph.add((X.Dog, RDFS.comment, Literal('日本語', lang='ja')))
    assert _description(graph, X.Dog, ('ja',)) == {'text': '日本語', 'lang': 'ja'}
    assert _description(graph, X.Dog, None) == {'text': 'English', 'lang': 'en'}
