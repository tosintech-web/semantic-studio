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


def authorize_inverse(repository, actor, request_id, changes, resources, role, *, operation=None, tx=None):
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
    while True:
        if operation is None:
            if request_id in visited:
                raise RepositoryError("forbidden")
            visited.add(request_id)
            rows = repository.read_operation_group(actor, request_id, tx=tx)
            if not rows:
                raise RepositoryError("forbidden")
            operation = rows[0]["operation"]
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
    group = repository.latest_operation(key)
    if group is None or group.actor != actor:
        raise RepositoryError("undo_forbidden")
    if redo != group.operation.startswith("undo:"):
        raise RepositoryError("undo_forbidden")
    rows = group.entries
    actual = group.versions
    basis = {row["key"]: row["after_version"] for row in rows}
    if actual != basis:
        raise Conflict(basis, actual)
    changes = {row["key"]: json.loads(row["before_payload"]) if row["before_payload"] is not None else None for row in rows}
    return changes, ("redo:" if redo else "undo:") + group.request_id


def authorize_replayed_inverse(repository, actor, request_id, role, *, tx):
    rows = repository.read_operation_group(actor, request_id, tx=tx)
    if not rows or not rows[0]['operation'].startswith(('undo:', 'redo:')):
        return
    changes = {row['key']: json.loads(row['after_payload']) if row['after_payload'] is not None else None for row in rows}
    before = {row['key']: json.loads(row['before_payload']) if row['before_payload'] is not None else None for row in rows}
    # A replay is not a retained administrator capability. Its recorded origin
    # and actual effects are checked under the same gate as the replay lookup.
    authorize_inverse(repository, actor, request_id, changes, before, role,
                      operation=rows[0]['operation'], tx=tx)
