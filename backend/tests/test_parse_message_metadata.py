"""
================================================================================
FILE: backend/tests/test_parse_message_metadata.py
SUMMARY
    Load explanations retain legacy fields while capturing source facts for i18n.
BASIC IDEA
    Exercise known and unknown parser explanations, line-less errors, binary
    input and literal prefix characters without changing parser selection.
INPUTS / INPUT SOURCES
    Synthetic parser attempts, file headers and technical error text.
EXPECTED OUTPUT
    Exact code/args beside unchanged original descriptions and source details.
================================================================================
"""
import pytest
from app.parse_errors import explain


@pytest.mark.parametrize("fmt,raw,code,args,legacy", [
    ("turtle", "at line 2: EOF found", "parse.unfinished_file", {},
     "The file ends in the middle of a statement."),
    ("trig", "at line 3: expected '.' or '}' or ']' at end of statement", "parse.missing_stop", {"line": 3},
     "Line 3: the statement before this line is not finished. It probably needs a full stop (.) at its end."),
    ("n3", 'at line 4: Prefix "<img>{prefix}:" not bound', "parse.undeclared_prefix", {"line": 4, "prefix": "<img>{prefix}:"},
     "Line 4: the prefix <img>{prefix}: is used but never declared. Add @prefix <img>{prefix}: <…> . near the top of the file."),
    ("turtle", "at line 7: newline found in string literal", "parse.unclosed_text", {"line": 7},
     "Line 7: a text value in quotes is not closed before the end of the line."),
    ("xml", "<unknown>:12:8: mismatched tag", "parse.malformed_xml_line", {"line": 12},
     "Line 12: the XML is not well formed: an element is not closed, or a character is out of place."),
    ("xml", "not well-formed", "parse.malformed_xml", {},
     "the XML is not well formed: an element is not closed, or a character is out of place."),
    ("json-ld", "Expecting value: line 2 column 1", "parse.invalid_json_line", {"line": 2},
     "Line 2: the JSON is not valid."),
    ("json-ld", "Expecting value", "parse.invalid_json", {}, "the JSON is not valid."),
    ("turtle", "at line 8: unfamiliar syntax", "parse.unreadable_line", {"format": "Turtle", "line": 8},
     "The file could not be read as Turtle, line 8."),
    ("nt", "Invalid line", "parse.unreadable", {"format": "N-Triples"},
     "The file could not be read as N-Triples."),
    ("future:<img>{format}", "unknown", "parse.unreadable", {"format": "future:<img>{format}"},
     "The file could not be read as future:<img>{format}."),
])
def test_each_explanation_captures_source_facts(fmt, raw, code, args, legacy):
    detail = explain([(fmt, raw)], fmt, head=b"@prefix", filename="sample.ttl", technical="original <img>{line}")
    assert detail["message"] == legacy
    assert detail["technical"] == "original <img>{line}"
    assert detail["uiMessage"] == {"code": code, "args": args}


@pytest.mark.parametrize("filename,head,code", [
    ("sample.ttl", b"name,value", "parse.not_rdf"),
    ("SAMPLE.XLSX", b"PK\x00<", "parse.not_rdf_table"),
    ("sample.csv", b"name,value", "parse.not_rdf_table"),
])
def test_non_rdf_and_table_guidance(filename, head, code):
    detail = explain([("turtle", "at line 1: unknown")], "turtle", head=head, filename=filename, technical="raw")
    assert detail["line"] is None and detail["format"] is None
    assert detail["technical"] == "raw"
    assert detail["uiMessage"] == {"code": code, "args": {}}


def test_unknown_mid_parse_refusal_retains_original_without_claiming_a_known_reason():
    assert explain([], None, head=b"", filename=None, technical="External refusal <img>") == {
        "code": "parse_error", "message": "External refusal <img>", "line": None,
        "format": None, "technical": None,
    }
