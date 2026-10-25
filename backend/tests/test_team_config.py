"""
================================================================================
FILE: backend/tests/test_team_config.py
================================================================================
SUMMARY
    Fail-closed team configuration and explicit local defaults.
BASIC IDEA
    Validate synthetic deployment settings without filesystem changes.
INPUTS / INPUT SOURCES
    - Explicit environment mappings.
EXPECTED OUTPUT
    - Safe configuration or secret-free errors.
================================================================================
"""
from pathlib import Path

import pytest

from app.team.config import TeamConfig


def team_env():
    return dict(SEMANTIC_STUDIO_MODE="team",
                SEMANTIC_STUDIO_PUBLIC_ORIGIN="https://studio.example.org:8443",
                SEMANTIC_STUDIO_GOOGLE_CLIENT_ID="synthetic-client",
                SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET="replace-me",
                SEMANTIC_STUDIO_ALLOWED_DOMAINS="example.org,second.example.org",
                SEMANTIC_STUDIO_BOOTSTRAP_SUBS="sub-one,sub-two",
                SEMANTIC_STUDIO_DATA_DIR="/tmp/team-synthetic")


def test_local_default_needs_no_credentials():
    assert TeamConfig.from_env({}).mode == "local"
    assert TeamConfig.from_env({}).data_dir is None
    assert TeamConfig.from_env({"SEMANTIC_STUDIO_MODE": "local"}).mode == "local"


def test_team_settings_are_explicit_immutable_and_without_side_effects(tmp_path):
    env = team_env()
    env["SEMANTIC_STUDIO_DATA_DIR"] = str(tmp_path / "uncreated")
    before = dict(env)
    config = TeamConfig.from_env(env)
    assert config.mode == "team"
    assert config.public_origin == "https://studio.example.org:8443"
    assert config.google_client_id == "synthetic-client"
    assert config.google_client_secret == "replace-me"
    assert config.allowed_domains == frozenset({"example.org", "second.example.org"})
    assert config.bootstrap_subs == frozenset({"sub-one", "sub-two"})
    assert config.data_dir == Path(env["SEMANTIC_STUDIO_DATA_DIR"])
    assert not config.data_dir.exists()
    assert env == before
    assert "replace-me" not in repr(config)
    with pytest.raises(AttributeError):
        config.mode = "local"


@pytest.mark.parametrize("key", [key for key in team_env() if key != "SEMANTIC_STUDIO_MODE"])
@pytest.mark.parametrize("value", [None, "", "   "])
def test_team_requires_all_deployment_settings(key, value):
    env = team_env()
    if value is None:
        env.pop(key)
    else:
        env[key] = value
    with pytest.raises(ValueError) as error:
        TeamConfig.from_env(env)
    assert "replace-me" not in str(error.value)


@pytest.mark.parametrize("mode", ["", "TEAM", "production", " team "])
def test_unknown_mode_fails_closed(mode):
    with pytest.raises(ValueError):
        TeamConfig.from_env({"SEMANTIC_STUDIO_MODE": mode})


@pytest.mark.parametrize("origin", ["http://studio.example.org", "https://user:secret@studio.example.org",
    "https://studio.example.org/", "https://studio.example.org/path", "https://studio.example.org?",
    "https://studio.example.org?q=1", "https://studio.example.org#", "https://studio.example.org#fragment",
    "https://studio.example.org:bad", "https://studio.example.org:99999", "https://",
    "https://studio.example.org\\evil", "https://studio.example.org\n"])
def test_origin_must_be_exact_https_origin_without_secret_echo(origin):
    env = team_env()
    env["SEMANTIC_STUDIO_PUBLIC_ORIGIN"] = origin
    with pytest.raises(ValueError) as error:
        TeamConfig.from_env(env)
    assert "secret" not in str(error.value)


@pytest.mark.parametrize("domains", ["*", "*.example.org", "example.org,", ",example.org", "example.org,,second.org",
    "https://example.org", "user@example.org", "example.org:443", ".example.org", "example.org.", "exa mple.org"])
def test_domains_refuse_wildcards_empty_members_and_non_domains(domains):
    env = team_env()
    env["SEMANTIC_STUDIO_ALLOWED_DOMAINS"] = domains
    with pytest.raises(ValueError):
        TeamConfig.from_env(env)


@pytest.mark.parametrize("subs", [",", "sub-one,", ",sub-one", "sub-one,,sub-two", "sub one"])
def test_bootstrap_subs_refuse_empty_or_ambiguous_identifiers(subs):
    env = team_env()
    env["SEMANTIC_STUDIO_BOOTSTRAP_SUBS"] = subs
    with pytest.raises(ValueError):
        TeamConfig.from_env(env)


@pytest.mark.parametrize("origin", ["https://*", "https://foo%00.example.org", "https://foo..example.org",
    "https://-foo.example.org", "https://foo_.example.org", "https://foo.example.org\x7f",
    "https://[not-an-ip]", "https://[::1%25eth0]", "https://999.999.999.999",
    "https://[::1]evil", "https://[::1]evil:443"])
def test_origin_requires_a_valid_dns_hostname_or_ip_literal(origin):
    env = team_env()
    env["SEMANTIC_STUDIO_PUBLIC_ORIGIN"] = origin
    with pytest.raises(ValueError):
        TeamConfig.from_env(env)


@pytest.mark.parametrize("origin", ["https://[::1]", "https://[2001:db8::1]:8443", "https://192.0.2.1", "https://studio.example.org"])
def test_valid_ip_literals_and_dns_origins_are_supported(origin):
    env = team_env()
    env["SEMANTIC_STUDIO_PUBLIC_ORIGIN"] = origin
    assert TeamConfig.from_env(env).public_origin == origin
