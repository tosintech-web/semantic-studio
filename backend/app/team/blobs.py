"""
================================================================================
FILE: backend/app/team/blobs.py
================================================================================
SUMMARY
    Stores immutable source files by their SHA-256 content address.
BASIC IDEA
    Keep mutable evaluation detached until the authoritative transaction commits.
INPUTS / INPUT SOURCES
    - Validated team service requests and private persistent storage.
EXPECTED OUTPUT
    - Durable state with explicit failure and replay semantics.
================================================================================
"""
import hashlib
import os
from pathlib import Path
import re
import tempfile

class BlobStore:
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, digest):
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError("Invalid blob reference")
        return self.root / digest

    def put(self, data):
        digest = hashlib.sha256(data).hexdigest()
        path = self._path(digest)
        if path.exists():
            if self.get(digest) != data:
                raise OSError("Corrupt immutable blob")
            return digest
        fd, temporary = tempfile.mkstemp(prefix=".candidate-", dir=self.root)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            # link is exclusive: a concurrent writer may install the same
            # content, but cannot replace an existing content-addressed file.
            try:
                os.link(temporary, path)
            except FileExistsError:
                self.get(digest)
            directory = os.open(self.root, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)) if os.name != "nt" else None
            if directory is not None:
                try:
                    os.fsync(directory)
                finally:
                    os.close(directory)
        finally:
            Path(temporary).unlink(missing_ok=True)
        return digest

    def get(self, digest):
        data = self._path(digest).read_bytes()
        if hashlib.sha256(data).hexdigest() != digest:
            raise OSError("Corrupt immutable blob")
        return data
