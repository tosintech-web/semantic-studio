"""
================================================================================
FILE: backend/tests/test_pg_schema.py
SUMMARY
    Verify schema initialization, catalog integrity and real table privileges.
BASIC IDEA
    Maintenance initializes under the same DB lease. Read-only checks still work
    while the app owns that lease; forged metadata never repairs altered DDL.
INPUTS / INPUT SOURCES
    Dedicated Compose test database and controlled catalog/privilege changes.
EXPECTED OUTPUT
    Exact schema/version/permissions or a closed incompatible-schema failure.
================================================================================
"""
import pytest

from app.team.pg_schema import ensure_schema
from app.team.pg_storage import PgStorage
from app.team.repository import UnsupportedSchema
from pg_probe import connect
from pg_support import role_config

pytestmark = pytest.mark.team_db


def test_current_schema_check_works_without_stealing_live_app_lease(pg_repository):
    maintenance = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    try:
        assert ensure_schema(maintenance) == 'current'
        pg_repository.storage.ensure_owner()
    finally:
        maintenance.close()


@pytest.mark.parametrize('damage', [
    'ALTER TABLE semantic_studio.resources DROP CONSTRAINT resources_version_check',
    'DROP INDEX semantic_studio.audit_key_id',
    'ALTER TABLE semantic_studio.requests DROP CONSTRAINT requests_pkey',
    'GRANT UPDATE ON semantic_studio.audit TO team_app',
    'GRANT UPDATE(before_payload) ON semantic_studio.audit TO team_app',
    'ALTER TABLE semantic_studio.resources ALTER COLUMN key TYPE text COLLATE "C"',
    'ALTER TABLE semantic_studio.resources ALTER COLUMN version TYPE numeric',
    'UPDATE semantic_studio.team_schema SET version=99',
])
def test_schema_rejects_forged_version_or_missing_constraint(pg_schema, damage):
    with connect(role_config('maintenance')) as db:
        db.execute(damage)
    check = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    try:
        with pytest.raises(UnsupportedSchema):
            ensure_schema(check)
    finally:
        check.close()


def test_partial_schema_is_rejected_without_implicit_repair():
    from pg_support import reset_test_schema
    reset_test_schema()
    with connect(role_config('maintenance')) as db:
        db.execute('CREATE TABLE semantic_studio.resources (key text PRIMARY KEY)')
    check = PgStorage(role_config('maintenance'), on_fatal=lambda kind: None)
    try:
        with pytest.raises(UnsupportedSchema):
            ensure_schema(check)
        with connect(role_config('maintenance')) as db:
            tables = db.execute("SELECT tablename FROM pg_tables WHERE schemaname='semantic_studio'").fetchall()
            assert tables == [{'tablename': 'resources'}]
    finally:
        check.close()
        reset_test_schema()


def test_schema_role_privileges(pg_repository):
    import psycopg
    app = role_config()
    forbidden = [
        'UPDATE semantic_studio.audit SET operation=operation',
        'DELETE FROM semantic_studio.audit',
        'UPDATE semantic_studio.requests SET result=result',
        'DELETE FROM semantic_studio.team_auth_events',
        'UPDATE semantic_studio.team_access_requests SET result=result',
        'CREATE TABLE semantic_studio.forbidden_role_table (id int)',
    ]
    with connect(app) as db:
        for sql in forbidden:
            with pytest.raises(psycopg.errors.InsufficientPrivilege) as caught:
                db.execute(sql)
            assert caught.value.sqlstate == '42501'
        db.execute("INSERT INTO semantic_studio.resources VALUES ('probe',1,'{}')")
        db.execute("INSERT INTO semantic_studio.audit(key,actor,timestamp,operation,request_id,after_version) VALUES ('probe','actor','time','test','id',1)")
    with connect(role_config('backup')) as db:
        assert db.execute('SELECT count(*) AS count FROM semantic_studio.audit').fetchone()['count'] == 1
        with pytest.raises(psycopg.errors.InsufficientPrivilege) as caught:
            db.execute('UPDATE semantic_studio.resources SET version=2')
        assert caught.value.sqlstate == '42501'
