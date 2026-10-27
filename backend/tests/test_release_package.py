"""
FILE: backend/tests/test_release_package.py
SUMMARY
    Public release extraction, lexical fidelity and bounded artifact validation.
BASIC IDEA
    Use a hand-built graph containing permitted and private statements.
INPUTS / INPUT SOURCES
    Synthetic RDF only.
EXPECTED OUTPUT
    Safe immutable packages, rejected malformed and preview packages.
"""
from io import BytesIO
import json
from zipfile import ZipFile
import pytest
from rdflib import Graph, URIRef, Literal, BNode
from rdflib.namespace import RDF, RDFS, SKOS, XSD
from app.releases.profile import project_graph
from app.releases.package import build_package, validate_package, preview_digest, ReleaseError

RID = '12345678-1234-4234-8234-123456789012'
META = {'source': 'Synthetic fixture', 'license': 'Synthetic test data, CC0'}

def graph():
    g = Graph()
    a, b = URIRef('urn:test:a'), URIRef('urn:test:b')
    g.add((a, SKOS.prefLabel, Literal('犬', lang='ja')))
    g.add((b, SKOS.prefLabel, Literal('犬', lang='ja')))
    g.add((a, SKOS.broader, URIRef('urn:test:reference')))
    g.add((a, RDFS.comment, Literal('PRIVATE_RAW_JSON')))
    g.add((a, URIRef('urn:private:raw'), Literal('PRIVATE_RAW_JSON')))
    g.add((a, SKOS.definition, Literal('001', datatype=XSD.integer, normalize=False)))
    g.add((a, SKOS.related, BNode('private')))
    return g

def package(approved=True):
    return build_package(project_graph(graph()), release_id=RID, created_at='2026-10-27T00:00:00+00:00', metadata=META, approved=approved)

def test_only_allowed_own_model_statements():
    g = graph(); p = project_graph(g)
    assert p.statement_count == 4 and p.entity_count == 2
    assert len(g) == 7
    assert p.excluded_by_reason == {'predicate': 2, 'blankNode': 1}

def test_literal_lexical_language_datatype_roundtrip():
    checked = validate_package(package())
    data = json.loads(checked.files['dictionary.json'])
    literal = data['entities'][0]['statements']
    assert {'predicate': str(SKOS.definition), 'object': {'kind':'literal','value':'001','language':None,'datatype':str(XSD.integer)}} in literal
    assert b'"001"' in checked.files['dictionary.ttl']

def test_same_label_different_iri():
    data = json.loads(validate_package(package()).files['dictionary.json'])
    assert [e['iri'] for e in data['entities']] == ['urn:test:a','urn:test:b']

def test_private_metadata_absent_from_all_entries():
    checked = validate_package(package())
    assert set(checked.files) == {'manifest.json','dictionary.ttl','dictionary.json','LICENSE.txt','NOTICE.txt'}
    assert all(b'PRIVATE_RAW_JSON' not in b for b in checked.files.values())

def test_preview_cannot_be_imported():
    with pytest.raises(ReleaseError): validate_package(package(False))
    assert not validate_package(package(False), require_approved=False).manifest['approved']

def test_limits_refuse_without_partial_package(monkeypatch):
    monkeypatch.setattr('app.releases.profile.MAX_STATEMENTS', 1)
    with pytest.raises(ReleaseError) as err: project_graph(graph())
    assert err.value.status == 413

def test_metadata_and_basis_change_review_digest():
    p=project_graph(graph())
    a=preview_digest(p,metadata=META,basis={'workspace':1})
    assert a != preview_digest(p,metadata=META,basis={'workspace':2})
    with pytest.raises(ReleaseError): build_package(p, release_id=RID,created_at='now',metadata={**META,'private':'secret'},approved=True)

def test_tampered_and_extra_entries_refused():
    for mode in ('tamper','extra','duplicate'):
        source=validate_package(package()).files
        out=BytesIO()
        with ZipFile(out,'w') as z:
            for name,value in source.items(): z.writestr(name,b'bad' if mode=='tamper' and name=='dictionary.json' else value)
            if mode=='extra': z.writestr('../private',b'bad')
            if mode=='duplicate': z.writestr('manifest.json',source['manifest.json'])
        with pytest.raises(ReleaseError): validate_package(out.getvalue())
