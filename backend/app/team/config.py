"""
================================================================================
FILE: backend/app/team/config.py
================================================================================
SUMMARY
    Explicit, immutable configuration for local and team operation.
BASIC IDEA
    Parse only the supplied environment mapping and fail closed when a team
    deployment lacks an exact HTTPS origin, identity settings or data directory.
    Parsing neither activates the mode nor opens or migrates a data directory.
INPUTS / INPUT SOURCES
    - SEMANTIC_STUDIO_* values passed to TeamConfig.from_env.
EXPECTED OUTPUT
    - An immutable configuration; validation errors never echo supplied values.
================================================================================
"""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path
from ipaddress import ip_address, IPv6Address
import re
from typing import Literal
from urllib.parse import urlsplit


_DOMAIN = re.compile(r"(?=.{1,253}\Z)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z", re.ASCII)

_HOSTNAME = re.compile(r"(?=.{1,253}\Z)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\Z", re.ASCII)


def _required(env: Mapping[str, str], name: str) -> str:
    key = "SEMANTIC_STUDIO_" + name
    value = env.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} is required in team mode")
    return value


def _members(value: str, name: str) -> frozenset[str]:
    members = value.split(",")
    if any(not item.strip() or any(c.isspace() for c in item.strip()) for item in members):
        raise ValueError(f"Invalid {name}")
    return frozenset(item.strip() for item in members)


def _origin(value: str) -> str:
    try:
        parts = urlsplit(value)
        valid = (parts.scheme == "https" and bool(parts.hostname) and
                 parts.username is None and parts.password is None and
                 not parts.path and "?" not in value and "#" not in value and
                 "\\" not in value and not any(c.isspace() or ord(c) < 32 for c in value))
        hostname = parts.hostname or ""
        if "%" in hostname or any(ord(char) < 32 or ord(char) == 127 for char in hostname):
            raise ValueError
        try:
            address = ip_address(hostname)
        except ValueError:
            # Numeric-looking addresses must not fall back to DNS after a
            # failed IP parse, and URL brackets must contain an IPv6 literal.
            if (parts.netloc.startswith("[") or re.fullmatch(r"[0-9.]+", hostname)
                    or not _HOSTNAME.fullmatch(hostname)):
                raise ValueError from None
        else:
            if isinstance(address, IPv6Address) != parts.netloc.startswith("["):
                raise ValueError
        # Accessing port validates both syntax and the TCP range.
        port = parts.port
        if not valid or port == 0 or parts.netloc.endswith(":"):
            raise ValueError
    except ValueError:
        raise ValueError("Invalid SEMANTIC_STUDIO_PUBLIC_ORIGIN: exact HTTPS origin required") from None
    return value


@dataclass(frozen=True)
class TeamConfig:
    mode: Literal["local", "team"] = "local"
    public_origin: str | None = None
    google_client_id: str | None = None
    google_client_secret: str | None = field(default=None, repr=False)
    allowed_domains: frozenset[str] = frozenset()
    bootstrap_subs: frozenset[str] = frozenset()
    data_dir: Path | None = None

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> TeamConfig:
        mode = env.get("SEMANTIC_STUDIO_MODE", "local")
        if mode not in ("local", "team"):
            raise ValueError("SEMANTIC_STUDIO_MODE must be local or team")
        if mode == "local":
            directory = env.get("SEMANTIC_STUDIO_DATA_DIR")
            return cls(data_dir=Path(directory) if directory else None)
        origin = _origin(_required(env, "PUBLIC_ORIGIN"))
        client_id = _required(env, "GOOGLE_CLIENT_ID")
        secret = _required(env, "GOOGLE_CLIENT_SECRET")
        domains = _members(_required(env, "ALLOWED_DOMAINS"), "allowed domains")
        if any(not _DOMAIN.fullmatch(domain) for domain in domains):
            raise ValueError("Invalid SEMANTIC_STUDIO_ALLOWED_DOMAINS")
        subs = _members(_required(env, "BOOTSTRAP_SUBS"), "bootstrap subjects")
        directory = _required(env, "DATA_DIR")
        if "\0" in directory:
            raise ValueError("Invalid SEMANTIC_STUDIO_DATA_DIR")
        return cls("team", origin, client_id, secret, domains, subs, Path(directory))
