"""
================================================================================
FILE: backend/tests/test_pg_bootstrap.py
SUMMARY
    Verify real bootstrap role isolation on the dedicated internal database.
BASIC IDEA
    Probe actual database privileges and denied sessions, not missing tables.
INPUTS / INPUT SOURCES
    Disposable Compose PostgreSQL and synthetic role secrets.
EXPECTED OUTPUT
    Least-privilege logins work; PUBLIC and administrator TCP do not.
================================================================================
"""
import pytest

from pg_probe import connect
from pg_support import role_config

pytestmark = pytest.mark.team_db


def test_pg_bootstrap_roles_and_secrets():
    import psycopg
    for role in ('app', 'maintenance', 'backup'):
        config = role_config(role)
        with connect(config) as db:
            row = db.execute('SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=current_user').fetchone()
            assert row == dict(rolsuper=False, rolcreatedb=False, rolcreaterole=False, rolreplication=False, rolbypassrls=False)
            assert db.execute("SELECT has_database_privilege(current_user,current_database(),'TEMP') AS allowed").fetchone()['allowed'] is False
            assert db.execute("SELECT has_schema_privilege(current_user,'public','CREATE') AS allowed").fetchone()['allowed'] is False
            if role == 'app':
                with pytest.raises(psycopg.errors.InsufficientPrivilege):
                    db.execute('CREATE ROLE forbidden_test_role')
                with pytest.raises(psycopg.errors.InsufficientPrivilege):
                    db.execute('CREATE TABLE semantic_studio.forbidden_test_table (id int)')
        with pytest.raises(psycopg.OperationalError):
            connect(config, user='postgres')
        with pytest.raises(psycopg.OperationalError):
            connect(config, dbname='postgres')


def test_backup_role_cannot_create_schema_objects():
    import psycopg
    with connect(role_config('backup')) as db:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            db.execute('CREATE TABLE semantic_studio.forbidden_backup_table (id int)')
