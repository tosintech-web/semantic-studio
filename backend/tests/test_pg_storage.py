"""
================================================================================
FILE: backend/tests/test_pg_storage.py
SUMMARY
    Exercise the real database lease, gate, read isolation and broken writer.
BASIC IDEA
    A second test-only SQL connection holds a gate or terminates its own role's
    writer; the product must never replace that writer behind the supervisor.
INPUTS / INPUT SOURCES
    Dedicated internal-network PostgreSQL and controlled DNS/clock failures.
EXPECTED OUTPUT
    One persistent writer, fresh post-gate reads and finite closed failures.
================================================================================
"""
from dataclasses import replace
from ipaddress import IPv4Address
import threading

import pytest

from app.team import pg_storage
from app.team.pg_storage import PgStorage, StorageError, WRITE_GATE_KEY
from pg_probe import connect
from pg_support import role_config

pytestmark = pytest.mark.team_db


@pytest.fixture
def storage():
    store = PgStorage(role_config(), on_fatal=lambda kind: None)
    store.start_writer()
    yield store
    store.close()


@pytest.mark.parametrize('address', ['8.8.8.8', '::1', 'gateway'])
def test_dns_outside_subnet_never_connects(monkeypatch, address):
    config = role_config()
    address = str(config.gateway) if address == 'gateway' else address
    monkeypatch.setattr(pg_storage, '_resolve_db_addresses', lambda: [address])
    import psycopg
    calls = []
    monkeypatch.setattr(psycopg, 'connect', lambda **kwargs: calls.append(kwargs))
    store = PgStorage(config, on_fatal=lambda kind: None)
    with pytest.raises(StorageError) as caught:
        store.start_writer()
    assert caught.value.kind == 'db_endpoint'
    assert calls == []


def test_dns_response_after_deadline_never_starts_connection(monkeypatch):
    entered, release = threading.Event(), threading.Event()
    def delayed():
        entered.set()
        release.wait(5)
        return ['10.253.53.2']
    monkeypatch.setattr(pg_storage, '_resolve_db_addresses', delayed)
    import psycopg
    calls = []
    monkeypatch.setattr(psycopg, 'connect', lambda **kwargs: calls.append(kwargs))
    config = replace(role_config(), dns_timeout=0.02)
    try:
        with pytest.raises(StorageError) as caught:
            PgStorage(config, on_fatal=lambda kind: None).start_writer()
        assert entered.is_set() and caught.value.kind == 'db_dns_timeout'
    finally:
        release.set()
    assert calls == []


def test_writer_retains_same_backend_and_lease(storage):
    with storage.write_transaction() as tx:
        before = tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid']
        assert tx.execute('SHOW lock_timeout').fetchone()['lock_timeout'] == '5s'
        assert tx.execute('SHOW statement_timeout').fetchone()['statement_timeout'] == '30s'
    with storage.write_transaction() as tx:
        assert tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid'] == before
    other = PgStorage(role_config(), on_fatal=lambda kind: None)
    try:
        with pytest.raises(StorageError) as caught:
            other.start_writer()
        assert caught.value.kind == 'lease_busy'
        storage.ensure_owner()
    finally:
        other.close()


def test_writer_is_not_reopened_after_connection_loss(monkeypatch):
    fatal = []
    store = PgStorage(role_config(), on_fatal=fatal.append)
    try:
        store.start_writer()
        with store.write_transaction() as tx:
            pid = tx.execute('SELECT pg_backend_pid() AS pid').fetchone()['pid']
        with connect(role_config()) as probe:
            assert probe.execute('SELECT pg_terminate_backend(%s) AS killed', (pid,)).fetchone()['killed']
        new_connections = []
        def forbidden_connect():
            new_connections.append(True)
            pytest.fail('the broken writer was reconnected')
        monkeypatch.setattr(store, '_connect', forbidden_connect)
        for operation in (store.ensure_owner, store.ensure_owner):
            with pytest.raises(StorageError):
                operation()
        with pytest.raises(StorageError):
            with store.write_transaction():
                pytest.fail('broken writer yielded a transaction')
        assert new_connections == []
        assert len(fatal) == 1
    finally:
        store.close()


def test_waiting_writer_uses_read_committed_after_gate(storage):
    with connect(role_config('maintenance')) as setup:
        setup.execute('CREATE TABLE semantic_studio.pg_storage_probe (value int NOT NULL)')
        setup.execute('INSERT INTO semantic_studio.pg_storage_probe VALUES (0)')
        setup.execute('GRANT SELECT, UPDATE ON semantic_studio.pg_storage_probe TO team_app')
    started, finished = threading.Event(), threading.Event()
    results, errors = [], []
    def waiting():
        started.set()
        try:
            with storage.write_transaction() as tx:
                results.append(tx.execute('SELECT value FROM semantic_studio.pg_storage_probe').fetchone()['value'])
        except Exception as error:
            errors.append(type(error).__name__)
        finally:
            finished.set()
    try:
        with connect(role_config()) as gate:
            with gate.transaction():
                gate.execute('SELECT pg_advisory_xact_lock(%s,%s)', WRITE_GATE_KEY)
                worker = threading.Thread(target=waiting)
                worker.start()
                assert started.wait(2)
                gate.execute('UPDATE semantic_studio.pg_storage_probe SET value=1')
            assert finished.wait(8)
            worker.join(1)
        assert errors == [] and results == [1]
    finally:
        with connect(role_config('maintenance')) as setup:
            setup.execute('DROP TABLE semantic_studio.pg_storage_probe')


def test_read_snapshot_is_repeatable_and_read_only(storage):
    with storage.read_snapshot() as tx:
        assert tx.execute('SHOW transaction_isolation').fetchone()['transaction_isolation'] == 'repeatable read'
        assert tx.execute('SHOW transaction_read_only').fetchone()['transaction_read_only'] == 'on'


def test_backup_cannot_acquire_writer_but_can_read():
    store = PgStorage(role_config('backup'), on_fatal=lambda kind: None)
    try:
        with pytest.raises(StorageError):
            store.start_writer()
        with store.export_snapshot() as tx:
            assert tx.execute('SELECT current_user AS role').fetchone()['role'] == 'team_backup'
    finally:
        store.close()


def test_failed_read_connection_checks_writer_before_fencing(monkeypatch, storage):
    import psycopg
    def failed_read():
        raise psycopg.OperationalError('synthetic connection failure')
    monkeypatch.setattr(storage, '_connect', failed_read)
    with pytest.raises(StorageError):
        with storage.read_snapshot():
            pytest.fail('failed read produced a transaction')
    # A failure on a different read connection must not close an independently
    # verified writer concurrently with another thread committing on it.
    storage.ensure_owner()


def test_lock_timeout_is_busy_and_writer_recovers():
    fatal = []
    config = replace(role_config(), lock_timeout_ms=50)
    store = PgStorage(config, on_fatal=fatal.append)
    try:
        store.start_writer()
        with connect(role_config()) as gate:
            with gate.transaction():
                gate.execute('SELECT pg_advisory_xact_lock(%s,%s)', WRITE_GATE_KEY)
                with pytest.raises(StorageError) as caught:
                    with store.write_transaction():
                        pytest.fail('entered while another connection owns the gate')
                assert caught.value.kind == 'db_busy'
        store.ensure_owner()
        assert fatal == []
    finally:
        store.close()


def test_dns_is_pinned_for_read_connections_after_start(monkeypatch, storage):
    def changed_dns():
        pytest.fail('runtime re-resolved its pinned database endpoint')
    monkeypatch.setattr(pg_storage, '_resolve_db_addresses', changed_dns)
    with storage.read_snapshot() as tx:
        address = tx.execute('SELECT inet_server_addr() AS address').fetchone()['address']
        assert IPv4Address(address) in storage.config.subnet


def test_statement_timeout_does_not_poison_writer():
    store = PgStorage(replace(role_config(), statement_timeout_ms=50), on_fatal=lambda kind: None)
    try:
        store.start_writer()
        with pytest.raises(StorageError) as caught:
            with store.write_transaction() as tx:
                tx.execute('SELECT pg_sleep(2)')
        assert caught.value.kind == 'db_busy'
        store.ensure_owner()
    finally:
        store.close()
