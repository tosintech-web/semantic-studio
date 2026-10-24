"""
================================================================================
FILE: backend/tests/test_editing_value_messages.py
SUMMARY
    Annotation-value refusals retain legacy English and add exact display facts.
BASIC IDEA
    Exercise the shared value parsers directly before document mutation. Invalid
    RDF values keep their old exception type/text; valid RDF terms stay unchanged.
INPUTS / INPUT SOURCES
    Synthetic values, language tags and datatype names with markup-like text.
EXPECTED OUTPUT
    Contract-valid metadata, literal operands and unchanged accepted RDF values.
================================================================================
"""
import pytest
from rdflib import Literal, URIRef
from rdflib.namespace import RDF, RDFS, XSD

from app.editing import CommandError, check_lexical, parse_value, range_for_value_type


@pytest.mark.parametrize("value,legacy,code,args", [
    (None, "A value needs a kind: text, typed or link.", "kind_required", {}),
    ({"kind": "text"}, "A value needs its text.", "text_required", {}),
    ({"kind": "text", "value": "x", "lang": "ja", "datatype": "xsd:string"},
     "A value cannot carry both a language and a datatype; RDF allows one or the other.", "language_datatype", {}),
    ({"kind": "typed", "value": "x", "lang": "ja"},
     "A value cannot carry both a language and a datatype; RDF allows one or the other.", "language_datatype", {}),
    ({"kind": "text", "value": "x", "lang": "<b>{lang}"},
     '"<b>{lang}" is not a well-formed language tag (for example en or fr).', "invalid_language", {"language": "<b>{lang}"}),
    ({"kind": "text", "value": " \n "}, "A text value cannot be empty.", "empty_text", {}),
    ({"kind": "unknown", "value": "x"}, "A value's kind is text, typed or link.", "invalid_kind", {}),
    ({"kind": "typed", "value": "x"}, "A typed value needs a datatype.", "datatype_required", {}),
    ({"kind": "typed", "value": "x", "datatype": "<b>{type}"},
     "<b>{type} is not one of the offered datatypes (xsd:string, xsd:integer, xsd:decimal, xsd:boolean, xsd:date, xsd:dateTime, xsd:anyURI).",
     "unsupported_datatype", {"datatype": "<b>{type}"}),
])
def test_value_refusal_facts(value, legacy, code, args):
    with pytest.raises(CommandError) as caught:
        parse_value(value, "ja", URIRef)
    assert str(caught.value) == legacy
    assert caught.value.ui_message == {"code": f"editing.value.{code}", "args": args}


@pytest.mark.parametrize("spec,legacy,code", [
    ([], "A value type is {kind: text | typed | link}.", "type_required"),
    ({"kind": "unknown"}, "A value type's kind is text, typed or link.", "invalid_type_kind"),
])
def test_value_type_refusal_facts(spec, legacy, code):
    with pytest.raises(CommandError) as caught:
        range_for_value_type(spec)
    assert str(caught.value) == legacy
    assert caught.value.ui_message == {"code": f"editing.value.{code}", "args": {}}


@pytest.mark.parametrize("datatype,name,expected", [
    ("integer", "integer", "a whole number such as 42"),
    ("decimal", "decimal", "a number such as 4.5"),
    ("double", "number", "a number such as 4.5 or 1E3"),
    ("float", "number", "a number such as 4.5 or 1E3"),
    ("boolean", "boolean", "true or false"),
    ("date", "date", "YYYY-MM-DD"),
    ("dateTime", "date and time", "YYYY-MM-DDThh:mm:ss"),
    ("gYear", "year", "a year such as 2026"),
])
def test_lexical_refusal_captures_value_and_semantic_type(datatype, name, expected):
    value = "<b>{value}"
    with pytest.raises(CommandError) as caught:
        check_lexical(value, datatype)
    assert str(caught.value) == f'"{value}" is not a valid {name} (expected {expected}).'
    assert caught.value.ui_message == {"code": f"editing.value.invalid_{datatype}", "args": {"value": value}}


@pytest.mark.parametrize("value", ["", "https://example.test/a b", "https://example.test/a\nb"])
def test_uri_refusal_keeps_literal_input(value):
    with pytest.raises(CommandError) as caught:
        check_lexical(value, "anyURI")
    assert str(caught.value) == f'"{value}" is not a valid URI (it is empty or contains a space).'
    assert caught.value.ui_message == {"code": "editing.value.invalid_uri", "args": {"value": value}}


def test_valid_value_terms_and_range_defaults_do_not_change():
    assert parse_value({"kind": "text", "value": "犬"}, "ja", URIRef) == Literal("犬", lang="ja")
    assert parse_value({"kind": "typed", "value": "42", "datatype": "xsd:integer"}, "ja", URIRef) == Literal("42", datatype=XSD.integer)
    assert parse_value({"kind": "link", "value": "https://example.test/a"}, "ja", URIRef) == URIRef("https://example.test/a")
    assert range_for_value_type(None) is None
    assert range_for_value_type({"kind": "text"}) == RDF.langString
    assert range_for_value_type({"kind": "link"}) == RDFS.Resource
    assert range_for_value_type({"kind": "typed", "datatype": "xsd:date"}) == XSD.date


def test_stored_value_invalid_kind_uses_the_same_descriptor():
    from app.editing import _stored_value
    with pytest.raises(CommandError) as caught:
        _stored_value(None, {"kind": "unknown", "value": "literal"})
    assert str(caught.value) == "A value's kind is text, typed or link."
    assert caught.value.ui_message == {"code": "editing.value.invalid_kind", "args": {}}
