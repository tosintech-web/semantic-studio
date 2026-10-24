/*
================================================================================
FILE: frontend/src/i18n/types.ts
SUMMARY
    Types for UI locale and complete message arguments.
BASIC IDEA
    Keep interface language independent from RDF language and project values.
INPUTS / INPUT SOURCES
    Stable message identifiers and primitive interpolation arguments.
EXPECTED OUTPUT
    Compile-time checking of message calls, including required arguments.
================================================================================
*/

export type UiLocale = "ja" | "en";
export type Primitive = string | number | boolean | null;
export interface MessageArgs {
  "kind.class": undefined;
  "kind.objectProperty": undefined;
  "kind.datatypeProperty": undefined;
  "kind.annotationProperty": undefined;
  "kind.property": undefined;
  "kind.concept": undefined;
  "kind.conceptScheme": undefined;
  "kind.collection": undefined;
  "kind.individual": undefined;
  "kind.ontology": undefined;
  "kind.other": undefined;

  "common.retry": undefined;
  "entities.filter": undefined;
  "entities.kind": undefined;
  "entities.sort": undefined;
  "entities.sortLabel": undefined;
  "entities.sortIri": undefined;
  "entities.all": undefined;
  "entities.concept": undefined;
  "entities.individual": undefined;
  "entities.class": undefined;
  "entities.properties": undefined;
  "entities.other": undefined;
  "entities.label": undefined;
  "entities.iri": undefined;
  "entities.description": undefined;
  "entities.reference": undefined;
  "entities.undefined": undefined;
  "entities.copy": undefined;
  "entities.copied": undefined;
  "entities.range": { start: number; end: number; total: number };
  "entities.previous": undefined;
  "entities.next": undefined;
  "entities.empty": undefined;
  "entities.updating": undefined;
  "entities.truncated": undefined;
  "entities.fallback": { language: string };
  "dictionary.readonly": undefined;
  "dictionary.editing": undefined;
  "dictionary.saved": undefined;
  "dictionary.dirty": undefined;
  "dictionary.saving": undefined;
  "dictionary.saveError": undefined;

  "common.cancel": undefined;
  "search.prompt": undefined;
  "search.queryPrompt": undefined;
  "search.results": undefined;
  "search.loading": undefined;
  "search.one": undefined;
  "search.none": undefined;
  "search.count": { count: number };
  "search.more": { count: number };
  "search.narrow": { count: number };
  "search.showAll": undefined;
  "search.undrawn": undefined;
  "search.undrawnTitle": undefined;
  "search.from": { name: string };
  "search.importNone": undefined;
  "match.name": { value: string };
  "match.alias": { value: string };
  "match.reading": { value: string };
  "match.search": { value: string };
  "match.identifier": { value: string };

  "nav.home": undefined;
  "nav.view": undefined;
  "nav.explore": undefined;
  "nav.edit": undefined;
  "nav.query": undefined;
  "nav.shapes": undefined;
  "nav.entities": undefined;
  "ui.language": undefined;
  "dictionary.language": undefined;
  "dictionary.apply": undefined;
  "dictionary.invalidLanguage": undefined;
  "common.error": undefined;
  "common.notSet": undefined;
  "crash.title": undefined;
  "crash.description": undefined;
  "crash.reload": undefined;
  "load.success": { name: string };
}
export type MessageId = keyof MessageArgs;
export type Catalog = { [K in MessageId]: string };
export type Translator = <K extends MessageId>(code: K, ...args: MessageArgs[K] extends undefined ? [] : [args: MessageArgs[K]]) => string;
