"""
================================================================================
FILE: backend/app/team/runtime.py
SUMMARY
    Exclusive process ownership, repository and team identity lifecycle.
BASIC IDEA
    Acquire a blob OS lock and the PostgreSQL writer lease; failure releases both.
    Team services require explicit configuration and never fall back to local.
    Standard uvicorn access records omit query strings while team mode runs.
INPUTS / INPUT SOURCES
    Validated configuration and a dedicated local persistent directory.
EXPECTED OUTPUT
    Initialized auth/repository services or a closed startup failure.
================================================================================
"""
import logging
import os
import threading
from pathlib import Path

from .auth import GoogleIdentity
from .auth_store import AuthStore
from .repository import TeamRepository
from .pg_storage import PgStorage
from .pg_schema import ensure_schema
from .maintenance_io import MARKER, is_legacy_store


class _PrivateAccessLog(logging.Filter):
    def filter(self, record):
        # Uvicorn's standard access format passes the request target as its
        # third argument. Strip every query, including OAuth code and state;
        # custom proxy/request logging still belongs to deployment configuration.
        args = record.args
        if isinstance(args, tuple) and len(args) == 5 and isinstance(args[2], str):
            record.args = (*args[:2], args[2].partition('?')[0], *args[3:])
        return True


class TeamRuntime:
    def __init__(self, config):
        if config.mode != 'team' or config.data_dir is None or config.public_origin is None or config.db is None:
            raise ValueError('Explicit team configuration required')
        self.config = config
        self.repository = None
        self.auth_store = None
        self.identity = None
        self.workspace = None
        self.storage = None
        self.fatal = threading.Event()
        self._fatal_lock = threading.Lock()
        self._lock_file = None
        self._access_filter = None
        self.started = False

    def start(self):
        if self.started or self.fatal.is_set():
            raise RuntimeError('Team runtime already started')
        directory = Path(self.config.data_dir)
        directory.mkdir(parents=True, exist_ok=True)
        lock_file = open(directory / '.team-process.lock', 'a+b')
        try:
            if os.name == 'nt':
                import msvcrt
                lock_file.seek(0, os.SEEK_END)
                if lock_file.tell() == 0:
                    lock_file.write(b'0')
                    lock_file.flush()
                lock_file.seek(0)
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            lock_file.close()
            raise RuntimeError('Team data directory already owned by another process') from None
        self._lock_file = lock_file
        try:
            # Never open, convert, overwrite or remove an old database, even
            # while another destination is being prepared by maintenance.
            marker = directory / MARKER
            if marker.exists() or marker.is_symlink() or any(is_legacy_store(path.name) for path in directory.iterdir()):
                raise ValueError('team_storage_not_ready')
            self.storage = PgStorage(self.config.db, on_fatal=self.fail_storage)
            self.storage.start_writer()
            ensure_schema(self.storage)
            self.repository = TeamRepository(self.storage)
            self.auth_store = AuthStore(self.storage, bootstrap_subs=self.config.bootstrap_subs)
            from .workspace import TeamWorkspace
            self.workspace = TeamWorkspace(self.repository, directory, auth_store=self.auth_store)
            self.identity = GoogleIdentity(self.config, self.workspace.auth_broker)
            self._access_filter = _PrivateAccessLog()
            logging.getLogger('uvicorn.access').addFilter(self._access_filter)
            self.started = True
        except BaseException:
            self.close()
            raise

    def fail_storage(self, kind):
        with self._fatal_lock:
            if self.fatal.is_set():
                return
            self.fatal.set()
        workspace = self.workspace
        if workspace is not None:
            workspace.close()

    def close(self):
        workspace, self.workspace = self.workspace, None
        try:
            if workspace is not None:
                close = getattr(workspace, 'close', None)
                if close is not None:
                    close()
        finally:
            storage, self.storage = self.storage, None
            try:
                if storage is not None:
                    storage.close()
            finally:
                self._release_process_lock()

    def _release_process_lock(self):
        # Cleanup must finish while this process still owns the directory;
        # even a cleanup failure must release the OS lock and log filter.
        lock_file, self._lock_file = self._lock_file, None
        self.started = False
        if self._access_filter is not None:
            logging.getLogger('uvicorn.access').removeFilter(self._access_filter)
            self._access_filter = None
        if lock_file is not None:
            try:
                if os.name == 'nt':
                    import msvcrt
                    lock_file.seek(0)
                    msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
            finally:
                lock_file.close()
