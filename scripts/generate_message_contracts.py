"""
================================================================================
FILE: scripts/generate_message_contracts.py
SUMMARY
    Deterministic TypeScript contracts from the backend's message definitions.
BASIC IDEA
    The committed output is used by frontend builds without requiring Python;
    --check detects drift in development and CI without rewriting files.
INPUTS / INPUT SOURCES
    backend/app/message_contracts.json, version 1 primitive/flat-parts argument contracts.
EXPECTED OUTPUT
    Generated runtime schema/types, or a nonzero check on differing bytes.
================================================================================
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {"string", "number", "boolean", "null", "parts"}

def generate(contract: dict) -> str:
    if contract.get("version") != 1 or not isinstance(contract.get("codes"), dict):
        raise ValueError("Unsupported message contract")
    codes = contract["codes"]
    for code, args in codes.items():
        if not isinstance(code, str) or not isinstance(args, dict):
            raise ValueError("Invalid code or argument declaration")
        if code.startswith("words.") and args:
            raise ValueError("Word tokens cannot have arguments")
        for name, kind in args.items():
            variants = kind if isinstance(kind, list) else [kind]
            if not isinstance(name, str) or not variants or not all(isinstance(value, str) and value in ALLOWED for value in variants):
                raise ValueError("Invalid argument declaration")
    header = '''/*
================================================================================
FILE: frontend/src/i18n/server-contracts.ts
SUMMARY
    Generated server-owned UI message definitions; do not edit manually.
BASIC IDEA
    Run python scripts/generate_message_contracts.py to update this file.
INPUTS / INPUT SOURCES
    backend/app/message_contracts.json, the sole argument contract definition.
EXPECTED OUTPUT
    Matching runtime validator schema and compile-time argument types.
================================================================================
*/
'''
    body = "export const SERVER_CONTRACTS = " + json.dumps(codes, ensure_ascii=False, indent=2, sort_keys=True) + " as const;\n"
    body += "export interface ServerMessageArgs {\n"
    for code, args in sorted(codes.items()):
        fields = []
        for name, kind in sorted(args.items()):
            variants = kind if isinstance(kind, list) else [kind]
            # Translators receive rendered plain strings; only the runtime wire
            # schema carries flat parts. Keep those two boundaries distinct.
            rendered = list(dict.fromkeys("string" if value == "parts" else value for value in variants))
            fields.append(json.dumps(name) + ": " + " | ".join(rendered))
        body += "  " + json.dumps(code) + ": " + ("{ " + "; ".join(fields) + " }" if fields else "undefined") + ";\n"
    body += "}\nexport type UiPart = { text: string } | { code: string; args: Record<string, never> };\n"
    body += "export interface WireMessage { code: string; args: Record<string, string | number | boolean | null | UiPart[]> }\n"
    return header + body

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    contract = json.loads((ROOT / "backend/app/message_contracts.json").read_text(encoding="utf-8"))
    result = generate(contract)
    target = ROOT / "frontend/src/i18n/server-contracts.ts"
    if args.check:
        if not target.exists() or target.read_text(encoding="utf-8") != result:
            parser.exit(1, "Generated message contracts differ; run scripts/generate_message_contracts.py\n")
    else:
        target.write_text(result, encoding="utf-8", newline="\n")

if __name__ == "__main__":
    main()
