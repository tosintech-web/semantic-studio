/*
================================================================================
FILE: frontend/src/i18n/kindLabel.ts
SUMMARY
    Localized names for the server's display-only RDF kinds.
BASIC IDEA
    Whitelist known codes; user-supplied kinds never become catalog paths.
INPUTS / INPUT SOURCES
    A kind string and the current typed translator.
EXPECTED OUTPUT
    Plain kind text with a safe Other fallback.
================================================================================
*/
import type { Translator } from "./types";
const kinds = ["class", "objectProperty", "datatypeProperty", "annotationProperty", "property", "concept", "conceptScheme", "collection", "individual", "ontology", "other"] as const;
export function kindLabelMessage(kind: string, t: Translator): string {
  const known = kinds.find(value => value === kind) ?? "other";
  return t(`kind.${known}`);
}

export function countKindMessage(kind: string, count: number, t: Translator): string {
  const known = kinds.find(value => value === kind) ?? "other";
  return t(`kindCount.${known}.${count === 1 ? "one" : "many"}`, { count });
}
