"""
================================================================================
FILE: backend/tests/pg_probe.py
SUMMARY
    Test-only raw PostgreSQL probes for authentication and network denials.
BASIC IDEA
    Use real psycopg connections to prove failures below the product connector;
    production cannot consume this helper or its additional test credentials.
INPUTS / INPUT SOURCES
    Dedicated synthetic role configuration, optionally a denied role/endpoint.
EXPECTED OUTPUT
    Real database result/SQLSTATE, with no secret-bearing diagnostic output.
================================================================================
"""
from __future__ import annotations


def connect(config, **overrides):
    import psycopg
    from psycopg.rows import dict_row
    values = dict(host=config.host, port=config.port, dbname=config.dbname,
                  user=config.user, password=config.password_file.read_text().rstrip('\n'),
                  connect_timeout=5, autocommit=True, row_factory=dict_row,
                  sslmode='disable', application_name='semantic-studio-test-probe')
    values.update(overrides)
    return psycopg.connect(**values)
