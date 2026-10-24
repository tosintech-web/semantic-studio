"""
================================================================================
FILE: backend/tests/test_message_contracts.py
SUMMARY
    Shared message contract, generator and additive HTTP metadata.
BASIC IDEA
    Validate primitive arguments at their source and inspect a real API error.
INPUTS / INPUT SOURCES
    Representative contracts, invalid arguments and controlled exceptions.
EXPECTED OUTPUT
    Deterministic TS and unchanged legacy detail, without guessing from text.
================================================================================
"""
import json
import subprocess
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.messages import make_message, UiHTTPException
from app.editing import CommandError
from app.main import app
ROOT = Path(__file__).resolve().parents[2]

@pytest.mark.parametrize("code,args", [
    ("parse.syntax", {"format": "Turtle", "line": 3}),
    ("model.invalid_value", {"value": "<b>犬</b>", "datatype": "xsd:integer"}),
    ("validation.min_count", {"name": "犬", "count": 2}),
    ("reasoning.timeout", {"seconds": 10}),
    ("entities.page_too_large", {"total": 3036, "suggested_limit": 25}),
])
def test_contract_examples(code, args):
    message = make_message(code, **args)
    assert message == {"code": code, "args": args}
    assert json.loads(json.dumps(message)) == message

@pytest.mark.parametrize("code,args", [
    ("unknown", {}), ("__proto__", {}),
    ("reasoning.timeout", {}), ("reasoning.timeout", {"seconds": "ten"}),
    ("reasoning.timeout", {"seconds": True}), ("reasoning.timeout", {"seconds": float("nan")}),
    ("reasoning.timeout", {"seconds": 2, "extra": 1}),
    ("model.invalid_value", {"value": [], "datatype": "xsd:string"}),
])
def test_invalid_messages_refused(code, args):
    with pytest.raises(ValueError): make_message(code, **args)

def test_nullable_parser_line_and_legacy_command_error():
    wire = make_message("parse.syntax", format="Turtle", line=None)
    assert wire["args"]["line"] is None
    error = CommandError("Legacy English sentence.", ui_message=wire)
    assert str(error) == "Legacy English sentence."
    assert error.ui_message == wire
    assert CommandError("Old call").ui_message is None

def test_generator_matches_committed_types_and_never_rewrites_in_check_mode():
    generated = ROOT / "frontend/src/i18n/server-contracts.ts"
    original = generated.read_bytes()
    subprocess.run([sys.executable, str(ROOT / "scripts/generate_message_contracts.py"), "--check"], cwd=ROOT, check=True, capture_output=True)
    assert generated.read_bytes() == original

def test_http_metadata_is_additive_and_legacy_detail_keeps_its_type():
    path = "/api/test-contract-error"
    @app.get(path)
    def refused():
        raise UiHTTPException(status_code=400, detail="Original English detail.", ui_message=make_message("reasoning.timeout", seconds=10))
    route = app.router.routes.pop()
    app.router.routes.insert(0, route)  # Before the production catch-all static mount.
    try:
        with TestClient(app, base_url="http://localhost", headers={"X-Semantic-Studio": "1"}) as client:
            response = client.get(path)
        assert response.status_code == 400
        assert response.json() == {"detail": "Original English detail.", "uiMessage": {"code": "reasoning.timeout", "args": {"seconds": 10}}}
    finally:
        app.router.routes[:] = [route for route in app.router.routes if getattr(route, "path", None) != path]

def test_generator_check_detects_stale_output_without_overwriting_it(tmp_path, monkeypatch):
    import importlib.util
    spec = importlib.util.spec_from_file_location("message_generator", ROOT / "scripts/generate_message_contracts.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    (tmp_path / "backend/app").mkdir(parents=True)
    (tmp_path / "frontend/src/i18n").mkdir(parents=True)
    (tmp_path / "backend/app/message_contracts.json").write_text(json.dumps({"version": 1, "codes": {"example": {"count": "number"}}}))
    target = tmp_path / "frontend/src/i18n/server-contracts.ts"
    target.write_text("stale")
    monkeypatch.setattr(module, "ROOT", tmp_path)
    monkeypatch.setattr(sys, "argv", ["generator", "--check"])
    with pytest.raises(SystemExit) as result: module.main()
    assert result.value.code == 1 and target.read_text() == "stale"
    monkeypatch.setattr(sys, "argv", ["generator"])
    module.main(); first = target.read_bytes(); module.main()
    assert target.read_bytes() == first
    monkeypatch.setattr(sys, "argv", ["generator", "--check"])
    module.main()

def test_project_command_refusal_keeps_its_metadata():
    from app.routers.projects import _errors
    wire = make_message("model.invalid_value", value="犬", datatype="xsd:integer")
    with pytest.raises(UiHTTPException) as caught:
        with _errors(): raise CommandError("Original command refusal", ui_message=wire)
    assert caught.value.detail == "Original command refusal"
    assert caught.value.ui_message == wire
