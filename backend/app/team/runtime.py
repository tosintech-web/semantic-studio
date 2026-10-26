"""
================================================================================
FILE: backend/app/team/runtime.py
SUMMARY
    Exclusive process ownership, repository and team identity lifecycle.
BASIC IDEA
    Acquire an OS-held lock before SQLite; startup failure releases ownership.
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
from pathlib import Path

from .auth import GoogleIdentity
from .auth_store import AuthStore
from .repository import TeamRepository


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
        if config.mode != 'team' or config.data_dir is None or config.public_origin is None:
            raise ValueError('Explicit team configuration required')
        self.config = config
        self.repository = None
        self.auth_store = None
        self.identity = None
        self.workspace = None
        self._lock_file = None
        self._access_filter = None
        self.started = False

    def start(self):
        if self.started:
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
            self.repository = TeamRepository(directory / 'team.sqlite')
            self.auth_store = AuthStore(self.repository.path, bootstrap_subs=self.config.bootstrap_subs)
            from .workspace import TeamWorkspace
            self.workspace = TeamWorkspace(self.repository, directory, auth_store=self.auth_store)
            self.identity = GoogleIdentity(self.config, self.workspace.auth_broker)
            self._access_filter = _PrivateAccessLog()
            logging.getLogger('uvicorn.access').addFilter(self._access_filter)
            self.started = True
        except BaseException:
            self.close()
            raise

    def close(self):
        workspace, self.workspace = self.workspace, None
        try:
            if workspace is not None:
                close = getattr(workspace, 'close', None)
                if close is not None:
                    close()
        finally:
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
