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

_restarted_storages = []


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


def reset_test_schema():
    """Drop known test tables only; never expose reset as a product CLI."""
    from pg_probe import connect
    if os.environ.get('SEMANTIC_STUDIO_TEST_DB') != '1':
        raise RuntimeError('dedicated_test_database_required')
    with connect(role_config('maintenance')) as db:
        for table in ('team_sessions', 'team_login_attempts', 'team_auth_events',
                      'team_access_requests', 'team_users', 'audit', 'requests', 'resources', 'team_schema'):
            db.execute('DROP TABLE IF EXISTS semantic_studio.' + table + ' CASCADE')


def restart_workspace(workspace):
    from app.team.pg_storage import PgStorage
    from app.team.repository import TeamRepository
    from app.team.auth_store import AuthStore
    from app.team.workspace import TeamWorkspace
    config, directory = workspace.repository.storage.config, workspace.data_dir
    bootstrap = workspace.auth_store.bootstrap_subs if workspace.auth_store else frozenset({'alice', 'bob'})
    workspace.close()
    workspace.repository.storage.close()
    storage = PgStorage(config, on_fatal=lambda kind: None)
    _restarted_storages.append(storage)
    storage.start_writer()
    return TeamWorkspace(TeamRepository(storage), directory,
                         auth_store=AuthStore(storage, bootstrap_subs=bootstrap))


def close_restarted_storages():
    while _restarted_storages:
        _restarted_storages.pop().close()


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] != '--init-secrets':
        raise SystemExit('test_secret_arguments_invalid')
    write_test_secrets(Path(sys.argv[2]))
