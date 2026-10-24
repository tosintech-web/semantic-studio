/*
================================================================================
FILE: frontend/src/i18n/en.ts
SUMMARY
    en UI message catalog.
BASIC IDEA
    Use whole sentences and stable placeholders; user data stays unchanged.
INPUTS / INPUT SOURCES
    Message contracts from types.ts.
EXPECTED OUTPUT
    A complete catalog matching the other supported UI locale.
================================================================================
*/

import type { Catalog } from "./types";

export const en: Catalog = {
  "parse.syntax": "Check the syntax of the {format} file (line: {line}).",
  "model.invalid_value": "“{value}” is not a valid {datatype} value.",
  "validation.min_count": "{name} needs at least {count} values.",
  "reasoning.timeout": "Reasoning stopped after {seconds} seconds. Reduce the data or rules and try again.",
  "entities.page_too_large": "The response is too large ({total} matching entries). Request at most {suggested_limit} entries or inspect the item details.",
  "entities.view_changed": "The dictionary is changing. Retry to see its latest entries.",
  "request.invalid": "Check the supplied values and try again.",

  "kind.class": "Class",
  "kind.objectProperty": "Object property",
  "kind.datatypeProperty": "Datatype property",
  "kind.annotationProperty": "Annotation property",
  "kind.property": "Property",
  "kind.concept": "SKOS concept",
  "kind.conceptScheme": "Concept scheme",
  "kind.collection": "SKOS collection",
  "kind.individual": "Individual",
  "kind.ontology": "Ontology",
  "kind.other": "Other",

  "common.retry": "Retry",
  "entities.filter": "Search dictionary",
  "entities.kind": "Kind",
  "entities.sort": "Sort",
  "entities.sortLabel": "Label",
  "entities.sortIri": "IRI",
  "entities.all": "All kinds",
  "entities.concept": "Concepts",
  "entities.individual": "Individuals",
  "entities.class": "Classes",
  "entities.properties": "Properties",
  "entities.other": "Other",
  "entities.label": "Name",
  "entities.iri": "Identifier (IRI)",
  "entities.description": "Description",
  "entities.reference": "Reference only",
  "entities.undefined": "This resource is referenced but has no definition in this dictionary.",
  "entities.copy": "Copy full IRI",
  "entities.copied": "IRI copied.",
  "entities.range": "{start}–{end} of {total}",
  "entities.previous": "Previous page",
  "entities.next": "Next page",
  "entities.empty": "No matching dictionary entries.",
  "entities.updating": "The dictionary is changing. Retry to see its latest entries.",
  "entities.truncated": "The displayed name is shortened. Open details to inspect the full value.",
  "entities.fallback": "Shown in {language} (preferred language unavailable)",
  "dictionary.readonly": "Read only",
  "dictionary.editing": "Editing",
  "dictionary.saved": "Saved",
  "dictionary.dirty": "Unsaved changes",
  "dictionary.saving": "Saving…",
  "dictionary.saveError": "Save failed",

  "common.cancel": "Cancel",
  "search.prompt": "Search concepts, properties…",
  "search.queryPrompt": "Search to add a step…",
  "search.results": "Search results",
  "search.loading": "Searching…",
  "search.one": "1 result",
  "search.none": "No results",
  "search.count": "{count} results",
  "search.more": "{count} results shown, more match",
  "search.narrow": "More than {count} match. Type more of the name to narrow the list.",
  "search.showAll": "See all in Entities",
  "search.undrawn": "not drawn",
  "search.undrawnTitle": "This entity is outside the drawn part of the graph",
  "search.from": "from {name}",
  "search.importNone": "No concept from an import matches. Only other vocabularies are offered here; resolve an import to map to one of its concepts.",
  "match.name": "Name: {value}",
  "match.alias": "Alias: {value}",
  "match.reading": "Reading: {value}",
  "match.search": "Search term: {value}",
  "match.identifier": "Identifier: {value}",

  "nav.home": "Home",
  "nav.view": "View",
  "nav.explore": "Explore",
  "nav.edit": "Edit",
  "nav.query": "Query",
  "nav.shapes": "Shapes",
  "nav.entities": "Entities",
  "ui.language": "UI language",
  "dictionary.invalidLanguage": "Enter a language tag such as ja, en or ja-JP.",
  "dictionary.apply": "Apply display language",
  "dictionary.language": "Dictionary display language",
  "common.error": "The operation could not be completed. Check the details.",
  "common.notSet": "Not set",
  "crash.title": "Something went wrong.",
  "crash.description": "The interface stopped rather than showing you something wrong. Reloading starts again from the ontology library; nothing stored on your machine has been changed.",
  "crash.reload": "Reload the application",
  "load.success": "Loaded “{name}”."
};
