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
    "shape_name": [
      "string",
      "parts"
    ]
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
    "shape_name": [
      "string",
      "parts"
    ]
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
    "shape_name": [
      "string",
      "parts"
    ]
  },
  "command.changed_shape_message": {
    "name": [
      "string",
      "parts"
    ]
  },
  "command.changed_shape_severity": {
    "name": [
      "string",
      "parts"
    ],
    "severity": "parts"
  },
  "command.changed_shape_target": {
    "name": [
      "string",
      "parts"
    ],
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
    "name": [
      "string",
      "parts"
    ]
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
    "shape_name": [
      "string",
      "parts"
    ]
  },
  "command.removed_shape_message": {
    "name": [
      "string",
      "parts"
    ]
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
    "old": [
      "string",
      "parts"
    ]
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
  "context.address_refused": {
    "url": "string"
  },
  "context.fetch_failed": {
    "url": "string"
  },
  "context.response_limit": {
    "limit": [
      "number",
      "string"
    ],
    "url": "string"
  },
  "data.change_required": {},
  "data.file_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "data.file_required": {},
  "data.mapping_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "data.new_file_required": {},
  "data.read_timeout": {
    "seconds": "number"
  },
  "data.source_required": {},
  "editing.guard.annotation_exists": {
    "name": "string",
    "property": "string"
  },
  "editing.guard.annotation_missing_remove": {
    "name": "string",
    "property": "string"
  },
  "editing.guard.annotation_missing_replace": {
    "name": "string",
    "property": "string"
  },
  "editing.guard.attribute_characteristic": {
    "name": "string"
  },
  "editing.guard.attribute_not_relationship": {
    "name": "string"
  },
  "editing.guard.attribute_rule_kind": {
    "name": "string"
  },
  "editing.guard.broader_exists": {
    "broader": "string",
    "concept": "string"
  },
  "editing.guard.broader_missing": {
    "broader": "string",
    "concept": "string"
  },
  "editing.guard.characteristic_exists": {
    "characteristic": "parts",
    "name": "string"
  },
  "editing.guard.characteristic_missing": {
    "characteristic": "parts",
    "name": "string"
  },
  "editing.guard.check_exists": {
    "name": [
      "string",
      "parts"
    ]
  },
  "editing.guard.check_path_conflict": {
    "name": [
      "string",
      "parts"
    ],
    "path": "parts"
  },
  "editing.guard.class_rule_exists": {
    "name": "string"
  },
  "editing.guard.clear_missing_end": {
    "field": "parts",
    "name": "string"
  },
  "editing.guard.count_bounds_conflict": {
    "high": "number",
    "low": "number"
  },
  "editing.guard.disjoint_exists": {
    "first": "string",
    "second": "string"
  },
  "editing.guard.disjoint_group_readonly": {
    "first": "string",
    "second": "string"
  },
  "editing.guard.disjoint_missing": {
    "first": "string",
    "second": "string"
  },
  "editing.guard.empty_field": {
    "field": "parts"
  },
  "editing.guard.equivalent_exists": {
    "first": "string",
    "second": "string"
  },
  "editing.guard.equivalent_missing": {
    "first": "string",
    "second": "string"
  },
  "editing.guard.example_class_required": {
    "name": "string"
  },
  "editing.guard.example_invalid_typed_value": {
    "datatype": "string",
    "value": "string"
  },
  "editing.guard.example_language_text": {
    "name": "string"
  },
  "editing.guard.example_link_required": {
    "name": "string"
  },
  "editing.guard.example_missing": {
    "name": "string"
  },
  "editing.guard.example_no_link": {
    "name": "string"
  },
  "editing.guard.example_property_required": {
    "name": "string"
  },
  "editing.guard.example_required_datatype": {
    "datatype": "string",
    "name": "string"
  },
  "editing.guard.example_target_class": {
    "class_name": "string",
    "property": "string",
    "target": "string"
  },
  "editing.guard.example_value_exists": {
    "name": "string",
    "property": "string"
  },
  "editing.guard.example_value_missing": {
    "name": "string",
    "property": "string"
  },
  "editing.guard.example_value_type": {
    "datatype": "string",
    "name": "string"
  },
  "editing.guard.field_language_required": {
    "field": "parts"
  },
  "editing.guard.field_nonnegative_integer": {
    "field": "parts"
  },
  "editing.guard.field_number_or_date": {
    "field": "parts"
  },
  "editing.guard.field_required": {
    "field": "parts"
  },
  "editing.guard.field_value_required": {
    "field": "parts"
  },
  "editing.guard.imported_parent": {
    "name": "string",
    "source": "string"
  },
  "editing.guard.imported_parent_unknown": {
    "name": "string"
  },
  "editing.guard.invalid_characteristic": {},
  "editing.guard.invalid_datatype": {
    "name": "string"
  },
  "editing.guard.invalid_iri": {
    "value": "string"
  },
  "editing.guard.invalid_language": {
    "language": "string"
  },
  "editing.guard.invalid_mapping": {},
  "editing.guard.inverse_exists": {
    "inverse": "string",
    "name": "string"
  },
  "editing.guard.inverse_missing": {
    "name": "string"
  },
  "editing.guard.inverse_wrong_kind": {
    "name": "string"
  },
  "editing.guard.iri_in_use": {
    "name": "string"
  },
  "editing.guard.mapping_concept_missing": {
    "name": "string"
  },
  "editing.guard.mapping_exists": {
    "name": "string"
  },
  "editing.guard.mapping_missing": {
    "name": "string"
  },
  "editing.guard.mapping_self": {
    "name": "string"
  },
  "editing.guard.missing_import_reference": {
    "field": "parts",
    "name": "string"
  },
  "editing.guard.missing_own_reference": {
    "field": "parts",
    "name": "string"
  },
  "editing.guard.missing_to_annotate": {
    "name": "string"
  },
  "editing.guard.missing_to_change": {
    "name": "string"
  },
  "editing.guard.missing_to_delete": {
    "name": "string"
  },
  "editing.guard.missing_to_rename": {
    "name": "string"
  },
  "editing.guard.not_common_parent": {
    "classes": "parts",
    "name": "string"
  },
  "editing.guard.not_concept": {
    "name": "string"
  },
  "editing.guard.not_own_property": {
    "name": "string"
  },
  "editing.guard.not_own_relationship": {
    "name": "string"
  },
  "editing.guard.own_class_missing": {
    "name": "string"
  },
  "editing.guard.pattern_invalid": {},
  "editing.guard.pref_label_language": {
    "language": "string",
    "name": "string"
  },
  "editing.guard.pref_label_plain": {
    "name": "string"
  },
  "editing.guard.primary_concept_name": {
    "language": "string"
  },
  "editing.guard.primary_name_required": {
    "language": "string"
  },
  "editing.guard.property_exists": {
    "kind": "parts",
    "name": "string"
  },
  "editing.guard.property_exists_domain": {
    "classes": "parts",
    "kind": "parts",
    "name": "string"
  },
  "editing.guard.property_kind_conflict": {
    "existing_kind": "parts",
    "name": "string",
    "new_kind": "parts"
  },
  "editing.guard.property_missing": {
    "name": "string"
  },
  "editing.guard.property_parent_kind": {
    "kind": "parts",
    "name": "string"
  },
  "editing.guard.related_exists": {
    "concept": "string",
    "related": "string"
  },
  "editing.guard.related_missing": {
    "concept": "string",
    "related": "string"
  },
  "editing.guard.relationship_missing": {
    "name": "string"
  },
  "editing.guard.rule_class_required": {
    "name": "string"
  },
  "editing.guard.rule_datatype_required": {
    "name": "string"
  },
  "editing.guard.rule_gone": {
    "name": "string"
  },
  "editing.guard.rule_missing_model": {
    "name": "string"
  },
  "editing.guard.rule_property_required": {
    "name": "string"
  },
  "editing.guard.self_link": {
    "field": "parts"
  },
  "editing.guard.shape_message_missing": {
    "name": [
      "string",
      "parts"
    ]
  },
  "editing.guard.shape_path_exists": {
    "path": "parts"
  },
  "editing.guard.shape_path_missing_change": {
    "name": [
      "string",
      "parts"
    ]
  },
  "editing.guard.shape_path_missing_remove": {
    "name": [
      "string",
      "parts"
    ]
  },
  "editing.guard.shape_readonly": {
    "count": "number",
    "name": [
      "string",
      "parts"
    ]
  },
  "editing.guard.shape_target_missing": {
    "name": "string"
  },
  "editing.guard.share_already_direct": {
    "class_name": "string",
    "name": "string"
  },
  "editing.guard.share_already_inherited": {
    "class_name": "string",
    "name": "string",
    "parent": "string"
  },
  "editing.guard.share_class_missing": {
    "name": "string"
  },
  "editing.guard.share_class_required": {
    "name": "string"
  },
  "editing.guard.share_expression": {
    "name": "string"
  },
  "editing.guard.share_method_required": {
    "name": "string"
  },
  "editing.guard.share_separate": {
    "classes": "parts",
    "name": "string"
  },
  "editing.guard.shared_parent_cycle": {
    "member": "string",
    "parent": "string"
  },
  "editing.guard.shared_parent_is_member": {
    "name": "string"
  },
  "editing.guard.subclass_exists": {
    "child": "string",
    "parent": "string"
  },
  "editing.guard.subclass_missing": {
    "child": "string",
    "parent": "string"
  },
  "editing.guard.subproperty_exists": {
    "child": "string",
    "parent": "string"
  },
  "editing.guard.subproperty_missing": {
    "child": "string",
    "parent": "string"
  },
  "editing.guard.swap_missing_ends": {
    "name": "string"
  },
  "editing.guard.swap_same_class": {
    "name": "string"
  },
  "editing.guard.swap_shared_start": {
    "name": "string"
  },
  "editing.guard.union_requires_owl": {
    "classes": "parts"
  },
  "editing.guard.unknown_command": {
    "name": "string"
  },
  "editing.guard.unshare_not_member": {
    "class_name": "string",
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
  "export.graph_limit": {
    "bytes": [
      "number",
      "string"
    ],
    "limit": [
      "number",
      "string"
    ]
  },
  "export.node_limit": {
    "count": [
      "number",
      "string"
    ],
    "limit": [
      "number",
      "string"
    ]
  },
  "export.page_limit": {
    "bytes": [
      "number",
      "string"
    ],
    "limit": [
      "number",
      "string"
    ]
  },
  "export.source_limit": {
    "bytes": [
      "number",
      "string"
    ],
    "limit": [
      "number",
      "string"
    ]
  },
  "export.term_limit": {
    "count": [
      "number",
      "string"
    ],
    "limit": [
      "number",
      "string"
    ]
  },
  "export.too_frequent": {},
  "export.zip_limit": {
    "bytes": [
      "number",
      "string"
    ],
    "limit": [
      "number",
      "string"
    ]
  },
  "fetch.connection_failed": {
    "url": "string"
  },
  "fetch.github_enterprise": {},
  "fetch.http_failed": {
    "status": "number",
    "url": "string"
  },
  "fetch.redirect_limit": {
    "limit": [
      "number",
      "string"
    ],
    "url": "string"
  },
  "fetch.redirect_missing": {
    "url": "string"
  },
  "fetch.response_limit": {
    "limit": [
      "number",
      "string"
    ],
    "url": "string"
  },
  "fetch.time_limit": {
    "url": "string"
  },
  "fetch.web_only": {},
  "imports.bundled_changed": {
    "title": "string"
  },
  "imports.bytes_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "imports.bytes_refused": {
    "limit": [
      "number",
      "string"
    ]
  },
  "imports.cache_changed": {},
  "imports.cache_failed": {},
  "imports.depth_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "imports.depth_refused": {
    "limit": [
      "number",
      "string"
    ]
  },
  "imports.document_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "imports.document_refused": {
    "limit": [
      "number",
      "string"
    ]
  },
  "imports.http_failed": {
    "status": "number"
  },
  "imports.parse_failed": {},
  "imports.permission_required": {
    "host": "string"
  },
  "imports.source_gone": {},
  "imports.stopped": {},
  "imports.total_file_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "load.already_running": {},
  "load.cancelled": {},
  "load.empty_file": {},
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
  "network.address_refused": {},
  "network.approval.declined": {
    "hosts": "parts"
  },
  "network.grant_missing": {},
  "network.host_blocked": {
    "host": "string"
  },
  "network.host_unresolvable": {},
  "network.invalid_host": {},
  "network.offline": {},
  "network.reason.context": {},
  "network.reason.fetch": {},
  "network.reason.import_many": {
    "count": [
      "number",
      "string"
    ],
    "name": "string"
  },
  "network.reason.import_one": {
    "name": "string"
  },
  "network.reason.redirect": {
    "host": "string"
  },
  "network.reason.service": {},
  "network.redirect_refused": {},
  "network.sends.context": {},
  "network.sends.fetch": {},
  "network.sends.import": {},
  "network.sends.service": {},
  "network.unknown_capability": {
    "capability": "string"
  },
  "ontology.choose_other": {},
  "ontology.entity_not_drawn": {
    "iri": "string"
  },
  "ontology.library_missing": {},
  "ontology.no_statements": {
    "iri": "string"
  },
  "ontology.not_found": {},
  "ontology.source_missing": {},
  "parse.file_timeout": {
    "seconds": "number"
  },
  "parse.invalid_json": {},
  "parse.invalid_json_line": {
    "line": "number"
  },
  "parse.malformed_xml": {},
  "parse.malformed_xml_line": {
    "line": "number"
  },
  "parse.missing_stop": {
    "line": "number"
  },
  "parse.not_rdf": {},
  "parse.not_rdf_table": {},
  "parse.syntax": {
    "format": "string",
    "line": [
      "number",
      "null"
    ]
  },
  "parse.syntax_without_line": {
    "format": "string"
  },
  "parse.text_timeout": {
    "seconds": "number"
  },
  "parse.unclosed_text": {
    "line": "number"
  },
  "parse.undeclared_prefix": {
    "line": "number",
    "prefix": "string"
  },
  "parse.unfinished_file": {},
  "parse.unreadable": {
    "format": "string"
  },
  "parse.unreadable_line": {
    "format": "string",
    "line": "number"
  },
  "project.document_not_found": {},
  "project.not_found": {},
  "project.not_open": {},
  "project.snapshot_not_found": {},
  "project.unsaved": {},
  "projects.base_iri": {},
  "projects.document_kind": {},
  "projects.kind": {},
  "projects.language": {
    "language": "string"
  },
  "projects.layout_key": {
    "limit": "number"
  },
  "projects.layout_limit": {
    "limit": "number"
  },
  "projects.layout_object": {},
  "projects.name_limit": {
    "limit": "number"
  },
  "projects.name_required": {},
  "projects.position": {},
  "projects.positions_object": {},
  "projects.prefix": {},
  "projects.shapes_exists": {},
  "projects.shown": {},
  "projects.template": {
    "name": "string"
  },
  "projects.viewport": {},
  "query.builder_required": {},
  "query.evaluation_failed": {},
  "query.name_required": {},
  "query.node_not_queryable": {},
  "query.not_found": {},
  "query.parse_failed": {},
  "query.select_only": {},
  "query.still_stopping": {},
  "query.time_limit": {
    "seconds": "number"
  },
  "query.too_deep": {
    "limit": [
      "number",
      "string"
    ]
  },
  "reasoning.already_running": {},
  "reasoning.characteristic.asymmetric": {
    "s": "parts"
  },
  "reasoning.characteristic.functional": {
    "s": "parts"
  },
  "reasoning.characteristic.inverse_functional": {
    "s": "parts"
  },
  "reasoning.characteristic.irreflexive": {
    "s": "parts"
  },
  "reasoning.characteristic.symmetric": {
    "s": "parts"
  },
  "reasoning.characteristic.transitive": {
    "s": "parts"
  },
  "reasoning.definition": {
    "expression": "parts",
    "name": "parts"
  },
  "reasoning.definition.maximum_one": {
    "p": "parts",
    "x": "parts"
  },
  "reasoning.definition.only": {
    "o": "parts",
    "p": "parts"
  },
  "reasoning.definition.only_owned": {
    "name": "parts",
    "o": "parts",
    "p": "parts"
  },
  "reasoning.definition.value": {
    "name": "parts",
    "o": "parts",
    "p": "parts"
  },
  "reasoning.fact.different": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.disjoint": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.domain": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.equivalent": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.inverse": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.kind": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.link": {
    "o": "parts",
    "p": "parts",
    "s": "parts"
  },
  "reasoning.fact.range": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.same": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact.type": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.fact_missing": {},
  "reasoning.fact_required": {},
  "reasoning.failed": {},
  "reasoning.group_missing": {},
  "reasoning.not_run": {},
  "reasoning.ontology_only": {},
  "reasoning.problem.asymmetric": {
    "first": "parts",
    "property": "parts",
    "second": "parts"
  },
  "reasoning.problem.different_same": {
    "first": "parts",
    "second": "parts"
  },
  "reasoning.problem.disjoint_member": {
    "first": "parts",
    "second": "parts",
    "subject": "parts"
  },
  "reasoning.problem.engine": {},
  "reasoning.problem.irreflexive": {
    "property": "parts",
    "subject": "parts"
  },
  "reasoning.problem.never.both": {
    "first": "parts",
    "name": "parts",
    "second": "parts"
  },
  "reasoning.problem.never.parent": {
    "first": "parts",
    "name": "parts",
    "second": "parts"
  },
  "reasoning.problem.never.self": {
    "name": "parts"
  },
  "reasoning.problem.never.unknown": {
    "name": "parts"
  },
  "reasoning.reason.definition_kind": {
    "expression": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.definition_member": {
    "expression": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.domain": {
    "o": "parts",
    "p": "parts",
    "s": "parts",
    "y": "parts"
  },
  "reasoning.reason.equivalent_chain": {
    "m": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.equivalent_property_link": {
    "o": "parts",
    "p": "parts",
    "q": "parts",
    "s": "parts"
  },
  "reasoning.reason.functional": {
    "o": "parts",
    "p": "parts",
    "s": "parts",
    "x": "parts"
  },
  "reasoning.reason.has_value": {
    "k": "parts",
    "o": "parts",
    "p": "parts",
    "s": "parts"
  },
  "reasoning.reason.inverse_functional": {
    "o": "parts",
    "p": "parts",
    "s": "parts",
    "y": "parts"
  },
  "reasoning.reason.inverse_link": {
    "o": "parts",
    "p": "parts",
    "q": "parts",
    "s": "parts"
  },
  "reasoning.reason.kind_chain": {
    "m": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.kind_equivalent": {
    "m": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.maximum_one": {
    "o": "parts",
    "p": "parts",
    "s": "parts",
    "x": "parts"
  },
  "reasoning.reason.member_equivalent": {
    "k": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.member_kind": {
    "k": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.mutual_kind": {
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.only": {
    "o": "parts",
    "p": "parts",
    "s": "parts",
    "x": "parts"
  },
  "reasoning.reason.only_owned": {
    "k": "parts",
    "o": "parts",
    "p": "parts",
    "s": "parts",
    "x": "parts"
  },
  "reasoning.reason.range": {
    "o": "parts",
    "p": "parts",
    "s": "parts",
    "y": "parts"
  },
  "reasoning.reason.same_chain": {
    "m": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.same_member": {
    "m": "parts",
    "o": "parts",
    "s": "parts"
  },
  "reasoning.reason.same_object_link": {
    "m": "parts",
    "o": "parts",
    "p": "parts",
    "s": "parts"
  },
  "reasoning.reason.same_subject_link": {
    "m": "parts",
    "o": "parts",
    "p": "parts",
    "s": "parts"
  },
  "reasoning.reason.stated": {
    "o": "parts",
    "p": "parts",
    "s": "parts"
  },
  "reasoning.reason.subproperty_link": {
    "o": "parts",
    "p": "parts",
    "q": "parts",
    "s": "parts"
  },
  "reasoning.reason.symmetric_link": {
    "o": "parts",
    "p": "parts",
    "s": "parts"
  },
  "reasoning.reason.transitive_link": {
    "m": "parts",
    "o": "parts",
    "p": "parts",
    "s": "parts"
  },
  "reasoning.reason.unsupported": {},
  "reasoning.result.unknown": {},
  "reasoning.stopped": {},
  "reasoning.timeout": {
    "seconds": "number"
  },
  "reasoning.too_large": {
    "count": "number",
    "limit": "number"
  },
  "request.body_json": {},
  "request.body_object": {},
  "request.field_json": {
    "field": "string"
  },
  "request.field_object": {
    "field": "string"
  },
  "request.file_limit": {
    "limit": [
      "number",
      "string"
    ],
    "variable": "string"
  },
  "request.foreign_host": {},
  "request.foreign_page": {},
  "request.invalid": {},
  "request.layout_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "request.nodes_limit": {
    "limit": [
      "number",
      "string"
    ]
  },
  "request.source_body": {},
  "rml.class_limit": {
    "limit": "number"
  },
  "rml.columns_missing": {
    "columns": "parts"
  },
  "rml.delimiter": {},
  "rml.encoding": {
    "encoding": "string"
  },
  "rml.field_missing": {
    "property": "string"
  },
  "rml.field_multiple": {
    "count": "number",
    "property": "string"
  },
  "rml.formulation": {
    "name": "string"
  },
  "rml.header": {},
  "rml.language_datatype": {},
  "rml.map_count": {
    "count": "number"
  },
  "rml.object_source": {},
  "rml.pair_limit": {
    "limit": "number"
  },
  "rml.predicate_iri": {},
  "rml.predicate_object": {},
  "rml.source": {
    "name": "string",
    "source": "string"
  },
  "rml.subject_iri": {
    "iri": "string"
  },
  "rml.syntax": {},
  "rml.template_close": {
    "template": "string"
  },
  "rml.template_open": {
    "template": "string"
  },
  "rml.unsupported": {
    "name": "string"
  },
  "service.address_refused": {
    "host": "string"
  },
  "service.connection_failed": {
    "host": "string"
  },
  "service.endpoint_not_public": {
    "endpoint": "string"
  },
  "service.fixed_endpoint": {},
  "service.host_unresolvable": {
    "host": "string"
  },
  "service.http_failed": {
    "host": "string",
    "status": "number"
  },
  "service.invalid_cell": {
    "host": "string"
  },
  "service.invalid_datatype": {
    "host": "string"
  },
  "service.invalid_language": {
    "host": "string"
  },
  "service.invalid_results": {
    "host": "string"
  },
  "service.invalid_row": {
    "host": "string"
  },
  "service.nested": {},
  "service.redirect_refused": {
    "host": "string"
  },
  "service.response_limit": {
    "host": "string",
    "limit": [
      "number",
      "string"
    ]
  },
  "service.runner_required": {},
  "service.time_limit": {
    "host": "string",
    "seconds": "number"
  },
  "service.too_many_blocks": {
    "limit": [
      "number",
      "string"
    ]
  },
  "service.unknown_result_type": {
    "host": "string",
    "kind": "string"
  },
  "service.unmatched": {},
  "shape.readonly.additional_types": {
    "types": "parts"
  },
  "shape.readonly.allowed_list": {},
  "shape.readonly.allowed_type": {},
  "shape.readonly.class_expression": {},
  "shape.readonly.datatype": {
    "datatype": "string"
  },
  "shape.readonly.duplicate_path": {
    "path": "parts"
  },
  "shape.readonly.language_list": {},
  "shape.readonly.multiple_messages": {
    "count": "number"
  },
  "shape.readonly.multiple_targets": {
    "count": "number"
  },
  "shape.readonly.path": {},
  "shape.readonly.precision": {
    "predicate": "string",
    "value": "string"
  },
  "shape.readonly.predicate_value": {
    "predicate": "string"
  },
  "shape.readonly.rule_reference": {
    "rule": "string"
  },
  "shape.readonly.rule_severity": {},
  "shape.readonly.severity": {
    "severity": "string"
  },
  "shape.readonly.target_expression": {},
  "shape.readonly.unknown": {},
  "shape.readonly.uses_predicate": {
    "predicate": "string"
  },
  "snapshots.choices_object": {},
  "snapshots.choose_sheet": {},
  "snapshots.class_required": {},
  "snapshots.column_missing": {
    "name": "string"
  },
  "snapshots.column_property": {
    "name": "string"
  },
  "snapshots.columns_object": {},
  "snapshots.mapping_syntax": {},
  "snapshots.mapping_text": {},
  "snapshots.model_class": {},
  "snapshots.one_name": {},
  "snapshots.refresh.class_limit": {
    "limit": "number"
  },
  "snapshots.refresh.columns_missing": {
    "columns": "parts"
  },
  "snapshots.refresh.delimiter": {},
  "snapshots.refresh.encoding": {
    "encoding": "string"
  },
  "snapshots.refresh.field_missing": {
    "property": "string"
  },
  "snapshots.refresh.field_multiple": {
    "count": "number",
    "property": "string"
  },
  "snapshots.refresh.formulation": {
    "name": "string"
  },
  "snapshots.refresh.header": {},
  "snapshots.refresh.language_datatype": {},
  "snapshots.refresh.map_count": {
    "count": "number"
  },
  "snapshots.refresh.object_source": {},
  "snapshots.refresh.pair_limit": {
    "limit": "number"
  },
  "snapshots.refresh.predicate_iri": {},
  "snapshots.refresh.predicate_object": {},
  "snapshots.refresh.source": {
    "name": "string",
    "source": "string"
  },
  "snapshots.refresh.subject_iri": {
    "iri": "string"
  },
  "snapshots.refresh.syntax": {},
  "snapshots.refresh.template_close": {
    "template": "string"
  },
  "snapshots.refresh.template_open": {
    "template": "string"
  },
  "snapshots.refresh.unsupported": {
    "name": "string"
  },
  "snapshots.refresh_encoding": {
    "encoding": "string"
  },
  "snapshots.refresh_mapping_refused": {},
  "snapshots.relationship_end": {
    "name": "string",
    "property": "string"
  },
  "snapshots.sample_file": {
    "limit": "number",
    "total": "number"
  },
  "snapshots.sample_sheet": {
    "limit": "number",
    "total": "number"
  },
  "snapshots.source_missing": {},
  "tabular.binary": {},
  "tabular.cell_limit": {
    "characters": "number",
    "column": "number",
    "limit": "number",
    "row": "number"
  },
  "tabular.column_limit": {
    "count": "number",
    "limit": "number"
  },
  "tabular.compression_limit": {
    "limit": "number",
    "ratio": "number"
  },
  "tabular.csv_syntax": {
    "row": "number"
  },
  "tabular.damaged_zip": {},
  "tabular.empty": {},
  "tabular.encoding": {
    "encoding": "string"
  },
  "tabular.entry_compression_limit": {
    "limit": "number",
    "name": "string",
    "ratio": "number"
  },
  "tabular.file_too_large": {
    "bytes": "number",
    "limit": "number"
  },
  "tabular.format.ods": {},
  "tabular.format.xls": {},
  "tabular.format.xlsb": {},
  "tabular.format.xlsm": {},
  "tabular.format.xltm": {},
  "tabular.header_empty": {
    "name": "string",
    "row": "number"
  },
  "tabular.header_row": {},
  "tabular.invalid_byte": {
    "encoding": "string",
    "position": "number"
  },
  "tabular.long_cell": {
    "limit": "number",
    "row": "number"
  },
  "tabular.no_sheets": {},
  "tabular.not_csv_encoding": {},
  "tabular.not_xlsx": {},
  "tabular.password": {},
  "tabular.separator": {},
  "tabular.sheet_cell_limit": {
    "characters": "number",
    "column": "number",
    "limit": "number",
    "name": "string",
    "row": "number"
  },
  "tabular.sheet_column_limit": {
    "column": "number",
    "limit": "number",
    "name": "string",
    "row": "number"
  },
  "tabular.sheet_empty": {
    "name": "string"
  },
  "tabular.sheet_missing": {
    "name": "string"
  },
  "tabular.unpacked_limit": {
    "bytes": "number",
    "limit": "number"
  },
  "tabular.unsafe_parser": {},
  "tabular.workbook_unreadable": {},
  "tabular.xml_declaration": {
    "name": "string"
  },
  "validation.min_count": {
    "count": "number",
    "name": "string"
  },
  "validation.shapes_refused": {},
  "validation.term": {
    "term": "parts"
  },
  "validation.unknown": {},
  "validation.violation.class": {
    "focus": "parts",
    "path": "parts",
    "qualifier": "parts",
    "value": "parts"
  },
  "validation.violation.datatype": {
    "datatype": [
      "string",
      "null"
    ],
    "focus": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.has_value": {
    "focus": "parts",
    "path": "parts",
    "wanted": "parts"
  },
  "validation.violation.in": {
    "allowed": "parts",
    "focus": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.language.allowed.tagged": {
    "allowed": "parts",
    "focus": "parts",
    "language": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.language.allowed.untagged": {
    "allowed": "parts",
    "focus": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.language.project.tagged": {
    "allowed": "parts",
    "focus": "parts",
    "language": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.language.project.untagged": {
    "allowed": "parts",
    "focus": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.max_count.attribute": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts"
  },
  "validation.violation.max_count.relationship": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts"
  },
  "validation.violation.max_inclusive": {
    "bound": "parts",
    "focus": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.max_length": {
    "focus": "parts",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.min_count.attribute": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts"
  },
  "validation.violation.min_count.relationship": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts"
  },
  "validation.violation.min_inclusive": {
    "bound": "parts",
    "focus": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.min_length": {
    "focus": "parts",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.other": {
    "focus": "parts",
    "path": "parts",
    "rule": "parts"
  },
  "validation.violation.pattern": {
    "focus": "parts",
    "path": "parts",
    "value": "parts"
  },
  "validation.violation.qualified.max.class": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts",
    "qualifier": "parts"
  },
  "validation.violation.qualified.max.datatype": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts",
    "qualifier": "parts"
  },
  "validation.violation.qualified.min.class": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts",
    "qualifier": "parts"
  },
  "validation.violation.qualified.min.datatype": {
    "focus": "parts",
    "have": "number",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts",
    "qualifier": "parts"
  },
  "validation.violation.qualified_language": {
    "focus": "parts",
    "language": "parts",
    "limit": [
      "number",
      "string",
      "null"
    ],
    "path": "parts"
  },
  "validation.violation.unique_language": {
    "focus": "parts",
    "path": "parts"
  },
  "validation.violation.unique_language.many": {
    "count": "number",
    "focus": "parts",
    "languages": "parts",
    "path": "parts"
  },
  "validation.violation.unique_language.one": {
    "count": "number",
    "focus": "parts",
    "language": "parts",
    "path": "parts"
  },
  "words.characteristic.asymmetric": {},
  "words.characteristic.functional": {},
  "words.characteristic.functionalAttribute": {},
  "words.characteristic.inverseFunctional": {},
  "words.characteristic.irreflexive": {},
  "words.characteristic.reflexive": {},
  "words.characteristic.symmetric": {},
  "words.characteristic.transitive": {},
  "words.editing.the_shape": {},
  "words.field.allowed_languages": {},
  "words.field.annotation_property": {},
  "words.field.attribute_relationship": {},
  "words.field.boundary": {},
  "words.field.broader": {},
  "words.field.child": {},
  "words.field.comment": {},
  "words.field.datatype": {},
  "words.field.domain": {},
  "words.field.end": {},
  "words.field.entity": {},
  "words.field.filler": {},
  "words.field.iri": {},
  "words.field.label": {},
  "words.field.link": {},
  "words.field.mapping_target": {},
  "words.field.max_count": {},
  "words.field.max_length": {},
  "words.field.maximum": {},
  "words.field.min_count": {},
  "words.field.min_length": {},
  "words.field.minimum": {},
  "words.field.name_languages": {},
  "words.field.new_iri": {},
  "words.field.parent": {},
  "words.field.parent_class": {},
  "words.field.path": {},
  "words.field.range": {},
  "words.field.related": {},
  "words.field.relationship_attribute": {},
  "words.field.rename_iri": {},
  "words.field.start": {},
  "words.field.thing": {},
  "words.field.value": {},
  "words.field.value_type": {},
  "words.host_separator": {},
  "words.kind.annotationProperty": {},
  "words.kind.class": {},
  "words.kind.concept": {},
  "words.kind.conceptScheme": {},
  "words.kind.datatypeProperty": {},
  "words.kind.entity": {},
  "words.kind.example": {},
  "words.kind.objectProperty": {},
  "words.kind.property": {},
  "words.language.ar": {},
  "words.language.ca": {},
  "words.language.cs": {},
  "words.language.da": {},
  "words.language.de": {},
  "words.language.el": {},
  "words.language.en": {},
  "words.language.es": {},
  "words.language.fi": {},
  "words.language.fr": {},
  "words.language.he": {},
  "words.language.hi": {},
  "words.language.hu": {},
  "words.language.it": {},
  "words.language.ja": {},
  "words.language.ko": {},
  "words.language.la": {},
  "words.language.nb": {},
  "words.language.nl": {},
  "words.language.no": {},
  "words.language.pl": {},
  "words.language.pt": {},
  "words.language.ro": {},
  "words.language.ru": {},
  "words.language.sv": {},
  "words.language.tr": {},
  "words.language.uk": {},
  "words.language.zh": {},
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
  "words.reasoning.any_value": {},
  "words.reasoning.condition_separator": {},
  "words.reasoning.intersection": {},
  "words.reasoning.minimum_one": {},
  "words.reasoning.rule_value": {},
  "words.reasoning.stated_rule": {},
  "words.reasoning.unnamed": {},
  "words.severity.violation": {},
  "words.severity.warning": {},
  "words.validation.missing_value": {},
  "words.validation.no_allowed_languages": {},
  "words.validation.no_allowed_values": {},
  "words.validation.required_class": {},
  "words.validation.this_shape": {},
  "words.validation.unnamed_node": {},
  "words.validation.unnamed_shape": {}
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
  "context.address_refused": { "url": string };
  "context.fetch_failed": { "url": string };
  "context.response_limit": { "limit": number | string; "url": string };
  "data.change_required": undefined;
  "data.file_limit": { "limit": number | string };
  "data.file_required": undefined;
  "data.mapping_limit": { "limit": number | string };
  "data.new_file_required": undefined;
  "data.read_timeout": { "seconds": number };
  "data.source_required": undefined;
  "editing.guard.annotation_exists": { "name": string; "property": string };
  "editing.guard.annotation_missing_remove": { "name": string; "property": string };
  "editing.guard.annotation_missing_replace": { "name": string; "property": string };
  "editing.guard.attribute_characteristic": { "name": string };
  "editing.guard.attribute_not_relationship": { "name": string };
  "editing.guard.attribute_rule_kind": { "name": string };
  "editing.guard.broader_exists": { "broader": string; "concept": string };
  "editing.guard.broader_missing": { "broader": string; "concept": string };
  "editing.guard.characteristic_exists": { "characteristic": string; "name": string };
  "editing.guard.characteristic_missing": { "characteristic": string; "name": string };
  "editing.guard.check_exists": { "name": string };
  "editing.guard.check_path_conflict": { "name": string; "path": string };
  "editing.guard.class_rule_exists": { "name": string };
  "editing.guard.clear_missing_end": { "field": string; "name": string };
  "editing.guard.count_bounds_conflict": { "high": number; "low": number };
  "editing.guard.disjoint_exists": { "first": string; "second": string };
  "editing.guard.disjoint_group_readonly": { "first": string; "second": string };
  "editing.guard.disjoint_missing": { "first": string; "second": string };
  "editing.guard.empty_field": { "field": string };
  "editing.guard.equivalent_exists": { "first": string; "second": string };
  "editing.guard.equivalent_missing": { "first": string; "second": string };
  "editing.guard.example_class_required": { "name": string };
  "editing.guard.example_invalid_typed_value": { "datatype": string; "value": string };
  "editing.guard.example_language_text": { "name": string };
  "editing.guard.example_link_required": { "name": string };
  "editing.guard.example_missing": { "name": string };
  "editing.guard.example_no_link": { "name": string };
  "editing.guard.example_property_required": { "name": string };
  "editing.guard.example_required_datatype": { "datatype": string; "name": string };
  "editing.guard.example_target_class": { "class_name": string; "property": string; "target": string };
  "editing.guard.example_value_exists": { "name": string; "property": string };
  "editing.guard.example_value_missing": { "name": string; "property": string };
  "editing.guard.example_value_type": { "datatype": string; "name": string };
  "editing.guard.field_language_required": { "field": string };
  "editing.guard.field_nonnegative_integer": { "field": string };
  "editing.guard.field_number_or_date": { "field": string };
  "editing.guard.field_required": { "field": string };
  "editing.guard.field_value_required": { "field": string };
  "editing.guard.imported_parent": { "name": string; "source": string };
  "editing.guard.imported_parent_unknown": { "name": string };
  "editing.guard.invalid_characteristic": undefined;
  "editing.guard.invalid_datatype": { "name": string };
  "editing.guard.invalid_iri": { "value": string };
  "editing.guard.invalid_language": { "language": string };
  "editing.guard.invalid_mapping": undefined;
  "editing.guard.inverse_exists": { "inverse": string; "name": string };
  "editing.guard.inverse_missing": { "name": string };
  "editing.guard.inverse_wrong_kind": { "name": string };
  "editing.guard.iri_in_use": { "name": string };
  "editing.guard.mapping_concept_missing": { "name": string };
  "editing.guard.mapping_exists": { "name": string };
  "editing.guard.mapping_missing": { "name": string };
  "editing.guard.mapping_self": { "name": string };
  "editing.guard.missing_import_reference": { "field": string; "name": string };
  "editing.guard.missing_own_reference": { "field": string; "name": string };
  "editing.guard.missing_to_annotate": { "name": string };
  "editing.guard.missing_to_change": { "name": string };
  "editing.guard.missing_to_delete": { "name": string };
  "editing.guard.missing_to_rename": { "name": string };
  "editing.guard.not_common_parent": { "classes": string; "name": string };
  "editing.guard.not_concept": { "name": string };
  "editing.guard.not_own_property": { "name": string };
  "editing.guard.not_own_relationship": { "name": string };
  "editing.guard.own_class_missing": { "name": string };
  "editing.guard.pattern_invalid": undefined;
  "editing.guard.pref_label_language": { "language": string; "name": string };
  "editing.guard.pref_label_plain": { "name": string };
  "editing.guard.primary_concept_name": { "language": string };
  "editing.guard.primary_name_required": { "language": string };
  "editing.guard.property_exists": { "kind": string; "name": string };
  "editing.guard.property_exists_domain": { "classes": string; "kind": string; "name": string };
  "editing.guard.property_kind_conflict": { "existing_kind": string; "name": string; "new_kind": string };
  "editing.guard.property_missing": { "name": string };
  "editing.guard.property_parent_kind": { "kind": string; "name": string };
  "editing.guard.related_exists": { "concept": string; "related": string };
  "editing.guard.related_missing": { "concept": string; "related": string };
  "editing.guard.relationship_missing": { "name": string };
  "editing.guard.rule_class_required": { "name": string };
  "editing.guard.rule_datatype_required": { "name": string };
  "editing.guard.rule_gone": { "name": string };
  "editing.guard.rule_missing_model": { "name": string };
  "editing.guard.rule_property_required": { "name": string };
  "editing.guard.self_link": { "field": string };
  "editing.guard.shape_message_missing": { "name": string };
  "editing.guard.shape_path_exists": { "path": string };
  "editing.guard.shape_path_missing_change": { "name": string };
  "editing.guard.shape_path_missing_remove": { "name": string };
  "editing.guard.shape_readonly": { "count": number; "name": string };
  "editing.guard.shape_target_missing": { "name": string };
  "editing.guard.share_already_direct": { "class_name": string; "name": string };
  "editing.guard.share_already_inherited": { "class_name": string; "name": string; "parent": string };
  "editing.guard.share_class_missing": { "name": string };
  "editing.guard.share_class_required": { "name": string };
  "editing.guard.share_expression": { "name": string };
  "editing.guard.share_method_required": { "name": string };
  "editing.guard.share_separate": { "classes": string; "name": string };
  "editing.guard.shared_parent_cycle": { "member": string; "parent": string };
  "editing.guard.shared_parent_is_member": { "name": string };
  "editing.guard.subclass_exists": { "child": string; "parent": string };
  "editing.guard.subclass_missing": { "child": string; "parent": string };
  "editing.guard.subproperty_exists": { "child": string; "parent": string };
  "editing.guard.subproperty_missing": { "child": string; "parent": string };
  "editing.guard.swap_missing_ends": { "name": string };
  "editing.guard.swap_same_class": { "name": string };
  "editing.guard.swap_shared_start": { "name": string };
  "editing.guard.union_requires_owl": { "classes": string };
  "editing.guard.unknown_command": { "name": string };
  "editing.guard.unshare_not_member": { "class_name": string; "name": string };
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
  "export.graph_limit": { "bytes": number | string; "limit": number | string };
  "export.node_limit": { "count": number | string; "limit": number | string };
  "export.page_limit": { "bytes": number | string; "limit": number | string };
  "export.source_limit": { "bytes": number | string; "limit": number | string };
  "export.term_limit": { "count": number | string; "limit": number | string };
  "export.too_frequent": undefined;
  "export.zip_limit": { "bytes": number | string; "limit": number | string };
  "fetch.connection_failed": { "url": string };
  "fetch.github_enterprise": undefined;
  "fetch.http_failed": { "status": number; "url": string };
  "fetch.redirect_limit": { "limit": number | string; "url": string };
  "fetch.redirect_missing": { "url": string };
  "fetch.response_limit": { "limit": number | string; "url": string };
  "fetch.time_limit": { "url": string };
  "fetch.web_only": undefined;
  "imports.bundled_changed": { "title": string };
  "imports.bytes_limit": { "limit": number | string };
  "imports.bytes_refused": { "limit": number | string };
  "imports.cache_changed": undefined;
  "imports.cache_failed": undefined;
  "imports.depth_limit": { "limit": number | string };
  "imports.depth_refused": { "limit": number | string };
  "imports.document_limit": { "limit": number | string };
  "imports.document_refused": { "limit": number | string };
  "imports.http_failed": { "status": number };
  "imports.parse_failed": undefined;
  "imports.permission_required": { "host": string };
  "imports.source_gone": undefined;
  "imports.stopped": undefined;
  "imports.total_file_limit": { "limit": number | string };
  "load.already_running": undefined;
  "load.cancelled": undefined;
  "load.empty_file": undefined;
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
  "network.address_refused": undefined;
  "network.approval.declined": { "hosts": string };
  "network.grant_missing": undefined;
  "network.host_blocked": { "host": string };
  "network.host_unresolvable": undefined;
  "network.invalid_host": undefined;
  "network.offline": undefined;
  "network.reason.context": undefined;
  "network.reason.fetch": undefined;
  "network.reason.import_many": { "count": number | string; "name": string };
  "network.reason.import_one": { "name": string };
  "network.reason.redirect": { "host": string };
  "network.reason.service": undefined;
  "network.redirect_refused": undefined;
  "network.sends.context": undefined;
  "network.sends.fetch": undefined;
  "network.sends.import": undefined;
  "network.sends.service": undefined;
  "network.unknown_capability": { "capability": string };
  "ontology.choose_other": undefined;
  "ontology.entity_not_drawn": { "iri": string };
  "ontology.library_missing": undefined;
  "ontology.no_statements": { "iri": string };
  "ontology.not_found": undefined;
  "ontology.source_missing": undefined;
  "parse.file_timeout": { "seconds": number };
  "parse.invalid_json": undefined;
  "parse.invalid_json_line": { "line": number };
  "parse.malformed_xml": undefined;
  "parse.malformed_xml_line": { "line": number };
  "parse.missing_stop": { "line": number };
  "parse.not_rdf": undefined;
  "parse.not_rdf_table": undefined;
  "parse.syntax": { "format": string; "line": number | null };
  "parse.syntax_without_line": { "format": string };
  "parse.text_timeout": { "seconds": number };
  "parse.unclosed_text": { "line": number };
  "parse.undeclared_prefix": { "line": number; "prefix": string };
  "parse.unfinished_file": undefined;
  "parse.unreadable": { "format": string };
  "parse.unreadable_line": { "format": string; "line": number };
  "project.document_not_found": undefined;
  "project.not_found": undefined;
  "project.not_open": undefined;
  "project.snapshot_not_found": undefined;
  "project.unsaved": undefined;
  "projects.base_iri": undefined;
  "projects.document_kind": undefined;
  "projects.kind": undefined;
  "projects.language": { "language": string };
  "projects.layout_key": { "limit": number };
  "projects.layout_limit": { "limit": number };
  "projects.layout_object": undefined;
  "projects.name_limit": { "limit": number };
  "projects.name_required": undefined;
  "projects.position": undefined;
  "projects.positions_object": undefined;
  "projects.prefix": undefined;
  "projects.shapes_exists": undefined;
  "projects.shown": undefined;
  "projects.template": { "name": string };
  "projects.viewport": undefined;
  "query.builder_required": undefined;
  "query.evaluation_failed": undefined;
  "query.name_required": undefined;
  "query.node_not_queryable": undefined;
  "query.not_found": undefined;
  "query.parse_failed": undefined;
  "query.select_only": undefined;
  "query.still_stopping": undefined;
  "query.time_limit": { "seconds": number };
  "query.too_deep": { "limit": number | string };
  "reasoning.already_running": undefined;
  "reasoning.characteristic.asymmetric": { "s": string };
  "reasoning.characteristic.functional": { "s": string };
  "reasoning.characteristic.inverse_functional": { "s": string };
  "reasoning.characteristic.irreflexive": { "s": string };
  "reasoning.characteristic.symmetric": { "s": string };
  "reasoning.characteristic.transitive": { "s": string };
  "reasoning.definition": { "expression": string; "name": string };
  "reasoning.definition.maximum_one": { "p": string; "x": string };
  "reasoning.definition.only": { "o": string; "p": string };
  "reasoning.definition.only_owned": { "name": string; "o": string; "p": string };
  "reasoning.definition.value": { "name": string; "o": string; "p": string };
  "reasoning.fact.different": { "o": string; "s": string };
  "reasoning.fact.disjoint": { "o": string; "s": string };
  "reasoning.fact.domain": { "o": string; "s": string };
  "reasoning.fact.equivalent": { "o": string; "s": string };
  "reasoning.fact.inverse": { "o": string; "s": string };
  "reasoning.fact.kind": { "o": string; "s": string };
  "reasoning.fact.link": { "o": string; "p": string; "s": string };
  "reasoning.fact.range": { "o": string; "s": string };
  "reasoning.fact.same": { "o": string; "s": string };
  "reasoning.fact.type": { "o": string; "s": string };
  "reasoning.fact_missing": undefined;
  "reasoning.fact_required": undefined;
  "reasoning.failed": undefined;
  "reasoning.group_missing": undefined;
  "reasoning.not_run": undefined;
  "reasoning.ontology_only": undefined;
  "reasoning.problem.asymmetric": { "first": string; "property": string; "second": string };
  "reasoning.problem.different_same": { "first": string; "second": string };
  "reasoning.problem.disjoint_member": { "first": string; "second": string; "subject": string };
  "reasoning.problem.engine": undefined;
  "reasoning.problem.irreflexive": { "property": string; "subject": string };
  "reasoning.problem.never.both": { "first": string; "name": string; "second": string };
  "reasoning.problem.never.parent": { "first": string; "name": string; "second": string };
  "reasoning.problem.never.self": { "name": string };
  "reasoning.problem.never.unknown": { "name": string };
  "reasoning.reason.definition_kind": { "expression": string; "o": string; "s": string };
  "reasoning.reason.definition_member": { "expression": string; "o": string; "s": string };
  "reasoning.reason.domain": { "o": string; "p": string; "s": string; "y": string };
  "reasoning.reason.equivalent_chain": { "m": string; "o": string; "s": string };
  "reasoning.reason.equivalent_property_link": { "o": string; "p": string; "q": string; "s": string };
  "reasoning.reason.functional": { "o": string; "p": string; "s": string; "x": string };
  "reasoning.reason.has_value": { "k": string; "o": string; "p": string; "s": string };
  "reasoning.reason.inverse_functional": { "o": string; "p": string; "s": string; "y": string };
  "reasoning.reason.inverse_link": { "o": string; "p": string; "q": string; "s": string };
  "reasoning.reason.kind_chain": { "m": string; "o": string; "s": string };
  "reasoning.reason.kind_equivalent": { "m": string; "o": string; "s": string };
  "reasoning.reason.maximum_one": { "o": string; "p": string; "s": string; "x": string };
  "reasoning.reason.member_equivalent": { "k": string; "o": string; "s": string };
  "reasoning.reason.member_kind": { "k": string; "o": string; "s": string };
  "reasoning.reason.mutual_kind": { "o": string; "s": string };
  "reasoning.reason.only": { "o": string; "p": string; "s": string; "x": string };
  "reasoning.reason.only_owned": { "k": string; "o": string; "p": string; "s": string; "x": string };
  "reasoning.reason.range": { "o": string; "p": string; "s": string; "y": string };
  "reasoning.reason.same_chain": { "m": string; "o": string; "s": string };
  "reasoning.reason.same_member": { "m": string; "o": string; "s": string };
  "reasoning.reason.same_object_link": { "m": string; "o": string; "p": string; "s": string };
  "reasoning.reason.same_subject_link": { "m": string; "o": string; "p": string; "s": string };
  "reasoning.reason.stated": { "o": string; "p": string; "s": string };
  "reasoning.reason.subproperty_link": { "o": string; "p": string; "q": string; "s": string };
  "reasoning.reason.symmetric_link": { "o": string; "p": string; "s": string };
  "reasoning.reason.transitive_link": { "m": string; "o": string; "p": string; "s": string };
  "reasoning.reason.unsupported": undefined;
  "reasoning.result.unknown": undefined;
  "reasoning.stopped": undefined;
  "reasoning.timeout": { "seconds": number };
  "reasoning.too_large": { "count": number; "limit": number };
  "request.body_json": undefined;
  "request.body_object": undefined;
  "request.field_json": { "field": string };
  "request.field_object": { "field": string };
  "request.file_limit": { "limit": number | string; "variable": string };
  "request.foreign_host": undefined;
  "request.foreign_page": undefined;
  "request.invalid": undefined;
  "request.layout_limit": { "limit": number | string };
  "request.nodes_limit": { "limit": number | string };
  "request.source_body": undefined;
  "rml.class_limit": { "limit": number };
  "rml.columns_missing": { "columns": string };
  "rml.delimiter": undefined;
  "rml.encoding": { "encoding": string };
  "rml.field_missing": { "property": string };
  "rml.field_multiple": { "count": number; "property": string };
  "rml.formulation": { "name": string };
  "rml.header": undefined;
  "rml.language_datatype": undefined;
  "rml.map_count": { "count": number };
  "rml.object_source": undefined;
  "rml.pair_limit": { "limit": number };
  "rml.predicate_iri": undefined;
  "rml.predicate_object": undefined;
  "rml.source": { "name": string; "source": string };
  "rml.subject_iri": { "iri": string };
  "rml.syntax": undefined;
  "rml.template_close": { "template": string };
  "rml.template_open": { "template": string };
  "rml.unsupported": { "name": string };
  "service.address_refused": { "host": string };
  "service.connection_failed": { "host": string };
  "service.endpoint_not_public": { "endpoint": string };
  "service.fixed_endpoint": undefined;
  "service.host_unresolvable": { "host": string };
  "service.http_failed": { "host": string; "status": number };
  "service.invalid_cell": { "host": string };
  "service.invalid_datatype": { "host": string };
  "service.invalid_language": { "host": string };
  "service.invalid_results": { "host": string };
  "service.invalid_row": { "host": string };
  "service.nested": undefined;
  "service.redirect_refused": { "host": string };
  "service.response_limit": { "host": string; "limit": number | string };
  "service.runner_required": undefined;
  "service.time_limit": { "host": string; "seconds": number };
  "service.too_many_blocks": { "limit": number | string };
  "service.unknown_result_type": { "host": string; "kind": string };
  "service.unmatched": undefined;
  "shape.readonly.additional_types": { "types": string };
  "shape.readonly.allowed_list": undefined;
  "shape.readonly.allowed_type": undefined;
  "shape.readonly.class_expression": undefined;
  "shape.readonly.datatype": { "datatype": string };
  "shape.readonly.duplicate_path": { "path": string };
  "shape.readonly.language_list": undefined;
  "shape.readonly.multiple_messages": { "count": number };
  "shape.readonly.multiple_targets": { "count": number };
  "shape.readonly.path": undefined;
  "shape.readonly.precision": { "predicate": string; "value": string };
  "shape.readonly.predicate_value": { "predicate": string };
  "shape.readonly.rule_reference": { "rule": string };
  "shape.readonly.rule_severity": undefined;
  "shape.readonly.severity": { "severity": string };
  "shape.readonly.target_expression": undefined;
  "shape.readonly.unknown": undefined;
  "shape.readonly.uses_predicate": { "predicate": string };
  "snapshots.choices_object": undefined;
  "snapshots.choose_sheet": undefined;
  "snapshots.class_required": undefined;
  "snapshots.column_missing": { "name": string };
  "snapshots.column_property": { "name": string };
  "snapshots.columns_object": undefined;
  "snapshots.mapping_syntax": undefined;
  "snapshots.mapping_text": undefined;
  "snapshots.model_class": undefined;
  "snapshots.one_name": undefined;
  "snapshots.refresh.class_limit": { "limit": number };
  "snapshots.refresh.columns_missing": { "columns": string };
  "snapshots.refresh.delimiter": undefined;
  "snapshots.refresh.encoding": { "encoding": string };
  "snapshots.refresh.field_missing": { "property": string };
  "snapshots.refresh.field_multiple": { "count": number; "property": string };
  "snapshots.refresh.formulation": { "name": string };
  "snapshots.refresh.header": undefined;
  "snapshots.refresh.language_datatype": undefined;
  "snapshots.refresh.map_count": { "count": number };
  "snapshots.refresh.object_source": undefined;
  "snapshots.refresh.pair_limit": { "limit": number };
  "snapshots.refresh.predicate_iri": undefined;
  "snapshots.refresh.predicate_object": undefined;
  "snapshots.refresh.source": { "name": string; "source": string };
  "snapshots.refresh.subject_iri": { "iri": string };
  "snapshots.refresh.syntax": undefined;
  "snapshots.refresh.template_close": { "template": string };
  "snapshots.refresh.template_open": { "template": string };
  "snapshots.refresh.unsupported": { "name": string };
  "snapshots.refresh_encoding": { "encoding": string };
  "snapshots.refresh_mapping_refused": undefined;
  "snapshots.relationship_end": { "name": string; "property": string };
  "snapshots.sample_file": { "limit": number; "total": number };
  "snapshots.sample_sheet": { "limit": number; "total": number };
  "snapshots.source_missing": undefined;
  "tabular.binary": undefined;
  "tabular.cell_limit": { "characters": number; "column": number; "limit": number; "row": number };
  "tabular.column_limit": { "count": number; "limit": number };
  "tabular.compression_limit": { "limit": number; "ratio": number };
  "tabular.csv_syntax": { "row": number };
  "tabular.damaged_zip": undefined;
  "tabular.empty": undefined;
  "tabular.encoding": { "encoding": string };
  "tabular.entry_compression_limit": { "limit": number; "name": string; "ratio": number };
  "tabular.file_too_large": { "bytes": number; "limit": number };
  "tabular.format.ods": undefined;
  "tabular.format.xls": undefined;
  "tabular.format.xlsb": undefined;
  "tabular.format.xlsm": undefined;
  "tabular.format.xltm": undefined;
  "tabular.header_empty": { "name": string; "row": number };
  "tabular.header_row": undefined;
  "tabular.invalid_byte": { "encoding": string; "position": number };
  "tabular.long_cell": { "limit": number; "row": number };
  "tabular.no_sheets": undefined;
  "tabular.not_csv_encoding": undefined;
  "tabular.not_xlsx": undefined;
  "tabular.password": undefined;
  "tabular.separator": undefined;
  "tabular.sheet_cell_limit": { "characters": number; "column": number; "limit": number; "name": string; "row": number };
  "tabular.sheet_column_limit": { "column": number; "limit": number; "name": string; "row": number };
  "tabular.sheet_empty": { "name": string };
  "tabular.sheet_missing": { "name": string };
  "tabular.unpacked_limit": { "bytes": number; "limit": number };
  "tabular.unsafe_parser": undefined;
  "tabular.workbook_unreadable": undefined;
  "tabular.xml_declaration": { "name": string };
  "validation.min_count": { "count": number; "name": string };
  "validation.shapes_refused": undefined;
  "validation.term": { "term": string };
  "validation.unknown": undefined;
  "validation.violation.class": { "focus": string; "path": string; "qualifier": string; "value": string };
  "validation.violation.datatype": { "datatype": string | null; "focus": string; "path": string; "value": string };
  "validation.violation.has_value": { "focus": string; "path": string; "wanted": string };
  "validation.violation.in": { "allowed": string; "focus": string; "path": string; "value": string };
  "validation.violation.language.allowed.tagged": { "allowed": string; "focus": string; "language": string; "path": string; "value": string };
  "validation.violation.language.allowed.untagged": { "allowed": string; "focus": string; "path": string; "value": string };
  "validation.violation.language.project.tagged": { "allowed": string; "focus": string; "language": string; "path": string; "value": string };
  "validation.violation.language.project.untagged": { "allowed": string; "focus": string; "path": string; "value": string };
  "validation.violation.max_count.attribute": { "focus": string; "have": number; "limit": number | string | null; "path": string };
  "validation.violation.max_count.relationship": { "focus": string; "have": number; "limit": number | string | null; "path": string };
  "validation.violation.max_inclusive": { "bound": string; "focus": string; "path": string; "value": string };
  "validation.violation.max_length": { "focus": string; "limit": number | string | null; "path": string; "value": string };
  "validation.violation.min_count.attribute": { "focus": string; "have": number; "limit": number | string | null; "path": string };
  "validation.violation.min_count.relationship": { "focus": string; "have": number; "limit": number | string | null; "path": string };
  "validation.violation.min_inclusive": { "bound": string; "focus": string; "path": string; "value": string };
  "validation.violation.min_length": { "focus": string; "limit": number | string | null; "path": string; "value": string };
  "validation.violation.other": { "focus": string; "path": string; "rule": string };
  "validation.violation.pattern": { "focus": string; "path": string; "value": string };
  "validation.violation.qualified.max.class": { "focus": string; "have": number; "limit": number | string | null; "path": string; "qualifier": string };
  "validation.violation.qualified.max.datatype": { "focus": string; "have": number; "limit": number | string | null; "path": string; "qualifier": string };
  "validation.violation.qualified.min.class": { "focus": string; "have": number; "limit": number | string | null; "path": string; "qualifier": string };
  "validation.violation.qualified.min.datatype": { "focus": string; "have": number; "limit": number | string | null; "path": string; "qualifier": string };
  "validation.violation.qualified_language": { "focus": string; "language": string; "limit": number | string | null; "path": string };
  "validation.violation.unique_language": { "focus": string; "path": string };
  "validation.violation.unique_language.many": { "count": number; "focus": string; "languages": string; "path": string };
  "validation.violation.unique_language.one": { "count": number; "focus": string; "language": string; "path": string };
  "words.characteristic.asymmetric": undefined;
  "words.characteristic.functional": undefined;
  "words.characteristic.functionalAttribute": undefined;
  "words.characteristic.inverseFunctional": undefined;
  "words.characteristic.irreflexive": undefined;
  "words.characteristic.reflexive": undefined;
  "words.characteristic.symmetric": undefined;
  "words.characteristic.transitive": undefined;
  "words.editing.the_shape": undefined;
  "words.field.allowed_languages": undefined;
  "words.field.annotation_property": undefined;
  "words.field.attribute_relationship": undefined;
  "words.field.boundary": undefined;
  "words.field.broader": undefined;
  "words.field.child": undefined;
  "words.field.comment": undefined;
  "words.field.datatype": undefined;
  "words.field.domain": undefined;
  "words.field.end": undefined;
  "words.field.entity": undefined;
  "words.field.filler": undefined;
  "words.field.iri": undefined;
  "words.field.label": undefined;
  "words.field.link": undefined;
  "words.field.mapping_target": undefined;
  "words.field.max_count": undefined;
  "words.field.max_length": undefined;
  "words.field.maximum": undefined;
  "words.field.min_count": undefined;
  "words.field.min_length": undefined;
  "words.field.minimum": undefined;
  "words.field.name_languages": undefined;
  "words.field.new_iri": undefined;
  "words.field.parent": undefined;
  "words.field.parent_class": undefined;
  "words.field.path": undefined;
  "words.field.range": undefined;
  "words.field.related": undefined;
  "words.field.relationship_attribute": undefined;
  "words.field.rename_iri": undefined;
  "words.field.start": undefined;
  "words.field.thing": undefined;
  "words.field.value": undefined;
  "words.field.value_type": undefined;
  "words.host_separator": undefined;
  "words.kind.annotationProperty": undefined;
  "words.kind.class": undefined;
  "words.kind.concept": undefined;
  "words.kind.conceptScheme": undefined;
  "words.kind.datatypeProperty": undefined;
  "words.kind.entity": undefined;
  "words.kind.example": undefined;
  "words.kind.objectProperty": undefined;
  "words.kind.property": undefined;
  "words.language.ar": undefined;
  "words.language.ca": undefined;
  "words.language.cs": undefined;
  "words.language.da": undefined;
  "words.language.de": undefined;
  "words.language.el": undefined;
  "words.language.en": undefined;
  "words.language.es": undefined;
  "words.language.fi": undefined;
  "words.language.fr": undefined;
  "words.language.he": undefined;
  "words.language.hi": undefined;
  "words.language.hu": undefined;
  "words.language.it": undefined;
  "words.language.ja": undefined;
  "words.language.ko": undefined;
  "words.language.la": undefined;
  "words.language.nb": undefined;
  "words.language.nl": undefined;
  "words.language.no": undefined;
  "words.language.pl": undefined;
  "words.language.pt": undefined;
  "words.language.ro": undefined;
  "words.language.ru": undefined;
  "words.language.sv": undefined;
  "words.language.tr": undefined;
  "words.language.uk": undefined;
  "words.language.zh": undefined;
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
  "words.reasoning.any_value": undefined;
  "words.reasoning.condition_separator": undefined;
  "words.reasoning.intersection": undefined;
  "words.reasoning.minimum_one": undefined;
  "words.reasoning.rule_value": undefined;
  "words.reasoning.stated_rule": undefined;
  "words.reasoning.unnamed": undefined;
  "words.severity.violation": undefined;
  "words.severity.warning": undefined;
  "words.validation.missing_value": undefined;
  "words.validation.no_allowed_languages": undefined;
  "words.validation.no_allowed_values": undefined;
  "words.validation.required_class": undefined;
  "words.validation.this_shape": undefined;
  "words.validation.unnamed_node": undefined;
  "words.validation.unnamed_shape": undefined;
}
export type UiPart = { text: string } | { code: string; args: Record<string, never> };
export interface WireMessage { code: string; args: Record<string, string | number | boolean | null | UiPart[]> }
