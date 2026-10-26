"""
================================================================================
FILE: backend/app/team/pg_bootstrap.py
SUMMARY
    Generate a database HBA from the same validated inputs as the connector.
BASIC IDEA
    Reject the host gateway first and grant only the dedicated database roles
    on the IPv4 bridge; Unix administration is peer-authenticated as postgres.
INPUTS / INPUT SOURCES
    Network-only environment configuration and an explicit configuration volume.
EXPECTED OUTPUT
    Atomic pg_hba.conf and quiet finite failure codes, without credentials.
================================================================================
"""
from __future__ import annotations

import os
from pathlib import Path
import sys
import tempfile

from .pg_config import PgEndpoint, load_endpoint


def render_hba(config: PgEndpoint) -> str:
    return '\n'.join([
        'local all postgres peer',
        'local all all reject',
        f'host all all {config.gateway}/32 reject',
        f'host {config.dbname} team_app,team_maintenance,team_backup {config.subnet} scram-sha-256',
        'host all all 0.0.0.0/0 reject',
        'host all all ::/0 reject',
        '',
    ])


def write_db_config(env, destination: Path) -> None:
    body = render_hba(load_endpoint(env))
    destination.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(dir=destination, prefix='.hba-')
    try:
        with os.fdopen(descriptor, 'w', encoding='ascii') as stream:
            stream.write(body)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(name, 0o444)
        os.replace(name, destination / 'pg_hba.conf')
    finally:
        Path(name).unlink(missing_ok=True)


def main() -> int:
    try:
        if len(sys.argv) != 2:
            raise ValueError
        write_db_config(os.environ, Path(sys.argv[1]))
    except (ValueError, OSError):
        print('db_bootstrap_failed', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
