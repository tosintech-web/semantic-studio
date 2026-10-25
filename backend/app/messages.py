"""
================================================================================
FILE: backend/app/messages.py
SUMMARY
    Source-validated, additive UI metadata for server-owned messages.
BASIC IDEA
    A single JSON contract defines primitive arguments and flat noun parts. Legacy
    English remains intact; clients choose their own UI locale at render time.
    String carriers preserve legacy check signatures; HTTP boundaries forward
    their metadata beside unchanged detail, including structured refusals.
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

def _known_word(code) -> bool:
    return (isinstance(code, str) and code.startswith("words.")
            and CONTRACT["codes"].get(code) == {})


def _part(value) -> bool:
    if not isinstance(value, dict):
        return False
    if set(value) == {"text"}:
        return isinstance(value["text"], str)
    return (set(value) == {"code", "args"} and _known_word(value["code"])
            and isinstance(value["args"], dict) and not value["args"])


def literal_part(text: str) -> dict:
    """A captured RDF name/value, never a previously assembled UI sentence."""
    if not isinstance(text, str):
        raise ValueError("A literal part must be text")
    return {"text": text}


def word_part(code: str) -> dict:
    """Only a registered argument-free noun/separator token, not a template."""
    if not _known_word(code):
        raise ValueError("Unknown or parameterized word token")
    return {"code": code, "args": {}}


def _matches(value, declared) -> bool:
    types = declared if isinstance(declared, list) else [declared]
    if isinstance(value, list):
        # Flat token validation never follows a nested list or object. No new
        # length cap: existing alternative paths can contain arbitrary terms.
        return "parts" in types and all(_part(part) for part in value)
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
        raise ValueError("Message argument does not match its contract")
    # Scalars are immutable; parts are copied at this boundary so a later
    # edit to a caller's list/dict cannot silently rewrite a history step.
    captured = {
        key: [literal_part(part["text"]) if "text" in part else word_part(part["code"])
              for part in value] if isinstance(value, list) else value
        for key, value in args.items()
    }
    return {"code": code, "args": captured}

class MessageText(str):
    """A legacy string carrying validated facts, without another graph read.

    JSON still serializes this as the original string. API records and exception
    boundaries explicitly forward ui_message alongside that legacy text.
    """
    def __new__(cls, text: str, code: str, **args):
        value = super().__new__(cls, text)
        value.ui_message = make_message(code, **args)
        return value


def integer_arg(value: int) -> int | str:
    """Preserve exact configured counts across JSON's JavaScript boundary."""
    return value if -(2**53 - 1) <= value <= 2**53 - 1 else str(value)


def detail_body(detail, ui_message: dict | None = None) -> dict:
    """Forward only typed source metadata, never infer it from legacy text."""
    if ui_message is None:
        message = detail.get("message") if isinstance(detail, dict) else detail
        if isinstance(message, MessageText):
            ui_message = message.ui_message
    body = {"detail": detail}
    if ui_message is not None:
        body["uiMessage"] = ui_message
    return body


class UiHTTPException(HTTPException):
    """HTTP refusal whose old detail and status retain their existing types."""
    def __init__(self, *, status_code: int, detail, ui_message: dict | None, headers=None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.ui_message = ui_message
