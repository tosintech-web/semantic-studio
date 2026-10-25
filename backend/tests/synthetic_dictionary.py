"""
================================================================================
FILE: backend/tests/synthetic_dictionary.py
SUMMARY
    Generates a public Japanese dictionary fixture without reading private data.
BASIC IDEA
    Stable identifiers and independently composed labels cover organisations,
    ambiguous concepts and resources omitted by a budgeted visual graph.
INPUTS / INPUT SOURCES
    Positive integer count only; no file or network access.
EXPECTED OUTPUT
    An rdflib Graph under example.org, with exactly count organisations.
================================================================================
"""
from rdflib import Graph, Literal, Namespace, RDF, RDFS, SKOS

S = Namespace('https://example.org/synthetic/')
V = Namespace('https://example.org/semantic-studio/crawler-organizations/vocab#')
ORG = Namespace('http://www.w3.org/ns/org#')


def build_synthetic_organizations(count: int = 3035) -> Graph:
    if isinstance(count, bool) or not isinstance(count, int):
        raise TypeError('count must be an integer')
    if count < 1:
        raise ValueError('count must be positive')
    graph = Graph()
    for prefix, ns in [('synthetic', S), ('v', V), ('org', ORG), ('skos', SKOS), ('rdfs', RDFS)]:
        graph.bind(prefix, ns)
    graph.add((ORG.Organization, RDF.type, RDFS.Class))
    graph.add((ORG.Organization, RDFS.label, Literal('組織', lang='ja')))
    for i in range(1, count + 1):
        ident = f'{i:05d}'
        subject = S[f'organization/{ident}']
        for predicate, value in [
            (RDF.type, ORG.Organization),
            (RDFS.label, Literal(f'合成組織{ident}', lang='ja')),
            (RDFS.label, Literal(f'Synthetic organization {ident}', lang='en')),
            (SKOS.altLabel, Literal(f'試験団体{ident}', lang='ja')),
            (V.originalName, Literal(f'Synthetic organization {ident}', lang='en')),
            (V.abbreviation, Literal(f'S{ident}')),
            (V.nameReading, Literal(f'ごうせいそしき{ident}', lang='ja')),
            (V.searchAlias, Literal(f'合成検索{ident}', lang='ja')),
            (V.sourceOrgId, Literal(ident)),
        ]:
            graph.add((subject, predicate, value))
        if i % 3 != 1:
            graph.add((subject, RDFS.comment, Literal('外部ファイルを使用しない合成データ。', lang='ja')))
    for local, definition in [('dog-animal', '動物としての犬。'), ('dog-symbol', '記号としての犬。')]:
        subject = S[f'concept/{local}']
        graph.add((subject, RDF.type, SKOS.Concept))
        graph.add((subject, SKOS.prefLabel, Literal('犬', lang='ja')))
        graph.add((subject, SKOS.prefLabel, Literal('dog', lang='en')))
        graph.add((subject, SKOS.definition, Literal(definition, lang='ja')))
    graph.add((S['label-only'], RDFS.label, Literal('ラベルだけの資源', lang='ja')))
    graph.add((S['undeclared-instance'], RDF.type, S['UndeclaredClass']))
    graph.add((S['undeclared-instance'], RDFS.label, Literal('型が未宣言の個体', lang='ja')))
    graph.add((S['long/' + 'x' * 300], RDFS.label, Literal('長い表示名' * 60, lang='ja')))
    return graph
