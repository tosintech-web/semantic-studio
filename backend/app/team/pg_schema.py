"""
================================================================================
FILE: backend/app/team/pg_schema.py
SUMMARY
    Validate the exact PostgreSQL catalog and initialize version 1 explicitly.
BASIC IDEA
    Compare parsed catalog facts to a reviewed reference, not just a version
    row. Current checks are read-only; DDL needs the maintenance writer lease.
INPUTS / INPUT SOURCES
    Immutable migration SQL/catalog reference and PostgreSQL metadata.
EXPECTED OUTPUT
    Verified current schema or atomic initialization, never implicit app DDL.
================================================================================
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .pg_storage import PgStorage, TABLES
from .repository import UnsupportedSchema

SQL_PATH = Path(__file__).with_name('sql') / '001_initial.sql'
CATALOG_PATH = SQL_PATH.with_suffix('.catalog.json')
SCHEMA_VERSION = 1


def ddl_fingerprint():
    return hashlib.sha256(SQL_PATH.read_bytes()).hexdigest()


def describe_schema(tx):
    """Capture parsed DDL, identities, indexes, ownership and all ACL grants.

    The reference is generated only by a developer from the reviewed migration,
    then committed. Runtime never learns a new expected catalog from its DB.
    """
    queries = {
        'relations': """SELECT c.relname AS name,c.relkind::text AS kind,
            pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls
            FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='semantic_studio'""",
        'columns': """SELECT c.relname AS table_name,a.attname AS name,a.attnum::int AS position,
            format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,
            a.attidentity::text AS identity,a.attcollation::regcollation::text AS collation,
            co.collisdeterministic AS deterministic,pg_get_expr(d.adbin,d.adrelid) AS default_value
            FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
            LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
            LEFT JOIN pg_collation co ON co.oid=a.attcollation
            WHERE n.nspname='semantic_studio' AND c.relkind IN ('r','p')""",
        'constraints': """SELECT c.relname AS table_name,k.conname AS name,k.contype::text AS type,
            k.convalidated AS validated,k.condeferrable AS deferrable,k.condeferred AS deferred,
            pg_get_constraintdef(k.oid,true) AS definition
            FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
            JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='semantic_studio'""",
        'indexes': """SELECT t.relname AS table_name,c.relname AS name,pg_get_indexdef(c.oid) AS definition,
            i.indisvalid AS valid,i.indisready AS ready,i.indislive AS live,i.indisunique AS unique_index,
            i.indnullsnotdistinct AS nulls_not_distinct,i.indimmediate AS immediate
            FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
            JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
            WHERE n.nspname='semantic_studio'""",
        'table_grants': """SELECT c.relname AS table_name,
            pg_get_userbyid(x.grantor) AS grantor,
            CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
            x.privilege_type AS privilege,x.is_grantable AS grantable
            FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) x
            WHERE n.nspname='semantic_studio' AND c.relkind IN ('r','p','S')""",
        'column_grants': """SELECT c.relname AS table_name,a.attname AS name,
            pg_get_userbyid(x.grantor) AS grantor,
            CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
            x.privilege_type AS privilege,x.is_grantable AS grantable
            FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
            CROSS JOIN LATERAL aclexplode(a.attacl) x
            WHERE n.nspname='semantic_studio'""",
        'schema_grants': """SELECT pg_get_userbyid(n.nspowner) AS owner,
            pg_get_userbyid(x.grantor) AS grantor,
            CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
            x.privilege_type AS privilege,x.is_grantable AS grantable
            FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x
            WHERE n.nspname='semantic_studio'""",
        'triggers': """SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition
            FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
            JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='semantic_studio' AND NOT t.tgisinternal""",
    }
    return {key: sorted((dict(row) for row in tx.execute(sql).fetchall()),
                        key=lambda row: json.dumps(row, sort_keys=True)) for key, sql in queries.items()}


def _tables(tx):
    return {row['name'] for row in tx.execute("SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='semantic_studio' AND c.relkind IN ('r','p')").fetchall()}


def _validate(tx):
    if _tables(tx) != TABLES:
        raise UnsupportedSchema(-1)
    rows = tx.execute('SELECT id,version,fingerprint FROM semantic_studio.team_schema').fetchall()
    if rows != [{'id': 1, 'version': SCHEMA_VERSION, 'fingerprint': ddl_fingerprint()}]:
        raise UnsupportedSchema(-1)
    reference = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    if reference['ddl_sha256'] != ddl_fingerprint() or describe_schema(tx) != reference['catalog']:
        raise UnsupportedSchema(-1)
    version = int(tx.execute("SELECT current_setting('server_version_num') AS version").fetchone()['version'])
    if not 180000 <= version < 190000:
        raise UnsupportedSchema(-1)
    for role in ('team_app', 'team_maintenance', 'team_backup'):
        row = tx.execute("SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=%s", (role,)).fetchone()
        if row is None or any(row.values()):
            raise UnsupportedSchema(-1)
        row = tx.execute("SELECT has_database_privilege(%s,current_database(),'CREATE') AS creates,has_database_privilege(%s,current_database(),'TEMP') AS temporary", (role, role)).fetchone()
        if any(row.values()):
            raise UnsupportedSchema(-1)


def validate_schema(storage: PgStorage) -> None:
    with storage.read_snapshot() as tx:
        _validate(tx)


def ensure_schema(storage: PgStorage):
    with storage.read_snapshot() as tx:
        tables = _tables(tx)
        if tables:
            _validate(tx)
            return 'current'
    if storage.config.role != 'maintenance':
        raise UnsupportedSchema(0)
    storage.start_writer()
    with storage.write_transaction() as tx:
        if _tables(tx):
            _validate(tx)
            return 'current'
        tx.execute(SQL_PATH.read_text(encoding='utf-8'))
        tx.execute('INSERT INTO semantic_studio.team_schema VALUES (%s,%s,%s)', (1, SCHEMA_VERSION, ddl_fingerprint()))
        _validate(tx)
    return 'created'
