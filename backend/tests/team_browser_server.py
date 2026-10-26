"""
================================================================================
FILE: backend/tests/team_browser_server.py
SUMMARY
    Test-only HTTPS server for two-browser team acceptance with synthetic Google IDs.
BASIC IDEA
    Exercise the production callback, nonce checks, official signature verifier,
    sessions and middleware. Only the external provider is replaced; generated
    keys remain in the scratch directory. This module is outside the shipped app.
INPUTS / INPUT SOURCES
    Explicit scratch directory, localhost port and generated synthetic accounts.
EXPECTED OUTPUT
    A private HTTPS test process without real Google traffic or printed tokens.
================================================================================
"""
from datetime import datetime, timedelta, timezone
import ipaddress
import json
import os
from pathlib import Path
import sys
import time
from types import SimpleNamespace
from urllib.parse import urlencode

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from google.auth import jwt
from google.auth.crypt import RSASigner
import uvicorn
import asyncio
import hashlib


def refuse_sqlite(event, arguments):
    if event == 'sqlite3.connect':
        raise AssertionError('forbidden_storage_connection')


# Audit the actual shipped app during HTTPS acceptance, including its imported
# libraries, without importing or constructing the rejected database engine.
sys.addaudithook(refuse_sqlite)


def serve(directory, port):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    origin = f"https://127.0.0.1:{os.environ.get('TEAM_BROWSER_PUBLIC_PORT', port)}"
    os.environ.update(SEMANTIC_STUDIO_MODE="team", SEMANTIC_STUDIO_DATA_DIR=str(directory / "team"),
                      SEMANTIC_STUDIO_PUBLIC_ORIGIN=origin, SEMANTIC_STUDIO_GOOGLE_CLIENT_ID="synthetic-client",
                      SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET="replace-me", SEMANTIC_STUDIO_ALLOWED_DOMAINS="example.org",
                      SEMANTIC_STUDIO_BOOTSTRAP_SUBS="owner")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    public = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    now = datetime.now(timezone.utc)
    certificate = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
                   .serial_number(x509.random_serial_number()).not_valid_before(now - timedelta(minutes=1))
                   .not_valid_after(now + timedelta(days=1))
                   .add_extension(x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]), critical=False)
                   .sign(key, hashes.SHA256()))
    key_path, cert_path = directory / "fixture.key", directory / "fixture.pem"
    key_path.write_bytes(private)
    key_path.chmod(0o600)
    cert_path.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
    from app.main import app
    from app.network_broker import BrokerResponse
    from app.team.auth import GoogleIdentity
    from app.team.auth_store import AuthRefused
    runtime = app.state.team
    original_start = runtime.start

    def start():
        original_start()
        store = runtime.auth_store
        timestamp = time.time()
        store.identity("owner", "owner@example.org", "example.org", now=timestamp)
        store.identity("editor", "editor@example.org", "example.org", now=timestamp)
        token = store.create_session('owner', now=timestamp)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        authorize = lambda tx: store.require_current_principal(tx, token_hash=token_hash, operation='admin', now=time.time)
        key_name = "file:合成原本.bin"
        if runtime.repository.read(key_name) is None:
            digest = runtime.workspace.blobs.put(b"synthetic opaque original")
            runtime.repository.commit("owner", "fixture-unicode-original",
                                      {key_name: None, "workspace": None},
                                      {key_name: {"blob": digest}, "workspace": {"schema": 1}}, "migrate", authorize=authorize)
        if next(user for user in store.users() if user.sub == "editor").role == "viewer":
            store.change_access("owner", "editor", expected_version=1, role="editor", disabled=False,
                                request_id="fixture-editor", now=timestamp, authorize=authorize)
        store.identity("reader", "reader@example.org", "example.org", now=timestamp)
        signer = RSASigner.from_string(private, key_id="fixture")
        def request(url, **kwargs):
            if not url.endswith("/certs"):
                raise AuthRefused()
            return BrokerResponse(url, 200, {}, json.dumps({"fixture": public.decode()}).encode())
        class FixtureIdentity(GoogleIdentity):
            logins = 0
            def authorization_url(self, attempt):
                # The driver has a fixed sequence. No application route gains a
                # testing exception or an unchecked client-supplied identity.
                user = ("owner", "editor", "owner", "reader")[min(self.logins, 3)]
                self.logins += 1
                return origin + "/api/auth/callback?" + urlencode({"code": user, "state": attempt.state})
            def exchange(self, code, state):
                if code not in {"owner", "editor", "reader"}:
                    raise AuthRefused()
                issued = int(time.time())
                claims = dict(iss="https://accounts.google.com", aud="synthetic-client", sub=code,
                              email=code + "@example.org", hd="example.org", email_verified=True,
                              nonce=state.nonce, iat=issued - 1, exp=issued + 300)
                return self.verify(jwt.encode(signer, claims).decode(), state.nonce)
        runtime.identity = FixtureIdentity(runtime.config, SimpleNamespace(authentication_request=request))
    runtime.start = start
    from app.team.server import serve_team
    asyncio.run(serve_team(app, host=os.environ.get('TEAM_BROWSER_BIND_HOST', '127.0.0.1'), port=port,
                           ssl_keyfile=str(key_path), ssl_certfile=str(cert_path)))


if __name__ == "__main__":
    serve(sys.argv[1], int(sys.argv[2]))
