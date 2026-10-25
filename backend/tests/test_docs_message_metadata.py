"""
================================================================================
FILE: backend/tests/test_docs_message_metadata.py
SUMMARY
    Documentation limits retain legacy errors and capture exact source counts.
BASIC IDEA
    Drive the HTTP boundary with each real export refusal constructor, changing
    caps after import and testing integers beyond JavaScript's exact range.
INPUTS / INPUT SOURCES
    Synthetic projects, real refusal classes and controlled export failures.
EXPECTED OUTPUT
    Unchanged status/detail/args and RDF state, with actual count/byte limits.
================================================================================
"""
import pytest
from app import docs_export
from app.routers import ontologies
from test_router_message_metadata import client, context, state

CASES = [
    ("OversizeGraphError", "MAX_GRAPH_JSON_BYTES", "bytes", "export.graph_limit"),
    ("OversizeNodeCountError", "GRAPH_MAX_NODES", "count", "export.node_limit"),
    ("OversizeSourceError", "MAX_SOURCE_BYTES", "bytes", "export.source_limit"),
    ("OversizeHtmlError", "MAX_HTML_BYTES", "bytes", "export.page_limit"),
    ("OversizeZipError", "MAX_ZIP_BYTES", "bytes", "export.zip_limit"),
    ("TermCountError", "MAX_TERMS", "count", "export.term_limit"),
]


def legacy(name, value, limit):
    mb = value / (1024 * 1024)
    limit_mb = limit / (1024 * 1024)
    return {
        "OversizeGraphError": f"This ontology's graph is {mb:.1f} MB, too large to embed in a documentation page. Ontologies this size are usually already published with their own documentation.",
        "OversizeNodeCountError": f"This ontology's graph has {value:,} entities, more than the {limit:,} an embedded documentation graph can show. Ontologies this size are usually already published with their own documentation.",
        "OversizeSourceError": f"This ontology's source file is {mb:.1f} MB, over the {limit_mb:.0f} MB documentation limit.",
        "OversizeHtmlError": f"The generated documentation page is {mb:.1f} MB, over the {limit_mb:.0f} MB limit.",
        "OversizeZipError": f"The documentation zip is {mb:.1f} MB, over the {limit_mb:.0f} MB limit.",
        "TermCountError": f"This ontology has {value:,} documentable terms, more than the {limit:,} a documentation page can list.",
    }[name]


@pytest.mark.parametrize("name,setting,field,code", CASES)
@pytest.mark.parametrize("value", [23, 2**60 + 1])
def test_export_refusals_expose_current_exact_facts(context, monkeypatch, name, setting, field, code, value):
    limit = value - 1
    monkeypatch.setattr(docs_export, setting, limit)
    error = getattr(docs_export, name)(value)
    original = legacy(name, value, limit)
    assert isinstance(error, docs_export.DocsExportError)
    assert str(error) == original and error.args == (original,)
    assert getattr(error, "size_bytes" if field == "bytes" else "count") == value
    def fail(*args, **kwargs):
        raise error
    monkeypatch.setattr(ontologies, "build_zip", fail)
    ontologies._reset_docs_rate_limit()
    before = state(context)
    try:
        response = client.get(f"/api/ontologies/{context['oid']}/documentation")
        assert response.status_code == 400, response.text
        assert response.json()["detail"] == original
        args = {field: value if value <= 2**53-1 else str(value), "limit": limit if limit <= 2**53-1 else str(limit)}
        assert response.json().get("uiMessage") == {"code": code, "args": args}
        assert state(context) == before
    finally:
        ontologies._reset_docs_rate_limit()


def test_unknown_export_refusal_is_not_classified_by_its_english(context, monkeypatch):
    original = "This ontology's graph is 7.5 MB, too large to embed in a documentation page."
    def fail(*args, **kwargs):
        raise docs_export.DocsExportError(original)
    monkeypatch.setattr(ontologies, "build_zip", fail)
    ontologies._reset_docs_rate_limit()
    try:
        response = client.get(f"/api/ontologies/{context['oid']}/documentation")
        assert response.status_code == 400
        assert response.json() == {"detail": original}
    finally:
        ontologies._reset_docs_rate_limit()
