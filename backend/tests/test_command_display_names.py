"""
================================================================================
FILE: backend/tests/test_command_display_names.py
SUMMARY
    Command display names follow the selected language without changing RDF or legacy text.
BASIC IDEA
    Issue real commands, undo them and repeat with Japanese display names. Compare
    resulting graphs and legacy labels, then check source metadata and history.
INPUTS / INPUT SOURCES
    A synthetic bilingual project, normal commands, refusals and read-only previews.
EXPECTED OUTPUT
    Japanese message operands, unchanged authored RDF and original compatibility text.
================================================================================
"""
import pytest
from rdflib import Graph
from rdflib.compare import isomorphic
from app.editing import editing_service
from tests.test_project_display_reads import create_project, client, EX, MODEL, SHAPES


@pytest.fixture
def project():
    pid = create_project()
    model = MODEL + '\nex:F a owl:Class ; rdfs:label "Class F"@en, "分類F"@ja .\nex:b a ex:D ; rdfs:label "Member B"@en, "対象B"@ja .\nex:rel a owl:ObjectProperty ; rdfs:domain ex:C ; rdfs:range ex:D ; rdfs:label "belongs to"@en, "所属"@ja .'
    shapes = SHAPES.replace('rdfs:label "Constraint"@en', 'rdfs:label "Constraint"@en, "制約"@ja')
    assert client.put(f"/api/projects/{pid}/documents/model/source", json={"text":model}).status_code == 200
    assert client.put(f"/api/projects/{pid}/documents/shapes/source", json={"text":shapes}).status_code == 200
    try:
        yield pid
    finally:
        editing_service.close_all()


def graphs(pid):
    found = {}
    for role in ("model", "shapes"):
        graph = Graph()
        for triple in editing_service.document(pid,role).graph: graph.add(triple)
        found[role] = graph
    return found


def command(pid, role, name, args, lang=None, *, dry=False):
    return client.post(f"/api/projects/{pid}/documents/{role}/commands", params={} if lang is None else {"lang":lang},
                       json={"command":name,"args":args,"dryRun":dry})


CASES = [
    ("model","AddSubClassOf",{"child":EX+"C","parent":EX+"E"},{"child":"分類C","parent":"分類E"}),
    ("model","RemoveSubClassOf",{"child":EX+"C","parent":EX+"D"},{"child":"分類C","parent":"分類D"}),
    ("model","SetDomain",{"property":EX+"p","target":EX+"D"},{"name":"項目p","target":"分類D"}),
    ("model","AddAnnotation",{"iri":EX+"C","property":"rdfs:comment","value":{"kind":"text","value":"Synthetic note"}},{"name":"分類C"}),
    ("model","SetLabel",{"iri":EX+"C","value":"New primary name","lang":"en"},{"name":"分類C"}),
    ("model","SetLabel",{"iri":EX+"C","value":"新しい分類C","lang":"ja"},{"name":"分類C"}),
    ("model","AddDisjointWith",{"a":EX+"C","b":EX+"E"},{"first":"分類C","second":"分類E"}),
    ("model","DeleteEntity",{"iri":EX+"C","strategy":"orphan"},{"name":"分類C"}),
    ("model","CreateExample",{"class":EX+"C","label":"New example"},{"class_name":"分類C"}),
    ("model","SetExampleValue",{"iri":EX+"a","property":EX+"rel","value":{"kind":"link","value":EX+"b"}},{"subject":"対象A","target":"対象B","property":"所属"}),
    ("shapes","SetShapeTarget",{"shape":EX+"S","target":EX+"D"},{"name":"制約","target":"分類D"}),
    ("shapes","SetShapeName",{"shape":EX+"S","value":"New shape name"},{"old":"制約"}),
    ("shapes","AddRule",{"shape":EX+"S","rule":{"path":[EX+"rel"],"minCount":1}},{"shape_name":"制約","path":[{"text":"所属"}]}),
    ("shapes","CreateShape",{"target":EX+"D"},{"name":"Class D rules"}),
    ("shapes","CreateShape",{"preset":"modelCheck"},{"name":"Check my model"}),
]


@pytest.mark.parametrize("role,name,args,display", CASES, ids=[case[1] for case in CASES])
def test_command_names_change_only_presentation_and_stay_with_the_history_step(project,role,name,args,display):
    before = graphs(project)
    original = command(project,role,name,args)
    assert original.status_code == 200, original.text
    original = original.json()
    expected_graphs = graphs(project)
    undone = client.post(f"/api/projects/{project}/documents/{role}/undo")
    assert undone.status_code == 200, undone.text
    for doc, graph in graphs(project).items(): assert isomorphic(graph,before[doc])
    chosen = command(project,role,name,args,"ja")
    assert chosen.status_code == 200, chosen.text
    chosen = chosen.json()
    assert chosen["label"] == original["label"]
    assert chosen.get("created") == original.get("created")
    for doc, graph in graphs(project).items(): assert isomorphic(graph,expected_graphs[doc]), doc
    assert editing_service.projects.manifest(project)["primaryLanguage"] == "en"
    for key,value in display.items(): assert chosen["uiMessage"]["args"][key] == value
    assert chosen["state"]["undoUiMessage"] == chosen["uiMessage"]
    undone = client.post(f"/api/projects/{project}/documents/{role}/undo").json()
    assert undone["label"] == original["label"] and undone["uiMessage"] == chosen["uiMessage"]
    redone = client.post(f"/api/projects/{project}/documents/{role}/redo").json()
    assert redone["label"] == original["label"] and redone["uiMessage"] == chosen["uiMessage"]


def test_refusal_keeps_original_text_but_names_its_operands_in_the_display_language(project):
    before = graphs(project)
    args={"child":EX+"C","parent":EX+"D"}
    original = command(project,"model","AddSubClassOf",args)
    chosen = command(project,"model","AddSubClassOf",args,"ja")
    assert original.status_code == chosen.status_code == 422
    assert chosen.json()["detail"] == original.json()["detail"] == "Class C is already a subclass of Class D."
    assert chosen.json()["uiMessage"]["args"] == {"child":"分類C","parent":"分類D"}
    for doc, graph in graphs(project).items(): assert isomorphic(graph,before[doc])


def test_delete_preview_reads_selected_names_without_changing_its_impact(project):
    before = graphs(project)
    response = command(project,"model","DeleteEntity",{"iri":EX+"D"},"ja",dry=True)
    assert response.status_code == 200,response.text
    impact = response.json()["impact"]
    assert impact["label"] == "分類D"
    assert impact["children"][0]["label"] == "分類C"
    assert impact["reparentedTo"][0]["label"] == "分類E"
    assert next(p for p in impact["properties"] if p["iri"]==EX+"rel")["label"] == "所属"
    assert impact["individuals"][0]["label"] == "対象B"
    for doc, graph in graphs(project).items(): assert isomorphic(graph,before[doc])


def test_reuse_preview_reads_names_without_changing_its_domain_choices(project):
    before = graphs(project)
    args={"property":EX+"p","class":EX+"F"}
    original = command(project,"model","ShareDomain",args,dry=True)
    chosen = command(project,"model","ShareDomain",args,"ja",dry=True)
    assert original.status_code == chosen.status_code == 200, chosen.text
    en,ja=original.json()["plan"],chosen.json()["plan"]
    assert ja["property"]["label"] == "項目p"
    assert ja["domain"]["classes"][0]["label"] == "分類C"
    assert ja["case"] == en["case"]
    assert ja["choices"]["union"] is True and en["choices"]["union"] is True
    for doc, graph in graphs(project).items(): assert isomorphic(graph,before[doc])


def test_unsupported_display_choice_keeps_primary_names(project):
    result=command(project,"model","AddSubClassOf",{"child":EX+"C","parent":EX+"E"},"fr")
    assert result.status_code == 200,result.text
    assert result.json()["uiMessage"]["args"] == {"child":"Class C","parent":"Class E"}


def test_already_defined_offer_reads_labels_but_keeps_its_original_reason(project):
    args={"iri":EX+"p","label":"field p"}
    original=command(project,"model","CreateDatatypeProperty",args)
    chosen=command(project,"model","CreateDatatypeProperty",args,"ja")
    assert original.status_code == chosen.status_code == 409
    en,ja=original.json(),chosen.json()
    assert ja["detail"]["message"] == en["detail"]["message"]
    assert ja["detail"]["property"]["label"] == "項目p"
    assert ja["detail"]["property"]["domain"]["classes"][0]["label"] == "分類C"
    assert ja["uiMessage"]["args"]["name"] == "項目p"
    assert ja["uiMessage"]["args"]["classes"] == [{"text":"分類C"}]


def test_readonly_shape_refusal_uses_its_display_name_and_preserves_original_detail(project):
    shapes = SHAPES.replace('rdfs:label "Constraint"@en', 'rdfs:label "Constraint"@en, "制約"@ja') + '\nex:S sh:closed true .'
    assert client.put(f"/api/projects/{project}/documents/shapes/source",json={"text":shapes}).status_code == 200
    args={"shape":EX+"S","value":"Synthetic new name"}
    original=command(project,"shapes","SetShapeName",args)
    chosen=command(project,"shapes","SetShapeName",args,"ja")
    assert original.status_code == chosen.status_code == 422
    assert chosen.json()["detail"] == original.json()["detail"]
    assert chosen.json()["uiMessage"]["args"]["name"] == "制約"


def test_shape_title_follows_display_language_without_changing_editable_name(project):
    before = graphs(project)
    original = client.get(f"/api/projects/{project}/shapes").json()
    for language, expected in (("ja", "制約"), ("en", "Constraint"), ("fr", "Constraint")):
        chosen = client.get(f"/api/projects/{project}/shapes", params={"lang": language})
        assert chosen.status_code == 200, chosen.text
        shape = next(s for s in chosen.json()["shapes"] if s["id"] == EX + "S")
        previous = next(s for s in original["shapes"] if s["id"] == EX + "S")
        assert shape["displayName"] == expected
        assert shape["name"] == previous["name"] == "Constraint"
    for doc, graph in graphs(project).items():
        assert isomorphic(graph, before[doc])
