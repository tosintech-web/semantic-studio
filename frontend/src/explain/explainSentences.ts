/*
================================================================================
FILE: frontend/src/explain/explainSentences.ts
SUMMARY
    Localized plain-language facts from the detail response, retaining linked names.
BASIC IDEA
    Catalog placeholders are resolved before values are inserted. Linked Part[]
    values keep their identity and text boundaries; names never become syntax.
    English alone uses the shared article rule. Counts, union/intersection and
    missing ends describe only the supplied structure; author text stays original.
INPUTS / INPUT SOURCES
    Selected label, Explain metadata, dictionary display language and UI locale.
EXPECTED OUTPUT
    Kind/fact/description sentences as strings and original {iri,label} references.
================================================================================
*/
import { a, asType, typeWord } from "../modeling/sentences";
import { translateParts } from "../i18n/parts";
import { translate } from "../i18n/format";
import type { MessageId, Translator, UiLocale } from "../i18n/types";
import { own } from "../theme/kinds";
import type { Explain, ExplainCount, ExplainRef } from "../types";
export type Part = string | ExplainRef;
export type Sentence = Part[];
const NAMES_SHOWN = 3;
const COUNT_LIMIT = 10_000;
const KIND_CODES: Record<string, Extract<MessageId, `explain.kind.${string}`>> = {
  "class": "explain.kind.class",
  "objectProperty": "explain.kind.objectProperty",
  "datatypeProperty": "explain.kind.datatypeProperty",
  "annotationProperty": "explain.kind.annotationProperty",
  "property": "explain.kind.property",
  "individual": "explain.kind.individual",
  "concept": "explain.kind.concept",
  "conceptScheme": "explain.kind.conceptScheme",
  "collection": "explain.kind.collection",
  "ontology": "explain.kind.ontology",
};
const translator = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;
const stop = (sentence: Sentence, locale: UiLocale): Sentence => [...sentence, translate(locale, "explain.stop")];
export function kindSentence(label: string, kind: string, locale: UiLocale = "en"): Sentence {
  return translateParts(locale, own(KIND_CODES, kind) ?? "explain.kind.other", { label });
}
function articled(ref: ExplainRef, locale: UiLocale): Part[] {
  return locale === "en" ? [a(ref.label).slice(0, -ref.label.length || undefined), ref] : [ref];
}
function list(items: Part[][], locale: UiLocale, joiner: "and" | "or" = "and"): Part[] {
  const out: Part[] = [];
  items.forEach((item, index) => {
    if (index > 0) out.push(translate(locale, index === items.length - 1 ? `explain.list.${joiner}` : "explain.list.separator"));
    out.push(...item);
  });
  return out;
}
function end(refs: ExplainRef[] | undefined, unnamed: boolean | undefined, form: "union" | "separate" | undefined, locale: UiLocale): Part[] {
  if (!refs?.length) return [translate(locale, unnamed ? "explain.end.unnamed" : "explain.end.missing")];
  if (refs.length === 1) return articled(refs[0], locale);
  const classes = list(refs.map(ref => articled(ref, locale)), locale, form === "union" ? "or" : "and");
  return translateParts(locale, form === "union" ? "explain.end.union" : "explain.end.separate", { classes });
}
export function countWords(counted: ExplainCount, locale: UiLocale = "en"): string {
  return translate(locale, counted.capped ? "explain.countMore" : "explain.count", { count: counted.capped ? COUNT_LIMIT : counted.count });
}
function names(counted: ExplainCount, locale: UiLocale): Part[] {
  const shown = (counted.names ?? []).slice(0, NAMES_SHOWN);
  if (!shown.length) return [];
  const all = shown.length === counted.count && !counted.capped;
  return translateParts(locale, all ? "explain.names.all" : "explain.names.some", { names: list(shown.map(ref => [ref]), locale) });
}
function present(counted: ExplainCount | undefined): counted is ExplainCount {
  return counted !== undefined && (counted.count > 0 || counted.capped);
}
export function factSentences(label: string, explain: Explain, locale: UiLocale = "en"): Sentence[] {
  const out: Sentence[] = [];
  const variant = (counted: ExplainCount) => counted.count === 1 && !counted.capped ? "one" : "many";
  switch (explain.kind) {
    case "class": {
      if (explain.parents?.length) out.push(stop(translateParts(locale, "sentence.parent", { child: label, parent: list(explain.parents.map(ref => [ref]), locale) }), locale));
      if (present(explain.children)) out.push(translateParts(locale, `explain.children.${variant(explain.children)}`, { count: countWords(explain.children, locale), names: names(explain.children, locale) }));
      if (present(explain.members)) {
        // Subclass members were not counted by the server; never imply they were.
        const code = present(explain.children) ? `explain.membersExcluded.${variant(explain.members)}` as const : `explain.membersOwn.${variant(explain.members)}` as const;
        out.push(translateParts(locale, code, { count: countWords(explain.members, locale), names: names(explain.members, locale) }));
      }
      break;
    }
    case "objectProperty":
    case "property":
      out.push(translateParts(locale, "explain.property", { label, from: end(explain.domains, explain.unnamedDomain, explain.domainForm, locale), to: end(explain.ranges, explain.unnamedRange, undefined, locale) }));
      if (explain.inverse) out.push(translateParts(locale, "explain.inverse", { inverse: explain.inverse }));
      break;
    case "datatypeProperty": {
      const domain = end(explain.domains, explain.unnamedDomain, explain.domainForm, locale);
      out.push(explain.datatype
        ? translateParts(locale, "explain.attribute.typed", { label, domain, type: locale === "en" ? asType(explain.datatype) : typeWord(explain.datatype, translator(locale)) })
        : translateParts(locale, "explain.attribute.untyped", { label, domain }));
      break;
    }
    case "individual":
      if (explain.types?.length) out.push(translateParts(locale, "explain.individual", { label, types: list(explain.types.map(ref => articled(ref, locale)), locale) }));
      break;
    case "concept":
      if (explain.broader?.length) out.push(stop(translateParts(locale, "sentence.link.broader", { from: label, to: list(explain.broader.map(ref => [ref]), locale) }), locale));
      if (explain.schemes?.length) out.push(translateParts(locale, "explain.schemes", { schemes: list(explain.schemes.map(ref => [ref]), locale) }));
      if (present(explain.narrower)) out.push(translateParts(locale, `explain.narrower.${variant(explain.narrower)}`, { count: countWords(explain.narrower, locale) }));
      break;
    case "conceptScheme":
      if (present(explain.topConcepts)) out.push(translateParts(locale, `explain.top.${variant(explain.topConcepts)}`, { count: countWords(explain.topConcepts, locale) }));
      break;
    case "collection":
      if (present(explain.members)) out.push(translateParts(locale, `explain.collection.${variant(explain.members)}`, { count: countWords(explain.members, locale), names: names(explain.members, locale) }));
      break;
  }
  return out;
}
function sameLanguage(tag: string, wanted: string): boolean {
  const tagLower = tag.toLowerCase();
  const wantedLower = wanted.toLowerCase();
  return tagLower === wantedLower || tagLower.startsWith(`${wantedLower}-`);
}
export function descriptionSentence(explain: Explain, language: string | null = null, locale: UiLocale = "en"): Sentence | null {
  const text = explain.description?.text.trim();
  if (!text) return null;
  const tag = explain.description?.lang;
  const marked = tag && !sameLanguage(tag, language ?? "en");
  const complete = (locale === "en" ? /[.!?]$/ : /[.!?。！？]$/).test(text);
  return marked
    ? translateParts(locale, complete ? "explain.descriptionMarked.complete" : "explain.descriptionMarked.fragment", { text, language: tag })
    : translateParts(locale, complete ? "explain.description.complete" : "explain.description.fragment", { text });
}
export function explainSentences(label: string, explain: Explain, language: string | null = null, locale: UiLocale = "en"): Sentence[] {
  const description = descriptionSentence(explain, language, locale);
  return [kindSentence(label, explain.kind, locale), ...factSentences(label, explain, locale), ...(description ? [description] : [])];
}
export function sentenceText(sentence: Sentence): string {
  return sentence.map(part => typeof part === "string" ? part : part.label).join("");
}
