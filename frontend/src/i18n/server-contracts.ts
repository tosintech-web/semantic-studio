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
  "command.added_annotation": {
    "name": "string",
    "property": "string"
  },
  "command.added_broader": {
    "broader": "string",
    "concept": "string"
  },
  "command.added_disjoint": {
    "first": "string",
    "second": "string"
  },
  "command.added_equivalent": {
    "first": "string",
    "second": "string"
  },
  "command.added_related": {
    "concept": "string",
    "related": "string"
  },
  "command.added_restriction": {
    "name": "string",
    "property": "string"
  },
  "command.added_subclass": {
    "child": "string",
    "parent": "string"
  },
  "command.added_subproperty": {
    "child": "string",
    "parent": "string"
  },
  "command.changed_annotation": {
    "name": "string",
    "property": "string"
  },
  "command.changed_restriction": {
    "name": "string",
    "property": "string"
  },
  "command.cleared_inverse": {
    "name": "string"
  },
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
  "command.created_example": {
    "class_name": "string",
    "name": "string"
  },
  "command.created_object_property": {
    "name": "string"
  },
  "command.removed_annotation": {
    "name": "string",
    "property": "string"
  },
  "command.removed_broader": {
    "broader": "string",
    "concept": "string"
  },
  "command.removed_disjoint": {
    "first": "string",
    "second": "string"
  },
  "command.removed_equivalent": {
    "first": "string",
    "second": "string"
  },
  "command.removed_related": {
    "concept": "string",
    "related": "string"
  },
  "command.removed_restriction": {
    "name": "string",
    "property": "string"
  },
  "command.removed_subclass": {
    "child": "string",
    "parent": "string"
  },
  "command.removed_subproperty": {
    "child": "string",
    "parent": "string"
  },
  "command.renamed_iri": {
    "new": "string",
    "old": "string"
  },
  "command.swapped_ends": {
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
  "command.added_annotation": { "name": string; "property": string };
  "command.added_broader": { "broader": string; "concept": string };
  "command.added_disjoint": { "first": string; "second": string };
  "command.added_equivalent": { "first": string; "second": string };
  "command.added_related": { "concept": string; "related": string };
  "command.added_restriction": { "name": string; "property": string };
  "command.added_subclass": { "child": string; "parent": string };
  "command.added_subproperty": { "child": string; "parent": string };
  "command.changed_annotation": { "name": string; "property": string };
  "command.changed_restriction": { "name": string; "property": string };
  "command.cleared_inverse": { "name": string };
  "command.created_annotation_property": { "name": string };
  "command.created_class": { "name": string };
  "command.created_concept": { "name": string };
  "command.created_datatype_property": { "name": string };
  "command.created_example": { "class_name": string; "name": string };
  "command.created_object_property": { "name": string };
  "command.removed_annotation": { "name": string; "property": string };
  "command.removed_broader": { "broader": string; "concept": string };
  "command.removed_disjoint": { "first": string; "second": string };
  "command.removed_equivalent": { "first": string; "second": string };
  "command.removed_related": { "concept": string; "related": string };
  "command.removed_restriction": { "name": string; "property": string };
  "command.removed_subclass": { "child": string; "parent": string };
  "command.removed_subproperty": { "child": string; "parent": string };
  "command.renamed_iri": { "new": string; "old": string };
  "command.swapped_ends": { "name": string };
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
