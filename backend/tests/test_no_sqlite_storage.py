"""
================================================================================
FILE: backend/tests/test_no_sqlite_storage.py
SUMMARY
    Reject SQLite execution in product, maintenance, test and helper source.
BASIC IDEA
    Parse imports and SQL call sites, including inert planted source snippets;
    a subprocess audit hook also guards local runtime without importing SQLite.
INPUTS / INPUT SOURCES
    Repository Python sources and synthetic forbidden-source strings only.
EXPECTED OUTPUT
    No SQLite import, connection or engine-specific executable SQL remains.
================================================================================
"""
import ast
from pathlib import Path
import re
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]


def sqlite_uses(source):
    tree = ast.parse(source)
    findings = []
    values = {}
    aliases = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                aliases[alias.asname or alias.name] = alias.name
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Constant):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    values[target.id] = node.value.value
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [alias.name for alias in node.names] if isinstance(node, ast.Import) else [node.module or '']
            if any(name.split('.')[0] in {'sqlite3', '_sqlite3', 'pysqlite3', 'aiosqlite'} for name in names):
                findings.append(('import', node.lineno))
        if not isinstance(node, ast.Call):
            continue
        name = node.func.attr if isinstance(node.func, ast.Attribute) else getattr(node.func, 'id', '')
        name = aliases.get(name, name)
        argument = node.args[0] if node.args else None
        value = argument.value if isinstance(argument, ast.Constant) else values.get(getattr(argument, 'id', ''))
        if name in {'import_module', '__import__'} and isinstance(value, str) and value.split('.')[0] in {'sqlite3', '_sqlite3', 'pysqlite3', 'aiosqlite'}:
            findings.append(('dynamic-import', node.lineno))
        if name in {'execute', 'executemany', 'executescript'} and isinstance(value, str) and re.search(r'(?i)\b(?:PRAGMA|sqlite_master|sqlite_schema)\b|\bBEGIN\s+IMMEDIATE\b', value):
            findings.append(('sql', node.lineno))
        if name in {'create_engine', 'connect'} and isinstance(value, str) and value.startswith('sqlite:'):
            findings.append(('selector', node.lineno))
        # Only executable strings are parsed again; inert negative fixtures are
        # deliberately never treated as imported or executed code.
        snippets = [value] if name in {'exec', 'eval'} and isinstance(value, str) else []
        if name in {'run', 'Popen', 'check_output', 'check_call', 'call'} and isinstance(argument, (ast.List, ast.Tuple)):
            for index, part in enumerate(argument.elts[:-1]):
                following = argument.elts[index + 1]
                if isinstance(part, ast.Constant) and part.value == '-c' and isinstance(following, ast.Constant) and isinstance(following.value, str):
                    snippets.append(following.value)
        for snippet in snippets:
            findings.extend(sqlite_uses(snippet))
    return findings


@pytest.mark.parametrize('source', [
    'import sqlite3 as database',
    'from sqlite3 import connect',
    'from _sqlite3 import connect',
    'import aiosqlite',
    "importlib.import_module('sqlite3')",
    "__import__('pysqlite3')",
    "database.execute('PRAGMA user_version=1')",
    "sql='SELECT * FROM sqlite_master'\ndatabase.execute(sql)",
    "database.execute('BEGIN IMMEDIATE')",
    "create_engine('sqlite:///state')",
    "from importlib import import_module as load\nload('sqlite3')",
    "subprocess.run(['python', '-c', 'import sqlite3'])",
])
def test_guard_detects_forbidden_source_without_executing_it(source):
    assert sqlite_uses(source)


def test_product_tests_and_helpers_have_no_sqlite_execution():
    findings = {}
    for directory in ('backend/app', 'backend/tests', 'scripts'):
        for path in ROOT.joinpath(directory).rglob('*.py'):
            uses = sqlite_uses(path.read_text(encoding='utf-8'))
            if uses:
                findings[str(path.relative_to(ROOT))] = uses
    assert findings == {}


def test_local_runtime_has_no_sqlite_connection(tmp_path):
    import os
    environment = dict(os.environ, SEMANTIC_STUDIO_MODE='local', SEMANTIC_STUDIO_DATA_DIR=str(tmp_path))
    result = subprocess.run([sys.executable, '-c', '''
import sys
def audit(event, args):
    if event == 'sqlite3.connect':
        raise AssertionError('forbidden_storage_connection')
sys.addaudithook(audit)
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app, base_url='http://localhost') as client:
    assert client.get('/api/auth/status').json()['mode'] == 'local'
    assert client.get('/api/ontologies').status_code == 200
assert 'app.team.pg_storage' not in sys.modules
'''], env=environment, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
