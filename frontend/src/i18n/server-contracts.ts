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
  "command.added_check": {
    "path": "parts",
    "shape_name": "string"
  },
  "command.added_disjoint": {
    "first": "string",
    "second": "string"
  },
  "command.added_equivalent": {
    "first": "string",
    "second": "string"
  },
  "command.added_example_value": {
    "property": "string",
    "subject": "string"
  },
  "command.added_mapping": {
    "concept": "string",
    "mapping": "parts",
    "target": "string"
  },
  "command.added_related": {
    "concept": "string",
    "related": "string"
  },
  "command.added_restriction": {
    "name": "string",
    "property": "string"
  },
  "command.added_rule": {
    "path": "parts",
    "shape_name": "string"
  },
  "command.added_subclass": {
    "child": "string",
    "parent": "string"
  },
  "command.added_subproperty": {
    "child": "string",
    "parent": "string"
  },
  "command.applied_turtle": {},
  "command.assigned_domain": {
    "class_name": "string",
    "property": "string"
  },
  "command.changed_annotation": {
    "name": "string",
    "property": "string"
  },
  "command.changed_restriction": {
    "name": "string",
    "property": "string"
  },
  "command.changed_rule": {
    "path": "parts",
    "shape_name": "string"
  },
  "command.changed_shape_message": {
    "name": "string"
  },
  "command.changed_shape_severity": {
    "name": "string",
    "severity": "parts"
  },
  "command.changed_shape_target": {
    "name": "string",
    "target": "string"
  },
  "command.cleared_domain": {
    "name": "string"
  },
  "command.cleared_inverse": {
    "name": "string"
  },
  "command.cleared_range": {
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
  "command.created_shape": {
    "name": "string"
  },
  "command.deleted_entity": {
    "kind": "parts",
    "name": "string"
  },
  "command.deleted_shape": {
    "name": "string"
  },
  "command.linked_example_value": {
    "property": "string",
    "subject": "string",
    "target": "string"
  },
  "command.made_inverse": {
    "inverse": "string",
    "name": "string"
  },
  "command.marked_characteristic": {
    "characteristic": "parts",
    "name": "string"
  },
  "command.moved_domain": {
    "class_name": "string",
    "property": "string"
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
  "command.removed_domain_member": {
    "class_name": "string",
    "property": "string"
  },
  "command.removed_equivalent": {
    "first": "string",
    "second": "string"
  },
  "command.removed_example_link": {
    "property": "string",
    "subject": "string",
    "target": "string"
  },
  "command.removed_example_value": {
    "property": "string",
    "subject": "string"
  },
  "command.removed_mapping": {
    "concept": "string",
    "mapping": "parts",
    "target": "string"
  },
  "command.removed_related": {
    "concept": "string",
    "related": "string"
  },
  "command.removed_restriction": {
    "name": "string",
    "property": "string"
  },
  "command.removed_rule": {
    "path": "parts",
    "shape_name": "string"
  },
  "command.removed_shape_message": {
    "name": "string"
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
  "command.renamed_shape": {
    "new": "string",
    "old": "string"
  },
  "command.set_comment": {
    "language": "string",
    "name": "string"
  },
  "command.set_domain": {
    "name": "string",
    "target": "string"
  },
  "command.set_ends_both": {
    "domain": "string",
    "name": "string",
    "range": "string"
  },
  "command.set_ends_domain": {
    "domain": "string",
    "name": "string"
  },
  "command.set_ends_range": {
    "name": "string",
    "range": "string"
  },
  "command.set_example_value": {
    "property": "string",
    "subject": "string"
  },
  "command.set_label": {
    "language": "string",
    "name": "string"
  },
  "command.set_range": {
    "name": "string",
    "target": "string"
  },
  "command.shared_domain": {
    "names": "parts",
    "property": "string"
  },
  "command.shared_parent": {
    "names": "parts",
    "property": "string"
  },
  "command.swapped_ends": {
    "name": "string"
  },
  "command.unmarked_characteristic": {
    "characteristic": "parts",
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
  },
  "words.characteristic.asymmetric": {},
  "words.characteristic.functional": {},
  "words.characteristic.functionalAttribute": {},
  "words.characteristic.inverseFunctional": {},
  "words.characteristic.irreflexive": {},
  "words.characteristic.reflexive": {},
  "words.characteristic.symmetric": {},
  "words.characteristic.transitive": {},
  "words.kind.annotationProperty": {},
  "words.kind.class": {},
  "words.kind.concept": {},
  "words.kind.conceptScheme": {},
  "words.kind.datatypeProperty": {},
  "words.kind.entity": {},
  "words.kind.example": {},
  "words.kind.objectProperty": {},
  "words.kind.property": {},
  "words.list.and": {},
  "words.mapping.broadMatch": {},
  "words.mapping.closeMatch": {},
  "words.mapping.exactMatch": {},
  "words.mapping.narrowMatch": {},
  "words.mapping.relatedMatch": {},
  "words.path.definition": {},
  "words.path.description": {},
  "words.path.name": {},
  "words.path.nameLabel": {},
  "words.path.or": {},
  "words.path.preferredName": {},
  "words.severity.violation": {},
  "words.severity.warning": {}
} as const;
export interface ServerMessageArgs {
  "command.added_annotation": { "name": string; "property": string };
  "command.added_broader": { "broader": string; "concept": string };
  "command.added_check": { "path": string; "shape_name": string };
  "command.added_disjoint": { "first": string; "second": string };
  "command.added_equivalent": { "first": string; "second": string };
  "command.added_example_value": { "property": string; "subject": string };
  "command.added_mapping": { "concept": string; "mapping": string; "target": string };
  "command.added_related": { "concept": string; "related": string };
  "command.added_restriction": { "name": string; "property": string };
  "command.added_rule": { "path": string; "shape_name": string };
  "command.added_subclass": { "child": string; "parent": string };
  "command.added_subproperty": { "child": string; "parent": string };
  "command.applied_turtle": undefined;
  "command.assigned_domain": { "class_name": string; "property": string };
  "command.changed_annotation": { "name": string; "property": string };
  "command.changed_restriction": { "name": string; "property": string };
  "command.changed_rule": { "path": string; "shape_name": string };
  "command.changed_shape_message": { "name": string };
  "command.changed_shape_severity": { "name": string; "severity": string };
  "command.changed_shape_target": { "name": string; "target": string };
  "command.cleared_domain": { "name": string };
  "command.cleared_inverse": { "name": string };
  "command.cleared_range": { "name": string };
  "command.created_annotation_property": { "name": string };
  "command.created_class": { "name": string };
  "command.created_concept": { "name": string };
  "command.created_datatype_property": { "name": string };
  "command.created_example": { "class_name": string; "name": string };
  "command.created_object_property": { "name": string };
  "command.created_shape": { "name": string };
  "command.deleted_entity": { "kind": string; "name": string };
  "command.deleted_shape": { "name": string };
  "command.linked_example_value": { "property": string; "subject": string; "target": string };
  "command.made_inverse": { "inverse": string; "name": string };
  "command.marked_characteristic": { "characteristic": string; "name": string };
  "command.moved_domain": { "class_name": string; "property": string };
  "command.removed_annotation": { "name": string; "property": string };
  "command.removed_broader": { "broader": string; "concept": string };
  "command.removed_disjoint": { "first": string; "second": string };
  "command.removed_domain_member": { "class_name": string; "property": string };
  "command.removed_equivalent": { "first": string; "second": string };
  "command.removed_example_link": { "property": string; "subject": string; "target": string };
  "command.removed_example_value": { "property": string; "subject": string };
  "command.removed_mapping": { "concept": string; "mapping": string; "target": string };
  "command.removed_related": { "concept": string; "related": string };
  "command.removed_restriction": { "name": string; "property": string };
  "command.removed_rule": { "path": string; "shape_name": string };
  "command.removed_shape_message": { "name": string };
  "command.removed_subclass": { "child": string; "parent": string };
  "command.removed_subproperty": { "child": string; "parent": string };
  "command.renamed_iri": { "new": string; "old": string };
  "command.renamed_shape": { "new": string; "old": string };
  "command.set_comment": { "language": string; "name": string };
  "command.set_domain": { "name": string; "target": string };
  "command.set_ends_both": { "domain": string; "name": string; "range": string };
  "command.set_ends_domain": { "domain": string; "name": string };
  "command.set_ends_range": { "name": string; "range": string };
  "command.set_example_value": { "property": string; "subject": string };
  "command.set_label": { "language": string; "name": string };
  "command.set_range": { "name": string; "target": string };
  "command.shared_domain": { "names": string; "property": string };
  "command.shared_parent": { "names": string; "property": string };
  "command.swapped_ends": { "name": string };
  "command.unmarked_characteristic": { "characteristic": string; "name": string };
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
  "words.characteristic.asymmetric": undefined;
  "words.characteristic.functional": undefined;
  "words.characteristic.functionalAttribute": undefined;
  "words.characteristic.inverseFunctional": undefined;
  "words.characteristic.irreflexive": undefined;
  "words.characteristic.reflexive": undefined;
  "words.characteristic.symmetric": undefined;
  "words.characteristic.transitive": undefined;
  "words.kind.annotationProperty": undefined;
  "words.kind.class": undefined;
  "words.kind.concept": undefined;
  "words.kind.conceptScheme": undefined;
  "words.kind.datatypeProperty": undefined;
  "words.kind.entity": undefined;
  "words.kind.example": undefined;
  "words.kind.objectProperty": undefined;
  "words.kind.property": undefined;
  "words.list.and": undefined;
  "words.mapping.broadMatch": undefined;
  "words.mapping.closeMatch": undefined;
  "words.mapping.exactMatch": undefined;
  "words.mapping.narrowMatch": undefined;
  "words.mapping.relatedMatch": undefined;
  "words.path.definition": undefined;
  "words.path.description": undefined;
  "words.path.name": undefined;
  "words.path.nameLabel": undefined;
  "words.path.or": undefined;
  "words.path.preferredName": undefined;
  "words.severity.violation": undefined;
  "words.severity.warning": undefined;
}
export type UiPart = { text: string } | { code: string; args: Record<string, never> };
export interface WireMessage { code: string; args: Record<string, string | number | boolean | null | UiPart[]> }
