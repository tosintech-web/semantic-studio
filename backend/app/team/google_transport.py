"""
================================================================================
FILE: backend/app/team/google_transport.py
SUMMARY
    Google verification's Request interface backed solely by the network broker.
BASIC IDEA
    Adapt fixed authentication responses without creating an HTTP client. Refuse
    transport failures with one finite code so credentials never enter errors.
INPUTS / INPUT SOURCES
    Google's certificate request or the server's code exchange request.
EXPECTED OUTPUT
    A response exposing status, data and headers, or a safe AuthRefused.
================================================================================
"""
from dataclasses import dataclass
from .auth_store import AuthRefused


@dataclass(frozen=True)
class GoogleResponse:
    status: int
    data: bytes
    headers: object


class GoogleTransport:
    def __init__(self, broker):
        self.broker = broker

    def __call__(self, url, method='GET', body=None, headers=None, timeout=20, **kwargs):
        try:
            if kwargs:
                raise ValueError
            response = self.broker.authentication_request(
                url, method=method, body=body, headers=headers, timeout=timeout,
            )
            return GoogleResponse(response.status, response.body, response.headers)
        except Exception:
            # Library exceptions can interpolate the entire exchange response.
            raise AuthRefused() from None
