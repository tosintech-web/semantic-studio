"""
================================================================================
FILE: backend/tests/test_team_google_transport.py
SUMMARY
    Prove authentication egress is pinned, bounded and secret-free.
BASIC IDEA
    Use counted DNS and in-memory HTTP to assert refusals before connections.
INPUTS / INPUT SOURCES
    Google endpoints and hostile URLs, redirects, headers and responses.
EXPECTED OUTPUT
    Fixed destinations only; zero traffic for policy and address refusals.
================================================================================
"""
import ipaddress
import json
import httpx
import pytest
from app.network_broker import NetworkBroker, Offline, HostBlocked, TooLarge
from app.team.auth_store import AuthRefused
from app.team.google_transport import GoogleTransport
TOKEN = 'https://oauth2.googleapis.com/token'
CERTS = 'https://www.googleapis.com/oauth2/v1/certs'
@pytest.fixture
def harness(monkeypatch):
    broker, dns, sends = NetworkBroker(), [], []
    def resolve(host):
        dns.append(host)
        return [ipaddress.ip_address('8.8.8.8')]
    monkeypatch.setattr('app.net_guard.resolve_host', resolve)
    def handle(request):
        sends.append(request)
        return httpx.Response(200, json={'safe': True})
    broker.transport = httpx.MockTransport(handle)
    return broker, dns, sends

def test_response_interface_and_pinning(harness):
    broker, dns, sends = harness
    response = GoogleTransport(broker)(CERTS)
    assert response.status == 200 and json.loads(response.data) == {'safe': True}
    assert response.headers['content-type'] == 'application/json'
    assert dns == ['www.googleapis.com']
    assert str(sends[0].url) == 'https://8.8.8.8/oauth2/v1/certs'
    assert sends[0].headers['host'] == sends[0].extensions['sni_hostname'] == 'www.googleapis.com'

@pytest.mark.parametrize('url,method,headers', [
    (TOKEN+'?secret=code','POST',None), (TOKEN+'#fragment','POST',None),
    ('https://oauth2.googleapis.com@evil.example/token','POST',None),
    ('http://oauth2.googleapis.com/token','POST',None),
    ('https://oauth2.googleapis.com:443/token','POST',None),
    ('https://127.0.0.1/token','POST',None), (TOKEN,'GET',None),
    (CERTS,'POST',None), (CERTS,'GET',{'Authorization':'secret'}),
    (CERTS,'GET',{'Host':'evil.example'})])
def test_endpoint_gate_precedes_dns(harness,url,method,headers):
    broker,dns,sends = harness
    with pytest.raises(AuthRefused):
        GoogleTransport(broker)(url,method=method,headers=headers)
    assert dns == sends == []
    assert 'secret' not in json.dumps(broker.activity.latest())

def test_offline_block_precede_dns(harness):
    broker,dns,sends = harness
    broker.policy.set_offline(True)
    with pytest.raises(Offline): broker.authentication_request(CERTS)
    broker.policy.set_offline(False)
    broker.policy.grant('authentication:google','www.googleapis.com','block',True)
    with pytest.raises(HostBlocked): broker.authentication_request(CERTS)
    assert dns == sends == []

def test_redirect_never_followed_or_logged(harness):
    broker,dns,sends = harness
    broker.transport = httpx.MockTransport(lambda r: httpx.Response(302,headers={'location':'http://127.0.0.1/?secret=code'}))
    with pytest.raises(AuthRefused): GoogleTransport(broker)(TOKEN,method='POST',body=b'code=secret')
    assert dns == ['oauth2.googleapis.com']
    assert len(broker.activity.latest()) == 1
    assert 'secret' not in json.dumps(broker.activity.latest())

def test_response_cap_and_private_dns(harness,monkeypatch):
    broker,dns,sends = harness
    broker.transport = httpx.MockTransport(lambda r: httpx.Response(200,content=b'x'*(256*1024+1)))
    with pytest.raises(TooLarge): broker.authentication_request(CERTS)
    monkeypatch.setattr('app.net_guard.resolve_host',lambda host:[ipaddress.ip_address('127.0.0.1')])
    with pytest.raises(AuthRefused): GoogleTransport(broker)(CERTS)

@pytest.mark.parametrize('timeout',[0,-1,21,float('nan'),float('inf'),True])
def test_invalid_timeout_does_not_resolve(harness,timeout):
    broker,dns,sends = harness
    with pytest.raises(ValueError): broker.authentication_request(CERTS,timeout=timeout)
    assert dns == sends == []


def test_deadline_stops_slow_body(harness,monkeypatch):
    from app.network_broker import FetchFailed
    broker,dns,sends = harness
    now = [0.0]
    monkeypatch.setattr('app.network_broker.time.monotonic', lambda:now[0])
    def slow(request):
        sends.append(request)
        now[0] = 21.0
        return httpx.Response(200,content=b'body')
    broker.transport = httpx.MockTransport(slow)
    with pytest.raises(FetchFailed): broker.authentication_request(CERTS)
    assert len(sends) == 1
    assert broker.activity.latest()[0]['outcome'] == 'timeout'


def test_token_post_does_not_record_secrets(harness):
    broker,dns,sends = harness
    response = GoogleTransport(broker)(TOKEN,method='POST',headers={'Content-Type':'application/x-www-form-urlencoded'},body=b'code=secret&client_secret=private')
    assert response.status == 200
    activity = json.dumps(broker.activity.latest())
    assert 'secret' not in activity and 'private' not in activity
    assert sends[0].content == b'code=secret&client_secret=private'


def test_dns_exhausting_deadline_never_connects(harness, monkeypatch):
    from app.network_broker import FetchFailed
    broker, dns, sends = harness
    now = [0.0]
    monkeypatch.setattr('app.network_broker.time.monotonic', lambda: now[0])
    def slow_resolve(host):
        dns.append(host)
        now[0] = 25.0
        return [ipaddress.ip_address('8.8.8.8')]
    monkeypatch.setattr('app.net_guard.resolve_host', slow_resolve)
    with pytest.raises(FetchFailed):
        broker.authentication_request(CERTS, timeout=20)
    assert dns == ['www.googleapis.com']
    assert sends == []
