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
  "editing.refusal.allowed_values_required": {},
  "editing.refusal.annotation_identity_required": {},
  "editing.refusal.attribute_value_kind": {},
  "editing.refusal.attribute_value_no_link": {},
  "editing.refusal.characteristic_switch_required": {},
  "editing.refusal.command_arguments_object": {},
  "editing.refusal.definition_text": {},
  "editing.refusal.delete_strategy": {},
  "editing.refusal.dry_run_unavailable": {},
  "editing.refusal.ends_required": {},
  "editing.refusal.examples_model_document": {},
  "editing.refusal.explicit_iri_required": {},
  "editing.refusal.length_bounds_conflict": {},
  "editing.refusal.no_change": {},
  "editing.refusal.pattern_text": {},
  "editing.refusal.recovery_choice": {},
  "editing.refusal.redo_unavailable": {},
  "editing.refusal.relationship_value_iri": {},
  "editing.refusal.rule_check_required": {},
  "editing.refusal.rule_count_condition": {},
  "editing.refusal.rule_count_range": {},
  "editing.refusal.rule_defining_class": {},
  "editing.refusal.rule_form": {},
  "editing.refusal.rule_identity_required": {},
  "editing.refusal.rule_kind": {},
  "editing.refusal.rule_object_required": {},
  "editing.refusal.rule_path_required": {},
  "editing.refusal.rule_target_class_required": {},
  "editing.refusal.rule_value_required": {},
  "editing.refusal.rules_model_document": {},
  "editing.refusal.shape_message_text": {},
  "editing.refusal.shape_missing": {},
  "editing.refusal.shape_name_required": {},
  "editing.refusal.shape_preset": {},
  "editing.refusal.shape_severity": {},
  "editing.refusal.shapes_document": {},
  "editing.refusal.share_model_document": {},
  "editing.refusal.unchanged_iri": {},
  "editing.refusal.undo_unavailable": {},
  "editing.refusal.value_bounds_conflict": {},
  "editing.refusal.value_bounds_kind": {},
  "editing.refusal.value_kind_and_text_required": {},
  "editing.value.datatype_required": {},
  "editing.value.empty_text": {},
  "editing.value.invalid_boolean": {
    "value": "string"
  },
  "editing.value.invalid_date": {
    "value": "string"
  },
  "editing.value.invalid_dateTime": {
    "value": "string"
  },
  "editing.value.invalid_decimal": {
    "value": "string"
  },
  "editing.value.invalid_double": {
    "value": "string"
  },
  "editing.value.invalid_float": {
    "value": "string"
  },
  "editing.value.invalid_gYear": {
    "value": "string"
  },
  "editing.value.invalid_integer": {
    "value": "string"
  },
  "editing.value.invalid_kind": {},
  "editing.value.invalid_language": {
    "language": "string"
  },
  "editing.value.invalid_type_kind": {},
  "editing.value.invalid_uri": {
    "value": "string"
  },
  "editing.value.kind_required": {},
  "editing.value.language_datatype": {},
  "editing.value.text_required": {},
  "editing.value.type_required": {},
  "editing.value.unsupported_datatype": {
    "datatype": "string"
  },
  "entities.page_too_large": {
    "suggested_limit": "number",
    "total": "number"
  },
  "entities.view_changed": {},
  "model.broader.related": {
    "broad": "string",
    "narrow": "string"
  },
  "model.chain.changed_inverse": {
    "characteristic": "parts",
    "name": "string",
    "source": "string"
  },
  "model.chain.changed_under": {
    "characteristic": "parts",
    "name": "string",
    "source": "string"
  },
  "model.chain.counted_inverse": {
    "name": "string",
    "source": "string"
  },
  "model.chain.counted_self": {
    "name": "string"
  },
  "model.chain.counted_under": {
    "name": "string",
    "source": "string"
  },
  "model.chain.inverse": {
    "characteristic": "parts",
    "name": "string"
  },
  "model.chain.self": {
    "characteristic": "parts"
  },
  "model.chain.under": {
    "characteristic": "parts",
    "name": "string"
  },
  "model.class.disjoint_equivalent": {
    "first": "string",
    "second": "string"
  },
  "model.class.disjoint_self": {},
  "model.class.equivalent_disjoint": {
    "first": "string",
    "second": "string"
  },
  "model.class.equivalent_self": {},
  "model.conflict.reflexive_irreflexive": {},
  "model.conflict.symmetric_asymmetric": {},
  "model.count.conflict": {
    "high": "number",
    "low": "number",
    "name": "string",
    "property": "string"
  },
  "model.count.inverse": {
    "name": "string"
  },
  "model.count.self": {
    "name": "string"
  },
  "model.count.under": {
    "name": "string",
    "source": "string"
  },
  "model.fix.inverse_ends": {
    "from_name": "string",
    "name": "string",
    "to_name": "string"
  },
  "model.fix.share": {},
  "model.invalid_value": {
    "datatype": "string",
    "value": "string"
  },
  "model.inverse.self": {
    "name": "string"
  },
  "model.loop.broader": {
    "name": "string"
  },
  "model.loop.property": {
    "name": "string"
  },
  "model.members.both": {
    "first": "string",
    "name": "string",
    "second": "string"
  },
  "model.members.parent": {
    "name": "string",
    "parent": "string"
  },
  "model.members.self": {
    "name": "string"
  },
  "model.related.broader": {
    "broad": "string",
    "narrow": "string"
  },
  "model.warning.domain.attribute": {
    "classes": "parts",
    "name": "string"
  },
  "model.warning.domain.relationship": {
    "classes": "parts",
    "name": "string"
  },
  "model.warning.inverse_ends": {
    "from_name": "string",
    "name": "string",
    "to_name": "string"
  },
  "model.warning.reflexive.all": {
    "classes": "parts"
  },
  "model.warning.reflexive.any": {
    "classes": "parts"
  },
  "model.warning.reflexive.one": {
    "classes": "parts"
  },
  "model.warning.symmetric.all": {
    "classes": "parts",
    "end": "string",
    "name": "string"
  },
  "model.warning.symmetric.any": {
    "classes": "parts",
    "end": "string",
    "name": "string"
  },
  "model.warning.symmetric.one": {
    "classes": "parts",
    "end": "string",
    "name": "string"
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
  "words.list.or": {},
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
  "editing.refusal.allowed_values_required": undefined;
  "editing.refusal.annotation_identity_required": undefined;
  "editing.refusal.attribute_value_kind": undefined;
  "editing.refusal.attribute_value_no_link": undefined;
  "editing.refusal.characteristic_switch_required": undefined;
  "editing.refusal.command_arguments_object": undefined;
  "editing.refusal.definition_text": undefined;
  "editing.refusal.delete_strategy": undefined;
  "editing.refusal.dry_run_unavailable": undefined;
  "editing.refusal.ends_required": undefined;
  "editing.refusal.examples_model_document": undefined;
  "editing.refusal.explicit_iri_required": undefined;
  "editing.refusal.length_bounds_conflict": undefined;
  "editing.refusal.no_change": undefined;
  "editing.refusal.pattern_text": undefined;
  "editing.refusal.recovery_choice": undefined;
  "editing.refusal.redo_unavailable": undefined;
  "editing.refusal.relationship_value_iri": undefined;
  "editing.refusal.rule_check_required": undefined;
  "editing.refusal.rule_count_condition": undefined;
  "editing.refusal.rule_count_range": undefined;
  "editing.refusal.rule_defining_class": undefined;
  "editing.refusal.rule_form": undefined;
  "editing.refusal.rule_identity_required": undefined;
  "editing.refusal.rule_kind": undefined;
  "editing.refusal.rule_object_required": undefined;
  "editing.refusal.rule_path_required": undefined;
  "editing.refusal.rule_target_class_required": undefined;
  "editing.refusal.rule_value_required": undefined;
  "editing.refusal.rules_model_document": undefined;
  "editing.refusal.shape_message_text": undefined;
  "editing.refusal.shape_missing": undefined;
  "editing.refusal.shape_name_required": undefined;
  "editing.refusal.shape_preset": undefined;
  "editing.refusal.shape_severity": undefined;
  "editing.refusal.shapes_document": undefined;
  "editing.refusal.share_model_document": undefined;
  "editing.refusal.unchanged_iri": undefined;
  "editing.refusal.undo_unavailable": undefined;
  "editing.refusal.value_bounds_conflict": undefined;
  "editing.refusal.value_bounds_kind": undefined;
  "editing.refusal.value_kind_and_text_required": undefined;
  "editing.value.datatype_required": undefined;
  "editing.value.empty_text": undefined;
  "editing.value.invalid_boolean": { "value": string };
  "editing.value.invalid_date": { "value": string };
  "editing.value.invalid_dateTime": { "value": string };
  "editing.value.invalid_decimal": { "value": string };
  "editing.value.invalid_double": { "value": string };
  "editing.value.invalid_float": { "value": string };
  "editing.value.invalid_gYear": { "value": string };
  "editing.value.invalid_integer": { "value": string };
  "editing.value.invalid_kind": undefined;
  "editing.value.invalid_language": { "language": string };
  "editing.value.invalid_type_kind": undefined;
  "editing.value.invalid_uri": { "value": string };
  "editing.value.kind_required": undefined;
  "editing.value.language_datatype": undefined;
  "editing.value.text_required": undefined;
  "editing.value.type_required": undefined;
  "editing.value.unsupported_datatype": { "datatype": string };
  "entities.page_too_large": { "suggested_limit": number; "total": number };
  "entities.view_changed": undefined;
  "model.broader.related": { "broad": string; "narrow": string };
  "model.chain.changed_inverse": { "characteristic": string; "name": string; "source": string };
  "model.chain.changed_under": { "characteristic": string; "name": string; "source": string };
  "model.chain.counted_inverse": { "name": string; "source": string };
  "model.chain.counted_self": { "name": string };
  "model.chain.counted_under": { "name": string; "source": string };
  "model.chain.inverse": { "characteristic": string; "name": string };
  "model.chain.self": { "characteristic": string };
  "model.chain.under": { "characteristic": string; "name": string };
  "model.class.disjoint_equivalent": { "first": string; "second": string };
  "model.class.disjoint_self": undefined;
  "model.class.equivalent_disjoint": { "first": string; "second": string };
  "model.class.equivalent_self": undefined;
  "model.conflict.reflexive_irreflexive": undefined;
  "model.conflict.symmetric_asymmetric": undefined;
  "model.count.conflict": { "high": number; "low": number; "name": string; "property": string };
  "model.count.inverse": { "name": string };
  "model.count.self": { "name": string };
  "model.count.under": { "name": string; "source": string };
  "model.fix.inverse_ends": { "from_name": string; "name": string; "to_name": string };
  "model.fix.share": undefined;
  "model.invalid_value": { "datatype": string; "value": string };
  "model.inverse.self": { "name": string };
  "model.loop.broader": { "name": string };
  "model.loop.property": { "name": string };
  "model.members.both": { "first": string; "name": string; "second": string };
  "model.members.parent": { "name": string; "parent": string };
  "model.members.self": { "name": string };
  "model.related.broader": { "broad": string; "narrow": string };
  "model.warning.domain.attribute": { "classes": string; "name": string };
  "model.warning.domain.relationship": { "classes": string; "name": string };
  "model.warning.inverse_ends": { "from_name": string; "name": string; "to_name": string };
  "model.warning.reflexive.all": { "classes": string };
  "model.warning.reflexive.any": { "classes": string };
  "model.warning.reflexive.one": { "classes": string };
  "model.warning.symmetric.all": { "classes": string; "end": string; "name": string };
  "model.warning.symmetric.any": { "classes": string; "end": string; "name": string };
  "model.warning.symmetric.one": { "classes": string; "end": string; "name": string };
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
  "words.list.or": undefined;
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
