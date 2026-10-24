"""
================================================================================
FILE: backend/app/messages.py
SUMMARY
    Source-validated, additive UI metadata for server-owned messages.
BASIC IDEA
    A single JSON contract defines primitive argument names and types. Legacy
    English remains intact; clients choose their own UI locale at render time.
INPUTS / INPUT SOURCES
    Stable code and facts available at the point a message is created.
EXPECTED OUTPUT
    A validated code/args object or a programming error for a contract mismatch.
================================================================================
"""
import json
import math
from pathlib import Path
from fastapi import HTTPException

CONTRACT = json.loads(Path(__file__).with_name("message_contracts.json").read_text(encoding="utf-8"))

def _matches(value, declared) -> bool:
    types = declared if isinstance(declared, list) else [declared]
    actual = ("null" if value is None else "boolean" if isinstance(value, bool) else
              "number" if isinstance(value, (int, float)) and math.isfinite(value) else
              "string" if isinstance(value, str) else "invalid")
    return actual in types

def make_message(code: str, **args) -> dict:
    """Refuse contract drift at the producer, before sending ambiguous data."""
    specification = CONTRACT["codes"].get(code)
    if specification is None or set(args) != set(specification):
        raise ValueError("Unknown message code or mismatched arguments")
    if not all(_matches(value, specification[name]) for name, value in args.items()):
        raise ValueError("Message argument does not match its primitive contract")
    return {"code": code, "args": dict(args)}

class UiHTTPException(HTTPException):
    """HTTP refusal whose old detail and status retain their existing types."""
    def __init__(self, *, status_code: int, detail, ui_message: dict, headers=None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.ui_message = ui_message
