/*
================================================================================
FILE: frontend/src/i18n/kindLabel.ts
SUMMARY
    Localized names for display-only RDF kinds and standard edge relations.
BASIC IDEA
    Whitelist known codes; user-supplied kinds never become catalog paths.
INPUTS / INPUT SOURCES
    A kind string and the current typed translator.
EXPECTED OUTPUT
    Plain kind text with a safe Other fallback.
================================================================================
*/
import type { MessageId, Translator } from "./types";
const kinds = ["class", "objectProperty", "datatypeProperty", "annotationProperty", "property", "concept", "conceptScheme", "collection", "individual", "ontology", "other"] as const;
export function kindLabelMessage(kind: string, t: Translator): string {
  const known = kinds.find(value => value === kind) ?? "other";
  return t(`kind.${known}`);
}

export function countKindMessage(kind: string, count: number, t: Translator): string {
  const known = kinds.find(value => value === kind) ?? "other";
  return t(`kindCount.${known}.${count === 1 ? "one" : "many"}`, { count });
}

type EdgeCode = Extract<MessageId, `edge.${string}`>;
const EDGE_CODES: Record<string, EdgeCode> = {
  "subClassOf": "edge.subClassOf",
  "subPropertyOf": "edge.subPropertyOf",
  "domain": "edge.domain",
  "range": "edge.range",
  "instanceOf": "edge.instanceOf",
  "assertion": "edge.assertion",
  "broader": "edge.broader",
  "related": "edge.related",
  "inScheme": "edge.inScheme",
  "member": "edge.member",
  "equivalentClass": "edge.equivalentClass",
  "equivalentProperty": "edge.equivalentProperty",
  "disjointWith": "edge.disjointWith",
  "inverseOf": "edge.inverseOf",
  "sameAs": "edge.sameAs",
  "seeAlso": "edge.seeAlso",
  "rule": "edge.rule"
};
export function edgeLabelMessage(kind: string, t: Translator): string {
  if (!Object.prototype.hasOwnProperty.call(EDGE_CODES, kind)) return kind;
  return t(EDGE_CODES[kind]);
}
