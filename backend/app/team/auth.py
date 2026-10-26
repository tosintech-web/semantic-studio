"""
================================================================================
FILE: backend/app/team/auth.py
SUMMARY
    Server-side Google authorization code flow and verified Workspace identity.
BASIC IDEA
    Bind state, nonce and PKCE to the server's login attempt. The official lazy
    loaded verifier checks signatures, audience, issuer and time through the
    broker transport; strict application claims then select identity facts.
INPUTS / INPUT SOURCES
    Validated team configuration, one-use login state, Google code and ID token.
EXPECTED OUTPUT
    A Google authorization URL or verified sub/email/hd; finite safe refusals.
================================================================================
"""
from __future__ import annotations
import base64
import hashlib
import hmac
import json
import math
import time
from urllib.parse import urlencode
from .auth_store import AuthRefused
from .google_transport import GoogleTransport


class GoogleIdentity:
    def __init__(self, config, broker, clock=None):
        self.config = config
        self.transport = GoogleTransport(broker)
        self.clock = clock or time.time

    @property
    def redirect_uri(self):
        return self.config.public_origin + '/api/auth/callback'

    def authorization_url(self, attempt):
        challenge = base64.urlsafe_b64encode(hashlib.sha256(attempt.code_verifier.encode()).digest()).rstrip(b'=').decode()
        return 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode({
            'client_id': self.config.google_client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code', 'scope': 'openid email',
            'state': attempt.state, 'nonce': attempt.nonce,
            'code_challenge': challenge, 'code_challenge_method': 'S256',
        })

    def exchange(self, code, login_state):
        try:
            if not isinstance(code, str) or not code or len(code) > 8192:
                raise ValueError
            response = self.transport(
                'https://oauth2.googleapis.com/token', method='POST',
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                body=urlencode({
                    'grant_type': 'authorization_code', 'code': code,
                    'client_id': self.config.google_client_id,
                    'client_secret': self.config.google_client_secret,
                    'redirect_uri': self.redirect_uri,
                    'code_verifier': login_state.code_verifier,
                }).encode(),
            )
            if response.status != 200:
                raise ValueError
            token = json.loads(response.data)['id_token']
            return self.verify(token, login_state.nonce)
        except Exception:
            raise AuthRefused() from None

    def verify(self, id_token, nonce):
        try:
            # Importing this module in local mode must not require google-auth,
            # and Google must never construct its default network transport.
            from google.oauth2.id_token import verify_oauth2_token
            if not isinstance(id_token, str) or not id_token or len(id_token) > 65536:
                raise ValueError
            if not isinstance(nonce, str) or not nonce:
                raise ValueError
            claims = verify_oauth2_token(id_token, self.transport, audience=self.config.google_client_id)
            if not all(name in claims for name in ('iss', 'aud', 'iat', 'exp', 'sub', 'email', 'hd', 'email_verified', 'nonce')):
                raise ValueError
            for name in ('iat', 'exp'):
                value = claims[name]
                if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value):
                    raise ValueError
            if claims['exp'] <= self.clock():
                raise ValueError
            if not isinstance(claims['hd'], str) or claims['hd'] not in self.config.allowed_domains or claims['email_verified'] is not True:
                raise ValueError
            for name in ('sub', 'email', 'nonce'):
                if not isinstance(claims[name], str) or not claims[name] or len(claims[name]) > 1024 or '\0' in claims[name]:
                    raise ValueError
            if not hmac.compare_digest(claims['nonce'].encode(), nonce.encode()):
                raise ValueError
            # Authorization always comes from the current server-owned user.
            return {name: claims[name] for name in ('sub', 'email', 'hd')}
        except Exception:
            raise AuthRefused() from None
