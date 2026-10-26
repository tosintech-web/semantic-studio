"""
================================================================================
FILE: backend/tests/test_pg_runtime.py
SUMMARY
    Runtime ownership, fatal loss and startup cleanup against real PostgreSQL.
BASIC IDEA
    Different blob directories cannot bypass the database lease; losing that
    connection fires a fatal event and never revives a writer in the old app.
INPUTS / INPUT SOURCES
    Dedicated database, synthetic team configuration and private temp volumes.
EXPECTED OUTPUT
    Exclusive operation, clean release on failure and database-free local mode.
================================================================================
"""
import os
import subprocess
import sys
import asyncio
import socket

import pytest

from app.team.config import TeamConfig
from app.team.pg_storage import StorageError, PgStorage
from app.team.runtime import TeamRuntime
from pg_probe import connect
from pg_support import role_config


def configuration(directory):
    return TeamConfig(mode='team', public_origin='https://studio.example.org',
                      google_client_id='synthetic-client', google_client_secret='replace-me',
                      allowed_domains=frozenset({'example.org'}), bootstrap_subs=frozenset({'owner'}),
                      data_dir=directory, db=role_config())


def test_team_server_preserves_access_log_and_proxy_boundary(monkeypatch):
    from types import SimpleNamespace
    import threading
    import uvicorn
    from app.team.server import serve_team
    captured = []
    class Server:
        should_exit = False
        def __init__(self, config):
            captured.append(config)
        async def serve(self):
            return
    monkeypatch.setattr(uvicorn, 'Server', Server)
    application = SimpleNamespace(state=SimpleNamespace(team=SimpleNamespace(fatal=threading.Event())))
    asyncio.run(serve_team(application))
    assert captured[0].access_log is False
    assert captured[0].proxy_headers is False
    assert captured[0].workers == 1 and captured[0].reload is False


@pytest.mark.team_db
def test_two_apps_with_different_blob_directories_cannot_share_db(pg_schema, tmp_path):
    first = TeamRuntime(configuration(tmp_path / 'first'))
    second = TeamRuntime(configuration(tmp_path / 'second'))
    try:
        first.start()
        with pytest.raises(StorageError) as caught:
            second.start()
        assert caught.value.kind == 'lease_busy'
        first.storage.ensure_owner()
    finally:
        first.close()
        second.close()
    restarted = TeamRuntime(configuration(tmp_path / 'second'))
    try:
        restarted.start()
        assert restarted.started
    finally:
        restarted.close()


@pytest.mark.team_db
def test_runtime_lost_writer_sets_fatal_and_cannot_restart_itself(pg_schema, tmp_path):
    runtime = TeamRuntime(configuration(tmp_path))
    try:
        runtime.start()
        with runtime.storage.write_transaction() as tx:
            pid = tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid']
        with connect(role_config()) as probe:
            probe.execute('SELECT pg_terminate_backend(%s)', (pid,))
        with pytest.raises(StorageError):
            runtime.storage.ensure_owner()
        assert runtime.fatal.is_set()
        with pytest.raises(StorageError):
            runtime.storage.ensure_owner()
    finally:
        runtime.close()


@pytest.mark.team_db
def test_failed_startup_releases_blob_lock_and_db_lease(pg_schema, tmp_path, monkeypatch):
    import app.team.runtime as module
    runtime = TeamRuntime(configuration(tmp_path))
    def broken_identity(*args):
        raise ValueError('synthetic startup failure')
    with monkeypatch.context() as patch:
        patch.setattr(module, 'GoogleIdentity', broken_identity)
        with pytest.raises(ValueError, match='synthetic startup failure'):
            runtime.start()
    restarted = TeamRuntime(configuration(tmp_path))
    try:
        restarted.start()
        assert restarted.started
    finally:
        restarted.close()


def test_local_mode_never_loads_pg_driver(tmp_path):
    environment = {**os.environ, 'SEMANTIC_STUDIO_MODE': 'local', 'SEMANTIC_STUDIO_DATA_DIR': str(tmp_path)}
    result = subprocess.run([sys.executable, '-c',
        "import sys; from app.main import app; assert 'psycopg' not in sys.modules; assert getattr(app.state,'team',None) is None"],
        env=environment, capture_output=True, timeout=30)
    assert result.returncode == 0, result.stderr.decode()


@pytest.mark.parametrize('filename', ['team.sqlite', 'team.sqlite3', 'team.db', 'team.sqlite3.bak',
    '.team-import-incomplete', pytest.param('marker-link', marks=pytest.mark.skipif(os.name == 'nt', reason='POSIX symlink fixture'))])
def test_incomplete_or_legacy_directory_is_refused_before_any_connection(tmp_path, monkeypatch, filename):
    from app.team.pg_config import load_pg_config
    secret = tmp_path / 'app-secret'
    secret.write_text('synthetic-password')
    db = load_pg_config({'SEMANTIC_STUDIO_DB_HOST': 'db', 'SEMANTIC_STUDIO_DB_PORT': '5432',
                         'SEMANTIC_STUDIO_DB_NAME': 'semantic_studio_team', 'SEMANTIC_STUDIO_DB_USER': 'team_app',
                         'SEMANTIC_STUDIO_DB_PASSWORD_FILE': str(secret),
                         'SEMANTIC_STUDIO_DB_SUBNET': '172.30.53.0/24', 'SEMANTIC_STUDIO_DB_GATEWAY': '172.30.53.1'}, role='app')
    root = tmp_path / 'data'
    root.mkdir()
    if filename == 'marker-link':
        (root / '.team-import-incomplete').symlink_to(root / 'missing')
    else:
        (root / filename).write_bytes(b'opaque unsupported storage')
    calls = []
    def forbidden_connect(self):
        calls.append(True)
        raise AssertionError('connected before refusing an unsupported data directory')
    monkeypatch.setattr(PgStorage, '_connect', forbidden_connect)
    runtime = TeamRuntime(TeamConfig(mode='team', public_origin='https://studio.example.org', data_dir=root, db=db))
    with pytest.raises(ValueError, match='team_storage_not_ready'):
        runtime.start()
    assert calls == []


@pytest.mark.team_db
def test_team_server_stops_after_runtime_fatal(pg_schema, tmp_path):
    import httpx
    from fastapi import FastAPI
    from starlette.concurrency import run_in_threadpool
    from app.main import health
    from app.team.server import serve_team
    runtime = TeamRuntime(configuration(tmp_path))
    runtime.start()
    app = FastAPI()
    app.state.team = runtime
    app.add_api_route('/api/health', health, methods=['GET'])
    with socket.socket() as temporary:
        temporary.bind(('127.0.0.1', 0))
        port = temporary.getsockname()[1]
    async def scenario():
        serving = asyncio.create_task(serve_team(app, host='127.0.0.1', port=port))
        try:
            async with httpx.AsyncClient(timeout=1) as client:
                for _ in range(100):
                    try:
                        response = await client.get(f'http://127.0.0.1:{port}/api/health')
                        assert response.status_code == 200
                        break
                    except httpx.ConnectError:
                        await asyncio.sleep(0.02)
                else:
                    raise AssertionError('team supervisor did not start the listener')
                def kill_writer():
                    with runtime.storage.write_transaction() as tx:
                        pid = tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid']
                    with connect(role_config()) as probe:
                        probe.execute('SELECT pg_terminate_backend(%s)', (pid,))
                await run_in_threadpool(kill_writer)
                with pytest.raises(StorageError):
                    await run_in_threadpool(runtime.storage.ensure_owner)
                await asyncio.wait_for(serving, timeout=5)
        finally:
            if not serving.done():
                serving.cancel()
            await asyncio.gather(serving, return_exceptions=True)
    try:
        asyncio.run(scenario())
    finally:
        runtime.close()
