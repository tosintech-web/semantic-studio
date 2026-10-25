"""
================================================================================
FILE: backend/tests/test_query_network_messages.py
SUMMARY
    Query and network refusals retain legacy detail and source-owned UI facts.
BASIC IDEA
    Drive real query/API gates and controlled SERVICE responses, never a remote
    server. Refused operations leave the synthetic project and its data intact.
INPUTS / INPUT SOURCES
    Synthetic RDF, parser/query inputs, fake broker responses and resolver replies.
EXPECTED OUTPUT
    Original statuses/text, explicit reason codes, literal facts and no sends.
================================================================================
"""
import ipaddress
import json
import socket
from types import SimpleNamespace
from urllib.request import Request

import pytest
from app import net_guard, network_broker, sparql_exec, sparql_service
from test_router_message_metadata import client, context, state


@pytest.mark.parametrize("query,code,args,detail", [
    ("ASK {}", "query.select_only", {}, "Only SELECT queries can be executed here. Updates and other query forms are not supported."),
    ("SELECT * WHERE { SERVICE ?endpoint { ?s ?p ?o } }", "service.fixed_endpoint", {}, sparql_service.VARIABLE_ENDPOINT_DETAIL),
    ("SELECT * WHERE { SERVICE <https://example.test/a> { SERVICE <https://example.test/b> { ?s ?p ?o } } }", "service.nested", {}, sparql_service.NESTED_DETAIL),
    ("SELECT * WHERE { SERVICE <http://127.0.0.1/> { ?s ?p ?o } }", "service.endpoint_not_public", {"endpoint": "http://127.0.0.1/"}, sparql_service.NOT_PUBLIC_DETAIL.format(endpoint="http://127.0.0.1/")),
])
def test_query_guards_propagate_facts_without_running(context, monkeypatch, query, code, args, detail):
    sent = []
    monkeypatch.setattr(network_broker.broker, "request", lambda *a, **k: sent.append((a, k)))
    before = state(context)
    response = client.post(f"/api/ontologies/{context['oid']}/sparql", json={"query": query})
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == detail
    assert response.json().get("uiMessage") == {"code": code, "args": args}
    assert not sent
    assert state(context) == before


def test_invalid_query_retains_original_parser_details(context):
    response = client.post(f"/api/ontologies/{context['oid']}/sparql", json={"query": "SELECT * WHERE {"})
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Could not parse the SPARQL query:")
    assert response.json().get("uiMessage") == {"code": "query.parse_failed", "args": {}}


def test_depth_guard_uses_actual_bound(context, monkeypatch):
    monkeypatch.setattr(sparql_exec, "MAX_ALGEBRA_DEPTH", 0)
    response = client.post(f"/api/ontologies/{context['oid']}/sparql", json={"query": "SELECT * WHERE { ?s ?p ?o }"})
    assert response.status_code == 400
    assert response.json()["detail"] == sparql_exec.DEEP_QUERY_REFUSED_DETAIL
    assert response.json().get("uiMessage") == {"code": "query.too_deep", "args": {"limit": 0}}


def test_busy_guard_preserves_status_and_never_runs(context, monkeypatch):
    monkeypatch.setitem(sparql_exec._abandoned, context["oid"], SimpleNamespace(is_alive=lambda: True))
    response = client.post(f"/api/ontologies/{context['oid']}/sparql", json={"query": "SELECT * WHERE {}"})
    assert response.status_code == 409
    assert response.json()["detail"] == sparql_exec.BUSY_DETAIL
    assert response.json().get("uiMessage") == {"code": "query.still_stopping", "args": {}}


@pytest.mark.parametrize("redirect", [False, True])
@pytest.mark.parametrize("url", ["file:///synthetic.ttl", "https:///missing", "http://127.0.0.1/data"])
def test_address_gates_capture_redirect_identity_before_any_resolution(monkeypatch, redirect, url):
    lookups = []
    monkeypatch.setattr(net_guard, "resolve_host", lambda host: lookups.append(host) or [ipaddress.ip_address("127.0.0.1")])
    with pytest.raises(net_guard.BlockedAddress) as caught:
        net_guard.assert_url_fetchable(url, after_redirect=redirect)
    assert str(caught.value) == (net_guard.BLOCKED_REDIRECT_DETAIL if redirect else net_guard.BLOCKED_ADDRESS_DETAIL)
    assert caught.value.ui_message == {"code": "network.redirect_refused" if redirect else "network.address_refused", "args": {}}
    if not url.startswith("http://127"):
        assert not lookups


def test_resolver_failure_has_an_explicit_reason(monkeypatch):
    def fail(*args, **kwargs):
        raise socket.gaierror("Synthetic lookup failure")
    monkeypatch.setattr(net_guard.socket, "getaddrinfo", fail)
    with pytest.raises(net_guard.BlockedAddress) as caught:
        net_guard.resolve_host("synthetic.invalid")
    assert str(caught.value) == net_guard.UNRESOLVABLE_HOST_DETAIL
    assert caught.value.ui_message == {"code": "network.host_unresolvable", "args": {}}


@pytest.mark.parametrize("blocked", [False, True])
def test_policy_refusals_reach_http_before_lookup(monkeypatch, blocked):
    host = "synthetic.example"
    if blocked:
        network_broker.broker.policy.grant("ontology:fetch", host, "block", True)
    else:
        network_broker.broker.policy.set_offline(True)
    looked_up = []
    monkeypatch.setattr(net_guard, "resolve_host", lambda name: looked_up.append(name))
    response = client.post("/api/ontologies/fetch", json={"url": f"https://{host}/data.ttl"})
    assert response.status_code == (403 if blocked else 503), response.text
    assert response.json()["detail"] == (network_broker.blocked_detail(host) if blocked else network_broker.OFFLINE_DETAIL)
    assert response.json().get("uiMessage") == {"code": "network.host_blocked" if blocked else "network.offline", "args": {"host": host} if blocked else {}}
    assert not looked_up


@pytest.mark.parametrize("body,code,extra", [
    (b"{}", "service.invalid_results", {}),
    (b'{"head":{"vars":[]},"results":{"bindings":{}}}', "service.invalid_results", {}),
    (b'{"head":{"vars":[]},"results":{"bindings":[3]}}', "service.invalid_row", {}),
    (b'{"head":{"vars":["s"]},"results":{"bindings":[{"s":3}]}}', "service.invalid_cell", {}),
    (json.dumps({"head":{"vars":["s"]},"results":{"bindings":[{"s":{"type":"literal","value":"v","xml:lang":3}}]}}).encode(), "service.invalid_language", {}),
    (json.dumps({"head":{"vars":["s"]},"results":{"bindings":[{"s":{"type":"literal","value":"v","datatype":3}}]}}).encode(), "service.invalid_datatype", {}),
    (json.dumps({"head":{"vars":["s"]},"results":{"bindings":[{"s":{"type":"<img>{kind}","value":"v"}}]}}).encode(), "service.unknown_result_type", {"kind": "'<img>{kind}'"}),
])
def test_service_result_failures_keep_host_and_source_reason(monkeypatch, body, code, extra):
    block = sparql_service.ServiceBlock("https://synthetic.example/sparql", "synthetic.example", "SELECT * WHERE {}", True)
    run = sparql_service.ServiceRun(sparql_service.ServicePlan([block], {}, []))
    monkeypatch.setattr(network_broker.broker, "request", lambda *a, **k: SimpleNamespace(status=200, body=body))
    outcome = run.outcome(block)
    assert isinstance(outcome.error, sparql_service.ServiceFailed)
    assert str(outcome.error).startswith("synthetic.example:")
    wire = {"code": code, "args": {"host": block.host, **extra}}
    assert outcome.error.ui_message == wire
    assert run.report[0].get("errorUiMessage") == wire


@pytest.mark.parametrize("status", [403, 451])
def test_service_http_status_is_captured_without_parsing_its_sentence(monkeypatch, status):
    block = sparql_service.ServiceBlock("https://synthetic.example/sparql", "synthetic.example", "SELECT * WHERE {}", True)
    run = sparql_service.ServiceRun(sparql_service.ServicePlan([block], {}, []))
    monkeypatch.setattr(network_broker.broker, "request", lambda *a, **k: SimpleNamespace(status=status, body=b""))
    outcome = run.outcome(block)
    assert str(outcome.error) == f"synthetic.example answered with HTTP {status}."
    assert outcome.error.ui_message == {"code": "service.http_failed", "args": {"host": block.host, "status": status}}


@pytest.mark.parametrize("headers,status,code,detail", [
    ({"host":"foreign.invalid"}, 400, "request.foreign_host", "host"),
    ({"X-Semantic-Studio":"0"}, 403, "request.foreign_page", "page"),
    ({"origin":"https://foreign.invalid"}, 403, "request.foreign_page", "page"),
])
def test_local_request_refusals_add_metadata_without_changing_the_policy(headers, status, code, detail):
    from app.local_guard import BAD_HOST_DETAIL, FORBIDDEN_DETAIL
    response = client.post("/api/ontologies/upload", content=b"not read", headers=headers)
    assert response.status_code == status
    assert response.json()["detail"] == (BAD_HOST_DETAIL if detail == "host" else FORBIDDEN_DETAIL)
    assert response.json().get("uiMessage") == {"code": code, "args": {}}
    assert int(response.headers["content-length"]) == len(response.content)


def test_evaluation_error_has_a_context_frame_and_original_native_detail(context, monkeypatch):
    from rdflib import Graph
    def fail(*args, **kwargs):
        raise RuntimeError("Synthetic evaluation <img>{host}")
    monkeypatch.setattr(Graph, "query", fail)
    response = client.post(f"/api/ontologies/{context['oid']}/sparql", json={"query": "SELECT * WHERE {}"})
    assert response.status_code == 400
    assert response.json()["detail"] == "The query could not be evaluated: Synthetic evaluation <img>{host}"
    assert response.json().get("uiMessage") == {"code": "query.evaluation_failed", "args": {}}


def test_service_block_count_captures_the_actual_limit(context, monkeypatch):
    monkeypatch.setattr(sparql_service, "MAX_SERVICE_BLOCKS", 1)
    query = "SELECT * WHERE { SERVICE <https://synthetic.example/a> { ?s ?p ?o } SERVICE <https://synthetic.example/b> { ?s ?p ?o } }"
    response = client.post(f"/api/ontologies/{context['oid']}/sparql", json={"query": query})
    assert response.status_code == 400
    assert response.json()["detail"] == sparql_service.TOO_MANY_BLOCKS_DETAIL
    assert response.json().get("uiMessage") == {"code": "service.too_many_blocks", "args": {"limit": 1}}


@pytest.mark.parametrize("kind,code", [("redirect", "fetch.redirect_missing"), ("transport", "fetch.connection_failed"), ("loop", "fetch.redirect_limit")])
def test_broker_failures_propagate_source_facts_without_real_connections(monkeypatch, kind, code):
    import httpx
    url = "https://synthetic.example/file.ttl"
    requests = []
    monkeypatch.setattr(net_guard, "resolve_host", lambda host: [ipaddress.ip_address("93.184.216.34")])
    def send(request):
        requests.append(request)
        if kind == "transport":
            raise httpx.ConnectError("Synthetic connection <img>{url}")
        return httpx.Response(302, headers={"location": url} if kind == "loop" else {})
    monkeypatch.setattr(network_broker.broker, "transport", httpx.MockTransport(send))
    response = client.post("/api/ontologies/fetch", json={"url": url})
    assert response.status_code == 502, response.text
    assert requests
    args = {"url": url}
    if kind == "loop":
        args["limit"] = network_broker.MAX_REDIRECTS
        assert len(requests) == network_broker.MAX_REDIRECTS + 1
    assert response.json().get("uiMessage") == {"code": code, "args": args}


def test_exhausted_deadline_has_a_source_code_without_inventing_a_duration():
    with pytest.raises(network_broker.FetchFailed) as caught:
        network_broker._remaining(20, 0, "https://synthetic.example/data")
    assert str(caught.value) == "Fetching https://synthetic.example/data failed: it took longer than the time allowed"
    assert caught.value.ui_message == {"code": "fetch.time_limit", "args": {"url": "https://synthetic.example/data"}}


@pytest.mark.parametrize("kind,code", [("address", "context.address_refused"), ("size", "context.response_limit"), ("fetch", "context.fetch_failed")])
def test_context_failure_survives_parse_error_wrapping(monkeypatch, kind, code):
    url = "https://synthetic.example/context.jsonld"
    monkeypatch.setattr(net_guard, "MAX_FETCH_BYTES", 64)
    def fail(*args, **kwargs):
        if kind == "address":
            net_guard.assert_url_fetchable("http://127.0.0.1/private")
        if kind == "size":
            raise network_broker.TooLarge(url, 64)
        raise network_broker.FetchFailed(url, "Synthetic transport <img>")
    monkeypatch.setattr(network_broker.broker, "request", fail)
    body = json.dumps({"@context": url, "@id": "https://example.test/s", "name": "synthetic"}).encode()
    response = client.post("/api/ontologies/upload", files={"file": ("synthetic.jsonld", body, "application/ld+json")})
    assert response.status_code == 422, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "parse_error" and detail["technical"] is None
    assert url in detail["message"]
    args = {"url": url}
    if kind == "size":
        args["limit"] = 64
    assert detail.get("uiMessage") == {"code": code, "args": args}


@pytest.mark.parametrize("redirect", [False, True])
def test_broker_resolution_failure_has_source_identity(monkeypatch, redirect):
    def fail(*args, **kwargs):
        raise socket.gaierror("Synthetic resolution failure")
    monkeypatch.setattr(net_guard.socket, "getaddrinfo", fail)
    with pytest.raises(net_guard.BlockedAddress) as caught:
        network_broker.broker._resolve_and_judge("synthetic.invalid", redirect)
    assert caught.value.ui_message == {"code": "network.redirect_refused" if redirect else "network.host_unresolvable", "args": {}}


@pytest.mark.parametrize("reason,code,detail", [
    ("address", "service.address_refused", sparql_service.ENDPOINT_NOT_PUBLIC_DETAIL),
    ("redirect", "service.redirect_refused", sparql_service.ENDPOINT_REDIRECT_DETAIL),
    ("lookup", "service.host_unresolvable", sparql_service.ENDPOINT_UNRESOLVABLE_DETAIL),
])
def test_service_address_failure_uses_source_identity(monkeypatch, reason, code, detail):
    host = "synthetic.example"
    block = sparql_service.ServiceBlock(f"https://{host}/sparql", host, "SELECT * WHERE {}", True)
    run = sparql_service.ServiceRun(sparql_service.ServicePlan([block], {}, []))
    def fail(*args, **kwargs):
        if reason == "lookup":
            raise socket.gaierror("Synthetic resolver error")
        return [ipaddress.ip_address("127.0.0.1")]
    monkeypatch.setattr(net_guard.socket, "getaddrinfo", fail if reason == "lookup" else lambda *a, **k: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 0))])
    def request(*args, **kwargs):
        network_broker.broker._resolve_and_judge(host, reason == "redirect")
    monkeypatch.setattr(network_broker.broker, "request", request)
    outcome = run.outcome(block)
    assert str(outcome.error) == detail.format(host=host)
    assert outcome.error.ui_message == {"code": code, "args": {"host": host}}


@pytest.mark.parametrize("limit", [23, 2**60 + 1])
def test_service_size_refusal_captures_actual_cap(monkeypatch, limit):
    block = sparql_service.ServiceBlock("https://synthetic.example/sparql", "synthetic.example", "SELECT * WHERE {}", True)
    run = sparql_service.ServiceRun(sparql_service.ServicePlan([block], {}, []))
    monkeypatch.setattr(sparql_service, "MAX_BYTES_PER_CALL", limit)
    def request(*args, **kwargs):
        raise network_broker.TooLarge(block.endpoint, limit)
    monkeypatch.setattr(network_broker.broker, "request", request)
    outcome = run.outcome(block)
    assert str(outcome.error) == f"synthetic.example sent more than {limit // (1024 * 1024)} MB."
    assert outcome.error.ui_message == {"code": "service.response_limit", "args": {"host": block.host, "limit": limit if limit <= 2**53-1 else str(limit)}}


def test_unknown_manual_refusal_is_not_identified_by_matching_its_english(monkeypatch):
    block = sparql_service.ServiceBlock("https://synthetic.example/sparql", "synthetic.example", "SELECT * WHERE {}", True)
    run = sparql_service.ServiceRun(sparql_service.ServicePlan([block], {}, []))
    def request(*args, **kwargs):
        raise net_guard.BlockedAddress(net_guard.UNRESOLVABLE_HOST_DETAIL)
    monkeypatch.setattr(network_broker.broker, "request", request)
    outcome = run.outcome(block)
    assert str(outcome.error) == sparql_service.ENDPOINT_UNRESOLVABLE_DETAIL.format(host=block.host)
    assert outcome.error.ui_message == {"code": "service.connection_failed", "args": {"host": block.host}}


@pytest.mark.parametrize("silent", [False, True])
def test_service_failure_metadata_reaches_query_http_or_silent_report(context, monkeypatch, silent):
    host = "synthetic.example"
    network_broker.broker.policy.grant("sparql:service", host, "allow", True)
    sends = []
    def request(*args, **kwargs):
        sends.append((args, kwargs))
        return SimpleNamespace(status=451, body=b"")
    monkeypatch.setattr(network_broker.broker, "request", request)
    before = state(context)
    query = f"SELECT ?s WHERE {{ BIND(<https://example.test/local> AS ?s) SERVICE {'SILENT' if silent else ''} <https://{host}/sparql> {{ ?remote ?p ?o }} }}"
    response = client.post(f"/api/ontologies/{context['oid']}/sparql", json={"query": query})
    wire = {"code": "service.http_failed", "args": {"host": host, "status": 451}}
    if silent:
        assert response.status_code == 200, response.text
        assert response.json()["rowCount"] == 1
        report = response.json()["services"][0]
        assert report["error"] == f"{host} answered with HTTP 451."
        assert report.get("errorUiMessage") == wire
    else:
        assert response.status_code == 400, response.text
        assert response.json()["detail"] == f"{host} answered with HTTP 451."
        assert response.json().get("uiMessage") == wire
    assert len(sends) == 1
    assert state(context) == before


def test_service_deadline_keeps_the_call_budget_at_its_source(monkeypatch):
    host = "synthetic.example"
    block = sparql_service.ServiceBlock(f"https://{host}/sparql", host, "SELECT * WHERE {}", True)
    run = sparql_service.ServiceRun(sparql_service.ServicePlan([block], {}, []))
    monkeypatch.setattr(sparql_service, "CALL_TIMEOUT_SECONDS", 7.5)
    def request(*args, **kwargs):
        assert kwargs["total_timeout"] == 7.5
        network_broker._remaining(7.5, 0, block.endpoint)
    monkeypatch.setattr(network_broker.broker, "request", request)
    outcome = run.outcome(block)
    assert str(outcome.error).startswith(f"{host} could not be reached:")
    assert outcome.error.ui_message == {"code": "service.time_limit", "args": {"host": host, "seconds": 7.5}}


def test_redirect_refusal_metadata_stops_before_the_private_hop(monkeypatch):
    import httpx
    sent = []
    monkeypatch.setattr(net_guard, "resolve_host", lambda host: [ipaddress.ip_address("93.184.216.34")])
    def reply(request):
        sent.append(request)
        return httpx.Response(302, headers={"location": "http://127.0.0.1/private"})
    monkeypatch.setattr(network_broker.broker, "transport", httpx.MockTransport(reply))
    response = client.post("/api/ontologies/fetch", json={"url": "https://synthetic.example/data"})
    assert response.status_code == 400
    assert response.json()["detail"] == net_guard.BLOCKED_REDIRECT_DETAIL
    assert response.json().get("uiMessage") == {"code": "network.redirect_refused", "args": {}}
    assert len(sent) == 1
