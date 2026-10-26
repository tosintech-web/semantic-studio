"""
================================================================================
FILE: backend/app/team/manage.py
SUMMARY
    Image-native role-only maintenance CLI for the internal PostgreSQL network.
BASIC IDEA
    Inspection/dry-run need no DB. Other commands load only their fixed database
    role secret; no Google/app credential or external DSN is accepted.
INPUTS / INPUT SOURCES
    Explicit command/path arguments and SEMANTIC_STUDIO_DB_* configuration.
EXPECTED OUTPUT
    JSON counts or finite diagnostics, never source values or exception text.
================================================================================
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from . import maintenance
from .pg_config import load_pg_config
from .pg_schema import SCHEMA_VERSION, ensure_schema
from .pg_storage import PgStorage, StorageError
from .repository import UnsupportedSchema


class JsonArgumentParser(argparse.ArgumentParser):
    def error(self, _message):
        raise ValueError('invalid_arguments')


def main(argv=None):
    parser = JsonArgumentParser(description='Private Semantic Studio PostgreSQL maintenance')
    commands = parser.add_subparsers(dest='operation', required=True)
    commands.add_parser('init-schema')
    inspect = commands.add_parser('inspect-local')
    inspect.add_argument('source', type=Path)
    migrate = commands.add_parser('migrate')
    migrate.add_argument('--source', type=Path, required=True)
    migrate.add_argument('--destination', type=Path)
    migrate.add_argument('--dry-run', action='store_true')
    backup = commands.add_parser('backup')
    backup.add_argument('--blob-root', type=Path, required=True)
    backup.add_argument('--destination', type=Path, required=True)
    restore = commands.add_parser('restore')
    restore.add_argument('--archive', type=Path, required=True)
    restore.add_argument('--destination', type=Path, required=True)
    try:
        args = parser.parse_args(argv)
    except ValueError:
        print(json.dumps({'ok': False, 'code': 'invalid_arguments'}))
        return 2
    storage = None
    try:
        if args.operation == 'inspect-local':
            result = maintenance.inspect_local(args.source)
        elif args.operation == 'migrate' and args.dry_run:
            result = maintenance.migrate_local(None, args.source, args.destination, dry_run=True)
        else:
            role = 'backup' if args.operation == 'backup' else 'maintenance'
            storage = PgStorage(load_pg_config(os.environ, role=role), on_fatal=lambda kind: None)
            if args.operation == 'init-schema':
                result = {'schema': SCHEMA_VERSION, 'status': ensure_schema(storage)}
            elif args.operation == 'migrate':
                result = maintenance.migrate_local(storage, args.source, args.destination)
            elif args.operation == 'backup':
                result = maintenance.backup(storage, args.blob_root, args.destination)
            else:
                result = maintenance.restore(storage, args.archive, args.destination)
    except maintenance.MaintenanceError as error:
        print(json.dumps({'ok': False, 'code': error.code}))
        return 2
    except UnsupportedSchema:
        print(json.dumps({'ok': False, 'code': 'unsupported_schema'}))
        return 2
    except StorageError as error:
        print(json.dumps({'ok': False, 'code': 'storage_error', 'reason': error.kind}))
        return 2
    except ValueError:
        print(json.dumps({'ok': False, 'code': 'configuration_invalid'}))
        return 2
    except Exception:
        print(json.dumps({'ok': False, 'code': 'maintenance_failed'}))
        return 2
    finally:
        if storage is not None:
            storage.close()
    print(json.dumps({'ok': True, 'operation': args.operation, **result}, ensure_ascii=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
