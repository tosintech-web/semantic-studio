"""
================================================================================
FILE: backend/tests/test_entity_views.py
SUMMARY
    Tests index cache identity, read consistency and data/import invalidation.
BASIC IDEA
    Use small actual graphs and document locks, plus real editing commands and
    local import resolution; no real datasets or external network.
INPUTS / INPUT SOURCES
    Temporary ontologies, generated snapshots and synthetic project commands.
EXPECTED OUTPUT
    Reuse only the same view; revision/generation/source/language changes renew it.
================================================================================
"""
import importlib
import importlib.util
from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from rdflib import Graph, Literal, Namespace, RDF, RDFS, OWL
from app.store import Ontology, store
from app.editing import editing_service
from app.main import app

S = Namespace('https://example.org/entity-views/')
client = TestClient(app, base_url='http://localhost', headers={'X-Semantic-Studio': '1'})


def module():
    assert importlib.util.find_spec('app.entity_views') is not None, 'Consistent entity views are not implemented'
    return importlib.import_module('app.entity_views')


def ontology():
    graph = Graph()
    graph.add((S.Dog, RDF.type, OWL.Class))
    graph.add((S.Dog, RDFS.label, Literal('犬', lang='ja')))
    graph.add((S.Dog, RDFS.label, Literal('Dog', lang='en')))
    return Ontology(id='ont-view-test', name='Synthetic', source='upload', format='turtle',
                    meta={}, data_path=Path('unused.ttl'), graph=graph, lock=threading.RLock())


def get(ont, *, imports=False, lang='ja'):
    return module().get_entity_view(ont, include_imports=imports, language=lang)


def test_same_view_reuses_index_and_language_projections_are_bounded(monkeypatch):
    mod = module()
    original = mod.build_entity_index
    calls = []
    def counted(*args, **kwargs):
        calls.append(1)
        return original(*args, **kwargs)
    monkeypatch.setattr(mod, 'build_entity_index', counted)
    ont = ontology()
    first = get(ont)
    assert get(ont) is first and len(calls) == 1
    assert first.index.entities[str(S.Dog)].display_name(first.languages) == '犬'
    for lang in ['en', 'fr', 'de', 'es']:
        assert get(ont, lang=lang).revision_token != first.revision_token
    assert len(ont.entity_cache) <= 4
    assert len(calls) == 1


def test_own_in_place_changes_are_revision_keyed_and_old_index_keeps_its_values():
    ont = ontology()
    first = get(ont)
    with ont.reading():
        ont.graph.set((S.Dog, RDFS.label, Literal('新しい名前', lang='ja')))
        ont.revision += 1
    second = get(ont)
    assert second.revision_token != first.revision_token
    assert second.index.entities[str(S.Dog)].display_name(second.languages) == '新しい名前'
    assert first.index.entities[str(S.Dog)].display_name(first.languages) == '犬'


def test_snapshots_on_off_and_empty_generation_change_invalidate_without_imports():
    ont = ontology()
    data = Graph()
    data.add((S.sample, RDFS.label, Literal('データ個体', lang='ja')))
    held = {'generation': 0, 'rows': []}
    ont.snapshots = lambda: (held['generation'], held['rows'])
    first = get(ont)
    held.update(generation=1, rows=[(data, {'id': 'snapshot-1', 'source': 'Synthetic'})])
    second = get(ont)
    assert str(S.sample) in second.index.entities
    assert second.revision_token != first.revision_token
    held.update(generation=2, rows=[])
    third = get(ont)
    assert str(S.sample) not in third.index.entities
    assert third.revision_token not in {first.revision_token, second.revision_token}


def test_real_edit_undo_redo_each_produces_a_new_consistent_view():
    module()
    response = client.post('/api/projects', json={'name': 'View test', 'template': 'empty', 'baseIri': str(S), 'prefix': 'test', 'primaryLanguage': 'ja'})
    pid = response.json()['id']
    try:
        assert client.post(f'/api/projects/{pid}/open').status_code == 200
        ont = editing_service.document(pid, 'model').ontology
        def command(name, **args):
            result = client.post(f'/api/projects/{pid}/documents/model/commands', json={'command': name, 'args': args})
            assert result.status_code == 200, result.text
        command('CreateClass', label='Dog')
        first = get(ont)
        command('SetLabel', iri=str(S.Dog), value='犬', lang='ja')
        second = get(ont)
        assert client.post(f'/api/projects/{pid}/documents/model/undo').status_code == 200
        third = get(ont)
        assert client.post(f'/api/projects/{pid}/documents/model/redo').status_code == 200
        fourth = get(ont)
        assert len({v.revision_token for v in [first, second, third, fourth]}) == 4
        assert fourth.index.entities[str(S.Dog)].display_name(fourth.languages) == '犬'
    finally:
        editing_service.close(pid, discard=True)


def test_local_import_reresolution_changes_token_at_same_revision():
    module()
    ids = []
    def upload(name, data):
        result = client.post('/api/ontologies/upload', files={'file': (name, data.encode())})
        assert result.status_code == 200
        ids.append(result.json()['id'])
        return ids[-1]
    try:
        parent = upload('parent.ttl', f'<{S.parent}> a <{OWL.Ontology}>; <{OWL.imports}> <{S.child}> .')
        child = upload('child.ttl', f'<{S.child}> a <{OWL.Ontology}> . <{S["importedTerm"]}> <{RDFS.label}> "Imported" .')
        ont = store.get(parent)
        first = get(ont, imports=True)
        assert client.post(f'/api/ontologies/{parent}/imports/resolve').status_code == 200
        second = get(ont, imports=True)
        assert str(S["importedTerm"]) in second.index.entities
        assert second.revision_token != first.revision_token and ont.revision == 0
        assert client.post(f'/api/ontologies/{parent}/imports/resolve').status_code == 200
        assert get(ont, imports=True).revision_token != second.revision_token
    finally:
        for oid in ids: client.delete(f'/api/ontologies/{oid}')


def test_readers_never_observe_a_half_written_document():
    module()
    ont = ontology()
    begun = threading.Event()
    release = threading.Event()
    def write():
        with ont.reading():
            ont.graph.set((S.Dog, RDFS.label, Literal('Changed', lang='en')))
            begun.set()
            assert release.wait(3)
            ont.graph.set((S.Dog, RDFS.label, Literal('変更済み', lang='ja')))
            ont.revision += 1
    with ThreadPoolExecutor(max_workers=2) as workers:
        writer = workers.submit(write)
        assert begun.wait(3)
        reader = workers.submit(get, ont)
        release.set()
        writer.result(timeout=3)
        view = reader.result(timeout=3)
    assert view.index.entities[str(S.Dog)].display_name(view.languages) == '変更済み'


def test_unspecified_library_language_preserves_legacy_predicate_priority():
    from rdflib import SKOS
    ont = ontology()
    ont.graph.add((S.Dog, SKOS.prefLabel, Literal('Chien', lang='fr')))
    view = get(ont, lang=None)
    assert view.languages is None
    assert view.index.entities[str(S.Dog)].display_name(view.languages) == 'Chien'


def test_continuously_changing_snapshot_source_is_refused_instead_of_mixed():
    mod = module()
    ont = ontology()
    counter = [0]
    def moving():
        counter[0] += 1
        return counter[0], []
    ont.snapshots = moving
    with pytest.raises(mod.EntityViewChanged):
        get(ont)
    assert len(ont.entity_cache) == 0
