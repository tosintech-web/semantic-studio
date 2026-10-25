"""
================================================================================
FILE: backend/tests/test_editing_static_messages.py
SUMMARY
    Editing's fixed refusal producers must carry registered display metadata.
BASIC IDEA
    Scan the actual source for owned literal CommandError factories, so a new
    fixed refusal cannot silently bypass the language contract. Exercise real
    model and shapes API refusals as well, preserving HTTP text and RDF state.
INPUTS / INPUT SOURCES
    Production AST, message contract and synthetic project commands.
EXPECTED OUTPUT
    Every fixed refusal has an argument-free registered code; actual rejected
    edits keep their old status/detail, revision and graph isomorphism.
================================================================================
"""
import ast
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from rdflib import Graph
from rdflib.compare import isomorphic

from app import editing
from app.main import app
from app.messages import CONTRACT

SOURCE = Path(editing.__file__).read_text(encoding="utf-8")
LITERAL_PRODUCERS = [node for node in ast.walk(ast.parse(SOURCE))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
    and node.func.id == "CommandError" and node.args
    and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str)]


@pytest.mark.parametrize("producer", LITERAL_PRODUCERS,
    ids=lambda producer: f"line-{producer.lineno}-{producer.args[0].value[:45]}")
def test_literal_refusal_has_registered_display_contract(producer):
    metadata = next((keyword.value for keyword in producer.keywords if keyword.arg == "ui_message"), None)
    assert metadata is not None, producer.args[0].value
    assert isinstance(metadata, ast.Call) and isinstance(metadata.func, ast.Name)
    assert metadata.func.id == "make_message" and len(metadata.args) == 1 and not metadata.keywords
    assert isinstance(metadata.args[0], ast.Constant)
    assert CONTRACT["codes"][metadata.args[0].value] == {}

LEGACY = {
    "definition_text": "A definition is text.",
    "annotation_identity_required": "A new annotation property needs a name or an IRI.",
    "ends_required": "Say which end to set: a domain, a range, or both.",
    "share_model_document": "Attributes and relationships live in model.ttl; share them there.",
    "characteristic_switch_required": "Say whether the characteristic is on or off.",
    "unchanged_iri": "The new IRI is the same as the old one.",
    "delete_strategy": "The strategy is reparent (children move up) or orphan.",
    "examples_model_document": "Examples live in model.ttl; run example commands on the model document.",
    "value_kind_and_text_required": "A value needs its kind and its text.",
    "rules_model_document": "A class's rules live in model.ttl; run rule commands on the model document.",
    "attribute_value_kind": "An attribute's value is text or a typed value.",
    "attribute_value_no_link": "An attribute's value is text or a typed value, not a link.",
    "rule_form": "The form is \"every\" or \"defines\".",
    "rule_kind": "The kind is some, only, exactly, atLeast, atMost or value.",
    "rule_identity_required": "Name the rule by what it says: form, property, kind, filler and n.",
    "no_change": "That would change nothing.",
    "shapes_document": "Shapes live in shapes.ttl; run shape commands on the shapes document.",
    "shape_missing": "There is no such shape in shapes.ttl.",
    "rule_path_required": "A rule needs the attribute or relationship it is about.",
    "rule_object_required": "A rule is an object: the path and what is checked on it.",
    "length_bounds_conflict": "The shortest length is longer than the longest; the rule could never be met.",
    "rule_check_required": "A rule needs at least one thing to check.",
    "shape_preset": "The preset is modelCheck, or none.",
    "shape_name_required": "A shape's name cannot be empty.",
    "shape_severity": "The severity is violation (a problem) or warning.",
    "shape_message_text": "A message is text.",
    "explicit_iri_required": "An IRI cannot be made from that name; give the IRI as well.",
    "relationship_value_iri": "A relationship's value is a thing, by its IRI.",
    "rule_count_range": "A number of 0 to 1,000.",
    "rule_count_condition": "Only exactly, at least and at most take a number.",
    "rule_value_required": "Choose the value.",
    "rule_defining_class": "Only the defining form (\"is exactly\") names a class with the rule.",
    "pattern_text": "A pattern is a regular expression.",
    "allowed_values_required": "List at least one allowed value.",
    "command_arguments_object": "A command's arguments are an object.",
    "dry_run_unavailable": "Only DeleteEntity and ShareDomain have a dry run.",
    "recovery_choice": "Choose recover or discard.",
    "rule_target_class_required": "Choose the class it points to.",
    "value_bounds_conflict": "The minimum is above the maximum; the rule could never be met.",
    "value_bounds_kind": "The minimum and the maximum must be the same kind of value.",
    "undo_unavailable": "There is nothing to undo.",
    "redo_unavailable": "There is nothing to redo."
}

CASES = [
    ('model', 'CreateClass', {'label': 'Synthetic', 'definition': 7}, 'definition_text'),
    ('model', 'CreateClass', {'label': '😊'}, 'explicit_iri_required'),
    ('model', 'CreateAnnotationProperty', {}, 'annotation_identity_required'),
    ('model', 'SetEnds', {'property': 'shop:memberOf'}, 'ends_required'),
    ('model', 'SetCharacteristic', {'property': 'shop:memberOf', 'characteristic': 'functional', 'on': 'yes'}, 'characteristic_switch_required'),
    ('model', 'RenameIri', {'old': 'shop:Person', 'new': 'shop:Person'}, 'unchanged_iri'),
    ('model', 'DeleteEntity', {'iri': 'shop:Person', 'strategy': 'other'}, 'delete_strategy'),
    ('shapes', 'CreateExample', {'class': 'shop:Person', 'label': 'Synthetic'}, 'examples_model_document'),
    ('shapes', 'ShareDomain', {'property': 'shop:memberOf', 'class': 'shop:Person'}, 'share_model_document'),
    ('shapes', 'AddRestriction', {'class': 'shop:Person'}, 'rules_model_document'),
    ('model', 'CreateShape', {'target': 'shop:Person'}, 'shapes_document'),
    ('shapes', 'SetShapeName', {'shape': 'https://example.test/missing', 'value': 'x'}, 'shape_missing'),
    ('shapes', 'CreateShape', {'preset': 'other'}, 'shape_preset'),
    ('shapes', 'SetShapeName', {'shape': '$shape', 'value': ''}, 'shape_name_required'),
    ('shapes', 'SetShapeSeverity', {'shape': '$shape', 'severity': 'info'}, 'shape_severity'),
    ('shapes', 'SetShapeMessage', {'shape': '$shape', 'value': 7}, 'shape_message_text'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': 'bad'}, 'rule_object_required'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': {'path': ['shop:memberOf']}}, 'rule_check_required'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': {'path': [], 'minCount': 1}}, 'rule_path_required'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': {'path': ['rdfs:label'], 'minLength': 10, 'maxLength': 2}}, 'length_bounds_conflict'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': {'path': ['rdfs:label'], 'pattern': 7}}, 'pattern_text'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': {'path': ['rdfs:label'], 'in': []}}, 'allowed_values_required'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': {'path': ['rdfs:label'], 'minInclusive': {'value': '10'}, 'maxInclusive': {'value': '2'}}}, 'value_bounds_conflict'),
    ('shapes', 'AddRule', {'shape': '$shape', 'rule': {'path': ['rdfs:label'], 'minInclusive': {'value': '2026-01-01', 'datatype': 'date'}, 'maxInclusive': {'value': '2'}}}, 'value_bounds_kind'),
    ('model', 'AddRestriction', {'class': 'shop:Person', 'form': 'bad', 'property': 'shop:memberOf', 'kind': 'some', 'filler': 'shop:Organization'}, 'rule_form'),
    ('model', 'AddRestriction', {'class': 'shop:Person', 'property': 'shop:memberOf', 'kind': 'bad'}, 'rule_kind'),
    ('model', 'AddRestriction', {'class': 'shop:Person', 'property': 'shop:memberOf', 'kind': 'atLeast', 'n': -1}, 'rule_count_range'),
    ('model', 'AddRestriction', {'class': 'shop:Person', 'property': 'shop:memberOf', 'kind': 'some', 'n': 2, 'filler': 'shop:Organization'}, 'rule_count_condition'),
    ('model', 'AddRestriction', {'class': 'shop:Person', 'property': 'shop:memberOf', 'kind': 'some'}, 'rule_target_class_required'),
    ('model', 'AddRestriction', {'class': 'shop:Person', 'property': 'shop:memberOf', 'kind': 'value'}, 'rule_value_required'),
]


@pytest.fixture
def opened():
    client = TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio": "1"})
    response = client.post("/api/projects", json={"name": "Synthetic", "template": "small",
        "baseIri": "http://example.org/shop#", "prefix": "shop"})
    assert response.status_code == 200, response.text
    pid = response.json()["id"]
    assert client.post(f"/api/projects/{pid}/open").status_code == 200
    shape = client.post(f"/api/projects/{pid}/documents/shapes/commands", json={
        "command": "CreateShape", "args": {"target": "shop:Person", "name": "Synthetic checks"}})
    assert shape.status_code == 200, shape.text
    try:
        yield client, pid, shape.json()["created"]
    finally:
        editing.editing_service.close_all()


@pytest.mark.parametrize("doc,command,args,key", CASES)
def test_fixed_api_refusal_preserves_legacy_and_document(opened, doc, command, args, key):
    client, pid, shape = opened
    args = {name: shape if value == "$shape" else value for name, value in args.items()}
    documents = [editing.editing_service.document(pid, name) for name in ("model", "shapes")]
    before = []
    for document in documents:
        graph = Graph()
        for triple in document.graph:
            graph.add(triple)
        before.append((graph, document.ontology.revision))
    response = client.post(f"/api/projects/{pid}/documents/{doc}/commands", json={"command": command, "args": args})
    assert response.status_code == 422, response.text
    assert response.json() == {"detail": LEGACY[key], "uiMessage": {"code": "editing.refusal." + key, "args": {}}}
    for document, (graph, revision) in zip(documents, before):
        assert document.ontology.revision == revision
        assert isomorphic(document.graph, graph)


@pytest.mark.parametrize("operation,key", [("undo", "undo_unavailable"), ("redo", "redo_unavailable")])
def test_empty_history_retains_legacy_status_and_metadata(opened, operation, key):
    client, pid, _ = opened
    response = client.post(f"/api/projects/{pid}/documents/model/{operation}")
    assert response.status_code == 422, response.text
    assert response.json() == {"detail": LEGACY[key], "uiMessage": {"code": "editing.refusal." + key, "args": {}}}


@pytest.mark.parametrize("operation,args,key", [
    ("command", ("model", "CreateClass", []), "command_arguments_object"),
    ("command", ("model", "CreateClass", {"label": "Synthetic"}, True), "dry_run_unavailable"),
    ("recover", ("other", None), "recovery_choice"),
])
def test_service_argument_guards_preserve_exception(opened, operation, args, key):
    _, pid, _ = opened
    with pytest.raises(editing.CommandError) as caught:
        getattr(editing.editing_service, operation)(pid, *args)
    assert str(caught.value) == LEGACY[key]
    assert caught.value.ui_message == {"code": "editing.refusal." + key, "args": {}}
