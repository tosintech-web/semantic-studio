"""
================================================================================
FILE: backend/tests/test_pg_test_inventory.py
SUMMARY
    Pin the collected database partition and preserve prior team case identities.
BASIC IDEA
    Compare collection against a reviewed inventory, so marker drift or missing
    parametrized cases fail instead of silently reducing Windows/PG coverage.
INPUTS / INPUT SOURCES
    pytest collection and the versioned test-case inventory.
EXPECTED OUTPUT
    Every former team case maps to a collected replacement and DB IDs match.
================================================================================
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_test_inventory_matches_actual_collection(tmp_path):
    import subprocess
    import sys
    output = tmp_path / 'collection.json'
    result = subprocess.run([sys.executable, '-m', 'pytest', 'tests', '--collect-only', '-q',
                             '-m', '', '--team-inventory-output=' + str(output),
                             '-o', 'cache_dir=' + str(tmp_path / 'cache')],
                            cwd=ROOT / 'backend', capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stdout + result.stderr
    collected = json.loads(output.read_text())
    inventory = json.loads(ROOT.joinpath('docs/p2-postgresql-test-inventory.json').read_text())
    assert collected['team_db'] == inventory['team_db']
    assert collected['cases'] == inventory['cases']
    assert len(inventory['previous_cases']) == 2957
    assert len(set(inventory['previous_cases'].values())) == 2957
    assert all(new in set(collected['cases']) for new in inventory['previous_cases'].values())
