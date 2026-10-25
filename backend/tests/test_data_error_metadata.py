"""
================================================================================
FILE: backend/tests/test_data_error_metadata.py
SUMMARY
    Data and project refusals expose producer-owned display facts.
BASIC IDEA
    Cover every exception factory, preserve constructor compatibility and API
    detail payloads, and test raw columns, formats and finite numeric limits.
INPUTS / INPUT SOURCES
    Actual source ASTs and synthetic bytes, names, RDF mappings and API requests.
EXPECTED OUTPUT
    Complete additive metadata without changed status, limits or original text.
================================================================================
"""
import ast
from pathlib import Path
import pytest
from rdflib import Graph, Literal, URIRef
from app import projects, snapshots, tabular, rml, shacl
from app.messages import make_message, UiHTTPException

MODULES = [projects, snapshots, tabular, rml, shacl]
CLASSES = {"ProjectError", "SnapshotError", "TabularError", "UnsupportedMapping", "ShapesRefused"}
FACTORIES = [(module, node) for module in MODULES for node in ast.walk(ast.parse(Path(module.__file__).read_text()))
    if isinstance(node, ast.Call) and (node.func.id if isinstance(node.func, ast.Name) else node.func.attr if isinstance(node.func, ast.Attribute) else None) in CLASSES]


@pytest.mark.parametrize("factory", FACTORIES, ids=lambda item: f"{item[0].__name__}-{item[1].lineno}")
def test_all_owned_factories_keep_display_metadata(factory):
    module, node = factory
    assert any(kw.arg == "ui_message" for kw in node.keywords), (module.__name__, ast.unparse(node))


@pytest.mark.parametrize("error_type", [projects.ProjectError, snapshots.SnapshotError, tabular.TabularError, rml.UnsupportedMapping, shacl.ShapesRefused])
def test_legacy_constructor_and_explicit_metadata_both_work(error_type):
    assert str(error_type("Original <b>{reason}")) == "Original <b>{reason}"
    wire = make_message("model.invalid_value", value="<img>{value}", datatype="xsd:integer")
    error = error_type("Original <b>{reason}", ui_message=wire)
    assert str(error) == "Original <b>{reason}"
    assert error.ui_message == wire


def test_tabular_numeric_limit_facts_keep_original_kind():
    with pytest.raises(tabular.TabularError) as caught:
        tabular.check_size(tabular.MAX_BYTES + 1)
    assert caught.value.kind == "too-large"
    assert caught.value.ui_message == {"code": "tabular.file_too_large", "args": {"bytes": tabular.MAX_BYTES + 1, "limit": tabular.MAX_BYTES // (1024 * 1024)}}
    assert "just over" in str(caught.value)
    tabular.check_size(tabular.MAX_BYTES)


def test_rml_predicate_is_a_technical_name_not_an_english_role_fragment():
    graph = Graph()
    node, predicate = URIRef("https://example.test/map"), rml.RML.source
    with pytest.raises(rml.UnsupportedMapping) as caught:
        rml._one(graph, node, predicate, "logical source")
    assert str(caught.value) == "This mapping has no logical source."
    assert caught.value.ui_message == {"code": "rml.field_missing", "args": {"property": rml._name(graph, predicate)}}
    graph.add((node, predicate, Literal("first"))); graph.add((node, predicate, Literal("second")))
    with pytest.raises(rml.UnsupportedMapping) as caught:
        rml._one(graph, node, predicate, "logical source")
    assert caught.value.ui_message == {"code": "rml.field_multiple", "args": {"property": rml._name(graph, predicate), "count": 2}}


@pytest.mark.parametrize("error_type", [snapshots.SnapshotError, rml.UnsupportedMapping])
def test_data_boundary_keeps_legacy_detail_and_metadata(error_type):
    from app.routers.data import _errors
    wire = make_message("model.invalid_value", value="<img>", datatype="xsd:integer")
    with pytest.raises(UiHTTPException) as caught:
        with _errors(): raise error_type("Original", ui_message=wire)
    assert caught.value.status_code == 422
    assert caught.value.detail == "Original"
    assert caught.value.ui_message == wire


@pytest.mark.parametrize("kind,status", [("too-large", 413), ("empty", 422)])
def test_workbook_boundary_keeps_sheet_state_and_kind(kind, status):
    from app.routers.data import _errors
    workbook = {"sheet": "表 <b>{name}", "headerRow": 1, "sheets": [], "top": []}
    wire = make_message("model.invalid_value", value="<img>", datatype="xsd:integer")
    with pytest.raises(UiHTTPException) as caught:
        with _errors(): raise tabular.TabularError("Original", kind, workbook, ui_message=wire)
    assert caught.value.status_code == status
    assert caught.value.detail == {"message": "Original", "kind": kind, "workbook": workbook}
    assert caught.value.ui_message == wire


@pytest.mark.parametrize("field,value,code,facts", [
    ("name", "", "name_required", {}),
    ("prefix", "bad prefix", "prefix", {}),
    ("primaryLanguage", "<b>{tag}", "language", {"language": "<b>{tag}"}),
])
def test_project_api_keeps_422_and_original_detail(field, value, code, facts):
    from fastapi.testclient import TestClient
    from app.main import app
    body = {"name": "Synthetic", "template": "small", "baseIri": "https://example.test/", "prefix": "test", field: value}
    client = TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio": "1"})
    response = client.post("/api/projects", json=body)
    assert response.status_code == 422, response.text
    assert isinstance(response.json()["detail"], str)
    assert response.json()["uiMessage"] == {"code": "projects." + code, "args": facts}


def test_refresh_wraps_known_facts_without_nesting_a_sentence():
    wire = make_message("rml.source", name="../<b>{source}.csv", source="source.csv")
    error = rml.UnsupportedMapping("Original source refusal", ui_message=wire)
    assert snapshots._refresh_mapping_message(error) == {"code": "snapshots.refresh.source", "args": wire["args"]}
    assert error.ui_message == wire
    assert snapshots._refresh_mapping_message(rml.UnsupportedMapping("Legacy")) == {"code": "snapshots.refresh_mapping_refused", "args": {}}


def test_one_compressed_entry_is_not_reported_as_the_whole_workbook_ratio():
    import io
    import random
    import zipfile
    name = "xl/<b>{entry}.xml"
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(name, b"x" * (1024 * 1024))
        archive.writestr("padding.bin", random.Random(0).randbytes(1024 * 1024))
    data = out.getvalue()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        assert sum(item.file_size for item in entries) < tabular.XLSX_MAX_RATIO * sum(item.compress_size for item in entries)
        entry = archive.getinfo(name)
    with pytest.raises(tabular.TabularError) as caught:
        tabular.check_workbook(data, "synthetic.xlsx")
    assert caught.value.kind == "too-large"
    assert caught.value.ui_message == {"code": "tabular.entry_compression_limit", "args": {
        "name": name, "ratio": entry.file_size // entry.compress_size, "limit": tabular.XLSX_MAX_RATIO}}
