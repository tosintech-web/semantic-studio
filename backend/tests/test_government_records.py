"""
================================================================================
FILE: backend/tests/test_government_records.py
SUMMARY
    Checks dated government relations, name history and temporal validation.
BASIC IDEA
    Hand-written synthetic intervals separate known, inactive and unknown facts;
    projections must preserve the original graph and RDF lexical information.
INPUTS / INPUT SOURCES
    Synthetic Turtle and exact date boundaries, without external data.
EXPECTED OUTPUT
    No historical or uncertain relationship silently becomes a current fact.
================================================================================
"""
from datetime import date

import pytest
from rdflib import Graph, Literal, Namespace
from rdflib.compare import isomorphic
from rdflib.namespace import RDF, SKOS

EX = Namespace("http://example.org/government#")
GOV = Namespace("urn:semantic-studio:government:v1#")
ORG = Namespace("http://www.w3.org/ns/org#")
HEADER = '''@prefix ex: <http://example.org/government#> .
@prefix gov: <urn:semantic-studio:government:v1#> .
@prefix org: <http://www.w3.org/ns/org#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dct: <http://purl.org/dc/terms/> .
ex:unit a org:OrganizationalUnit ; skos:prefLabel "Current label"@en .
ex:a a org:Organization . ex:b a org:Organization .
'''


def graph(body=""):
    return Graph().parse(data=HEADER + body, format="turtle")


TRANSFER = '''
ex:old a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate org:unitOf ; gov:object ex:a ;
    gov:openStart true ; gov:validUntil "2020-04-01"^^xsd:date ; dct:source "Synthetic source" .
ex:new a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate org:unitOf ; gov:object ex:b ;
    gov:validFrom "2020-04-01"^^xsd:date ; gov:openEnd true ; dct:source <https://example.org/source> .
'''


def test_transfer_switches_on_effective_date():
    from app.government.records import project_at
    original = graph(TRANSFER)
    before = project_at(original, at=date(2020, 3, 31))
    after = project_at(original, at=date(2020, 4, 1))
    assert (EX.unit, ORG.unitOf, EX.a) in before.graph
    assert (EX.unit, ORG.unitOf, EX.b) not in before.graph
    assert (EX.unit, ORG.unitOf, EX.b) in after.graph
    assert (EX.unit, ORG.unitOf, EX.a) not in after.graph
    assert not list(after.graph.subjects(RDF.type, GOV.RelationRecord))


@pytest.mark.parametrize("raw,at,want", [
    ({"start": {"date": None, "open": False}, "end": {"date": None, "open": False}}, "2020-04-01", "uncertain"),
    ({"start": {"date": "2021-01-01", "open": False}, "end": {"date": None, "open": False}}, "2020-04-01", "inactive"),
    ({"start": {"date": None, "open": False}, "end": {"date": "2020-04-01", "open": False}}, "2020-04-01", "inactive"),
    ({"start": {"date": "2020-01-01", "open": False}, "end": {"date": "2020-04-01", "open": False}}, "2020-01-01", "active"),
])
def test_unknown_bound_is_not_unbounded(raw, at, want):
    from app.government.records import parse_period, period_state
    assert period_state(parse_period(raw), date.fromisoformat(at)) == want


def test_explicit_open_bound_projects():
    from app.government.records import project_at
    result = project_at(graph('''ex:r a gov:RelationRecord ; gov:subject ex:unit ;
        gov:predicate org:unitOf ; gov:object ex:a ; gov:openStart true ; gov:openEnd true ; dct:source "S" .'''), at=date(1900, 1, 1))
    assert (EX.unit, ORG.unitOf, EX.a) in result.graph
    assert not result.uncertain


def test_future_name_does_not_replace_current_name():
    from app.government.records import project_at
    original = graph('''ex:n a gov:NameRecord ; gov:entity ex:unit ; gov:nameValue "Future label"@en ;
        gov:validFrom "2030-01-01"^^xsd:date ; gov:openEnd true ; dct:source "S" .
        ex:unit skos:prefLabel "日本語の名称"@ja .''')
    before = project_at(original, at=date(2020, 1, 1)).graph
    after = project_at(original, at=date(2030, 1, 1)).graph
    assert (EX.unit, SKOS.prefLabel, Literal("Current label", lang="en")) in before
    assert (EX.unit, SKOS.prefLabel, Literal("Future label", lang="en")) not in before
    assert (EX.unit, SKOS.prefLabel, Literal("Current label", lang="en")) not in after
    assert (EX.unit, SKOS.prefLabel, Literal("Future label", lang="en")) in after
    assert (EX.unit, SKOS.prefLabel, Literal("日本語の名称", lang="ja")) in after


def test_gap_and_uncertainty_stay_visible():
    from app.government.records import project_at
    original = graph('''ex:r a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate org:unitOf ;
        gov:object ex:a ; gov:validFrom "2010-01-01"^^xsd:date ; dct:source "S" .''')
    result = project_at(original, at=date(2020, 4, 1))
    assert (EX.unit, ORG.unitOf, EX.a) not in result.graph
    assert [r.iri for r in result.uncertain] == [str(EX.r)]
    assert not project_at(graph(), at=date(2020, 4, 1)).uncertain


def test_source_graph_unchanged():
    from app.government.records import project_at, read_relations
    original = graph(TRANSFER)
    before = set(original)
    project_at(original, at=date(2020, 4, 1)).graph.add((EX.a, SKOS.prefLabel, Literal("Other")))
    assert set(original) == before
    copied = Graph().parse(data=original.serialize(format="turtle"), format="turtle")
    assert read_relations(original) == read_relations(copied)
    assert isomorphic(original, copied)


def test_cycle_is_checked_per_overlapping_period():
    from app.government.validation import validate_relations
    nonoverlap = graph('''
        ex:forward a gov:RelationRecord ; gov:subject ex:a ; gov:predicate org:unitOf ; gov:object ex:b ;
            gov:openStart true ; gov:validUntil "2020-04-01"^^xsd:date ; dct:source "S" .
        ex:reverse a gov:RelationRecord ; gov:subject ex:b ; gov:predicate org:subOrganizationOf ; gov:object ex:a ;
            gov:validFrom "2020-04-01"^^xsd:date ; gov:openEnd true ; dct:source "S" .''')
    assert not [p for p in validate_relations(nonoverlap) if p.code == "government.cycle"]
    overlap = graph('''ex:f a gov:RelationRecord ; gov:subject ex:a ; gov:predicate org:unitOf ; gov:object ex:b ;
        gov:openStart true ; gov:openEnd true ; dct:source "S" .
        ex:r a gov:RelationRecord ; gov:subject ex:b ; gov:predicate org:subOrganizationOf ; gov:object ex:a ;
        gov:openStart true ; gov:openEnd true ; dct:source "S" .''')
    assert any(p.code == "government.cycle" and p.severity == "error" for p in validate_relations(overlap))


def test_inactive_endpoint_is_excluded_with_diagnostic():
    from app.government.records import project_at
    original = graph(TRANSFER + '''ex:life a gov:ExistenceRecord ; gov:entity ex:b ; gov:openStart true ;
        gov:validUntil "2020-01-01"^^xsd:date ; dct:source "S" .''')
    result = project_at(original, at=date(2020, 4, 1))
    assert (EX.unit, ORG.unitOf, EX.b) not in result.graph
    assert any(p.code == "government.inactive_endpoint" for p in result.diagnostics)


def test_unknown_existence_is_annotated():
    from app.government.records import project_at
    result = project_at(graph(TRANSFER), at=date(2020, 4, 1))
    assert (EX.unit, GOV.existenceState, Literal("uncertain")) in result.graph
    assert (EX.unit, ORG.unitOf, EX.b) in result.graph


@pytest.mark.parametrize("period", [
    {"start": {"date": "2020-1-1", "open": False}, "end": {"date": None, "open": True}},
    {"start": {"date": "2020-02-30", "open": False}, "end": {"date": None, "open": True}},
    {"start": {"date": "2020-01-01", "open": True}, "end": {"date": None, "open": True}},
    {"start": {"date": "2020-04-01", "open": False}, "end": {"date": "2020-04-01", "open": False}},
    {"start": {"date": None, "open": "false"}, "end": {"date": None, "open": True}},
])
def test_invalid_period_is_refused_without_date_inference(period):
    from app.government.records import parse_period
    with pytest.raises(ValueError):
        parse_period(period)


def test_unsupported_record_is_read_only_and_never_projected():
    from app.government.records import project_at, read_relations
    original = graph('''ex:r a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate org:unitOf ;
        gov:object ex:a, ex:b ; gov:openStart true ; gov:openEnd true ; dct:source "S" .''')
    record = read_relations(original)[0]
    assert record.unsupported
    result = project_at(original, at=date(2020, 1, 1))
    assert not list(result.graph.objects(EX.unit, ORG.unitOf))
    assert any(p.code == "government.record_unsupported" for p in result.diagnostics)


def test_single_country_overlap_and_symmetric_duplicate_are_checked():
    from app.government.validation import validate_relations
    original = graph('''
    ex:c1 a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate gov:inCountry ; gov:object ex:countryA ;
        gov:openStart true ; gov:openEnd true ; dct:source "S" .
    ex:c2 a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate gov:inCountry ; gov:object ex:countryB ;
        gov:openStart true ; gov:openEnd true ; dct:source "S" .
    ex:f a gov:RelationRecord ; gov:subject ex:a ; gov:predicate gov:cooperatesWith ; gov:object ex:b ;
        gov:openStart true ; gov:openEnd true ; dct:source "S" .
    ex:r a gov:RelationRecord ; gov:subject ex:b ; gov:predicate gov:cooperatesWith ; gov:object ex:a ;
        gov:openStart true ; gov:openEnd true ; dct:source "S" .''')
    codes = {p.code for p in validate_relations(original) if p.severity == "error"}
    assert "government.country_overlap" in codes
    assert "government.relation_overlap" in codes


def test_unknown_overlap_warns_instead_of_asserting_conflict():
    from app.government.validation import validate_relations
    original = graph('''
    ex:c1 a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate gov:inCountry ; gov:object ex:countryA ; dct:source "S" .
    ex:c2 a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate gov:inCountry ; gov:object ex:countryB ; dct:source "S" .''')
    problems = validate_relations(original)
    assert any(p.code == "government.country_overlap" and p.severity == "warning" for p in problems)
    assert not any(p.severity == "error" for p in problems)


def test_validation_refuses_excessive_combinations_instead_of_silently_skipping(monkeypatch):
    import app.government.validation as validation
    monkeypatch.setattr(validation, "MAX_VALIDATION_STEPS", 2, raising=False)
    original = graph(''.join(f'''ex:r{i} a gov:RelationRecord ; gov:subject ex:unit ; gov:predicate gov:inCountry ;
        gov:object ex:c{i} ; gov:openStart true ; gov:openEnd true ; dct:source "S" .''' for i in range(4)))
    assert any(p.code == "government.validation_limit" and p.severity == "error"
               for p in validation.validate_relations(original))
