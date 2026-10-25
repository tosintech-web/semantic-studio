"""
================================================================================
FILE: backend/tests/test_team_auth.py
SUMMARY
    Verify signed Google identity facts and strict Workspace restrictions.
BASIC IDEA
    Locally sign synthetic JWTs and supply certificates through a fake broker.
INPUTS / INPUT SOURCES
    Fresh RSA keys, altered claims and code exchange responses.
EXPECTED OUTPUT
    Valid identity facts only or finite, sanitized authentication refusals.
================================================================================
"""
import base64
import hashlib
import json
import time
from dataclasses import replace
from urllib.parse import parse_qs,urlsplit
from types import SimpleNamespace
import pytest
from google.auth import jwt
from google.auth.crypt import RSASigner
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from app.network_broker import BrokerResponse
from app.team.auth import GoogleIdentity
from app.team.auth_store import AuthRefused,LoginAttempt,LoginState
from app.team.config import TeamConfig
@pytest.fixture
def fixture():
    key = rsa.generate_private_key(public_exponent=65537,key_size=2048)
    private = key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())
    public = key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = RSASigner.from_string(private,key_id='synthetic')
    now = int(time.time())
    claims = dict(iss='https://accounts.google.com',aud='client',sub='stable-sub',email='person@example.org',hd='example.org',email_verified=True,nonce='nonce',iat=now-10,exp=now+300,role='admin')
    calls,token_body = [],{}
    def request(url,**kwargs):
        calls.append((url,kwargs))
        return BrokerResponse(url,200,{},json.dumps({'synthetic':public.decode()} if url.endswith('/certs') else token_body).encode())
    config = TeamConfig(mode='team',public_origin='https://studio.example',google_client_id='client',google_client_secret='replace-me',allowed_domains=frozenset({'example.org'}))
    return GoogleIdentity(config,SimpleNamespace(authentication_request=request)),signer,claims,calls,token_body

def test_verified_facts_exclude_roles(fixture):
    identity,signer,claims,calls,_ = fixture
    assert identity.verify(jwt.encode(signer,claims).decode(),'nonce') == {k:claims[k] for k in ('sub','email','hd')}
    assert calls[0][0] == 'https://www.googleapis.com/oauth2/v1/certs'

@pytest.mark.parametrize('domain', ['example.org', 'second.example.org', 'example.net'])
def test_workspace_membership_uses_only_the_deployment_configuration(fixture, domain):
    identity, signer, claims, *_ = fixture
    identity.config = replace(identity.config, allowed_domains=frozenset({domain}))
    claims.update(hd=domain, email='person@' + domain)
    token = jwt.encode(signer, claims).decode()
    assert identity.verify(token, 'nonce')['hd'] == domain
    identity.config = replace(identity.config, allowed_domains=frozenset({'different.example'}))
    with pytest.raises(AuthRefused):
        identity.verify(token, 'nonce')

@pytest.mark.parametrize('field,value',[('iss','evil'),('aud','other'),('exp',1),('hd','other.net'),('email_verified',False),('email_verified','true'),('nonce','forged'),('sub',''),('email','')])
def test_forged_claims(fixture,field,value):
    identity,signer,claims,*_ = fixture
    claims[field] = value
    with pytest.raises(AuthRefused,match='^auth_failed$'): identity.verify(jwt.encode(signer,claims).decode(),'nonce')

@pytest.mark.parametrize('field',['iss','aud','exp','iat','hd','email_verified','nonce','sub','email'])
def test_missing_claims(fixture,field):
    identity,signer,claims,*_ = fixture
    del claims[field]
    with pytest.raises(AuthRefused): identity.verify(jwt.encode(signer,claims).decode(),'nonce')

def test_signature_and_original_errors_sanitized(fixture):
    identity,signer,claims,*_ = fixture
    token = jwt.encode(signer,claims).decode().rsplit('.',1)[0]+'.AAAA'
    with pytest.raises(AuthRefused,match='^auth_failed$'): identity.verify(token,'nonce')
    def fail(*args,**kwargs): raise RuntimeError('secret=code&client-secret')
    identity.transport.broker.authentication_request = fail
    with pytest.raises(AuthRefused) as error: identity.verify(jwt.encode(signer,claims).decode(),'nonce')
    assert str(error.value) == 'auth_failed' and error.value.__cause__ is None

def test_authorization_and_exchange_bind_pkce_nonce(fixture):
    identity,signer,claims,calls,body = fixture
    url = identity.authorization_url(LoginAttempt('state','cookie','nonce','verifier'))
    assert url.startswith('https://accounts.google.com/o/oauth2/v2/auth?')
    query = parse_qs(urlsplit(url).query)
    assert query['scope'] == ['openid email']
    assert query['redirect_uri'] == ['https://studio.example/api/auth/callback']
    assert query['state'] == ['state'] and query['nonce'] == ['nonce']
    assert query['code_challenge_method'] == ['S256']
    assert query['code_challenge'] == [base64.urlsafe_b64encode(hashlib.sha256(b'verifier').digest()).rstrip(b'=').decode()]
    assert 'replace-me' not in url and 'access_type' not in query
    body['id_token'] = jwt.encode(signer,claims).decode()
    assert identity.exchange('code-value',LoginState('nonce','verifier'))['sub'] == 'stable-sub'
    url,kwargs = calls[0]
    assert url == 'https://oauth2.googleapis.com/token' and kwargs['method'] == 'POST'
    form = parse_qs(kwargs['body'].decode())
    assert form['code_verifier'] == ['verifier'] and form['code'] == ['code-value'] and form['client_secret'] == ['replace-me']

def test_exchange_error_is_sanitized(fixture):
    identity,_,_,_,body = fixture
    body['error_description'] = 'client-secret code-value'
    with pytest.raises(AuthRefused,match='^auth_failed$'): identity.exchange('code-value',LoginState('nonce','verifier'))
