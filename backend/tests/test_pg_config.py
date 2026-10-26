"""
================================================================================
FILE: backend/tests/test_pg_config.py
SUMMARY
    Keep the database capability inside its dedicated Compose network.
BASIC IDEA
    Feed untrusted environment spellings to the real parser; check rejection
    without reflecting endpoint or credential values into exception messages.
INPUTS / INPUT SOURCES
    Synthetic files and operator-style configuration mappings.
EXPECTED OUTPUT
    Only the dedicated database endpoint, roles and IPv4 bridge are accepted.
================================================================================
"""
from pathlib import Path

import pytest

from app.team.pg_config import load_pg_config
from app.team.pg_bootstrap import render_hba, write_db_config


@pytest.fixture
def pg_env(tmp_path):
    secret = tmp_path / 'password'
    secret.write_text('synthetic-password-for-tests\n')
    return {
        'SEMANTIC_STUDIO_DB_HOST': 'db',
        'SEMANTIC_STUDIO_DB_PORT': '5432',
        'SEMANTIC_STUDIO_DB_NAME': 'semantic_studio_team',
        'SEMANTIC_STUDIO_DB_USER': 'team_app',
        'SEMANTIC_STUDIO_DB_PASSWORD_FILE': str(secret),
        'SEMANTIC_STUDIO_DB_SUBNET': '172.30.53.0/24',
        'SEMANTIC_STUDIO_DB_GATEWAY': '172.30.53.1',
    }


def test_pg_config_accepts_only_dedicated_capability(pg_env):
    config = load_pg_config(pg_env, role='app')
    assert config.host == 'db' and config.port == 5432
    assert config.user == 'team_app'
    assert config.password_file.read_text().strip() not in repr(config)


@pytest.mark.parametrize('key,value', [
    ('HOST', 'outside.example'), ('HOST', '/var/run/postgresql'),
    ('PORT', '5433'), ('NAME', 'db\nlocal all all trust'),
    ('USER', 'postgres'), ('PASSWORD', 'private-inline-value'),
    ('URL', 'postgresql://user:private-inline-value@outside.example/db'),
    ('DSN', 'host=db password=private-inline-value'),
    ('SUBNET', '8.8.8.0/24'), ('SUBNET', '127.0.0.0/24'),
    ('SUBNET', '172.30.53.0/30'), ('SUBNET', 'fd00::/64'),
    ('GATEWAY', '172.30.54.1'), ('GATEWAY', '172.30.53.0'),
    ('GATEWAY', '172.30.53.255'), ('GATEWAY', '::1'),
    ('PASSWORD_FILE', '/missing/password'),
])
def test_pg_config_rejects_external_endpoint_and_inline_secret(pg_env, key, value):
    pg_env['SEMANTIC_STUDIO_DB_' + key] = value
    with pytest.raises(ValueError) as caught:
        load_pg_config(pg_env, role='app')
    assert value not in str(caught.value)


def test_pg_role_is_fixed_by_trusted_caller(pg_env):
    with pytest.raises(ValueError):
        load_pg_config(pg_env, role='postgres')
    pg_env['SEMANTIC_STUDIO_DB_USER'] = 'team_backup'
    assert load_pg_config(pg_env, role='backup').user == 'team_backup'


def test_hba_gateway_rule_precedes_subnet(pg_env):
    config = load_pg_config(pg_env, role='app')
    lines = render_hba(config).splitlines()
    assert lines[0] == 'local all postgres peer'
    gateway = lines.index('host all all 172.30.53.1/32 reject')
    allow = lines.index('host semantic_studio_team team_app,team_maintenance,team_backup 172.30.53.0/24 scram-sha-256')
    reject = lines.index('host all all 0.0.0.0/0 reject')
    assert gateway < allow < reject
    assert lines[-1] == 'host all all ::/0 reject'
    assert 'trust' not in render_hba(config)


def test_write_db_config_uses_validated_common_inputs(pg_env, tmp_path):
    destination = tmp_path / 'config'
    write_db_config(pg_env, destination)
    hba = destination / 'pg_hba.conf'
    assert '172.30.53.1/32 reject' in hba.read_text()
    assert hba.stat().st_mode & 0o444 == 0o444


def test_hba_generation_does_not_need_application_secret(pg_env, tmp_path):
    pg_env.pop('SEMANTIC_STUDIO_DB_PASSWORD_FILE')
    write_db_config(pg_env, tmp_path / 'config')
    assert (tmp_path / 'config/pg_hba.conf').exists()
