"""
================================================================================
FILE: backend/app/team/pg_config.py
SUMMARY
    Immutable, bounded capability for the dedicated Compose database.
BASIC IDEA
    Validate endpoint, role and bridge inputs without accepting a general DSN.
    The bootstrap job validates the same network without mounting credentials.
INPUTS / INPUT SOURCES
    Explicit SEMANTIC_STUDIO_DB_* mappings and secret file metadata.
EXPECTED OUTPUT
    A dedicated IPv4 endpoint or a finite error containing no supplied values.
================================================================================
"""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from ipaddress import IPv4Address, IPv4Network, ip_address, ip_network
from pathlib import Path
import os
import re
from typing import Literal

Role = Literal['app', 'maintenance', 'backup']
ROLES = {'app': 'team_app', 'maintenance': 'team_maintenance', 'backup': 'team_backup'}
PREFIX = 'SEMANTIC_STUDIO_DB_'
PRIVATE_NETWORKS = tuple(IPv4Network(s) for s in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'))


@dataclass(frozen=True)
class PgEndpoint:
    host: str
    port: int
    dbname: str
    subnet: IPv4Network
    gateway: IPv4Address


@dataclass(frozen=True)
class PgConfig(PgEndpoint):
    role: Role
    user: str
    password_file: Path = field(repr=False)
    connect_timeout: int = 5
    dns_timeout: int = 5
    mutex_timeout: int = 5
    lock_timeout_ms: int = 5000
    statement_timeout_ms: int = 30000


def load_endpoint(env: Mapping[str, str]) -> PgEndpoint:
    """Network-only parsing is also used by the credential-free HBA job."""
    try:
        # Reject alternative capability inputs even when empty: otherwise a
        # misspelled operator configuration could appear to have taken effect.
        if any(PREFIX + key in env for key in ('URL', 'DSN', 'PASSWORD')):
            raise ValueError
        if env.get(PREFIX + 'HOST') != 'db' or env.get(PREFIX + 'PORT') != '5432':
            raise ValueError
        name = env[PREFIX + 'NAME']
        if (not re.fullmatch(r'[a-z][a-z0-9_]{0,62}', name, flags=re.ASCII)
                or name in {'postgres', 'template0', 'template1'}):
            raise ValueError
        subnet = ip_network(env[PREFIX + 'SUBNET'], strict=True)
        gateway = ip_address(env[PREFIX + 'GATEWAY'])
        if (not isinstance(subnet, IPv4Network) or subnet.num_addresses < 16
                or not any(subnet.subnet_of(network) for network in PRIVATE_NETWORKS)
                or not isinstance(gateway, IPv4Address) or gateway not in subnet
                or gateway in {subnet.network_address, subnet.broadcast_address}):
            raise ValueError
        return PgEndpoint('db', 5432, name, subnet, gateway)
    except (KeyError, TypeError, ValueError):
        raise ValueError('db_config_invalid') from None


def load_pg_config(env: Mapping[str, str], *, role: Role) -> PgConfig:
    endpoint = load_endpoint(env)
    try:
        if role not in ROLES or env.get(PREFIX + 'USER') != ROLES[role]:
            raise ValueError
        secret = Path(env[PREFIX + 'PASSWORD_FILE'])
        if not secret.is_file() or not 0 < secret.stat().st_size <= 16384 or not os.access(secret, os.R_OK):
            raise ValueError
        return PgConfig(**vars(endpoint), role=role, user=ROLES[role], password_file=secret)
    except (KeyError, TypeError, ValueError, OSError):
        raise ValueError('db_secret_config_invalid') from None
