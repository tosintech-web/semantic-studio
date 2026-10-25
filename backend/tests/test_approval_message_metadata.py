"""
================================================================================
FILE: backend/tests/test_approval_message_metadata.py
SUMMARY
    Approval purposes and disclosures retain source facts without changing grants.
BASIC IDEA
    Ask before resolution, use recording redirect servers, and preserve authored
    import names and the exact SERVICE text alongside optional UI metadata.
INPUTS / INPUT SOURCES
    Synthetic hosts, isolated policies and existing reason producers.
EXPECTED OUTPUT
    Source-owned descriptors, unchanged legacy fields and zero unapproved sends.
================================================================================
"""
import ipaddress
import pytest
from app.imports import ImportsService
from app.messages import MessageText
from app.net_guard import CONTEXT_REASON
from app.network_broker import ApprovalRequired, CAPABILITIES, broker
from app.routers.ontologies import FETCH_REASON
from app.sparql_service import SERVICE_REASON, ServiceBlock


@pytest.mark.parametrize("capability", list(CAPABILITIES))
def test_approval_sends_descriptor_is_owned_by_the_capability(capability, monkeypatch):
    def forbidden(*args):
        pytest.fail("No lookup may precede approval")
    monkeypatch.setattr(broker, "_resolve_and_judge", forbidden)
    with pytest.raises(ApprovalRequired) as caught:
        broker.request(capability, "https://synthetic.example/a", reason="Custom unclassified text", max_bytes=1024, timeout=1)
    request = caught.value.requests[0]
    assert request["sends"] == CAPABILITIES[capability]["sends"]
    suffix = {"ontology:fetch": "fetch", "ontology:import": "import", "jsonld:context": "context", "sparql:service": "service"}[capability]
    assert request.get("sendsUiMessage") == {"code": "network.sends." + suffix, "args": {}}
    assert request["reason"] == "Custom unclassified text"
    assert "reasonUiMessage" not in request


@pytest.mark.parametrize("reason,code", [(CONTEXT_REASON,"context"), (FETCH_REASON,"fetch"), (SERVICE_REASON,"service")])
def test_owned_reason_metadata_survives_a_real_approval(reason, code):
    with pytest.raises(ApprovalRequired) as caught:
        broker.request("ontology:fetch", "https://synthetic.example/a", reason=reason, max_bytes=1024, timeout=1)
    request = caught.value.requests[0]
    assert request["reason"] == reason
    assert request.get("reasonUiMessage") == {"code": "network.reason." + code, "args": {}}


@pytest.mark.parametrize("others,count", [([],1), (["https://synthetic.example/b", "https://other.example/c"],2)])
def test_import_reason_preserves_raw_name_and_same_host_count(others, count):
    name = "Authored <img>{value}"
    reason = ImportsService._reason(name,"https://synthetic.example/a",others)
    expected = f'"{name}" imports an ontology from this site.' if count == 1 else f'"{name}" imports {count} ontologies from this site.'
    assert reason == expected
    code = "network.reason.import_one" if count == 1 else "network.reason.import_many"
    assert getattr(reason, "ui_message", None) == {"code": code, "args": {"name": name, **({"count": count} if count != 1 else {})}}


def test_service_plan_approval_keeps_exact_text_and_owned_descriptors():
    text = 'SELECT ?s WHERE { ?s ?p "日本語 <img>{raw}" }\n# unchanged'
    request = ServiceBlock("https://synthetic.example/query", "synthetic.example", text, True).approval()
    assert request["text"] == text
    assert request["reason"] == SERVICE_REASON
    assert request.get("reasonUiMessage") == {"code": "network.reason.service", "args": {}}
    assert request.get("sendsUiMessage") == {"code": "network.sends.service", "args": {}}


@pytest.mark.parametrize("known", [False, True])
def test_redirect_keeps_original_reason_facts_separate_and_never_contacts_target(http_server, loopback_is_public, monkeypatch, known):
    target = http_server(lambda path: (200, {}, b"must not be sent"))
    first = http_server(lambda path: (302, {"Location": f"http://second.test:{target.server_address[1]}/a"}, b""))
    loopback_is_public["first.test"] = [ipaddress.ip_address("127.0.0.1")]
    loopback_is_public["second.test"] = [ipaddress.ip_address("127.0.0.1")]
    monkeypatch.setattr(broker.policy, "decide", lambda cap,host,grants: "allow" if host == "first.test" else "ask")
    reason = CONTEXT_REASON if known else str(CONTEXT_REASON)
    with pytest.raises(ApprovalRequired) as caught:
        broker.request("jsonld:context", f"http://first.test:{first.server_address[1]}/a", reason=reason, max_bytes=1024, timeout=5)
    request = caught.value.requests[0]
    assert request["reason"] == f"{reason} first.test redirected the request to this site."
    assert request.get("redirectUiMessage") == {"code":"network.reason.redirect", "args":{"host":"first.test"}}
    if known:
        assert request.get("reasonUiMessage") == {"code":"network.reason.context", "args":{}}
    else:
        assert "reasonUiMessage" not in request
    assert len(first.requests) == 1
    assert target.requests == []
