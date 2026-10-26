"""
================================================================================
FILE: scripts/team_workspace.py
SUMMARY
    Source-checkout entry point for internal PostgreSQL maintenance commands.
BASIC IDEA
    Delegate to the same app.team.manage module shipped in the app image.
INPUTS / INPUT SOURCES
    Explicit CLI arguments and role-only database configuration.
EXPECTED OUTPUT
    The module CLI's finite JSON diagnostics/counts without duplicate behavior.
================================================================================
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from app.team.manage import main

if __name__ == '__main__':
    raise SystemExit(main())
