"""
================================================================================
FILE: backend/app/team/pg_storage.py
SUMMARY
    The only product capability to connect to the private PostgreSQL service.
BASIC IDEA
    Pin a validated DNS address for this runtime. Retain the database lease on
    the sole autocommit writer; serialize explicit transactions with a mutex
    and a separate advisory gate. A lost writer is terminal, never replaced.
INPUTS / INPUT SOURCES
    Validated PgConfig, secret files, bound SQL values and a fatal callback.
EXPECTED OUTPUT
    Named-row transactions or finite storage failures without SQL/secret output.
================================================================================
"""
from __future__ import annotations

from collections.abc import Callable, Iterator
from contextlib import contextmanager
from ipaddress import IPv4Address
import os
import re
import threading
import time

from .pg_config import PgConfig, ROLES

APP_LEASE_KEY = (1397969989, 1)
WRITE_GATE_KEY = (1397969989, 2)
TABLES = frozenset({'resources', 'audit', 'requests', 'team_users', 'team_sessions',
                    'team_login_attempts', 'team_auth_events', 'team_access_requests', 'team_schema'})
FAILURES = frozenset({'archive_table', 'db_endpoint', 'db_environment', 'db_dns_timeout',
                      'db_secret', 'db_connection', 'db_busy', 'db_error', 'read_only_role',
                      'writer_unavailable', 'lease_busy', 'lease_lost', 'backup_role_required'})


class StorageError(Exception):
    def __init__(self, kind: str, *, sqlstate: str | None = None):
        self.kind = kind if kind in FAILURES else 'db_error'
        self.sqlstate = sqlstate if isinstance(sqlstate, str) and re.fullmatch(r'[0-9A-Z]{5}', sqlstate) else None
        self.code = 'storage_error'
        self.details = {'kind': self.kind}
        super().__init__('storage_error')


def _resolve_db_addresses() -> list[str]:
    # This is the narrowly audited DNS exception to the HTTP egress boundary.
    # It opens no socket and cannot resolve a user-supplied host or port.
    import socket
    return [answer[4][0] for answer in socket.getaddrinfo('db', 5432, family=socket.AF_INET, type=socket.SOCK_STREAM)]


class ReadTx:
    def __init__(self, connection):
        self._connection = connection

    def execute(self, statement, parameters=None):
        return self._connection.execute(statement, parameters)

    def iter_rows(self, table: str):
        if table not in TABLES:
            raise StorageError('archive_table')
        # The identifier comes exclusively from this fixed allowlist. Value
        # parameters elsewhere are always bound, never interpolated into SQL.
        with self._connection.cursor() as cursor:
            yield from cursor.stream('SELECT * FROM semantic_studio.' + table)


class WriteTx(ReadTx):
    pass


SnapshotExport = ReadTx


class PgStorage:
    def __init__(self, config: PgConfig, *, on_fatal: Callable[[str], None]):
        self.config = config
        self._on_fatal = on_fatal
        self._mutex = threading.Lock()
        self._writer = None
        self._state = 'new'
        self._hostaddr = None
        self._pending_fatal = None

    def _address(self) -> str:
        if self._hostaddr is not None:
            return self._hostaddr
        config = self.config
        if config.host != 'db' or config.port != 5432 or ROLES.get(config.role) != config.user:
            raise StorageError('db_endpoint')
        # libpq environment service/options could otherwise add capabilities
        # which the explicit endpoint parser did not authorize.
        if any(key.startswith('PG') for key in os.environ):
            raise StorageError('db_environment')
        finished = threading.Event()
        result = []
        def resolve():
            try:
                result.extend(_resolve_db_addresses())
            except Exception:
                pass
            finally:
                finished.set()
        deadline = time.monotonic() + config.dns_timeout
        threading.Thread(target=resolve, name='team-db-dns', daemon=True).start()
        if not finished.wait(max(0, deadline - time.monotonic())) or time.monotonic() > deadline:
            raise StorageError('db_dns_timeout')
        try:
            addresses = [IPv4Address(value) for value in result]
            if not addresses or any(address not in config.subnet or address in {
                config.gateway, config.subnet.network_address, config.subnet.broadcast_address
            } for address in addresses):
                raise ValueError
        except (ValueError, TypeError):
            raise StorageError('db_endpoint') from None
        self._hostaddr = str(addresses[0])
        return self._hostaddr

    def _connect(self):
        # Keep local mode independent of libpq availability and import cost.
        address = self._address()
        try:
            with self.config.password_file.open('rb') as stream:
                data = stream.read(16385)
            password = data.decode('utf-8').rstrip('\r\n')
            if len(data) > 16384 or not password or any(c in password for c in ('\0', '\r', '\n')):
                raise ValueError
        except (OSError, UnicodeError, ValueError):
            raise StorageError('db_secret') from None
        import psycopg
        from psycopg.rows import dict_row
        config = self.config
        return psycopg.connect(
            host='db', hostaddr=address, port=5432, dbname=config.dbname, user=config.user,
            password=password, passfile=os.devnull, connect_timeout=config.connect_timeout,
            sslmode='disable', gssencmode='disable', client_encoding='UTF8',
            application_name='semantic-studio-' + config.role,
            autocommit=True, row_factory=dict_row,
            keepalives=1, keepalives_idle=5, keepalives_interval=1, keepalives_count=3,
            tcp_user_timeout=5000,
            options=f'-c search_path=semantic_studio,pg_catalog -c lock_timeout={config.lock_timeout_ms} -c statement_timeout={config.statement_timeout_ms}',
        )

    def _translate(self, error, *, writer_failure=False):
        if isinstance(error, StorageError):
            return error
        import psycopg
        if not isinstance(error, psycopg.Error):
            return None
        state = error.sqlstate
        broken = (isinstance(error, (psycopg.OperationalError, psycopg.InterfaceError))
                  and (state is None or state.startswith('08') or state.startswith('57P')))
        if broken:
            if writer_failure and self._state == 'owned':
                self._mark_fatal('db_connection')
            return StorageError('db_connection', sqlstate=state)
        kind = 'db_busy' if state in {'55P03', '57014', '40001', '40P01'} else 'db_error'
        return StorageError(kind, sqlstate=state)

    def _mark_fatal(self, kind):
        if self._state not in {'fatal', 'closed'}:
            self._state = 'fatal'
            self._pending_fatal = kind
            if self._writer is not None:
                self._writer.close()

    @contextmanager
    def _locked(self):
        if not self._mutex.acquire(timeout=self.config.mutex_timeout):
            raise StorageError('db_busy')
        try:
            yield
        except Exception as error:
            translated = self._translate(error, writer_failure=True)
            if translated is not None:
                raise translated from None
            raise
        finally:
            # The supervisor may close the storage in its callback. Release
            # the mutex first so shutdown cannot deadlock its own notifier.
            notify, self._pending_fatal = self._pending_fatal, None
            self._mutex.release()
            if notify is not None:
                self._on_fatal(notify)

    def start_writer(self) -> None:
        if self.config.role == 'backup':
            raise StorageError('read_only_role')
        with self._locked():
            if self._state == 'owned':
                self._check_writer()
                return
            if self._state != 'new':
                raise StorageError('writer_unavailable')
            connection = self._connect()
            try:
                acquired = connection.execute('SELECT pg_try_advisory_lock(%s,%s) AS acquired', APP_LEASE_KEY).fetchone()['acquired']
                if not acquired:
                    raise StorageError('lease_busy')
            except BaseException:
                connection.close()
                raise
            self._writer = connection
            self._state = 'owned'

    def _check_writer(self):
        if self._state != 'owned' or self._writer is None:
            raise StorageError('writer_unavailable')
        row = self._writer.execute(
            "SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND classid=%s::oid AND objid=%s::oid AND objsubid=2 AND granted) AS owned", APP_LEASE_KEY,
        ).fetchone()
        if not row['owned']:
            self._mark_fatal('lease_lost')
            raise StorageError('lease_lost')

    def ensure_owner(self) -> None:
        with self._locked():
            self._check_writer()

    @contextmanager
    def write_transaction(self) -> Iterator[WriteTx]:
        if self.config.role == 'backup':
            raise StorageError('read_only_role')
        with self._locked():
            self._check_writer()
            with self._writer.transaction():
                self._writer.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
                self._writer.execute('SELECT pg_advisory_xact_lock(%s,%s)', WRITE_GATE_KEY)
                yield WriteTx(self._writer)

    @contextmanager
    def read_snapshot(self) -> Iterator[ReadTx]:
        if self._state in {'fatal', 'closed'}:
            raise StorageError('writer_unavailable')
        if self.config.role == 'app':
            self.ensure_owner()
        try:
            with self._connect() as connection:
                with connection.transaction():
                    connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
                    yield ReadTx(connection)
        except Exception as error:
            translated = self._translate(error)
            # A separate read connection never changes writer state without
            # its mutex. Confirm the lease on the actual writer: an outage
            # fences there, while a transient read failure only fails this read.
            if (translated is not None and translated.kind == 'db_connection'
                    and self._state == 'owned'):
                self.ensure_owner()
            if translated is not None:
                raise translated from None
            raise

    @contextmanager
    def export_snapshot(self) -> Iterator[SnapshotExport]:
        if self.config.role != 'backup':
            raise StorageError('backup_role_required')
        with self.read_snapshot() as tx:
            yield tx

    def close(self) -> None:
        with self._mutex:
            self._state = 'closed'
            if self._writer is not None:
                self._writer.close()
