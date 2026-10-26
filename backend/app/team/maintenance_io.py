"""
================================================================================
FILE: backend/app/team/maintenance_io.py
SUMMARY
    Private generation files and fail-closed import publication primitives.
BASIC IDEA
    Atomically publish completed archives. Imports retain a durable marker
    from before any blob/SQL publication until the caller verifies its commit.
INPUTS / INPUT SOURCES
    Operator-selected fresh destinations and fixed-format file content.
EXPECTED OUTPUT
    Durable private files or finite errors; failed imports stay fenced.
================================================================================
"""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import os
import re
from pathlib import Path
import shutil
import stat
import tempfile

MARKER = '.team-import-incomplete'
CODES = frozenset({'maintenance_failed', 'invalid_source', 'symlink_refused', 'invalid_source_path',
    'special_file_refused', 'not_local_library', 'invalid_manifest', 'invalid_ontology', 'context_missing',
    'invalid_local_library', 'destination_exists', 'destination_parent_missing', 'destination_busy',
    'destination_required', 'migration_failed', 'invalid_blob_reference', 'source_destination_overlap',
    'archive_invalid', 'archive_schema', 'archive_limit', 'archive_corrupt', 'archive_path',
    'invalid_resource', 'role_required', 'database_not_empty', 'import_incomplete',
    'backup_failed', 'restore_failed', 'source_changed'})


class MaintenanceError(Exception):
    def __init__(self, code='maintenance_failed'):
        self.code = code if code in CODES else 'maintenance_failed'
        super().__init__(self.code)


def is_legacy_store(name):
    return re.search(r'\.(?:sqlite3?|db)(?:$|[-.])', name, re.IGNORECASE) is not None


def fsync_directory(path: Path):
    if os.name == 'nt':
        return
    descriptor = os.open(path, os.O_RDONLY | getattr(os, 'O_DIRECTORY', 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def separate(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if source == destination or source in destination.parents or destination in source.parents:
        raise MaintenanceError('source_destination_overlap')


@contextmanager
def regular_file(path: Path):
    descriptor = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_NONBLOCK', 0))
    try:
        if path.is_symlink() or not stat.S_ISREG(os.fstat(descriptor).st_mode):
            raise MaintenanceError('special_file_refused')
        with os.fdopen(descriptor, 'rb', closefd=False) as stream:
            yield stream
    finally:
        os.close(descriptor)


def copy_hashed(source: Path, destination: Path, *, expected_hash: str, expected_bytes: int):
    digest, count = hashlib.sha256(), 0
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'wb') as output, regular_file(source) as stream:
        while chunk := stream.read(1024 * 1024):
            count += len(chunk)
            if count > expected_bytes:
                raise MaintenanceError('archive_corrupt')
            digest.update(chunk)
            output.write(chunk)
        output.flush()
        os.fsync(output.fileno())
    if count != expected_bytes or digest.hexdigest() != expected_hash:
        raise MaintenanceError('archive_corrupt')


@contextmanager
def archive_destination(destination):
    destination = Path(destination).absolute()
    if destination.exists() or destination.is_symlink():
        raise MaintenanceError('destination_exists')
    if not destination.parent.is_dir():
        raise MaintenanceError('destination_parent_missing')
    reservation = destination.parent / ('.team-publish-' + hashlib.sha256(destination.name.encode()).hexdigest() + '.lock')
    try:
        descriptor = os.open(reservation, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise MaintenanceError('destination_busy') from None
    os.close(descriptor)
    stage = None
    published = False
    try:
        stage = Path(tempfile.mkdtemp(prefix='.team-archive-', dir=destination.parent))
        os.chmod(stage, 0o700)
        yield stage
        if destination.exists() or destination.is_symlink():
            raise MaintenanceError('destination_exists')
        stage.rename(destination)
        published = True
        fsync_directory(destination.parent)
    except BaseException:
        # Only this operation's newly created archive is removed. Never modify
        # a prior destination or the source if publication/durability fails.
        if published:
            shutil.rmtree(destination, ignore_errors=True)
        raise
    finally:
        if stage is not None:
            shutil.rmtree(stage, ignore_errors=True)
        reservation.unlink(missing_ok=True)


def _write_marker(root):
    marker = root / MARKER
    descriptor = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'wb') as stream:
        stream.write(b'import-incomplete\n')
        stream.flush()
        os.fsync(stream.fileno())
    fsync_directory(root)


@contextmanager
def import_destination(destination):
    root = Path(destination).absolute()
    if root.is_symlink() or root.exists() and (not root.is_dir() or any(root.iterdir())):
        raise MaintenanceError('destination_exists')
    if not root.parent.is_dir():
        raise MaintenanceError('destination_parent_missing')
    root.mkdir(mode=0o700, exist_ok=True)
    os.chmod(root, 0o700)
    fsync_directory(root.parent)
    _write_marker(root)
    lock = None
    try:
        # Same OS lock as TeamRuntime, independent of the database lease.
        # Maintenance runs only in the supported Linux team container.
        import fcntl
        descriptor = os.open(root / '.team-process.lock', os.O_RDWR | os.O_CREAT | getattr(os, 'O_NOFOLLOW', 0), 0o600)
        lock = os.fdopen(descriptor, 'a+b')
        try:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise MaintenanceError('destination_busy') from None
        yield root
        # The caller has verified a known SQL commit and still owns its lease.
        # Restore a visible fence if directory durability fails after unlink.
        try:
            (root / MARKER).unlink()
            fsync_directory(root)
        except BaseException:
            if not (root / MARKER).exists():
                _write_marker(root)
            raise
    finally:
        if lock is not None:
            lock.close()
