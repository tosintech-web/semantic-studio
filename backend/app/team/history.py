"""
================================================================================
FILE: backend/app/team/history.py
================================================================================
SUMMARY
    Builds durable inverses with actor, version and current-role authorization.
BASIC IDEA
    Reconstruct the complete operation group, check its current resource bases,
    and authorize both its original route and its inverse's actual effects.
INPUTS / INPUT SOURCES
    - Validated team service requests and private persistent storage.
EXPECTED OUTPUT
    - Durable state with explicit failure and replay semantics.
================================================================================
"""
import json
from pathlib import PurePosixPath
from .repository import RepositoryError, Conflict


def authorize_inverse(repository, actor, request_id, changes, resources, role, *, operation=None):
    """Authorize the origin and resource effects using the current role.

    Undo is another write, not a retained capability from when the actor made
    the original change. An editor can inverse ordinary document edits, but
    cannot use an inverse to delete or restore a snapshot/reference/query, even
    when the forward operation (for example importing a snapshot) was editable.
    """
    from .permissions import classify_route, allows
    from ..projects import PROJECT_ID, split_document_id
    if role == "admin":
        return
    if role != "editor":
        raise RepositoryError("forbidden")
    # A pending response has no audit row yet; its server-owned operation can
    # enter the same policy/effect checks without staging another candidate.
    visited = set()
    with repository.connection() as db:
        while True:
            if operation is None:
                if request_id in visited:
                    raise RepositoryError("forbidden")
                visited.add(request_id)
                row = db.execute("SELECT operation FROM audit WHERE actor=? AND request_id=? LIMIT 1", (actor, request_id)).fetchone()
                if row is None:
                    raise RepositoryError("forbidden")
                operation = row["operation"]
            if operation.startswith(("undo:", "redo:")):
                request_id = operation.split(":", 1)[1]
                operation = None
                continue
            method, separator, path = operation.partition(" ")
            classified = classify_route(method, path) if separator else None
            if classified is None or not allows(role, classified[0].operation):
                raise RepositoryError("forbidden")
            break
    for key, payload in changes.items():
        if key == "file:network-policy.json" or key == "file:examples.json":
            raise RepositoryError("forbidden")
        if (resources.get(key) is None) == (payload is None):
            continue
        if key.startswith(("graph:", "state:")) and split_document_id(key.split(":", 1)[1]) is not None:
            continue
        if key.startswith("file:"):
            parts = PurePosixPath(key[5:]).parts
            if (len(parts) == 3 and parts[0] == "projects" and PROJECT_ID.fullmatch(parts[1])
                    and parts[2] in {"model.ttl", "shapes.ttl", "model.layout.json", "shapes.layout.json", "model.original.ttl", "shapes.original.ttl"}):
                continue
        raise RepositoryError("forbidden")


def inverse(repository, actor, key, expected, *, redo=False):
    entries = repository.history(key, limit=1)
    if not entries or entries[0]["actor"] != actor:
        raise RepositoryError("undo_forbidden")
    latest = entries[0]
    if redo != latest["operation"].startswith("undo:"):
        raise RepositoryError("undo_forbidden")
    with repository.connection() as db:
        rows = db.execute("SELECT * FROM audit WHERE actor=? AND request_id=? ORDER BY id", (actor, latest["request_id"])).fetchall()
    actual = repository.versions(row["key"] for row in rows)
    basis = {row["key"]: row["after_version"] for row in rows}
    if actual != basis:
        raise Conflict(basis, actual)
    changes = {row["key"]: json.loads(row["before_payload"]) if row["before_payload"] is not None else None for row in rows}
    return changes, ("redo:" if redo else "undo:") + latest["request_id"]
