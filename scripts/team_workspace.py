"""
================================================================================
FILE: scripts/team_workspace.py
SUMMARY
    Runs explicit private team migration, backup and recovery operations.
BASIC IDEA
    Delegate data work to the tested maintenance service; print finite codes
    and counts as JSON, keeping source values and internal exceptions private.
INPUTS / INPUT SOURCES
    Operator-selected source paths and new destination paths.
EXPECTED OUTPUT
    JSON success with counts, or a stable error code and nonzero exit status.
================================================================================
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))


class JsonArgumentParser(argparse.ArgumentParser):
    def error(self, _message):
        # argparse's default error includes supplied arguments, which may be
        # private paths. The CLI contract exposes finite machine codes only.
        raise ValueError("invalid_arguments")


def main(argv=None):
    parser = JsonArgumentParser(description="Private Semantic Studio team maintenance")
    commands = parser.add_subparsers(dest="operation", required=True)
    inspect = commands.add_parser("inspect-local")
    inspect.add_argument("source", type=Path)
    migration = commands.add_parser("migrate")
    migration.add_argument("source", type=Path)
    migration.add_argument("--destination", type=Path)
    migration.add_argument("--dry-run", action="store_true")
    for name in ("backup", "restore"):
        command = commands.add_parser(name)
        command.add_argument("source", type=Path)
        command.add_argument("--destination", type=Path, required=True)
    try:
        args = parser.parse_args(argv)
    except ValueError:
        print(json.dumps({"ok": False, "code": "invalid_arguments"}))
        return 2
    maintenance = None
    try:
        from app.team import maintenance
        if args.operation == "inspect-local":
            result = maintenance.inspect_local(args.source)
        elif args.operation == "migrate":
            result = maintenance.migrate(args.source, args.destination, dry_run=args.dry_run)
        else:
            result = getattr(maintenance, args.operation)(args.source, args.destination)
    except Exception as exc:
        # Only our finite diagnostics are printable; third-party exceptions can
        # contain authored input, database paths or provider response bodies.
        code = exc.code if maintenance is not None and isinstance(exc, maintenance.MaintenanceError) else "maintenance_failed"
        print(json.dumps({"ok": False, "code": code}))
        return 2
    print(json.dumps({"ok": True, "operation": args.operation, **result}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
