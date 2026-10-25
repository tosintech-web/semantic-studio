"""
================================================================================
FILE: backend/tests/test_import_message_metadata.py
SUMMARY
    Import closure refusals preserve source facts through saved state and listing.
BASIC IDEA
    Use isolated stores and synthetic RDF, exercise real closure gates locally,
    and distinguish source metadata from identical-looking legacy text.
INPUTS / INPUT SOURCES
    Temporary stores, generated ontologies and controlled broker/cache failures.
EXPECTED OUTPUT
    Original statuses/text/RDF and optional metadata that survives local retries.
================================================================================
"""
import json
from types import SimpleNamespace
import pytest
from app import imports as imports_mod
from app.imports import ImportsService
from app.network_broker import ApprovalRequired, broker
from app.store import OntologyStore

@pytest.fixture
def library(tmp_path):
    local = OntologyStore(tmp_path)
    service = ImportsService(local)
    def doc(iri, imports=(), name="Synthetic dictionary"):
        text = f'<{iri}> a <http://www.w3.org/2002/07/owl#Ontology> .\n'
        text += ''.join(f'<{iri}> <http://www.w3.org/2002/07/owl#imports> <{other}> .\n' for other in imports)
        return local.add(name=name, source="upload", data=text.encode(), fmt="turtle")
    return service, doc

@pytest.mark.parametrize("kind,row_code,limit_code", [
    ("depth", "imports.depth_refused", "imports.depth_limit"),
    ("documents", "imports.document_refused", "imports.document_limit"),
    ("bytes", "imports.bytes_refused", "imports.bytes_limit"),
])
def test_closure_limits_keep_legacy_text_and_capture_current_limit(library, monkeypatch, kind, row_code, limit_code):
    service, doc = library
    a, b = "https://synthetic.example/a", "https://synthetic.example/b"
    root = doc("https://example.test/root", (a,) if kind != "documents" else (a,b))
    doc(a, (b,) if kind == "depth" else ())
    doc(b)
    setting = {"depth":"MAX_DEPTH", "documents":"MAX_DOCUMENTS", "bytes":"MAX_TOTAL_BYTES"}[kind]
    monkeypatch.setattr(imports_mod, setting, 1)
    before = set(root.ensure_loaded()), root.data_path.read_bytes(), root.revision
    result = service.resolve(root, allow_network=False, max_bytes=1024*1024)
    rows = [row for row in result["rows"] if row["error"]]
    assert len(rows) == 1
    assert rows[0].get("errorUiMessage") == {"code":row_code,"args":{"limit":1}}
    assert result.get("limitUiMessage") == {"code":limit_code,"args":{"limit":1}}
    if kind == "bytes":
        assert rows[0]["error"] == "Not loaded: the imports together would pass 150 MB."
        assert result["limit"] == "Imports were loaded up to the 150 MB total limit."
    else:
        assert "1" in rows[0]["error"] and "1" in result["limit"]
    listed = service.listing(root)
    assert listed.get("limitUiMessage") == result["limitUiMessage"]
    assert next(row for row in listed["imports"] if row["error"])["errorUiMessage"] == rows[0]["errorUiMessage"]
    assert (set(root.ensure_loaded()),root.data_path.read_bytes(),root.revision) == before


def test_cancelled_rows_capture_the_stop_without_loading(library, monkeypatch):
    service,doc=library
    root=doc("https://example.test/root",("https://synthetic.example/a",))
    progress=service.progress_start(root.id)
    progress.cancel.set()
    try:
        result=service._resolve(root,progress,True,False,None,1024)
        assert result["rows"][0]["error"] == "Stopped before this import was resolved."
        assert result["rows"][0].get("errorUiMessage") == {"code":"imports.stopped","args":{}}
    finally:
        service.progress_end(root.id)




def test_local_only_resolution_preserves_a_prior_failure_descriptor(library):
    service,doc=library
    root=doc("https://example.test/root",("https://synthetic.example/a",))
    broker.policy.set_offline(True)
    first=service.resolve(root,max_bytes=1024)
    second=service.resolve(root,allow_network=False,max_bytes=1024)
    assert second["rows"][0]["status"]=="failed"
    assert second["rows"][0]["error"]==first["rows"][0]["error"]
    assert second["rows"][0].get("errorUiMessage")=={"code":"network.offline","args":{}}
    assert service.listing(root)["imports"][0]["errorUiMessage"]==second["rows"][0]["errorUiMessage"]


def test_missing_source_is_explained_on_read_without_rewriting_saved_state(library,monkeypatch):
    service,doc=library
    iri="https://synthetic.example/a"
    root=doc("https://example.test/root",(iri,));doc(iri)
    service.resolve(root,allow_network=False,max_bytes=1024)
    before=imports_mod.load_state(root)
    monkeypatch.setattr(service.store,"get",lambda oid:None)
    row=service.listing(root)["imports"][0]
    assert row["status"]=="failed"
    assert row["error"]=="What this import was resolved from is no longer available. Resolve imports again."
    assert row.get("errorUiMessage")=={"code":"imports.source_gone","args":{}}
    assert imports_mod.load_state(root)==before


def test_http_import_failure_has_source_status(library,monkeypatch):
    service,_=library
    iri="https://synthetic.example/a"
    monkeypatch.setattr(broker,"request",lambda *a,**k:SimpleNamespace(status=451,url=iri,headers={},body=b""))
    result=service._download(iri,None,1024,"Custom reason")
    assert result["failure"]=="The site answered HTTP 451 for this import."
    assert result.get("failureUiMessage")=={"code":"imports.http_failed","args":{"status":451}}


def test_invalid_chosen_file_retains_its_original_first_line(library):
    service,doc=library
    iri="https://synthetic.example/a";root=doc("https://example.test/root",(iri,))
    result=service.accept_files(root,[("synthetic.ttl",b"not rdf")],for_iri=iri,accept_mismatch=False,parse_timeout=None)
    assert result["matched"]==[]
    assert result["invalid"][0]["error"]=="Could not parse the file as RDF. Attempts:"
    assert result["invalid"][0].get("errorUiMessage")=={"code":"imports.parse_failed","args":{}}


def test_permission_rows_capture_host_without_parsing_legacy_text(library):
    service, doc = library
    root = doc("https://example.test/root", ("https://synthetic.example/a",))
    with pytest.raises(ApprovalRequired):
        service.resolve(root, max_bytes=1024)
    row = service.listing(root)["imports"][0]
    assert row["errorUiMessage"] == {"code": "imports.permission_required", "args": {"host": "synthetic.example"}}


@pytest.mark.parametrize("error_type,status", [(imports_mod.Offline, "failed"), (imports_mod.HostBlocked, "blocked"), (imports_mod.BlockedAddress, "failed"), (imports_mod.TooLarge, "failed"), (imports_mod.FetchFailed, "failed")])
@pytest.mark.parametrize("known", [False, True])
def test_download_forwards_only_actual_exception_metadata(library, monkeypatch, error_type, status, known):
    service, _ = library
    facts = {"code": "network.offline", "args": {}}
    args = {imports_mod.Offline: (), imports_mod.HostBlocked: ("synthetic.example",),
            imports_mod.BlockedAddress: ("Arbitrary original details",),
            imports_mod.TooLarge: ("https://synthetic.example/a", 1024),
            imports_mod.FetchFailed: ("https://synthetic.example/a", "Arbitrary original details")}
    error = error_type(*args[error_type])
    error.ui_message = facts if known else None
    def refuse(*args, **kwargs):
        raise error
    monkeypatch.setattr(broker, "request", refuse)
    result = service._download("https://synthetic.example/a", None, 1024, "Custom reason")
    assert result["failure"] == str(error)
    assert result["status"] == status
    if known:
        assert result["failureUiMessage"] == facts
    else:
        assert "failureUiMessage" not in result


def test_bundled_checksum_error_keeps_authored_title(library, monkeypatch):
    from app.messages import make_message
    entry = {"title": "Literal <img>{name}", "file": "synthetic.ttl", "sha256": "incorrect"}
    monkeypatch.setattr(imports_mod, "VOCAB_DIR", library[0].store.data_dir)
    (imports_mod.VOCAB_DIR / "synthetic.ttl").write_bytes(b"synthetic")
    with pytest.raises(imports_mod.VocabIntegrityError) as caught:
        imports_mod.bundled_bytes(entry)
    assert str(caught.value) == f"The bundled copy of {entry['title']} does not match its recorded checksum, so it was not used."
    assert caught.value.ui_message == make_message("imports.bundled_changed", title=entry["title"])
