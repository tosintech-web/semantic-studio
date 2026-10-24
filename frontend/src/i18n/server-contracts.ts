/*
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
export const SERVER_CONTRACTS = {
  "command.created_annotation_property": {
    "name": "string"
  },
  "command.created_class": {
    "name": "string"
  },
  "command.created_concept": {
    "name": "string"
  },
  "command.created_datatype_property": {
    "name": "string"
  },
  "command.created_object_property": {
    "name": "string"
  },
  "entities.page_too_large": {
    "suggested_limit": "number",
    "total": "number"
  },
  "entities.view_changed": {},
  "model.invalid_value": {
    "datatype": "string",
    "value": "string"
  },
  "parse.syntax": {
    "format": "string",
    "line": [
      "number",
      "null"
    ]
  },
  "reasoning.failed": {},
  "reasoning.stopped": {},
  "reasoning.timeout": {
    "seconds": "number"
  },
  "reasoning.too_large": {
    "count": "number",
    "limit": "number"
  },
  "request.invalid": {},
  "validation.min_count": {
    "count": "number",
    "name": "string"
  }
} as const;
export interface ServerMessageArgs {
  "command.created_annotation_property": { "name": string };
  "command.created_class": { "name": string };
  "command.created_concept": { "name": string };
  "command.created_datatype_property": { "name": string };
  "command.created_object_property": { "name": string };
  "entities.page_too_large": { "suggested_limit": number; "total": number };
  "entities.view_changed": undefined;
  "model.invalid_value": { "datatype": string; "value": string };
  "parse.syntax": { "format": string; "line": number | null };
  "reasoning.failed": undefined;
  "reasoning.stopped": undefined;
  "reasoning.timeout": { "seconds": number };
  "reasoning.too_large": { "count": number; "limit": number };
  "request.invalid": undefined;
  "validation.min_count": { "count": number; "name": string };
}
export interface WireMessage { code: string; args: Record<string, string | number | boolean | null> }
