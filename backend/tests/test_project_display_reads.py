"""
================================================================================
FILE: backend/tests/test_project_display_reads.py
SUMMARY
    Project read labels honor an explicit display language without RDF changes.
BASIC IDEA
    Read bilingual synthetic shapes, suggestions, validation and a recorded
    reasoning result through HTTP; compare actual names and untouched state.
INPUTS / INPUT SOURCES
    An English-primary project with Japanese labels and controlled reasoner facts.
EXPECTED OUTPUT
    Selected read names, stable constraint values and no additional reasoning.
================================================================================
"""
import copy
import json
from urllib.parse import urlencode
import pytest
from fastapi.testclient import TestClient
from rdflib import URIRef
from rdflib.namespace import RDF, RDFS
from app import reasoning
from app.editing import editing_service
from app.main import app

client = TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio":"1"})
EX = "https://synthetic.example/"
PREFIX = f'''@prefix ex: <{EX}> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
'''
MODEL = PREFIX + '''ex:C a owl:Class ; rdfs:label "Class C"@en, "分類C"@ja ; rdfs:subClassOf ex:D ; owl:disjointWith ex:D .
ex:D a owl:Class ; rdfs:label "Class D"@en, "分類D"@ja ; rdfs:subClassOf ex:E .
ex:E a owl:Class ; rdfs:label "Class E"@en, "分類E"@ja .
ex:p a owl:DatatypeProperty ; rdfs:label "field p"@en, "項目p"@ja ; rdfs:domain ex:C ; rdfs:range xsd:string .
ex:a a ex:C ; rdfs:label "Member A"@en, "対象A"@ja .
'''
SHAPES = PREFIX + '''ex:S a sh:NodeShape ; rdfs:label "Constraint"@en ; sh:targetClass ex:C ; sh:property [ sh:path ex:p ; sh:minCount 1 ] .'''

def create_project():
    response = client.post("/api/projects", json={"name":"Synthetic bilingual dictionary", "template":"empty", "primaryLanguage":"en", "baseIri":EX, "prefix":"ex"})
    assert response.status_code == 200, response.text
    pid = response.json()["id"]
    assert client.post(f"/api/projects/{pid}/open").status_code == 200
    assert client.patch(f"/api/projects/{pid}", json={"languages":["ja"]}).status_code == 200
    assert client.put(f"/api/projects/{pid}/documents/model/source", json={"text":MODEL}).status_code == 200
    assert client.post(f"/api/projects/{pid}/documents", json={"role":"shapes"}).status_code == 200
    assert client.put(f"/api/projects/{pid}/documents/shapes/source", json={"text":SHAPES}).status_code == 200
    return pid


@pytest.fixture
def project():
    pid=create_project()
    def snapshot():
        return (copy.deepcopy(editing_service.projects.manifest(pid)),
                [(doc, set(editing_service.document(pid,doc).graph), editing_service.document(pid,doc).state()) for doc in ("model","shapes")])
    before = snapshot()
    try:
        yield pid
        assert snapshot() == before
    finally:
        editing_service.close_all()


def read(path):
    response = client.get(path)
    assert response.status_code == 200, response.text
    return response.json()


def test_shape_read_labels_use_the_selected_language_and_unsupported_choices_fall_back(project):
    url = f"/api/projects/{project}/shapes"
    ja = read(url+"?lang=ja")["shapes"][0]
    assert ja["target"]["label"] == "分類C"
    assert ja["rules"][0]["pathLabel"] == "項目p"
    assert read(url+"?lang=en")["shapes"][0]["target"]["label"] == "Class C"
    assert read(url+"?lang=fr")["shapes"][0]["target"]["label"] == "Class C"
    assert read(url)["shapes"][0]["target"]["label"] == "Class C"


def test_suggestion_display_labels_do_not_change_primary_or_required_rdf_languages(project):
    url = f"/api/projects/{project}/shapes/suggestions?target={EX}C"
    en = read(url+"&lang=en")
    ja = read(url+"&lang=ja")
    assert next(p for p in ja["paths"] if p["path"] == [EX+"p"])["label"] == "項目p"
    def rules(value):
        return {s["id"]:{k:v for k,v in s["rule"].items() if k != "pathLabel"} for s in value["suggestions"]}
    assert rules(ja) == rules(en)
    assert rules(ja)["name-primary"]["requiredLanguages"] == ["en"]
    assert rules(ja)["name-per-language"]["languageIn"] == ["en","ja"]


def test_validation_names_use_display_language_without_changing_the_check(project):
    def check(lang):
        response=client.post(f"/api/projects/{project}/validate?lang={lang}")
        assert response.status_code == 200, response.text
        return response.json()["shapes"][0]
    en,ja=check("en"),check("ja")
    assert ja["target"]["label"] == "分類C"
    assert ja["problems"][0]["focusLabel"] == "対象A"
    assert (ja["problemCount"],ja["failingCount"],ja["focusCount"]) == (en["problemCount"],en["failingCount"],en["focusCount"])
    assert ja["problems"][0]["focus"] == en["problems"][0]["focus"] == EX+"a"


def test_reasoning_pages_about_problems_and_why_read_names_without_another_run(project,monkeypatch):
    U=lambda name:URIRef(EX+name)
    raw=reasoning.RawResult("done",added=[(U("C"),RDFS.subClassOf,U("E")),(U("a"),RDF.type,U("D")),(U("a"),RDF.type,U("E"))],
        errors=[f"Disjoint classes {EX}C and {EX}D have a common individual {EX}a"],
        probe_errors=[f"Disjoint classes {EX}C and {EX}D have a common individual {reasoning.PROBE}0"])
    calls=[]
    def run(*args,**kwargs):
        calls.append(1)
        return raw
    monkeypatch.setattr(reasoning,"reason",run)
    response=client.post(f"/api/projects/{project}/reasoning?lang=en",json={"includeData":False,"imports":False})
    assert response.status_code == 200,response.text
    en=response.json()
    original=reasoning.service.result(project)
    ja=read(f"/api/projects/{project}/reasoning?lang=ja")
    member=next(f for g in ja["groups"] for f in g["items"] if f["s"]==EX+"a")
    assert member["sLabel"] == "対象A"
    assert any("分類C" in problem["sentence"] for problem in ja["problems"])
    page=read(f"/api/projects/{project}/reasoning?group=memberships&lang=ja")
    assert any(f["sLabel"]=="対象A" for f in page["items"])
    about=read(f"/api/projects/{project}/reasoning?about={EX}a&lang=ja")
    assert all(f["sLabel"]=="対象A" for f in about["facts"])
    query=urlencode({"s":EX+"C","p":str(RDFS.subClassOf),"o":EX+"E","lang":"ja"})
    why=read(f"/api/projects/{project}/reasoning/why?{query}")
    assert "分類C" in why["sentence"] and "分類E" in why["sentence"]
    assert read(f"/api/projects/{project}/reasoning?lang=en") == en
    assert reasoning.service.result(project) is original
    assert len(calls)==1
    cached=original.for_languages(["ja","en"])
    assert cached is original.for_languages(("ja","en"))
    assert cached.stated is original.stated and cached.closure is original.closure
    assert cached.names(U("a")) == "対象A" and original.names(U("a")) == "Member A"
    assert {fact["t"] for rows in cached.facts.values() for fact in rows} == original.shown
    assert cached.never == original.never
    assert reasoning.PROBE not in json.dumps(ja) + json.dumps(why) + json.dumps(about)


def test_validation_read_rewords_the_recorded_check_without_running_it_again(project, monkeypatch):
    from app import shacl
    assert read(f"/api/projects/{project}/validate?lang=ja") is None
    calls=[]
    original=shacl.run_shapes
    def counted(*args,**kwargs):
        calls.append(1)
        return original(*args,**kwargs)
    monkeypatch.setattr(shacl,"run_shapes",counted)
    response=client.post(f"/api/projects/{project}/validate?lang=en")
    assert response.status_code==200,response.text
    en=response.json()
    runs=len(calls)
    assert runs>0
    ja=read(f"/api/projects/{project}/validate?lang=ja")
    assert ja["shapes"][0]["problems"][0]["focusLabel"]=="対象A"
    assert ja["revisions"]==en["revisions"]
    assert ja["durationMs"]==en["durationMs"]
    assert read(f"/api/projects/{project}/validate?lang=en")==en
    assert read(f"/api/projects/{project}/validate?lang=ja")==ja
    assert len(calls)==runs


def test_validation_name_read_keeps_the_checked_snapshot_after_a_later_revision(project):
    from rdflib import Literal
    response=client.post(f"/api/projects/{project}/validate?lang=en")
    assert response.status_code==200,response.text
    checked=response.json()
    document=editing_service.document(project,"model")
    subject=URIRef(EX+"a")
    old=Literal("対象A",lang="ja")
    newer=Literal("変更後の対象",lang="ja")
    revision=document.ontology.revision
    # Simulate a later model revision. Reading the old check must neither
    # use its new label nor claim that the old check validated this revision.
    document.graph.remove((subject,RDFS.label,old))
    document.graph.add((subject,RDFS.label,newer))
    document.ontology.revision+=1
    try:
        result=read(f"/api/projects/{project}/validate?lang=ja")
        assert result["revisions"]==checked["revisions"]
        assert result["shapes"][0]["problems"][0]["focusLabel"]=="対象A"
        assert document.ontology.revision==revision+1
        assert (subject,RDFS.label,newer) in document.graph
    finally:
        document.graph.remove((subject,RDFS.label,newer))
        document.graph.add((subject,RDFS.label,old))
        document.ontology.revision=revision


@pytest.mark.parametrize("change",["reopen","newer_check"])
def test_late_validation_does_not_replace_a_new_owner_or_newer_check(monkeypatch,change):
    import threading
    from concurrent.futures import ThreadPoolExecutor
    from app import shacl
    pid=create_project()
    started,release=threading.Event(),threading.Event()
    original=shacl.validate
    calls=[]
    def delayed(*args,**kwargs):
        number=len(calls);calls.append(number)
        result=original(*args,**kwargs)
        if number==0:
            started.set()
            assert release.wait(10),"test did not release the captured validation"
        return result
    monkeypatch.setattr(shacl,"validate",delayed)
    pool=ThreadPoolExecutor(max_workers=1)
    pending=pool.submit(client.post,f"/api/projects/{pid}/validate?lang=en")
    try:
        assert started.wait(10),"validation did not reach its recorded result"
        if change=="reopen":
            for doc in ("model","shapes"):editing_service.save(pid,doc,confirm_rewrite=True)
            assert client.post(f"/api/projects/{pid}/close").status_code==200
            assert client.post(f"/api/projects/{pid}/open").status_code==200
        else:
            response=client.post(f"/api/projects/{pid}/documents/model/commands",json={"command":"CreateExample","args":{"class":EX+"C","label":"Later member","iri":EX+"b"}})
            assert response.status_code==200,response.text
            response=client.post(f"/api/projects/{pid}/validate?lang=ja")
            assert response.status_code==200,response.text
            newer=response.json()
            assert newer["shapes"][0]["focusCount"]==2
        release.set()
        response=pending.result(timeout=10)
        assert response.status_code==200,response.text
        assert response.json()["shapes"][0]["focusCount"]==1
        found=read(f"/api/projects/{pid}/validate?lang=ja")
        if change=="reopen":assert found is None
        else:
            assert found["revisions"]==newer["revisions"]
            assert found["shapes"][0]["focusCount"]==2
    finally:
        release.set();pool.shutdown(wait=True);editing_service.close_all()
