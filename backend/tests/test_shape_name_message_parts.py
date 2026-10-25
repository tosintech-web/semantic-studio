"""
================================================================================
FILE: backend/tests/test_shape_name_message_parts.py
SUMMARY
    Editing distinguishes an unnamed shape from identical authored English names.
BASIC IDEA
    Exercise real shape commands against synthetic graphs; preserve legacy
    labels and RDF deltas while localizing only an owned fallback name.
INPUTS / INPUT SOURCES
    Blank/named shapes, authored labels and the actual editing command handlers.
EXPECTED OUTPUT
    A word token only for missing names; authored names stay literal strings.
================================================================================
"""
import pytest
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.namespace import OWL, RDF, RDFS, XSD
from app import editing, shapes_form

EX = "https://synthetic.example/"
SH = shapes_form.SH


def context(label=None, *, named=False, readonly=False):
    graph = Graph()
    graph.bind("ex", EX)
    graph.bind("sh", SH)
    node = URIRef(EX + "S") if named else BNode("synthetic-shape")
    graph.add((node, RDF.type, SH.NodeShape))
    graph.add((node, SH.targetClass, URIRef(EX + "C")))
    if label is not None:
        graph.add((node, RDFS.label, Literal(label, lang="ja")))
    if readonly:
        graph.add((node, SH.closed, Literal(True)))
    model = Graph()
    for cls in ("C", "D"):
        model.add((URIRef(EX + cls), RDF.type, OWL.Class))
        model.add((URIRef(EX + cls), RDFS.label, Literal(cls, lang="ja")))
    model.add((URIRef(EX + "p"), RDF.type, OWL.DatatypeProperty))
    model.add((URIRef(EX + "p"), RDFS.range, XSD.string))
    manifest = {"baseIri": EX, "prefix": "ex", "primaryLanguage": "ja", "languages": ["en"], "kind": "ontology"}
    return editing.Context(graph, manifest, lambda: None, "shapes", model=lambda: model), node


CASES = [
    ("SetShapeTarget", {"target": EX + "D"}, "name", "Made {name} apply to D"),
    ("SetShapeName", {"value": "新しい制約"}, "old", "Renamed shape {name} to 新しい制約"),
    ("SetShapeSeverity", {"severity": "warning"}, "name", "Made a failure of {name} a warning"),
    ("SetShapeMessage", {"value": "検証文"}, "name", "Set the message of {name}"),
    ("AddRule", {"rule": {"path": [EX + "p"], "minCount": 1}}, "shape_name", "Added a rule on p to {name}"),
    ("DeleteShape", {}, "name", "Deleted shape {name}"),
]


@pytest.mark.parametrize("label,named", [(None,False), ("the shape",False), ("Unnamed shape",False), ("制約 <img>{raw}",False), (None,True)])
@pytest.mark.parametrize("command,args,field,legacy", CASES)
def test_shape_change_uses_an_owned_token_only_for_missing_blank_node_names(label, named, command, args, field, legacy):
    ctx, node = context(label, named=named)
    before = set(ctx.graph), set(ctx.model)
    change = editing.SHAPE_COMMANDS[command](ctx, {"shape": shapes_form.shape_id(node), **args})
    name = label if label is not None else "ex:S" if named else "the shape"
    assert change.label == legacy.format(name=name)
    expected = [{"code": "words.editing.the_shape", "args": {}}] if label is None and not named else name
    assert change.ui_message["args"][field] == expected
    assert (set(ctx.graph), set(ctx.model)) == before
    if command == "SetShapeName":
        assert (node, RDFS.label, Literal("新しい制約", lang="ja")) in change.added
    if command == "SetShapeMessage":
        assert (node, SH.message, Literal("検証文", lang="ja")) in change.added


@pytest.mark.parametrize("label", [None, "the shape"])
@pytest.mark.parametrize("command,args", [
    ("SetShapeMessage", {"value": None}),
    ("ReplaceRule", {"path": [EX + "p"], "rule": {"path": [EX + "p"], "minCount": 1}}),
    ("RemoveRule", {"path": [EX + "p"]}),
])
def test_shape_refusal_distinguishes_missing_names_from_authored_text(label, command, args):
    ctx, node = context(label)
    before = set(ctx.graph)
    with pytest.raises(editing.CommandError) as caught:
        editing.SHAPE_COMMANDS[command](ctx, {"shape": shapes_form.shape_id(node), **args})
    assert str(caught.value).startswith("the shape has no")
    assert caught.value.ui_message["args"]["name"] == (
        [{"code": "words.editing.the_shape", "args": {}}] if label is None else label)
    assert set(ctx.graph) == before


@pytest.mark.parametrize("label", [None, "Unnamed shape"])
def test_readonly_shape_guard_forwards_existing_default_name_ownership(label):
    ctx, node = context(label, readonly=True)
    before = set(ctx.graph)
    with pytest.raises(editing.CommandError) as caught:
        editing.SHAPE_COMMANDS["SetShapeName"](ctx, {"shape": shapes_form.shape_id(node), "value": "新しい制約"})
    assert str(caught.value).startswith("Unnamed shape is written in Turtle")
    assert caught.value.ui_message["args"]["name"] == (
        [{"code": "words.validation.unnamed_shape", "args": {}}] if label is None else label)
    assert set(ctx.graph) == before
