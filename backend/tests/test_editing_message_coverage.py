"""
================================================================================
FILE: backend/tests/test_editing_message_coverage.py
SUMMARY
    Every editing refusal producer forwards additive display metadata.
BASIC IDEA
    Check the actual owned exception factories and field roles, then exercise
    reuse-plan refusal facts, actual 404/409/422 responses and AND/OR domains.
    Legacy exceptions and domain algorithms stay intact.
INPUTS / INPUT SOURCES
    Editing AST, synthetic RDF graphs and the registered message contract.
EXPECTED OUTPUT
    No unannotated editing factories; translated field tokens and exact plan facts.
================================================================================
"""
import ast
from pathlib import Path
import pytest
from rdflib import BNode, Graph, URIRef
from rdflib.namespace import OWL, RDF, RDFS
from app import axioms, editing
from app.messages import CONTRACT, make_message

TREE = ast.parse(Path(editing.__file__).read_text(encoding="utf-8"))
PRODUCERS = [node for node in ast.walk(TREE) if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name) and node.func.id in {"CommandError", "NoSuchRule", "AlreadyDefined"}]


@pytest.mark.parametrize("producer", PRODUCERS, ids=lambda node: f"{node.func.id}-line-{node.lineno}")
def test_every_editing_refusal_forwards_metadata(producer):
    metadata = next((item.value for item in producer.keywords if item.arg == "ui_message"), None)
    assert metadata is not None, ast.unparse(producer)
    assert not (isinstance(metadata, ast.Constant) and metadata.value is None)


def test_owned_field_roles_have_registered_translations():
    roles = {"IRI", "child", "parent", "concept", "broader", "related", "property", "class",
        "label", "comment", "start", "end", "minimum", "maximum", *editing._COUNTS}
    for node in ast.walk(TREE):
        if not isinstance(node, ast.Call) or len(node.args) < 2: continue
        callee = node.func.attr if isinstance(node.func, ast.Attribute) else node.func.id if isinstance(node.func, ast.Name) else ""
        if callee not in {"iri", "require", "_languages", "_count", "_bound"}: continue
        role = node.args[1]
        if isinstance(role, ast.Constant) and isinstance(role.value, str): roles.add(role.value)
    declared = getattr(editing, "_FIELD_CODES", {})
    assert roles <= declared.keys(), sorted(roles - declared.keys())
    assert all(CONTRACT["codes"][declared[role]] == {} for role in roles)


def test_unknown_private_field_labels_remain_literal_data():
    helper = getattr(editing, "_field_parts", None)
    assert callable(helper)
    assert helper("独自 <b>{field}") == [{"text": "独自 <b>{field}"}]


@pytest.mark.parametrize("form", ["expression", "separate"])
def test_reuse_plan_refusal_has_its_own_facts(form):
    prop, first, second, target = [URIRef("https://example.test/" + name) for name in ("p", "A", "B", "C")]
    graph = Graph()
    for cls in (first, second, target): graph.add((cls, RDF.type, OWL.Class))
    graph.add((prop, RDF.type, OWL.ObjectProperty))
    if form == "expression": graph.add((prop, RDFS.domain, BNode()))
    else:
        graph.add((prop, RDFS.domain, first)); graph.add((prop, RDFS.domain, second))
    names = {prop: "関連 <b>{name}", first: "甲 {name}", second: "乙 <img>", target: "丙"}
    plan = axioms.reuse_plan(graph, graph, prop, target, names.__getitem__)
    assert plan["case"] is None and isinstance(plan["refused"], str)
    wire = plan.get("refusedUiMessage")
    expected = {"name": names[prop]}
    if form == "separate": expected["classes"] = [{"text": names[first]}, {"code": "words.list.and", "args": {}}, {"text": names[second]}]
    assert wire == {"code": "editing.guard.share_" + form, "args": expected}
    assert make_message(wire["code"], **wire["args"]) == wire


@pytest.fixture
def opened():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio": "1"})
    created = client.post("/api/projects", json={"name": "Synthetic guards", "template": "small",
        "baseIri": "http://example.org/shop#", "prefix": "shop"})
    assert created.status_code == 200, created.text
    pid = created.json()["id"]
    assert client.post(f"/api/projects/{pid}/open").status_code == 200
    try:
        yield client, pid
    finally:
        editing.editing_service.close_all()


@pytest.mark.parametrize("command,args,status,code,facts", [
    ("RenameIri", {"old": "shop:Person", "new": "<b>{iri}"}, 422,
        "invalid_iri", {"value": "<b>{iri}"}),
    ("SetLabel", {"iri": "shop:Missing", "value": "新しい名前"}, 422,
        "missing_to_change", {"name": "shop:Missing"}),
    ("RemoveRestriction", {"class": "shop:Person", "restriction": {"form": "every", "property": "http://example.org/shop#memberOf", "kind": "some", "filler": "http://example.org/shop#Organization", "n": None}}, 404,
        "rule_gone", {"name": "Person"}),
    ("CreateObjectProperty", {"label": "memberOf", "iri": "shop:memberOf"}, 409,
        "property_exists_domain", {"name": "member of", "kind": [{"code": "words.kind.objectProperty", "args": {}}], "classes": [{"text": "Person"}]}),
    ("SyntheticUnknown", {}, 422, "unknown_command", {"name": "SyntheticUnknown"}),
])
def test_dynamic_api_refusals_preserve_status_and_documents(opened, command, args, status, code, facts):
    from rdflib.compare import isomorphic
    client, pid = opened
    document = editing.editing_service.document(pid, "model")
    before = Graph()
    for triple in document.graph: before.add(triple)
    revision = document.ontology.revision
    response = client.post(f"/api/projects/{pid}/documents/model/commands", json={"command": command, "args": args})
    assert response.status_code == status, response.text
    data = response.json()
    assert data["uiMessage"] == {"code": "editing.guard." + code, "args": facts}
    if status == 409:
        assert data["detail"]["code"] == "already_defined"
        assert data["detail"]["property"]["iri"] == "http://example.org/shop#memberOf"
        assert isinstance(data["detail"]["message"], str)
    else: assert isinstance(data["detail"], str)
    assert document.ontology.revision == revision
    assert isomorphic(document.graph, before)


@pytest.mark.parametrize("language", [None, "JA"])
def test_preferred_name_conflict_captures_raw_language_without_mutation(language):
    from rdflib import Literal
    from rdflib.namespace import SKOS
    concept = URIRef("https://example.test/concept")
    graph = Graph()
    graph.add((concept, SKOS.prefLabel, Literal("犬 <b>{name}", lang=language)))
    context = editing.Context(graph, {"baseIri": "https://example.test/", "primaryLanguage": "ja"}, lambda: None)
    before = set(graph)
    term = Literal("別名", lang=language)
    with pytest.raises(editing.CommandError) as caught:
        editing._check_pref_label(context, concept, SKOS.prefLabel, term)
    assert "skos:prefLabel" in str(caught.value)
    expected = {"name": context.name(concept)}
    if language: expected["language"] = term.language
    assert caught.value.ui_message == {"code": "editing.guard.pref_label_" + ("language" if language else "plain"), "args": expected}
    assert set(graph) == before


@pytest.mark.parametrize("form", ["none", "one", "union", "separate"])
def test_existing_property_conflict_keeps_domain_grouping_and_literal_names(form):
    from rdflib import Literal
    from rdflib.collection import Collection
    prop, a, b = [URIRef("https://example.test/" + key) for key in ("p", "a", "b")]
    graph = Graph()
    graph.add((prop, RDF.type, OWL.ObjectProperty))
    for term, label in [(prop, "関連 <b>{p}"), (a, "A 甲 {a}"), (b, "B 乙 <img>")]:
        graph.add((term, RDFS.label, Literal(label, lang="ja")))
    if form == "union":
        union, head = BNode(), BNode()
        graph.add((prop, RDFS.domain, union)); graph.add((union, OWL.unionOf, head))
        Collection(graph, head, [a, b])
    elif form in {"one", "separate"}:
        graph.add((prop, RDFS.domain, a))
        if form == "separate": graph.add((prop, RDFS.domain, b))
    context = editing.Context(graph, {"baseIri": "https://example.test/", "primaryLanguage": "ja"}, lambda: None)
    before = set(graph)
    with pytest.raises(editing.AlreadyDefined) as caught:
        editing._new_property(context, prop, OWL.ObjectProperty)
    facts = {"name": "関連 <b>{p}", "kind": [{"code": "words.kind.objectProperty", "args": {}}]}
    if form != "none":
        facts["classes"] = [{"text": "A 甲 {a}"}]
        if form != "one": facts["classes"] += [{"code": "words.list.and" if form == "separate" else "words.list.or", "args": {}}, {"text": "B 乙 <img>"}]
    assert caught.value.ui_message == {"code": "editing.guard.property_exists" + ("_domain" if form != "none" else ""), "args": facts}
    assert caught.value.property["domain"]["form"] == form
    assert set(graph) == before


@pytest.mark.parametrize("source", [None, "Imported <b>{source}"])
def test_imported_parent_refusal_keeps_first_class_and_source_as_data(source):
    plan = {"imported": [{"label": "外部 <img>{name}", "from": source}, {"label": "second", "from": "other"}]}
    expected = {"name": "外部 <img>{name}"}
    if source: expected["source"] = source
    assert editing._imported_parent_message(plan) == {"code": "editing.guard.imported_parent" + ("" if source else "_unknown"), "args": expected}


@pytest.mark.parametrize("low,high", [(2**53 + 1, 1), (10**400, 1), (10**400, 10**399)])
def test_conflicting_count_bounds_keep_exact_integers_and_refusal(opened, low, high):
    from rdflib.compare import isomorphic
    client, pid = opened
    url = f"/api/projects/{pid}/documents/shapes/commands"
    created = client.post(url, json={"command": "CreateShape", "args": {"target": "shop:Person", "name": "Count guards"}})
    assert created.status_code == 200, created.text
    document = editing.editing_service.document(pid, "shapes")
    before = Graph()
    for triple in document.graph: before.add(triple)
    revision = document.ontology.revision
    response = client.post(url, json={"command": "AddRule", "args": {"shape": created.json()["created"],
        "rule": {"path": ["rdfs:label"], "minCount": low, "maxCount": high}}})
    assert response.status_code == 422, response.text
    data = response.json()
    assert data["uiMessage"] == {"code": "editing.guard.count_bounds_conflict", "args": {
        "low": str(low), "high": str(high) if high > 2**53 - 1 else high}}
    assert str(low) in data["detail"] and str(high) in data["detail"]
    assert document.ontology.revision == revision
    assert isomorphic(document.graph, before)


@pytest.mark.parametrize("low", [2**53 + 1, 10**400])
def test_stored_owl_count_conflict_keeps_exact_refusal(opened, low):
    from rdflib.compare import isomorphic
    client, pid = opened
    source = f'''@prefix shop: <http://example.org/shop#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
shop:Person a owl:Class; rdfs:subClassOf [a owl:Restriction; owl:onProperty shop:memberOf; owl:minCardinality {low}] .
shop:memberOf a owl:ObjectProperty .'''
    applied = client.put(f"/api/projects/{pid}/documents/model/source", json={"text": source})
    assert applied.status_code == 200, applied.text
    document = editing.editing_service.document(pid, "model")
    before = Graph()
    for triple in document.graph: before.add(triple)
    revision = document.ontology.revision
    response = client.post(f"/api/projects/{pid}/documents/model/commands", json={"command": "AddRestriction",
        "args": {"class": "shop:Person", "property": "shop:memberOf", "kind": "atMost", "n": 1}})
    assert response.status_code == 422, response.text
    data = response.json()
    assert data["uiMessage"]["code"] == "model.count.conflict"
    assert data["uiMessage"]["args"]["low"] == str(low)
    assert data["uiMessage"]["args"]["high"] == 1
    assert str(low) in data["detail"]
    assert document.ontology.revision == revision
    assert isomorphic(document.graph, before)
