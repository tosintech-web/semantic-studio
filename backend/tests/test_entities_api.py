"""
================================================================================
FILE: backend/tests/test_entities_api.py
SUMMARY
    Exercises complete dictionary paging and compatible search over real APIs.
BASIC IDEA
    Upload generated data and boundary-case Turtle; enumerate every filtered
    entity without relying on the graph budget or external input files.
INPUTS / INPUT SOURCES
    Public synthetic generator and tiny inline Turtle.
EXPECTED OUTPUT
    Honest totals, bounded display fields/responses, stable ordering and guards.
================================================================================
"""
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from tests.synthetic_dictionary import build_synthetic_organizations

client = TestClient(app, base_url='http://localhost', headers={'X-Semantic-Studio': '1'})


def upload(data):
    response = client.post('/api/ontologies/upload', files={'file': ('synthetic.ttl', data)})
    assert response.status_code == 200, response.text
    return response.json()['id']


@pytest.fixture(scope='module')
def synthetic_id():
    return upload(build_synthetic_organizations().serialize(format='turtle').encode())


def test_all_individuals_are_paged_once_regardless_of_graph_budget(synthetic_id):
    oid = synthetic_id
    graph = client.get(f'/api/ontologies/{oid}/graph?limit=2000').json()
    assert graph['stats']['truncated'] is True
    found = []
    revision = None
    for offset in range(0, 3036, 100):
        response = client.get(f'/api/ontologies/{oid}/entities', params={'kind': 'individual', 'lang': 'ja', 'offset': offset, 'limit': 100})
        assert response.status_code == 200
        page = response.json()
        assert page['total'] == 3036
        assert page['offset'] == offset and page['limit'] == 100
        if revision is None: revision = page['revision']
        assert page['revision'] == revision
        found.extend(item['iri'] for item in page['items'])
        assert len(response.content) <= 256 * 1024
    assert len(set(found)) == len(found) == 3036
    assert sum('/organization/' in iri for iri in found) == 3035


def test_page_defaults_filter_and_sort_are_independent_of_search_rank(synthetic_id):
    page = client.get(f'/api/ontologies/{synthetic_id}/entities', params={'lang': 'ja'}).json()
    assert page['limit'] == 50 and page['offset'] == 0 and len(page['items']) == 50
    names = [(item['label'], item['iri']) for item in page['items']]
    assert names == sorted(names)
    concepts = client.get(f'/api/ontologies/{synthetic_id}/entities', params={'kind': 'concept', 'q': '犬', 'sort': 'iri', 'lang': 'ja'}).json()
    assert concepts['total'] == 2
    assert [i['iri'] for i in concepts['items']] == sorted(i['iri'] for i in concepts['items'])
    assert all(i['label'] == '犬' and i['description'] for i in concepts['items'])


def test_alias_reading_identifier_and_legacy_array_search(synthetic_id):
    for query, reason in [('試験団体00001', 'alias'), ('ごうせいそしき00001', 'reading'), ('00001', 'identifier')]:
        response = client.get(f'/api/ontologies/{synthetic_id}/entities', params={'q': query, 'lang': 'ja'})
        assert response.status_code == 200
        item = next(i for i in response.json()['items'] if i['iri'].endswith('/organization/00001'))
        # 00001 is also contained in the label, whose partial match outranks ID.
        assert item['match']['reason'] == ('name' if query == '00001' else reason)
        assert item['description'] is None
    hits = client.get(f'/api/ontologies/{synthetic_id}/search', params={'q': '犬', 'lang': 'ja'}).json()
    assert isinstance(hits, list) and len(hits) == 2
    assert all({'id', 'label', 'kind', 'degree', 'match'} <= set(hit) for hit in hits)
    assert client.get(f'/api/ontologies/{synthetic_id}/search?kind=individual&q=x').status_code == 422


def test_subject_only_reference_and_unrelated_url_membership():
    oid = upload(b'@prefix x: <https://example.org/page/> . @prefix r: <http://www.w3.org/2000/01/rdf-schema#> . x:label r:label "Only"; x:url x:notAnEntity . x:child r:subClassOf x:reference .')
    page = client.get(f'/api/ontologies/{oid}/entities').json()
    rows = {i['iri']: i for i in page['items']}
    assert 'https://example.org/page/label' in rows
    assert 'https://example.org/page/notAnEntity' not in rows
    assert rows['https://example.org/page/reference']['reference_only'] is True


def test_empty_missing_invalid_and_limits(synthetic_id):
    empty = upload(b'@prefix x: <https://example.org/empty/> .')
    page = client.get(f'/api/ontologies/{empty}/entities').json()
    assert page['items'] == [] and page['total'] == 0
    assert client.get('/api/ontologies/not-issued/entities').status_code == 404
    for params in [{'offset': -1}, {'limit': 0}, {'limit': 101}, {'kind': 'unknown'}, {'sort': 'random'}, {'q': 'a' * 513}, {'lang': 'a' * 36}]:
        assert client.get(f'/api/ontologies/{synthetic_id}/entities', params=params).status_code == 422


def test_display_lengths_preserve_full_index_match_and_unicode_codepoints():
    text = '😀' * 205
    ttl = f'<https://example.org/long> <http://www.w3.org/2000/01/rdf-schema#label> {json.dumps(text, ensure_ascii=False)}@ja .'
    oid = upload(ttl.encode())
    page = client.get(f'/api/ontologies/{oid}/entities', params={'q': '😀', 'lang': 'ja'}).json()
    row = page['items'][0]
    assert row['label'] == '😀' * 200 and row['label_truncated'] is True
    assert row['match']['value'] == '😀' * 200 and row['match']['truncated'] is True
    assert page['total'] == 1


def test_a_single_huge_iri_is_refused_without_cutting_it_or_dropping_the_row():
    iri = 'https://example.org/' + 'x' * (270 * 1024)
    oid = upload(f'<{iri}> <http://www.w3.org/2000/01/rdf-schema#label> "Huge IRI" .'.encode())
    response = client.get(f'/api/ontologies/{oid}/entities?limit=1')
    assert response.status_code == 400
    detail = response.json()['detail']
    assert detail['code'] == 'ENTITY_PAGE_TOO_LARGE' and detail['total'] == 1 and detail['suggested_limit'] == 1
    assert 'details' in detail['message'].lower()
