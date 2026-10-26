"""
================================================================================
FILE: backend/tests/pg_support.py
SUMMARY
    Dedicated PostgreSQL test credentials and role-aware connection helpers.
BASIC IDEA
    Keep disposable secrets out of source/image layers; integration tests run
    in the same internal network and never request a published database port.
INPUTS / INPUT SOURCES
    The test runner environment and a private, explicit scratch directory.
EXPECTED OUTPUT
    Synthetic secret files or a validated role configuration, without output.
================================================================================
"""
from __future__ import annotations

import os
from pathlib import Path
import secrets
import sys


def role_config(role='app'):
    from app.team.pg_config import load_pg_config, ROLES
    env = dict(os.environ)
    env['SEMANTIC_STUDIO_DB_USER'] = ROLES[role]
    env['SEMANTIC_STUDIO_DB_PASSWORD_FILE'] = '/run/secrets/team_db_' + role
    return load_pg_config(env, role=role)


def write_test_secrets(destination: Path):
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(destination, 0o700)
    for role in ('admin', 'app', 'maintenance', 'backup'):
        path = destination / role
        # Never rotate an existing DB's credential implicitly on a rerun.
        if not path.exists():
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, 'w') as stream:
                stream.write(secrets.token_urlsafe(48) + '\n')
            # File-backed Compose secrets preserve host ownership/mode. The
            # private host directory protects the files; container UID 999
            # must also be able to read its individual secret bind mount.
            os.chmod(path, 0o444)


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] != '--init-secrets':
        raise SystemExit('test_secret_arguments_invalid')
    write_test_secrets(Path(sys.argv[2]))
