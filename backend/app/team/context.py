"""
================================================================================
FILE: backend/app/team/context.py
================================================================================
SUMMARY
    Routes legacy service references to request-bound team candidates.
BASIC IDEA
    Keep mutable evaluation detached until the authoritative transaction commits.
INPUTS / INPUT SOURCES
    - Validated team service requests and private persistent storage.
EXPECTED OUTPUT
    - Durable state with explicit failure and replay semantics.
================================================================================
"""
import os
from contextvars import ContextVar
from contextlib import contextmanager

_services = ContextVar("team_services", default={})

class ServiceProxy:
    def __init__(self, name, fallback=None, *, factory=None):
        object.__setattr__(self, "_name", name)
        object.__setattr__(self, "_fallback", factory() if factory is not None and os.environ.get("SEMANTIC_STUDIO_MODE", "local") != "team" else fallback)

    def _target(self):
        target = _services.get().get(self._name, self._fallback)
        if target is None:
            raise RuntimeError("Team service requires an isolated workspace request")
        return target

    def __getattr__(self, name):
        return getattr(self._target(), name)

    def __setattr__(self, name, value):
        setattr(self._target(), name, value)

    def __delattr__(self, name):
        delattr(self._target(), name)

@contextmanager
def bind_services(services):
    token = _services.set(services)
    try:
        yield
    finally:
        _services.reset(token)
