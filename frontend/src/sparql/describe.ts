/*
================================================================================
FILE: frontend/src/sparql/describe.ts
================================================================================

SUMMARY
    Renders the visual query-builder state as a localized explanation shown
    above the SPARQL preview.

BASIC IDEA
    Whole catalog templates describe the original query facts. English
    lowercasing/pluralization runs only for en; other UI locales retain raw
    names. Describing a query never mutates its state or generated SPARQL.

    The generated SPARQL is meaningless to someone new to the Semantic Web, so
    the query is also stated in words: "Start from every planet, then follow
    orbits from each planet to its stars. Return at most 100 rows." Pure and
    dependency-free like the generator, so it can be unit tested directly.
    Also exports `plural`, reused by the starters module for titles.

INPUTS / INPUT SOURCES
    - state: the QueryState.
    - predicateLabel: a function to turn a predicate IRI into a readable label
      (supplied by the UI from the schema; defaults to the IRI itself).

EXPECTED OUTPUT
    - describeQuery -> a single human-readable sentence (empty when no steps).
================================================================================
*/

import { translate } from "../i18n/format";
import type { Translator, UiLocale } from "../i18n/types";
import type { QueryState, QueryStep, SelectedProp } from "./types";

const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;
// English spelling rules are never applied to original names in another UI locale.
const nameFor = (name: string, locale: UiLocale) => locale === "en" ? lower(name) : name;
const pluralFor = (name: string, locale: UiLocale) => locale === "en" ? plural(name) : name;

/** Lowercase a plain capitalised word so it reads naturally mid-sentence. */
function lower(label: string): string {
  // Keep acronyms and CamelCase names as they are; only lowercase a plain
  // capitalised word so it reads naturally mid-sentence.
  return /^[A-Z][a-z]+$/.test(label) ? label.toLowerCase() : label;
}

/** Naive English pluralisation, good enough for class names in a sentence. */
export function plural(label: string): string {
  const word = lower(label);
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;   // bus -> buses
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`; // city -> cities
  return `${word}s`;
}

/** "diameter is at least 5000" for a filtered property, or null if no filter. */
function describeFilter(prop: SelectedProp, locale: UiLocale): string | null {
  const filter = prop.filter;
  if (!filter || filter.value.trim() === "") return null;
  return tFor(locale)(`queryDescription.filter.${filter.op}`, { label: nameFor(prop.label, locale), value: filter.value.trim() });
}

/** Describe the same original hop facts using the active UI language. */
function describeHop(step: QueryStep, steps: QueryStep[], predicateLabel: (iri: string) => string, locale: UiLocale): string {
  const link = step.link;
  if (!link) return "";
  const t = tFor(locale);
  const anchor = steps[link.anchor];
  const anchorName = anchor ? nameFor(anchor.label, locale) : t("queryDescription.it");
  const names = link.predicates.map(p => p.inverse ? t("queryDescription.inverse", { name: predicateLabel(p.iri) }) : predicateLabel(p.iri)).join(t("queryDescription.or"));
  return t(link.optional ? "queryDescription.hopOptional" : "queryDescription.hop", {
    names, modifier: t(`queryDescription.modifier.${link.modifier}`), anchor: anchorName, target: pluralFor(step.label, locale),
  });
}

export function describeQuery(
  state: QueryState,
  predicateLabel: (iri: string) => string = iri => iri,
  locale: UiLocale = "en",
): string {
  if (state.steps.length === 0) return "";
  const t = tFor(locale);
  const root = state.steps[0];
  const sentences: string[] = [];
  const start = root.pin ? t("queryDescription.start.pin", { pin: root.pin.label, cls: nameFor(root.label, locale) }) : t("queryDescription.start.all", { cls: nameFor(root.label, locale) });
  const hops = state.steps.slice(1).map(step => describeHop(step, state.steps, predicateLabel, locale)).filter(Boolean);
  sentences.push(hops.length ? t("queryDescription.traversal", { start, hops: hops.join(t("queryDescription.hopsJoin")) }) : t("queryDescription.rootOnly", { start }));
  const shown: string[] = [];
  const conditions: string[] = [];
  for (const step of state.steps) {
    for (const prop of step.props) {
      const condition = describeFilter(prop, locale);
      if (condition) conditions.push(t("queryDescription.condition", { cls: nameFor(step.label, locale), condition }));
      else shown.push(t("queryDescription.property", { cls: nameFor(step.label, locale), label: nameFor(prop.label, locale) }));
    }
    if (step.pin && step !== root) conditions.push(t("queryDescription.pinCondition", { cls: nameFor(step.label, locale), pin: step.pin.label }));
  }
  if (state.aggregate === "count") {
    const last = state.steps[state.steps.length - 1];
    sentences.push(state.steps.length > 1 ? t("queryDescription.countGrouped", { target: pluralFor(last.label, locale), root: nameFor(root.label, locale) }) : t("queryDescription.count", { target: pluralFor(root.label, locale) }));
  } else if (shown.length) sentences.push(t("queryDescription.shown", { properties: shown.join(t("queryDescription.listJoin")) }));
  if (conditions.length) sentences.push(t("queryDescription.only", { conditions: conditions.join(t("queryDescription.conditionsJoin")) }));
  if (state.aggregate !== "count") sentences.push(t(state.distinct ? "queryDescription.limitDistinct" : "queryDescription.limit", { count: state.limit }));
  return sentences.join(t("queryDescription.sentencesJoin"));
}
