"""
================================================================================
FILE: backend/tests/test_model_message_metadata.py
SUMMARY
    Modeling checks retain string compatibility and add exact display facts.
BASIC IDEA
    Exercise each chaining explanation and graph-check family with distinct
    literal names. Warnings retain block, fix and disjoint identity while
    exposing metadata without changing graphs or legacy sentences.
INPUTS / INPUT SOURCES
    Synthetic RDF graphs and Japanese names with braces and HTML-like text.
EXPECTED OUTPUT
    Valid metadata, original operands, str/None compatibility and stable RDF.
================================================================================
"""
import json
import pytest
from rdflib import BNode, Graph, URIRef
from rdflib.collection import Collection
from rdflib.compare import isomorphic
from rdflib.namespace import OWL, RDF, RDFS, SKOS
from app import modeling_checks as checks
from app.messages import make_message

P, Q, A, B, C = [URIRef("https://example.test/" + key) for key in ("p", "q", "A", "B", "C")]
LABELS = {P: "関連 <b>{p}", Q: "逆向き {q}", A: "A 甲 <img>{a}", B: "B 乙 {b}", C: "C 丙 {c}"}
name = LABELS.__getitem__
part = lambda value: {"text": value}
word = lambda code: {"code": code, "args": {}}


def described(result, code, **args):
    assert isinstance(result, str) and result
    assert json.loads(json.dumps(result)) == str(result)
    assert getattr(result, "ui_message", None) == {"code": code, "args": args}
    assert make_message(code, **args) == result.ui_message


@pytest.mark.parametrize("first,second", [("symmetric", "asymmetric"), ("reflexive", "irreflexive")])
def test_characteristic_conflict(first, second):
    graph = Graph(); graph.add((P, RDF.type, checks.CHARACTERISTICS[first]))
    result = checks.characteristic_refusal(graph, P, second, True, name)
    assert result == next(text for a, b, text in checks.CONFLICTS if a == first)
    described(result, f"model.conflict.{first}_{second}")
    assert checks.characteristic_refusal(graph, P, second, False, name) is None


@pytest.mark.parametrize("feature", ["functional", "inverseFunctional", "asymmetric", "irreflexive"])
@pytest.mark.parametrize("mode,how,subject", [("self", "self", None), ("under", "under", None),
    ("inverse", "inverse", None), ("changed_under", "under", Q), ("changed_inverse", "inverse", Q)])
def test_characteristic_chaining_frames(feature, mode, how, subject):
    args = {"characteristic": [word("words.characteristic." + feature)]}
    if mode != "self": args["name"] = name(P)
    if mode.startswith("changed_"): args["source"] = name(Q)
    described(checks.chaining_sentence(P, feature, (Q, how), name, subject), "model.chain." + mode, **args)


@pytest.mark.parametrize("how", ["self", "under", "inverse"])
def test_counted_chaining_frames(how):
    args = {"name": name(P)}
    if how != "self": args["source"] = name(Q)
    described(checks.chaining_sentence(P, "counted", (P if how == "self" else Q, how), name), "model.chain.counted_" + how, **args)


@pytest.mark.parametrize("how", ["self", "under", "inverse"])
def test_counting_refusal_does_not_change_graph(how):
    graph = Graph(); graph.add((P if how == "self" else Q, RDF.type, OWL.TransitiveProperty))
    if how == "under": graph.add((Q, RDFS.subPropertyOf, P))
    if how == "inverse": graph.add((Q, OWL.inverseOf, P))
    before = Graph()
    for triple in graph: before.add(triple)
    args = {"name": name(P)}
    if how == "under": args["source"] = name(Q)
    described(checks.counting_refusal(graph, P, name), "model.count." + how, **args)
    assert isomorphic(graph, before)
    assert checks.counting_refusal(Graph(), P, name) is None


def test_count_conflict_and_inverse_keep_raw_labels():
    result = checks.count_conflict_refusal(name(A), "has line <b>{p}", 3, 2)
    assert str(result) == f'{name(A)} cannot have at least 3 and at most 2 line <b>{{p}}s.'
    described(result, "model.count.conflict", name=name(A), property="has line <b>{p}", low=3, high=2)
    assert checks.count_conflict_refusal(name(A), name(P), 2, 3) is None
    described(checks.own_inverse_refusal(P, P, name(P)), "model.inverse.self", name=name(P))
    assert checks.own_inverse_refusal(P, Q, name(P)) is None


@pytest.mark.parametrize("function,predicate,code", [(checks.broader_loop_refusal, SKOS.broader, "model.loop.broader"),
    (checks.subproperty_loop_refusal, RDFS.subPropertyOf, "model.loop.property")])
def test_loop_direction(function, predicate, code):
    graph = Graph(); graph.add((B, predicate, A))
    described(function(graph, A, B, name), code, name=name(A))
    assert function(Graph(), A, B, name) is None


@pytest.mark.parametrize("reverse", [False, True])
def test_related_conflict_direction(reverse):
    graph = Graph(); graph.add((A, SKOS.broader, B))
    a, b = (B, A) if reverse else (A, B)
    described(checks.related_refusal(graph, a, b, name), "model.related.broader", narrow=name(A), broad=name(B))
    graph = Graph(); graph.add((a, SKOS.related, b))
    described(checks.broader_related_refusal(graph, A, B, name), "model.broader.related", narrow=name(A), broad=name(B))
    assert checks.related_refusal(Graph(), A, B, name) is None
    assert checks.broader_related_refusal(Graph(), A, B, name) is None


@pytest.mark.parametrize("predicate,existing,code", [(OWL.disjointWith, OWL.equivalentClass, "disjoint_equivalent"),
    (OWL.equivalentClass, OWL.disjointWith, "equivalent_disjoint")])
def test_pair_conflict(predicate, existing, code):
    graph = Graph(); graph.add((A, existing, B))
    described(checks.pair_refusal(graph, A, B, predicate, name), "model.class." + code, first=name(A), second=name(B))
    assert checks.pair_refusal(Graph(), A, B, predicate, name) is None


@pytest.mark.parametrize("predicate,code", [(OWL.disjointWith, "disjoint_self"), (OWL.equivalentClass, "equivalent_self")])
def test_pair_self(predicate, code):
    described(checks.pair_refusal(Graph(), A, A, predicate, name), "model.class." + code)


def classes(graph, form):
    if form == "one": graph.add((P, RDFS.domain, A))
    elif form == "all":
        graph.add((P, RDFS.domain, A)); graph.add((P, RDFS.domain, B))
    else:
        union, head = BNode(), BNode()
        graph.add((P, RDFS.domain, union)); graph.add((union, OWL.unionOf, head)); Collection(graph, head, [A, B])
    return [part(name(A))] if form == "one" else [part(name(A)), word("words.list.and" if form == "all" else "words.list.or"), part(name(B))]


@pytest.mark.parametrize("kind", ["symmetric", "reflexive"])
@pytest.mark.parametrize("form", ["one", "all", "any"])
def test_domain_group_meaning(kind, form):
    graph = Graph(); graph.add((P, RDF.type, OWL.ObjectProperty)); graph.add((P, RDF.type, checks.CHARACTERISTICS[kind]))
    graph.add((P, RDFS.range, C)); parts = classes(graph, form)
    warnings = checks.warnings(graph, P, name)
    assert len(warnings) == 1
    args = {"classes": parts}
    if kind == "symmetric": args.update(name=name(P), end=name(C))
    assert warnings[0]["uiMessage"] == {"code": f"model.warning.{kind}.{form}", "args": args}
    assert warnings[0]["block"] == "characteristics"


@pytest.mark.parametrize("kind", ["attribute", "relationship"])
def test_separate_domain_and_fix(kind):
    graph = Graph(); graph.add((P, RDF.type, OWL.DatatypeProperty if kind == "attribute" else OWL.ObjectProperty))
    parts = classes(graph, "all")
    for cls in (A, B): graph.add((cls, RDF.type, OWL.Class))
    warning = checks.domain_warning(graph, graph, P, name)
    assert warning["uiMessage"] == {"code": "model.warning.domain." + kind, "args": {"name": name(P), "classes": parts}}
    assert warning["code"] == "separate" and warning["fix"]["args"] == {"property": str(P), "how": "union"}
    assert warning["fix"]["uiMessage"] == {"code": "model.fix.share", "args": {}}


def test_inverse_fix_direction():
    graph = Graph()
    for prop in (P, Q):
        graph.add((prop, RDF.type, OWL.ObjectProperty)); graph.add((prop, RDFS.domain, A)); graph.add((prop, RDFS.range, B))
    graph.add((P, OWL.inverseOf, Q)); warning = checks.warnings(graph, P, name)[0]
    args = {"name": name(Q), "from_name": name(B), "to_name": name(A)}
    assert warning["uiMessage"] == {"code": "model.warning.inverse_ends", "args": args}
    assert warning["fix"]["uiMessage"] == {"code": "model.fix.inverse_ends", "args": args}
    assert warning["fix"]["args"] == {"property": str(Q), "domain": str(B), "range": str(A)}


@pytest.mark.parametrize("mode", ["self", "parent", "both"])
def test_never_member_names(mode):
    graph = Graph()
    if mode == "self": graph.add((A, OWL.disjointWith, A)); args = {"name": name(A)}
    elif mode == "parent":
        graph.add((A, RDFS.subClassOf, B)); graph.add((A, OWL.disjointWith, B)); args = {"name": name(A), "parent": name(B)}
    else:
        graph.add((A, RDFS.subClassOf, B)); graph.add((A, RDFS.subClassOf, C)); graph.add((B, OWL.disjointWith, C))
        args = {"name": name(A), "first": name(B), "second": name(C)}
    warning = checks.never_members(graph, A, name)[0]
    assert warning["uiMessage"] == {"code": "model.members." + mode, "args": args}
    if mode == "parent": assert warning["disjoint"] == str(B)


@pytest.fixture
def project_client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.editing import editing_service
    client = TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio": "1"})
    response = client.post("/api/projects", json={"name": "Synthetic model", "template": "empty",
        "baseIri": "https://example.test/", "prefix": "ex", "primaryLanguage": "ja"})
    assert response.status_code == 200, response.text
    pid = response.json()["id"]
    assert client.post(f"/api/projects/{pid}/open").status_code == 200
    try:
        yield client, pid
    finally:
        editing_service.close_all()
        client.close()


def api_graph(client, pid, graph):
    from rdflib import Literal
    for term, label in LABELS.items(): graph.add((term, RDFS.label, Literal(label, lang="ja")))
    for term in (A, B, C): graph.add((term, RDF.type, OWL.Class))
    for term in (P, Q): graph.add((term, RDF.type, OWL.ObjectProperty))
    response = client.put(f"/api/projects/{pid}/documents/model/source", json={"text": graph.serialize(format="turtle")})
    assert response.status_code == 200, response.text


@pytest.mark.parametrize("mode,command,args,code,facts", [
    ("conflict", "SetCharacteristic", {"property": str(P), "characteristic": "asymmetric", "on": True}, "model.conflict.symmetric_asymmetric", {}),
    ("loop", "AddBroader", {"concept": str(A), "broader": str(B)}, "model.loop.broader", {"name": name(A)}),
    ("related", "AddRelated", {"concept": str(A), "related": str(B)}, "model.related.broader", {"narrow": name(A), "broad": name(B)}),
    ("count", "AddRestriction", {"class": str(A), "property": str(P), "kind": "exactly", "n": 2}, "model.count.self", {"name": name(P)}),
    ("inverse", "SetInverse", {"property": str(P), "inverse": str(P)}, "model.inverse.self", {"name": name(P)}),
    ("pair", "AddDisjointWith", {"a": str(A), "b": str(B)}, "model.class.disjoint_equivalent", {"first": name(A), "second": name(B)}),
])
def test_command_forwarding_keeps_status_and_graph(project_client, mode, command, args, code, facts):
    from app.editing import editing_service
    client, pid = project_client
    graph = Graph()
    if mode == "conflict": graph.add((P, RDF.type, OWL.SymmetricProperty))
    elif mode == "loop": graph.add((B, SKOS.broader, A))
    elif mode == "related": graph.add((A, SKOS.broader, B))
    elif mode == "count": graph.add((P, RDF.type, OWL.TransitiveProperty))
    elif mode == "pair": graph.add((A, OWL.equivalentClass, B))
    if mode in ("loop", "related"):
        for term in (A, B): graph.add((term, RDF.type, SKOS.Concept))
    api_graph(client, pid, graph)
    document = editing_service.document(pid, "model")
    before, revision = Graph(), document.ontology.revision
    for triple in document.graph: before.add(triple)
    response = client.post(f"/api/projects/{pid}/documents/model/commands", json={"command": command, "args": args})
    assert response.status_code == 422, response.text
    assert response.json()["uiMessage"] == {"code": code, "args": facts}
    assert isinstance(response.json()["detail"], str) and response.json()["detail"]
    assert document.ontology.revision == revision and isomorphic(before, document.graph)


def test_node_warning_metadata_and_fix_remain_additive(project_client):
    client, pid = project_client
    graph = Graph(); graph.add((P, RDF.type, OWL.SymmetricProperty)); classes(graph, "all"); graph.add((P, RDFS.range, C))
    graph.add((A, OWL.disjointWith, A))
    api_graph(client, pid, graph)
    response = client.get(f"/api/ontologies/{pid}-model/node", params={"iri": str(P), "lang": "ja"})
    assert response.status_code == 200, response.text
    warnings = response.json()["warnings"]
    assert [warning["uiMessage"]["code"] for warning in warnings] == ["model.warning.symmetric.all", "model.warning.domain.relationship"]
    for warning in warnings:
        assert warning["text"] and make_message(warning["uiMessage"]["code"], **warning["uiMessage"]["args"]) == warning["uiMessage"]
    assert warnings[1]["fix"]["uiMessage"] == {"code": "model.fix.share", "args": {}}
    response = client.get(f"/api/ontologies/{pid}-model/node", params={"iri": str(A), "lang": "ja"})
    assert response.json()["rules"]["warnings"][0]["uiMessage"] == {"code": "model.members.self", "args": {"name": name(A)}}


def test_described_string_copies_parts_and_validates_contract():
    from app.messages import MessageText
    parts = [{"text": "甲 <b>{name}"}]
    text = MessageText("Unchanged original", "model.warning.reflexive.any", classes=parts)
    parts[0]["text"] = "changed"
    assert text == "Unchanged original" and json.dumps(text) == '"Unchanged original"'
    assert text.ui_message["args"]["classes"] == [{"text": "甲 <b>{name}"}]
    with pytest.raises(ValueError): MessageText("Original", "future.code")
    with pytest.raises(ValueError): MessageText("Original", "model.count.conflict", name="a", property="p", low=[], high=2)
