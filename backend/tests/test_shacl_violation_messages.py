"""
================================================================================
FILE: backend/tests/test_shacl_violation_messages.py
SUMMARY
    SHACL explanations retain their legacy sentences and expose display facts.
BASIC IDEA
    Exercise the actual constraint families with multilingual RDF names and raw
    values. Authored messages stay authored; metadata never contains inflected
    English fragments or rounded RDF counts.
INPUTS / INPUT SOURCES
    Synthetic data/shapes graphs, standard constraint components and literals.
EXPECTED OUTPUT
    Valid flat metadata, original RDF, exact large counts and language identities.
================================================================================
"""
import json
import pytest
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.collection import Collection
from rdflib.namespace import OWL, RDF, RDFS, SKOS, XSD
from app import shacl
from app.messages import make_message

EX = "https://example.test/"
FOCUS, PATH, SOURCE, OWNER, CLASS = [URIRef(EX + name) for name in ("focus", "property", "source", "owner", "Class")]
WHO = "子 <b>{focus}"
PROP = "備考 <img>{path}"
SH = shacl.SH


def fixture(component, params=None, values=None, relationship=False):
    data, shapes = Graph(), Graph()
    for node, ja, en in [(FOCUS, WHO, "Child {focus}"), (PATH, PROP, "Notes {path}"), (CLASS, "対象 {class}", "Target {class}")]:
        data.add((node, RDFS.label, Literal(ja, lang="ja")))
        data.add((node, RDFS.label, Literal(en, lang="en")))
    data.add((PATH, RDF.type, OWL.ObjectProperty if relationship else OWL.DatatypeProperty))
    data.add((CLASS, RDF.type, OWL.Class)); data.add((FOCUS, RDF.type, CLASS))
    for value in values or []: data.add((FOCUS, PATH, value))
    shapes.add((SOURCE, SH.path, PATH)); shapes.add((OWNER, SH.property, SOURCE))
    shapes.add((OWNER, SH.targetClass, CLASS))
    for predicate, value in (params or {}).items():
        if isinstance(value, list):
            head = BNode(); Collection(shapes, head, value); value = head
        shapes.add((SOURCE, predicate, value))
    result = {"source": SOURCE, "focus": FOCUS, "path": PATH,
        "value": (values or [Literal("<i>{value}")])[0], "component": component, "message": None}
    return shacl.Sentences(data, shapes, ["ja", "en"]), data, shapes, result


CASES = [
    (SH.MinCountConstraintComponent, {SH.minCount: Literal(1)}, [], False, "min_count.attribute", {"have": 0, "limit": 1}),
    (SH.MinCountConstraintComponent, {SH.minCount: Literal(3)}, [Literal("x")], False, "min_count.attribute", {"have": 1, "limit": 3}),
    (SH.MinCountConstraintComponent, {SH.minCount: Literal(1)}, [], True, "min_count.relationship", {"have": 0, "limit": 1}),
    (SH.MinCountConstraintComponent, {SH.minCount: Literal(2)}, [], True, "min_count.relationship", {"have": 0, "limit": 2}),
    (SH.MinCountConstraintComponent, {SH.minCount: Literal(3)}, [URIRef(EX + "a")], True, "min_count.relationship", {"have": 1, "limit": 3}),
    (SH.MaxCountConstraintComponent, {SH.maxCount: Literal(1)}, [Literal("a"), Literal("b")], False, "max_count.attribute", {"have": 2, "limit": 1}),
    (SH.MaxCountConstraintComponent, {SH.maxCount: Literal(1)}, [URIRef(EX + "a"), URIRef(EX + "b")], True, "max_count.relationship", {"have": 2, "limit": 1}),
    (SH.DatatypeConstraintComponent, {SH.datatype: XSD.integer}, [Literal("raw")], False, "datatype", {"datatype": "xsd:integer"}),
    (SH.DatatypeConstraintComponent, {SH.datatype: URIRef(EX + "Custom")}, [Literal("raw")], False, "datatype", {"datatype": EX + "Custom"}),
    (SH.ClassConstraintComponent, {SH["class"]: CLASS}, [URIRef(EX + "other")], True, "class", {}),
    (SH.MinLengthConstraintComponent, {SH.minLength: Literal(3)}, [Literal("x")], False, "min_length", {"limit": 3}),
    (SH.MaxLengthConstraintComponent, {SH.maxLength: Literal(1)}, [Literal("long")], False, "max_length", {"limit": 1}),
    (SH.PatternConstraintComponent, {SH.pattern: Literal("^a")}, [Literal("b")], False, "pattern", {}),
    (SH.MinInclusiveConstraintComponent, {SH.minInclusive: Literal(10)}, [Literal(1)], False, "min_inclusive", {}),
    (SH.MaxInclusiveConstraintComponent, {SH.maxInclusive: Literal(10)}, [Literal(20)], False, "max_inclusive", {}),
    (SH.InConstraintComponent, {SH["in"]: [Literal("甲 {allowed}"), Literal("乙 <b>")]}, [Literal("other")], False, "in", {}),
    (SH.LanguageInConstraintComponent, {SH.languageIn: [Literal("ja"), Literal("en")]}, [Literal("raw", lang="de")], False, "language.project.tagged", {}),
    (SH.LanguageInConstraintComponent, {SH.languageIn: [Literal("ja"), Literal("en")]}, [Literal("raw")], False, "language.project.untagged", {}),
    (SH.LanguageInConstraintComponent, {SH.languageIn: [Literal("en-US")]}, [Literal("raw", lang="ja")], False, "language.allowed.tagged", {}),
    (SH.LanguageInConstraintComponent, {SH.languageIn: [Literal("en-US")]}, [Literal("raw")], False, "language.allowed.untagged", {}),
    (SH.UniqueLangConstraintComponent, {}, [Literal("a", lang="ja"), Literal("b", lang="ja")], False, "unique_language.one", {"count": 2}),
    (SH.UniqueLangConstraintComponent, {}, [Literal("a", lang="ja"), Literal("b", lang="ja"), Literal("c", lang="en"), Literal("d", lang="en")], False, "unique_language.many", {"count": 4}),
    (SH.UniqueLangConstraintComponent, {}, [Literal("a", lang="ja")], False, "unique_language", {}),
    (SH.HasValueConstraintComponent, {SH.hasValue: Literal("必要 <b>{value}", lang="ja")}, [], False, "has_value", {}),
    (URIRef(EX + "UnknownConstraint"), {}, [Literal("raw")], False, "other", {}),
]


@pytest.mark.parametrize("component,params,values,relationship,key,expected", CASES)
def test_constraint_families_keep_raw_names_and_facts(component, params, values, relationship, key, expected):
    reader, data, shapes, result = fixture(component, params, values, relationship)
    before = (set(data), set(shapes))
    sentence = reader.sentence(result, OWNER)
    wire = getattr(sentence, "ui_message", None)
    assert wire is not None, str(sentence)
    assert isinstance(sentence, str) and str(sentence)
    assert wire["code"] == "validation.violation." + key
    assert wire["args"]["focus"] == [{"text": WHO}]
    assert wire["args"]["path"] == [{"text": PROP}]
    for name, value in expected.items(): assert wire["args"][name] == value
    assert make_message(wire["code"], **wire["args"]) == wire
    assert json.loads(json.dumps(sentence, ensure_ascii=False)) == str(sentence)
    assert (set(data), set(shapes)) == before


@pytest.mark.parametrize("low", [True, False])
@pytest.mark.parametrize("datatype", [True, False])
@pytest.mark.parametrize("relationship", [True, False])
def test_qualified_counts_keep_matching_kind_and_count(low, datatype, relationship):
    component = SH.QualifiedMinCountConstraintComponent if low else SH.QualifiedMaxCountConstraintComponent
    predicate = SH.qualifiedMinCount if low else SH.qualifiedMaxCount
    reader, data, shapes, result = fixture(component, {predicate: Literal(3 if low else 0)}, [Literal("text") if datatype else URIRef(EX + "member")], relationship)
    inner = BNode(); shapes.add((SOURCE, SH.qualifiedValueShape, inner))
    shapes.add((inner, SH.datatype if datatype else SH["class"], XSD.string if datatype else CLASS))
    if not datatype: data.add((URIRef(EX + "member"), RDF.type, CLASS))
    sentence = reader.sentence(result, OWNER)
    wire = getattr(sentence, "ui_message", None)
    assert wire is not None, sentence
    assert wire["code"] == "validation.violation.qualified." + ("min" if low else "max") + (".datatype" if datatype else ".class")
    assert wire["args"]["have"] == 1
    assert wire["args"]["qualifier"] == [{"text": "xsd:string" if datatype else "対象 {class}"}]
    assert wire["args"]["limit"] == (3 if low else 0)


def test_large_rdf_limit_is_exact_and_does_not_acquire_a_numeric_cap():
    limit = 2**63 + 1
    reader, _, _, result = fixture(SH.MinCountConstraintComponent, {SH.minCount: Literal(limit)}, [])
    sentence = reader.sentence(result, OWNER)
    wire = getattr(sentence, "ui_message", None)
    assert wire is not None
    assert wire["args"]["limit"] == str(limit)
    assert str(limit) in str(sentence)


@pytest.mark.parametrize("at_owner", [False, True])
def test_authored_message_is_unchanged_rdf_text_without_owned_metadata(at_owner):
    reader, data, shapes, result = fixture(SH.MinCountConstraintComponent, {SH.minCount: Literal(1)}, [])
    message = "独自の説明 <b>{focus} every Person"
    shapes.add((OWNER if at_owner else SOURCE, SH.message, Literal(message, lang="ja")))
    assert reader.sentence(result, OWNER) == message
    assert getattr(reader.sentence(result, OWNER), "ui_message", None) is None


def test_required_language_keeps_its_exact_tag_and_limit():
    reader, _, shapes, result = fixture(SH.QualifiedMinCountConstraintComponent, {SH.qualifiedMinCount: Literal(2)}, [])
    inner, head = BNode(), BNode()
    shapes.add((SOURCE, SH.qualifiedValueShape, inner)); shapes.add((inner, SH.languageIn, head))
    Collection(shapes, head, [Literal("en-US")])
    wire = getattr(reader.sentence(result, OWNER), "ui_message", None)
    assert wire is not None
    assert wire["code"] == "validation.violation.qualified_language"
    assert wire["args"]["limit"] == 2
    assert wire["args"]["language"] == [{"code": "words.language.en", "args": {}}, {"text": " (en-US)"}]


def test_named_property_called_definition_is_not_mistaken_for_a_standard_ui_word():
    reader, data, _, result = fixture(SH.MinCountConstraintComponent, {SH.minCount: Literal(1)}, [])
    data.set((PATH, RDFS.label, Literal("definition", lang="ja")))
    wire = getattr(reader.sentence(result, OWNER), "ui_message", None)
    assert wire is not None
    assert wire["args"]["path"] == [{"text": "definition"}]
    result["path"] = RDFS.label
    wire = reader.sentence(result, OWNER).ui_message
    assert wire["args"]["path"] == [{"code": "words.path.name", "args": {}}]


def test_names_follow_requested_rdf_languages_and_do_not_follow_ui_language():
    reader, _, _, result = fixture(SH.MinCountConstraintComponent, {SH.minCount: Literal(1)}, [])
    japanese = getattr(reader.sentence(result, OWNER), "ui_message", None)
    assert japanese is not None
    reader.languages = ["en", "ja"]
    english = reader.sentence(result, OWNER).ui_message
    assert japanese["args"]["focus"] == [{"text": WHO}]
    assert english["args"]["focus"] == [{"text": "Child {focus}"}]
    assert japanese["args"]["path"] == [{"text": PROP}]
    assert english["args"]["path"] == [{"text": "Notes {path}"}]


def test_an_unknown_engine_message_is_original_detail_not_a_translatable_argument():
    reader, _, _, result = fixture(URIRef(EX + "Unknown"), {}, [])
    result["message"] = Literal("Engine reason <b>{focus}")
    sentence = reader.sentence(result, OWNER)
    wire = getattr(sentence, "ui_message", None)
    assert wire is not None
    assert wire["code"] == "validation.violation.other"
    assert "Engine reason <b>{focus}" in str(sentence)
    assert "Engine reason" not in json.dumps(wire)


@pytest.mark.parametrize("family", ["count", "language", "qualified"])
def test_only_the_existing_visible_problem_cap_gets_display_metadata(monkeypatch, family):
    from app import messages
    reader, data, shapes, result = fixture(SH.MinCountConstraintComponent, {SH.minCount: Literal(1)}, [])
    result["severity"] = SH.Violation
    if family == "language":
        result["component"] = SH.UniqueLangConstraintComponent
        shapes.add((SOURCE, SH.uniqueLang, Literal(True)))
        data.add((FOCUS, PATH, Literal("a", lang="ja")))
        data.add((FOCUS, PATH, Literal("b", lang="ja")))
    elif family == "qualified":
        result["component"] = SH.QualifiedMinCountConstraintComponent
        shapes.add((SOURCE, SH.qualifiedMinCount, Literal(2)))
        inner = BNode(); shapes.add((SOURCE, SH.qualifiedValueShape, inner))
        shapes.add((inner, SH.datatype, XSD.string)); data.add((FOCUS, PATH, Literal("text")))
    real = messages.make_message
    calls = []
    def recording(code, **args):
        if code.startswith("validation.violation."): calls.append(code)
        return real(code, **args)
    monkeypatch.setattr(messages, "make_message", recording)
    panels = shacl.panels(data, shapes, [OWNER], [dict(result) for _ in range(1000)], {}, ["ja", "en"])
    assert panels[0]["problemsTotal"] == 1000
    assert len(panels[0]["problems"]) == shacl.PANEL_CAP
    assert len(calls) == shacl.PANEL_CAP
    assert all("uiMessage" in problem for problem in panels[0]["problems"])
    assert all(not key.startswith("_") for problem in panels[0]["problems"] for key in problem)


def test_literal_focus_has_no_fake_iri_and_keeps_its_rdf_lexical_value():
    reader, data, shapes, result = fixture(SH.DatatypeConstraintComponent)
    literal = Literal("三 <b>{focus}", lang="ja")
    data.add((FOCUS, PATH, literal))
    shapes.add((OWNER, SH.datatype, XSD.integer)); shapes.add((OWNER, SH.targetObjectsOf, PATH))
    result.update(source=OWNER, focus=literal, path=None, value=literal, severity=SH.Violation)
    problem = shacl.panels(data, shapes, [OWNER], [result], {}, ["ja"])[0]["problems"][0]
    assert problem["focus"] is None
    assert problem["focusLabel"] == "a node without a name"
    assert problem.get("focusLabelUiMessage") == {"code": "validation.term", "args": {"term": [{"text": '"三 <b>{focus}"@ja'}]}}
    assert problem["uiMessage"]["args"]["focus"] == [{"text": '"三 <b>{focus}"@ja'}]


def test_only_an_owned_unnamed_shape_label_gets_a_standard_word():
    reader, data, shapes, result = fixture(SH.MinCountConstraintComponent, {SH.minCount: Literal(1)}, [])
    owner = BNode()
    for _, predicate, value in list(shapes.triples((OWNER, None, None))):
        shapes.remove((OWNER, predicate, value)); shapes.add((owner, predicate, value))
    result["severity"] = SH.Violation
    panel = shacl.panels(data, shapes, [owner], [result], {}, ["ja"])[0]
    assert panel["name"] == "Unnamed shape" and panel["id"].startswith("_:")
    assert panel.get("nameUiMessage") == {"code": "words.validation.unnamed_shape", "args": {}}
    shapes.add((owner, RDFS.label, Literal("Unnamed shape", lang="en")))
    authored = shacl.panels(data, shapes, [owner], [result], {}, ["ja"])[0]
    assert authored["name"] == "Unnamed shape" and "nameUiMessage" not in authored


def test_only_a_blank_value_gets_a_translated_placeholder_not_an_authored_literal():
    reader, data, shapes, result = fixture(SH.ClassConstraintComponent, {SH["class"]: CLASS}, [])
    result.update(value=BNode(), severity=SH.Violation)
    problem = shacl.panels(data, shapes, [OWNER], [result], {}, ["ja"])[0]["problems"][0]
    assert problem["value"] == "a node without a name"
    assert problem.get("valueUiMessage") == {"code": "validation.term", "args": {"term": [{"code": "words.validation.unnamed_node", "args": {}}]}}
    result["value"] = Literal("a node without a name")
    authored = shacl.panels(data, shapes, [OWNER], [result], {}, ["ja"])[0]["problems"][0]
    assert authored["value"] == '"a node without a name"' and "valueUiMessage" not in authored
