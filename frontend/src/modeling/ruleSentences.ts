/*
================================================================================
FILE: frontend/src/modeling/ruleSentences.ts
================================================================================

SUMMARY
    A class's rules in the learner's words (axioms-and-reasoning 5.8, 5.9),
    both ways: a rule as its sentence (*Every Order has at least one has
    line that is an Order line*, *A Manager is exactly a Person that manages
    at least one Employee*, *No Person is an Organization*), its canvas
    label (*at least 1 · has line*, *only · has line*, *defines*) and its
    open-world note; and the sentence builder's state as the sentence so
    far, the problem that stops Add, and the one command Add sends.

BASIC IDEA
    Whole catalogs provide rule prose, choices and help in the requested UI
    locale. English alone applies articles, plurals and has-noun wording;
    other locales preserve original names. Commands and RDF values remain
    locale-independent; compatibility exports retain English defaults.

    The server reads a rule out of the graph into its parts with labels
    (axioms.py); everything a learner reads is built here, from those parts,
    so the form, canvas, builder and retained notice say a rule the same way and are
    tested without drawing anything. A name is used exactly as written;
    nothing here reads ontology text as markup or as a pattern. The article
    is sentences.ts's, the one rule every sentence shares (X-12), and the
    plural the last word's. A count on a relationship named *has X* reads
    without its *has*: *has at most 2 lines*, not *has at most 2 has line*.

    The builder is one state for every kind of rule. Its blanks are the
    parts of the sentence: which rule, the relationship or attribute, the
    kind, the number, the class or value at the other end and, for the
    defining form, the class it is *exactly a ... that*. The sentence reads
    with "…" in the blanks still empty, and the command is the same shape
    the server's commands take, with the old rule's key for a replace.

INPUTS / INPUT SOURCES
    - Rule items and choices from /node (types.ts ClassRules); a canvas rule
      line's parts; the builder's state.

EXPECTED OUTPUT
    - Strings, the builder state, and { name, args } commands.
================================================================================
*/

import { translate } from "../i18n/format";
import type { Translator, UiLocale } from "../i18n/types";
import type { AnnotationValue, RuleChoices, RuleForm, RuleItem, RuleKey, RuleKind, RuleRef, RuleRestriction } from "../types";
import { a } from "./sentences";
import { plural } from "./shapeSentences";

const XSD = "http://www.w3.org/2001/XMLSchema#";

const BLANK = "…";
const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;
const articleName = (name: string, locale: UiLocale) => locale === "en" ? a(name) : name;

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 1 is *one*, as 5.8 writes *at least one*; any other number is digits. */
export function countWord(n: number, locale: UiLocale = "en"): string {
  return n === 1 ? tFor(locale)("ruleSentence.countOne") : String(n);
}

export function isCount(kind: RuleKind | null): kind is "exactly" | "atLeast" | "atMost" {
  return kind === "exactly" || kind === "atLeast" || kind === "atMost";
}

/** The parts of a rule a sentence is built from, as labels. */
export interface RuleParts {
  form: RuleForm;
  kind: RuleKind | null;
  property: string | null;
  // The class or type of value at the other end, or the value.
  filler: string | null;
  n: number | null;
  with: string | null;
}

/** A value of *has value*, as the sentence shows it. */
export function valueText(value: AnnotationValue & { label?: string }): string {
  if (value.kind === "link") return value.label ?? value.value;
  return value.value;
}

export function partsOf(item: RuleRestriction): RuleParts {
  let filler: string | null = null;
  if (item.filler) {
    filler =
      item.kind === "value"
        ? valueText(item.filler as AnnotationValue & { label?: string })
        : "iri" in item.filler
          ? item.filler.label
          : null;
  }
  return {
    form: item.form,
    kind: item.kind,
    property: item.property.label,
    filler,
    n: item.n,
    with: item.with?.label ?? null,
  };
}

/** *that is an Order line* / *that are Order lines*, by the number. */
function thatIs(filler: string, n: number): string {
  return n === 1 ? tFor("en")("ruleSentence.that.one", { filler: a(filler) }) : tFor("en")("ruleSentence.that.many", { filler: plural(filler) });
}

/** The sentence of a restriction (5.8). Blanks not yet filled read "…",
 *  so the builder's sentence reads as its pickers fill. */
export function restrictionSentence(cls: string, parts: RuleParts, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const p = parts.property ?? BLANK;
  const f = parts.filler;
  const kind = parts.kind;
  if (parts.form === "defines") {
    const phrase = definingPhrase(p, kind, f, parts.n, locale);
    const saidClass = locale === "en" ? capital(a(cls)) : cls;
    return parts.with ? t("ruleSentence.defines.named", { cls: saidClass, with: articleName(parts.with, locale), phrase }) : t("ruleSentence.defines.any", { cls: saidClass, phrase });
  }
  const counted = locale === "en" && parts.property ? hasNoun(parts.property) : null;
  if (kind === "some") return t("ruleSentence.every.some", { cls, property: counted ?? p, filler: f ? articleName(f, locale) : BLANK });
  if (kind === "only") return t("ruleSentence.every.only", { cls, property: p, filler: f ? locale === "en" ? plural(f) : f : BLANK });
  if (kind === "value") return t("ruleSentence.every.value", { cls, property: p, filler: f ?? BLANK });
  if (isCount(kind)) {
    const n = parts.n;
    const count = n === null ? BLANK : countWord(n, locale);
    const tail = f ? t("ruleSentence.qualified", { filler: locale === "en" ? thatIs(f, n ?? 2) : f }) : "";
    const property = counted ? n === 1 ? counted : plural(counted) : p;
    return t(`ruleSentence.every.${kind}`, { cls, count, property, tail });
  }
  return t("ruleSentence.blank", { cls });
}

function definingPhrase(p: string, kind: RuleKind | null, f: string | null, n: number | null, locale: UiLocale): string {
  const t = tFor(locale);
  if (kind === "some") return t("ruleSentence.define.some", { property: p, filler: f ?? BLANK });
  if (kind === "only") return t("ruleSentence.define.only", { property: p, filler: f ? locale === "en" ? plural(f) : f : BLANK });
  if (kind === "value") return t("ruleSentence.define.value", { property: p, filler: f ?? BLANK });
  if (isCount(kind)) return t(`ruleSentence.define.${kind}`, { property: p, count: n === null ? BLANK : countWord(n, locale), what: f ? t("ruleSentence.countWhat", { filler: locale === "en" && n !== 1 ? plural(f) : f }) : t("ruleSentence.values") });
  return t("ruleSentence.define.blank", { property: p });
}

export function disjointSentence(cls: string, other: string, locale: UiLocale = "en"): string {
  return tFor(locale)("ruleSentence.disjoint", { cls, other: articleName(other, locale) });
}

export function equivalentSentence(cls: string, other: string, locale: UiLocale = "en"): string {
  return tFor(locale)("ruleSentence.equivalent", { cls, other });
}

/** Any item of the Rules block as its sentence; Turtle outside 5.8 is its
 *  own text and has none. */
export type RuleNarrative =
  | { type: "restriction"; cls: string; parts: RuleParts }
  | { type: "disjoint" | "equivalent"; cls: string; other: string | null };

/** Capture selected labels only: notices outlive the form and its choices. */
export function itemNarrative(cls: string, item: RuleItem): RuleNarrative | null {
  if (item.type === "restriction") return { type: "restriction", cls, parts: partsOf(item) };
  if (item.type === "disjoint" || item.type === "equivalent") return { type: item.type, cls, other: item.other.label };
  return null;
}

export function narrativeSentence(facts: RuleNarrative, locale: UiLocale = "en"): string {
  if (facts.type === "restriction") return restrictionSentence(facts.cls, facts.parts, locale);
  if (facts.type === "equivalent") return equivalentSentence(facts.cls, facts.other ?? BLANK, locale);
  return facts.other ? disjointSentence(facts.cls, facts.other, locale) : tFor(locale)("ruleSentence.disjointBlank", { cls: facts.cls });
}

export function itemSentence(cls: string, item: RuleItem, locale: UiLocale = "en"): string | null {
  const facts = itemNarrative(cls, item);
  return facts ? narrativeSentence(facts, locale) : null;
}

/** A rule line's label on the canvas (5.9): the sentence's short form. */
export function shortLabel(rule: { form: RuleForm; kind: RuleKind; n: number | null; propertyLabel: string }, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  if (rule.form === "defines") return t("ruleSentence.short.defines");
  if (rule.kind === "some" || rule.kind === "only" || rule.kind === "value") return t(`ruleSentence.short.${rule.kind}`, { property: rule.propertyLabel });
  return t(`ruleSentence.short.${rule.kind}`, { count: rule.n ?? 0, property: rule.propertyLabel });
}

/** A box's count of the rules the canvas does not draw (5.9). */
export function moreRulesText(n: number, locale: UiLocale = "en"): string {
  return tFor(locale)(n === 1 ? "ruleSentence.more.one" : "ruleSentence.more.many", { count: n });
}

/** *has line* read as the thing it links to, *line*; null for any other
 *  name, which is read as written. */
function hasNoun(property: string): string | null {
  return /^has /i.test(property) && property.trim().length > 4 ? property.trim().slice(4) : null;
}

/** The thing a property links to, for the note: *line* for *has line*. */
function thing(property: string): string {
  return hasNoun(property) ?? property;
}

/** The open-world note under a restriction (Q3, Section 7): what the rule
 *  does not do, with the case that is not an error. */
export function openWorldNote(cls: string, parts: RuleParts, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const articleClass = articleName(cls, locale);
  if (parts.form === "defines") return t("ruleSentence.world.defines", { articleClass });
  const property = parts.property ? locale === "en" ? thing(parts.property) : parts.property : BLANK;
  const n = parts.n ?? 0;
  switch (parts.kind) {
    case "some": return t("ruleSentence.world.some", { cls, articleClass, property });
    case "atLeast": case "atMost": return t(`ruleSentence.world.${parts.kind}`, { cls, articleClass, count: n, property: locale === "en" && n !== 1 ? plural(property) : property });
    case "only": return t("ruleSentence.world.only", { cls, articleClass, property: articleName(property, locale), filler: parts.filler ? articleName(parts.filler, locale) : BLANK });
    case "exactly": return t("ruleSentence.world.exactly", { cls, articleClass, property: locale === "en" ? plural(property) : property });
    default: return t("ruleSentence.world.default", { cls, articleClass, property });
  }
}

// ---------------------------------------------------------------------------
// The sentence builder
// ---------------------------------------------------------------------------

export type RuleType = "every" | "defines" | "disjoint" | "equivalent";

export interface BuilderState {
  type: RuleType;
  property: string | null;
  kind: RuleKind | null;
  /** The number, as typed. */
  n: string;
  /** A class, a type of value, or a thing (an IRI); null when none. */
  filler: string | null;
  /** A *has value* attribute's value, as typed. */
  value: string;
  /** The defining form's named class, or null for *something*. */
  with: string | null;
  /** The other class of a disjoint or same-meaning rule. */
  other: string | null;
  /** An existing *has value*'s value as it was read, so Edit and Save
   *  without a change send it back with its language or type (code review:
   *  "red"@en came back as plain text). */
  original?: AnnotationValue | null;
}

export const EMPTY_BUILDER: BuilderState = {
  type: "every",
  property: null,
  kind: null,
  n: "1",
  filler: null,
  value: "",
  with: null,
  other: null,
};

export function ruleTypeChoices(locale: UiLocale = "en"): { id: RuleType; words: (cls: string) => string }[] {
  const t = tFor(locale);
  return ["every", "defines", "disjoint", "equivalent"].map(type => {
    const id = type as RuleType;
    return { id, words: cls => t(`ruleSentence.type.${id}`, { cls: id === "defines" && locale === "en" ? capital(a(cls)) : cls }) };
  });
}
export const RULE_TYPES = ruleTypeChoices();

/** The kinds a property is offered (5.8): an attribute takes a count or a
 *  value; a relationship any of the six. */
export function kindsFor(propertyKind: "relationship" | "attribute" | null | undefined, locale: UiLocale = "en"): { id: RuleKind; words: string }[] {
  const t = tFor(locale);
  const ids: RuleKind[] = ["some", "only", "exactly", "atLeast", "atMost", "value"];
  return ids.filter(id => propertyKind !== "attribute" || id !== "some" && id !== "only").map(id => ({ id, words: t(`ruleSentence.kind.${id}`) }));
}

/** The seven types of value E-6 offers, as an attribute's count may name one. */
export const VALUE_TYPES: { iri: string; label: string }[] = [
  "string",
  "integer",
  "decimal",
  "boolean",
  "date",
  "dateTime",
  "anyURI",
].map((name) => ({ iri: `${XSD}${name}`, label: `xsd:${name}` }));

function find(list: RuleRef[] | undefined, iri: string | null): RuleRef | undefined {
  return iri ? list?.find((r) => r.iri === iri) : undefined;
}

/** The chosen property's kind, from the choices. */
export function propertyKind(state: BuilderState, choices: RuleChoices | null): "relationship" | "attribute" | null {
  const chosen = choices?.properties.items.find((p) => p.iri === state.property);
  return chosen?.kind ?? null;
}

function parsedN(state: BuilderState): number | null {
  if (!/^\d+$/.test(state.n.trim())) return null;
  const n = Number(state.n.trim());
  return n <= 1000 ? n : null;
}

/** The builder's sentence so far, with "…" in each blank still empty: the
 *  group's name and what Add announces (Section 6, Accessibility). */
export function builderNarrative(cls: string, state: BuilderState, choices: RuleChoices | null): RuleNarrative {
  const label = (list: RuleRef[] | undefined, iri: string | null) => find(list, iri)?.label ?? null;
  if (state.type === "disjoint" || state.type === "equivalent") {
    return { type: state.type, cls, other: label(choices?.classes.items, state.other) };
  }
  const attribute = propertyKind(state, choices) === "attribute";
  let filler: string | null = null;
  if (state.kind === "value") {
    filler = attribute ? state.value.trim() || null : label(choices?.things.items, state.filler);
  } else if (state.filler) {
    filler = attribute ? (find(VALUE_TYPES, state.filler)?.label ?? state.filler) : label(choices?.classes.items, state.filler);
  }
  return { type: "restriction", cls, parts: {
    form: state.type,
    kind: state.kind,
    property: label(choices?.properties.items, state.property),
    filler,
    n: isCount(state.kind) ? parsedN(state) : null,
    with: state.type === "defines" ? label(choices?.classes.items, state.with) : null,
  } };
}

export function builderSentence(cls: string, state: BuilderState, choices: RuleChoices | null, locale: UiLocale = "en"): string {
  return narrativeSentence(builderNarrative(cls, state, choices), locale);
}

/** What stops Add, in words, or null when the rule can be written. The
 *  server checks again and has the last word (5.10). */
export function builderProblem(state: BuilderState, choices: RuleChoices | null, locale: UiLocale = "en"): string | null {
  if (state.type === "disjoint" || state.type === "equivalent") {
    return state.other ? null : tFor(locale)("ruleSentence.problem.other");
  }
  if (!state.property) return tFor(locale)("ruleSentence.problem.property");
  if (!state.kind) return tFor(locale)("ruleSentence.problem.kind");
  const attribute = propertyKind(state, choices) === "attribute";
  if (attribute && (state.kind === "some" || state.kind === "only")) {
    return tFor(locale)("ruleSentence.problem.attribute");
  }
  if (isCount(state.kind) && parsedN(state) === null) return tFor(locale)("ruleSentence.problem.number");
  if ((state.kind === "some" || state.kind === "only") && !state.filler) return tFor(locale)("ruleSentence.problem.target");
  if (state.kind === "value" && (attribute ? !state.value.trim() : !state.filler)) return tFor(locale)("ruleSentence.problem.value");
  return null;
}

/** An attribute's value as the commands take it: typed with the
 *  attribute's own type when it is one of the seven, else text without a
 *  language (written plain). */
function attributeValue(state: BuilderState, choices: RuleChoices | null): AnnotationValue {
  const was = state.original;
  if (was && was.kind !== "link" && was.value === state.value.trim()) return was;
  const datatype = choices?.properties.items.find((p) => p.iri === state.property)?.datatype ?? null;
  const offered = datatype && datatype.startsWith(XSD) ? `xsd:${datatype.slice(XSD.length)}` : null;
  const known = offered && VALUE_TYPES.some((t) => t.label === offered) ? offered : "xsd:string";
  return { kind: "typed", value: state.value.trim(), datatype: known };
}

/** The one command Add sends (5.10): AddRestriction, or ReplaceRestriction
 *  with the old rule's key when editing; AddDisjointWith or
 *  AddEquivalentClass for the pairs. Null while a blank stops it. */
export function builderCommand(
  cls: string,
  state: BuilderState,
  choices: RuleChoices | null,
  replacing: RuleKey | null = null,
): { name: string; args: Record<string, unknown> } | null {
  if (builderProblem(state, choices) !== null) return null;
  if (state.type === "disjoint") return { name: "AddDisjointWith", args: { a: cls, b: state.other } };
  if (state.type === "equivalent") return { name: "AddEquivalentClass", args: { a: cls, b: state.other } };
  const attribute = propertyKind(state, choices) === "attribute";
  const kind = state.kind!;
  let filler: unknown = null;
  if (kind === "value") filler = attribute ? attributeValue(state, choices) : state.filler;
  else filler = state.filler;
  const args: Record<string, unknown> = {
    class: cls,
    form: state.type,
    property: state.property,
    kind,
    filler,
    n: isCount(kind) ? parsedN(state) : null,
  };
  if (state.type === "defines" && state.with) args.with = state.with;
  if (replacing) return { name: "ReplaceRestriction", args: { ...args, restriction: replacing } };
  return { name: "AddRestriction", args };
}

/** The builder opened on an existing restriction, for Edit. */
export function stateOf(item: RuleRestriction): BuilderState {
  const value = item.kind === "value" && item.filler && !("iri" in item.filler) ? (item.filler as AnnotationValue) : null;
  return {
    type: item.form,
    property: item.property.iri,
    kind: item.kind,
    n: item.n === null ? "1" : String(item.n),
    filler: value ? (value.kind === "link" ? value.value : null) : item.filler && "iri" in item.filler ? item.filler.iri : null,
    value: value && value.kind !== "link" ? value.value : "",
    with: item.with?.iri ?? null,
    other: null,
    original: value && value.kind !== "link" ? { ...value } : null,
  };
}

/** The command that takes an item away (5.9's Remove). */
export function removeCommand(cls: string, item: RuleItem): { name: string; args: Record<string, unknown> } | null {
  if (!item.editable) return null;
  if (item.type === "restriction") return { name: "RemoveRestriction", args: { class: cls, restriction: item.key } };
  if (item.type === "disjoint") return { name: "RemoveDisjointWith", args: { a: cls, b: item.other.iri } };
  if (item.type === "equivalent") return { name: "RemoveEquivalentClass", args: { a: cls, b: item.other.iri } };
  return null;
}

/** A stable key for an item, so a refusal or focus can follow it across a
 *  refetch that re-orders the list. */
export function itemKey(item: RuleItem): string {
  if (item.type === "restriction") return `r:${JSON.stringify(item.key)}`;
  if (item.type === "turtle") return `t:${item.turtle}`;
  return `${item.type}:${item.other.iri}`;
}
