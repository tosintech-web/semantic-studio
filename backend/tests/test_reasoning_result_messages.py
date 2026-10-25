"""
================================================================================
FILE: backend/tests/test_reasoning_result_messages.py
SUMMARY
    Reasoning facts and contradictions expose source facts for localized display.
BASIC IDEA
    Real predicate and conflict branches retain legacy text, RDF identities and
    authored names. Page projection captures metadata only for requested rows.
INPUTS / INPUT SOURCES
    Synthetic indexes, raw engine results and bilingual labels.
EXPECTED OUTPUT
    Additive validated metadata with raw names and bounded page capture.
================================================================================
"""
import json
import pytest
from rdflib import BNode, Literal, URIRef
from rdflib.namespace import OWL, RDF, RDFS
from app import reasoning as r
from app.messages import make_message

EX = 'https://example.test/'
S, O, P, C, A = (URIRef(EX + key) for key in ('s', 'o', 'p', 'Class', 'Other'))
NAMES = {S: '対象 <b>{s}', O: '相手 {o}', P: '関連 <img>{p}', C: '分類 {class}', A: '別分類'}
def names(node): return NAMES.get(node, str(node))
def part(node): return [{'text': names(node)}]
def wire(record, code, **args):
    assert record.get('uiMessage') is not None, record
    assert record['uiMessage'] == make_message(code, **args)
    assert json.loads(json.dumps(record['uiMessage'], ensure_ascii=False)) == record['uiMessage']

@pytest.mark.parametrize('predicate,form', [
    (RDF.type, 'type'), (RDFS.subClassOf, 'kind'), (RDFS.subPropertyOf, 'kind'),
    (OWL.equivalentClass, 'equivalent'), (OWL.equivalentProperty, 'equivalent'),
    (OWL.sameAs, 'same'), (OWL.differentFrom, 'different'), (OWL.disjointWith, 'disjoint'),
    (OWL.inverseOf, 'inverse'), (RDFS.domain, 'domain'), (RDFS.range, 'range'), (P, 'link'),
])
def test_fact_premises_capture_raw_names_without_english_inflection(predicate, form):
    triple = (S, predicate, O); index = r.Index([triple])
    record = r.premise(triple, index, names)
    wire(record, 'reasoning.fact.' + form, **dict(s=part(S), o=part(O), **({'p': part(predicate)} if form == 'link' else {})))
    assert record['sentence'] == r.fact_sentence(triple, names)
    assert record['s'] == str(S) and record['o'] == str(O) and not record['inferred']
    assert index.all == {triple}

@pytest.mark.parametrize('kind,code', [
    (OWL.TransitiveProperty, 'transitive'), (OWL.SymmetricProperty, 'symmetric'),
    (OWL.FunctionalProperty, 'functional'), (OWL.InverseFunctionalProperty, 'inverse_functional'),
    (OWL.IrreflexiveProperty, 'irreflexive'), (OWL.AsymmetricProperty, 'asymmetric'),
])
def test_characteristic_causes_capture_the_source_kind(kind, code):
    triple = (P, RDF.type, kind); record = r.premise(triple, r.Index([]), names)
    wire(record, 'reasoning.characteristic.' + code, s=part(P))
    assert record['sentence'] == f'{names(P)} {r._CHARACTERISTIC[kind]}' and record['inferred']

@pytest.mark.parametrize('raw,kind,code,args', [
    (f'Disjoint classes {C} and {A} have a common individual {S}', 'disjointMember', 'disjoint_member', {'subject': part(S), 'first': part(C), 'second': part(A)}),
    (f'Irreflexive property used on {S} with {P}', 'irreflexive', 'irreflexive', {'subject': part(S), 'property': part(P)}),
    (f'Erroneous usage of asymmetric property {P} on {S} and {O}', 'asymmetric', 'asymmetric', {'first': part(O), 'second': part(S), 'property': part(P)}),
    (f"'sameAs' and 'differentFrom' cannot be used on the same subject-object pair: ({S}, {O})", 'differentSame', 'different_same', {'first': part(O), 'second': part(S)}),
    ('A new engine diagnostic <img>{raw}', 'other', 'engine', {}),
])
def test_conflicts_expose_known_facts_and_all_causes(raw, kind, code, args):
    stated = r.Index([(S, RDF.type, C), (S, RDF.type, A), (C, OWL.disjointWith, A), (S, P, S),
        (S, P, O), (O, P, S), (P, RDF.type, OWL.IrreflexiveProperty), (P, RDF.type, OWL.AsymmetricProperty),
        (S, OWL.sameAs, O), (S, OWL.differentFrom, O)])
    before = set(stated.all); record = r._problem(raw, stated, stated, names)
    wire(record, 'reasoning.problem.' + code, **args)
    assert record['kind'] == kind and record['sentence']
    for cause in record['causes']: assert cause.get('uiMessage') is not None
    assert stated.all == before
    if kind == 'other': assert record['sentence'] == raw + " (the reasoner's words)"

@pytest.mark.parametrize('mode', ['self', 'parent', 'both', 'unknown'])
def test_never_members_metadata_distinguishes_the_disjoint_source(mode):
    triples = []
    first, second = (C, C) if mode == 'self' else (C, A) if mode == 'parent' else (A, O)
    if mode != 'unknown':
        triples.append((first, OWL.disjointWith, second))
        triples += [(C, RDFS.subClassOf, node) for node in (first, second) if node != C]
    stated = r.Index(triples)
    message = f'Disjoint classes {first} and {second} have a common individual {r.PROBE}0' if mode != 'unknown' else f'new engine message about {r.PROBE}0'
    record = r._never_members(C, message, stated, names, [str(C)])
    wire(record, 'reasoning.problem.never.' + mode, name=part(C), **({'first': part(first), 'second': part(second)} if mode in ('parent', 'both') else {}))
    assert r.PROBE not in json.dumps(record) and record['subject'] == str(C)
    for cause in record['causes']: assert cause.get('uiMessage') is not None

def test_unnamed_nodes_use_a_word_but_identically_named_literals_stay_authored():
    for obj, expected in [(BNode('anonymous'), [{'code': 'words.reasoning.unnamed', 'args': {}}]), (Literal('something'), [{'text': 'something'}])]:
        record = r.premise((S, P, obj), r.Index([]), names)
        assert record.get('uiMessage') is not None
        assert record['uiMessage']['args']['o'] == expected and record['o'] == obj.n3()

def test_fact_metadata_is_captured_only_for_the_requested_page_and_about(monkeypatch):
    added = [(URIRef(EX + f'item{i}'), RDF.type, C) for i in range(1000)]
    outcome = r.analyse([], r.RawResult('done', added=added), key=r.Key(1, 0, False, False), languages=['ja'], probes=[])
    calls = []; original = r.make_message
    def capture(code, **args):
        calls.append(code)
        return original(code, **args)
    monkeypatch.setattr(r, 'make_message', capture)
    page = outcome.page('memberships', 200)
    assert page['total'] == 1000 and len(page['items']) == r.PAGE and len(calls) == r.PAGE
    assert all(item.get('uiMessage') is not None for item in page['items'])
    assert all('uiMessage' not in fact for fact in outcome.facts['memberships'])
    calls.clear(); about = outcome.about(str(added[0][0]))
    assert len(about['facts']) == 1 and len(calls) == 1 and about['facts'][0]['s'] == str(added[0][0])

def test_names_follow_result_read_languages_and_not_labels_copied_by_reasoning():
    stated = [(S, RDFS.label, Literal('原語 {s}', lang='ja')), (S, RDFS.label, Literal('Original {s}', lang='en')),
        (C, RDFS.label, Literal('分類', lang='ja')), (C, RDFS.label, Literal('Class', lang='en'))]
    for languages, subject in [(['ja', 'en'], '原語 {s}'), (['en', 'ja'], 'Original {s}')]:
        raw = r.RawResult('done', added=[(S, RDF.type, C), (S, RDFS.label, Literal('wrong label', lang=languages[0]))])
        result = r.analyse(stated, raw, key=r.Key(1, 0, False, False), languages=languages, probes=[]).summary()
        fact = result['groups'][2]['items'][0]
        assert fact.get('uiMessage') is not None
        assert fact['uiMessage']['args']['s'] == [{'text': subject}] and fact['sLabel'] == subject


def test_explanation_core_keeps_display_projection_at_the_public_why_boundary(monkeypatch):
    stated = [(S, RDF.type, A), (A, RDFS.subClassOf, C)]
    triple = (S, RDF.type, C)
    outcome = r.analyse(stated, r.RawResult('done', added=[triple]), key=r.Key(1, 0, False, False), languages=['ja'], probes=[])
    calls = []; original = r.make_message
    def capture(code, **args):
        calls.append(code)
        return original(code, **args)
    monkeypatch.setattr(r, 'make_message', capture)
    monkeypatch.setattr('app.messages.make_message', capture)
    core = r.Explainer(outcome.stated, outcome.closure, outcome.names).explain(triple)
    assert calls == [], 'bulk core traversal must not project display metadata'
    assert 'uiMessage' not in core
    public = outcome.why(str(S), str(RDF.type), str(C))
    assert len(calls) == 3 and len(public['premises']) == 2
    assert public['uiMessage']['code'] == 'reasoning.reason.member_kind'
    for plain, described in zip(core['premises'], public['premises']):
        assert {key: value for key, value in described.items() if key != 'uiMessage'} == plain
        assert described['uiMessage']['code'] in ('reasoning.fact.type', 'reasoning.fact.kind')
    assert public['sentence'] == core['sentence'] and public['family'] == core['family']
