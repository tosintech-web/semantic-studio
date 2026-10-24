/*
================================================================================
FILE: frontend/src/modeling/shapeSentences.ts
================================================================================

SUMMARY
    The sentences a SHACL shape is read as (shacl-authoring 5.3, 5.4, 5.7):
    each rule (*must have exactly one name, as text*), the whole shape
    (*Every Person must have exactly one name, as text, and must have a
    birth date, as a date.*), a list row (*Every Person: 3 rules*), a
    result panel's header (*✕ Person rules: 2 of 5 people fail (3
    problems)*), the summary the live region reads after a check, and the
    checks the rule editor makes before Add is allowed.

BASIC IDEA
    Whole catalog templates provide rule descriptions, choices, editor checks
    and result-panel headers in the UI locale. English morphology stays in
    English branches; other locales preserve original labels and values.
    Validation-result summaries also derive from raw result counts.

    Every rule and every result is a sentence in the learner's own names
    (Section 7), so the sentences are built in one place and tested without
    rendering. Names come from the server, already in the display language;
    nothing here reads ontology text as markup or as a pattern. A pattern a
    learner types is checked by constructing a RegExp from it -- their own
    input, never ontology text -- so a mistake is caught before it is sent.

    A rule's sentence is a head and its qualifiers. The head says how many
    (*must have a*, *may have at most one*, *must have between 1 and 3*); a
    relationship reads as its own words instead (*works for an
    Organization, at most once*), since a relationship's name is a verb. The
    qualifiers say what each value must be (*as a date*, *of at most 20
    characters*, *one of: active, retired*).

INPUTS / INPUT SOURCES
    - Rules and shapes as the server reads them (ShapeRule, ShapeForm), and
      panels as it reports them (ValidationPanel).

EXPECTED OUTPUT
    - ruleSentence, shapeSentence, rowSentence, panelHeader, panelName,
      validationSummary, problemsFound (the Results tab's words,
      load-and-shapes 5.3), ruleProblem, languageName, plural; and pathWords
      and dateTimeBound, Stage B's follow-ups 1 and 5: a relationship read
      after *must* (*must work for*, *must be member of*, by sentences.ts's
      verb rule since X-12), a minimum of 0 left unsaid, a type and its
      length one phrase, a rule without a label named by its path.
================================================================================
*/

import { englishTranslator, translate } from "../i18n/format";
import type { Translator, UiLocale } from "../i18n/types";
import type { PanelState, ShapeForm, ShapeRule, ValidationPanel, ValidationResult } from "../types";
import { a, mustVerb } from "./sentences";

const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const DATATYPES = {
  "xsd:string": "shapeWords.datatype.string",
  "rdf:langString": "shapeWords.datatype.langString",
  "xsd:integer": "shapeWords.datatype.integer",
  "xsd:decimal": "shapeWords.datatype.decimal",
  "xsd:boolean": "shapeWords.datatype.boolean",
  "xsd:date": "shapeWords.datatype.date",
  "xsd:dateTime": "shapeWords.datatype.dateTime",
  "xsd:anyURI": "shapeWords.datatype.anyURI",
} as const;
const LANGUAGE_CODES = {
  ar: "shapeWords.language.ar",
  ca: "shapeWords.language.ca",
  cs: "shapeWords.language.cs",
  da: "shapeWords.language.da",
  de: "shapeWords.language.de",
  el: "shapeWords.language.el",
  en: "shapeWords.language.en",
  es: "shapeWords.language.es",
  fi: "shapeWords.language.fi",
  fr: "shapeWords.language.fr",
  he: "shapeWords.language.he",
  hi: "shapeWords.language.hi",
  hu: "shapeWords.language.hu",
  it: "shapeWords.language.it",
  ja: "shapeWords.language.ja",
  ko: "shapeWords.language.ko",
  la: "shapeWords.language.la",
  nb: "shapeWords.language.nb",
  nl: "shapeWords.language.nl",
  no: "shapeWords.language.no",
  pl: "shapeWords.language.pl",
  pt: "shapeWords.language.pt",
  ro: "shapeWords.language.ro",
  ru: "shapeWords.language.ru",
  sv: "shapeWords.language.sv",
  tr: "shapeWords.language.tr",
  uk: "shapeWords.language.uk",
  zh: "shapeWords.language.zh",
} as const;

/** Type identities stay stable when their display words change. */
export function offeredTypes(locale: UiLocale = "en"): { value: string; label: string }[] {
  const t = tFor(locale);
  return [
    { value: "xsd:string", label: t("shapeWords.offered.string") },
    { value: "xsd:integer", label: t("shapeWords.offered.integer") },
    { value: "xsd:decimal", label: t("shapeWords.offered.decimal") },
    { value: "xsd:boolean", label: t("shapeWords.offered.boolean") },
    { value: "xsd:date", label: t("shapeWords.offered.date") },
    { value: "xsd:dateTime", label: t("shapeWords.offered.dateTime") },
    { value: "xsd:anyURI", label: t("shapeWords.offered.anyURI") },
  ];
}
export const OFFERED_TYPES = offeredTypes();

export function languageName(tag: string, locale: UiLocale = "en"): string {
  const base = tag.split("-")[0].toLowerCase();
  return own(LANGUAGE_CODES, base) ? tFor(locale)(LANGUAGE_CODES[base as keyof typeof LANGUAGE_CODES]) : tag;
}

const IRREGULAR: Record<string, string> = {
  person: "people",
  child: "children",
  man: "men",
  woman: "women",
  class: "classes",
};

/** The plural of a noun phrase's last word. A phrase that says which one in
 *  brackets, *name (label)*, is the word before them: *names (label)*. */
export function plural(phrase: string): string {
  const note = phrase.endsWith(")") ? phrase.lastIndexOf(" (") : -1;
  if (note > 0) return `${plural(phrase.slice(0, note))}${phrase.slice(note)}`;
  const at = phrase.lastIndexOf(" ");
  const head = at >= 0 ? phrase.slice(0, at + 1) : "";
  const last = phrase.slice(at + 1);
  const lower = last.toLowerCase();
  let out: string;
  if (lower in IRREGULAR) {
    out = IRREGULAR[lower];
    if (last[0] && last[0] !== last[0].toLowerCase()) out = out[0].toUpperCase() + out.slice(1);
  } else if (/[^aeiou]y$/.test(lower)) out = last.slice(0, -1) + "ies";
  else if (/(s|x|z|ch|sh)$/.test(lower)) out = last + "es";
  else out = last + "s";
  return head + out;
}

/** What a rule is about, in words: its label, or the path's last name when
 *  it has none -- never "undefined" (Stage A follow-up 5). */
export function pathWords(rule: Pick<ShapeRule, "path" | "pathLabel">, locale: UiLocale = "en"): string {
  if (rule.pathLabel) return rule.pathLabel;
  const names = rule.path.map((iri) => iri.slice(Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/")) + 1) || iri);
  return names.join(tFor(locale)("shapeWords.pathOr")) || tFor(locale)("shapeWords.value");
}

/** A date and time as the server reads one: a field that shows no seconds
 *  when they are zero gives "2020-01-01T10:00", which needs ":00". */
export function dateTimeBound(value: string): string {
  return /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

function listWords(items: string[], last: "and" | "or", t: Translator): string {
  if (items.length <= 1) return items.join("");
  return t("shapeWords.list", { head: items.slice(0, -1).join(t("shapeWords.separator")), join: t(`shapeWords.${last}`), tail: items[items.length - 1] });
}
function typeWord(datatype: string, t: Translator): string {
  return own(DATATYPES, datatype) ? t(DATATYPES[datatype as keyof typeof DATATYPES]) : t("shapeWords.typeUnknown", { datatype });
}
function times(n: number, t: Translator): string {
  return n === 1 ? t("shapeWords.once") : n === 2 ? t("shapeWords.twice") : t("shapeWords.times", { count: n });
}
function valueWord(v: { value: string; label?: string; kind: string }): string {
  return v.kind === "link" ? v.label ?? v.value : v.value;
}

/** What each value must be, in the order a learner reads them. */
function qualifiers(rule: ShapeRule, relationship: boolean, locale: UiLocale): string[] {
  const t = tFor(locale);
  const out: string[] = [];
  if (rule.datatype) out.push(t("shapeWords.as", { type: typeWord(rule.datatype, t) }));
  if (rule.class && !relationship) out.push(t("shapeWords.pointing", { target: locale === "en" ? a(rule.classLabel ?? rule.class) : rule.classLabel ?? rule.class }));
  const { minLength: lo, maxLength: hi } = rule;
  if (lo !== undefined && hi !== undefined) out.push(t("shapeWords.length.between", { low: lo, high: hi }));
  else if (lo !== undefined) out.push(t(lo === 1 ? "shapeWords.length.min.one" : "shapeWords.length.min.many", { count: lo }));
  else if (hi !== undefined) out.push(t(hi === 1 ? "shapeWords.length.max.one" : "shapeWords.length.max.many", { count: hi }));
  if (rule.pattern) out.push(t("shapeWords.pattern", { pattern: rule.pattern }));
  const low = rule.minInclusive?.value;
  const high = rule.maxInclusive?.value;
  if (low !== undefined && high !== undefined) out.push(t("shapeWords.range.between", { low, high }));
  else if (low !== undefined) out.push(t("shapeWords.range.min", { value: low }));
  else if (high !== undefined) out.push(t("shapeWords.range.max", { value: high }));
  if (rule.in?.length) out.push(t("shapeWords.allowed", { values: rule.in.map(valueWord).join(t("shapeWords.separator")) }));
  if (rule.languageIn?.length) out.push(t("shapeWords.languages", { languages: listWords(rule.languageIn.map(tag => languageName(tag, locale)), "or", t) }));
  if (rule.uniqueLang) out.push(t("shapeWords.unique"));
  return out;
}

/** One rule, as the form lists it and the editor reads it back (5.3). */
export function ruleSentence(rule: ShapeRule, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const label = pathWords(rule, locale);
  const noun = locale === "en" ? plural(label) : label;
  const one = locale === "en" ? a(label) : label;
  const min = rule.minCount === 0 ? undefined : rule.minCount;
  const max = rule.maxCount;
  const required = rule.requiredLanguages ?? [];
  if (rule.pathKind === "relationship") {
    const target = rule.class ? locale === "en" ? a(rule.classLabel ?? rule.class) : rule.classLabel ?? rule.class : t("shapeWords.something");
    let count = "";
    if (min !== undefined && max !== undefined && min === max) count = t("shapeWords.rel.exactly", { times: times(min, t) });
    else if (min !== undefined && max !== undefined) count = t("shapeWords.rel.between", { low: min, high: max });
    else if (min !== undefined && min > 0) count = min === 1 ? t("shapeWords.rel.min.one") : t("shapeWords.rel.min.many", { count: min });
    else if (max !== undefined) count = t("shapeWords.rel.max", { times: times(max, t) });
    return [t("shapeWords.relation", { label, target }), count, ...qualifiers(rule, true, locale)].filter(Boolean).join(t("shapeWords.separator"));
  }
  let head: string;
  if (min === 1 && max === 1) head = t("shapeWords.count.exactlyOne", { label });
  else if (min !== undefined && max !== undefined && min === max) head = t("shapeWords.count.exactly", { count: min, label: noun });
  else if (min !== undefined && max !== undefined) head = t("shapeWords.count.between", { low: min, high: max, label: noun });
  else if (min !== undefined && min > 0) head = min === 1 ? t("shapeWords.count.required", { label: one }) : t("shapeWords.count.min", { count: min, label: noun });
  else if (max === 1) head = t("shapeWords.count.maxOne", { label });
  else if (max !== undefined) head = t("shapeWords.count.max", { count: max, label: noun });
  else if (required.length) head = t("shapeWords.count.required", { label: one });
  else head = t("shapeWords.count.any", { label: noun });
  if (required.length) head = t("shapeWords.requiredLanguages", { head, languages: listWords(required.map(tag => languageName(tag, locale)), "and", t) });
  const quals = qualifiers(rule, false, locale);
  // Only English folds the datatype and length into one phrase and adds
  // "each". Japanese uses explicit field descriptions with unchanged names.
  const lengthAt = rule.class ? 2 : 1;
  if (locale === "en" && rule.datatype && !rule.class && (rule.minLength !== undefined || rule.maxLength !== undefined)) {
    quals.splice(0, 2, t("shapeWords.typeLength", { type: quals[0], length: quals[lengthAt] }));
  }
  if (locale === "en" && quals.length && (max === undefined || max > 1) && !(min === 1 && max === 1)) {
    quals[0] = t("shapeWords.each", { qualifier: rule.datatype ? quals[0].slice(t("shapeWords.as", { type: "" }).length) : quals[0] });
  }
  return [head, ...quals].join(t("shapeWords.separator"));
}

/** Who a shape is about: *Every Person*, *Every class*, *Every concept*. */
export function everyWord(shape: Pick<ShapeForm, "target">, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  if (!shape.target) return t("shapeWords.everyMatch");
  if (locale === "en" && shape.target.every) return shape.target.every[0].toUpperCase() + shape.target.every.slice(1);
  if (locale !== "en") {
    const iri = shape.target.iri;
    if (iri === "http://www.w3.org/2002/07/owl#Class" || iri === "http://www.w3.org/2000/01/rdf-schema#Class") return t("shapeWords.everyClass");
    if (iri === "http://www.w3.org/2004/02/skos/core#Concept") return t("shapeWords.everyConcept");
  }
  return t("shapeWords.every", { name: shape.target.label });
}

export function shapeSentence(shape: Pick<ShapeForm, "target" | "rules">, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const target = everyWord(shape, locale);
  if (!shape.rules.length) return t("shapeWords.shapeEmpty", { target });
  const parts = shape.rules.map(rule => {
    const sentence = ruleSentence(rule, locale);
    if (locale !== "en" || rule.pathKind !== "relationship") return sentence;
    const label = pathWords(rule, locale);
    return t("shapeWords.must", { verb: mustVerb(label), tail: sentence.slice(label.length) });
  });
  const rules = parts.length > 1 ? t("shapeWords.joinRules", { head: parts.slice(0, -1).join(t("shapeWords.separator")), last: parts[parts.length - 1] }) : parts[0];
  return t("shapeWords.shape", { target, rules });
}

export function rowSentence(shape: Pick<ShapeForm, "target" | "rules">, locale: UiLocale = "en"): string {
  const count = shape.rules.length;
  return tFor(locale)(count === 1 ? "shapeWords.row.one" : "shapeWords.row.many", { target: everyWord(shape, locale), count });
}

/** The word a result is said with, beside its colour: never colour alone. */
export function panelStateWord(state: PanelState, t: Translator = englishTranslator): string {
  return t(`shapePanel.state.${state}`);
}
export const STATE_WORDS: Record<PanelState, string> = {
  fails: panelStateWord("fails"), passes: panelStateWord("passes"),
  warnings: panelStateWord("warnings"), nothing: panelStateWord("nothing"), error: panelStateWord("error"),
};

export const STATE_SIGNS: Record<PanelState, string> = {
  fails: "✕",
  passes: "✓",
  warnings: "!",
  nothing: "–",
  error: "",
};

/** A panel's header text after its sign (5.7). */
export function panelHeader(panel: ValidationPanel, locale: UiLocale = "en"): string {
  const t = ((code, args) => translate(locale, code, args)) as Translator;
  // English inflections from the server are presentation for English only.
  const one = (locale === "en" ? panel.target?.one : panel.target?.label) ?? t("shapePanel.match.one");
  const many = (locale === "en" ? panel.target?.many : panel.target?.label) ?? t("shapePanel.match.many");
  const name = panel.name;
  switch (panel.state) {
    case "fails":
      return t(panel.failingCount === 1 ? "shapePanel.fail.one" : "shapePanel.fail.many", {
        name, failing: panel.failingCount, focus: panel.focusCount, target: panel.focusCount === 1 ? one : many,
        problems: t(panel.problemCount === 1 ? "shapePanel.problems.one" : "shapePanel.problems.many", { count: panel.problemCount }),
      });
    case "passes":
      return panel.focusCount === 1 ? t("shapePanel.pass.one", { name, target: one }) : t("shapePanel.pass.many", { name, count: panel.focusCount, target: many });
    case "warnings":
      return t(panel.warningCount === 1 ? "shapePanel.warning.one" : "shapePanel.warning.many", { name, count: panel.warningCount });
    case "nothing":
      return t("shapePanel.nothing", { name, target: panel.target?.label ?? t("shapePanel.match.one") });
    case "error":
      return t("shapePanel.error", { name });
  }
}

/** A panel's accessible name: the state word, then the header with counts. */
export function panelName(panel: ValidationPanel, locale: UiLocale = "en"): string {
  const t = ((code, args) => translate(locale, code, args)) as Translator;
  return t("shapePanel.name", { state: panelStateWord(panel.state, t), header: panelHeader(panel, locale) });
}

/** What the Results tab carries when a run ends while Shape is showing
 *  (load-and-shapes 5.3): the problems found, in words, never a bare number. */
export function problemsFound(result: ValidationResult, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  if (result.stopped) return t("shapeSummary.stopped");
  const count = result.shapes.reduce((sum, p) => sum + p.problemCount, 0);
  if (count === 0) return t("shapeSummary.noProblems");
  return count === 1 ? t("shapeSummary.problem.one") : t("shapeSummary.problem.many", { count });
}

/** Only summary facts are needed by a retained live-region notice. */
export type ValidationSummaryInput = Pick<ValidationResult, "stopped" | "shapeCount" | "statements"> & {
  shapes: readonly Pick<ValidationPanel, "state">[];
};

/** The live summary is derived from result facts, never stored English. */
export function validationSummary(result: ValidationSummaryInput, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  if (result.stopped) return t("shapeSummary.timeout", { shapes: result.shapeCount, statements: result.statements });
  const count = result.shapes.length;
  if (count === 0) return t("shapeSummary.empty");
  const counts: Partial<Record<PanelState, number>> = {};
  for (const panel of result.shapes) counts[panel.state] = (counts[panel.state] ?? 0) + 1;
  const states: PanelState[] = ["passes", "fails", "warnings", "nothing", "error"];
  const parts = states.filter(state => counts[state]).map(state => {
    const count = counts[state]!;
    return t(`shapeSummary.state.${state}.${count === 1 ? "one" : "many"}`, { count });
  }).join(t("shapeWords.separator"));
  return t(count === 1 ? "shapeSummary.total.one" : "shapeSummary.total.many", { count, parts });
}

/** Why a rule cannot be added yet, or null when it can (Section 6: invalid
 *  values keep Add disabled, with a sentence). */
export function ruleProblem(rule: ShapeRule, locale: UiLocale = "en"): string | null {
  const t = tFor(locale);
  const { minCount: min, maxCount: max, minLength: lo, maxLength: hi } = rule;
  for (const [n, what] of [[min, "number"], [max, "number"], [lo, "length"], [hi, "length"]] as const) {
    if (n !== undefined && (!Number.isInteger(n) || n < 0)) return t(`shapeWords.problem.${what}`);
  }
  if (min !== undefined && max !== undefined && min > max) return t("shapeWords.problem.counts", { low: min, high: max });
  if (lo !== undefined && hi !== undefined && lo > hi) return t("shapeWords.problem.lengths");
  if (rule.pattern !== undefined) {
    try {
      new RegExp(rule.pattern);
    } catch {
      return t("shapeWords.problem.pattern");
    }
  }
  const low = rule.minInclusive;
  const high = rule.maxInclusive;
  for (const bound of [low, high]) {
    if (!bound) continue;
    const isDate = bound.datatype === "xsd:date" || bound.datatype === "xsd:dateTime";
    const withTime = bound.datatype === "xsd:dateTime";
    const ok = withTime
      ? /^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(bound.value)
      : isDate
        ? /^-?\d{4,}-\d{2}-\d{2}/.test(bound.value)
        : bound.value.trim() !== "" && Number.isFinite(Number(bound.value));
    if (!ok) {
      if (withTime) return t("shapeWords.problem.dateTime", { value: bound.value });
      return isDate ? t("shapeWords.problem.date", { value: bound.value }) : t("shapeWords.problem.numeric", { value: bound.value });
    }
  }
  if (low && high && low.datatype === high.datatype) {
    const lower = low.datatype.startsWith("xsd:date") ? low.value > high.value : Number(low.value) > Number(high.value);
    if (lower) return t("shapeWords.problem.range");
  }
  if (rule.in && rule.in.length === 0) return t("shapeWords.problem.allowed");
  if (rule.languageIn && rule.languageIn.length === 0) return t("shapeWords.problem.languages");
  const says = [
    min, max, lo, hi, rule.datatype, rule.class, rule.pattern, low, high, rule.in,
    rule.languageIn, rule.uniqueLang || undefined, rule.requiredLanguages?.length ? rule.requiredLanguages : undefined,
  ].some((v) => v !== undefined && v !== "");
  return says ? null : t("shapeWords.problem.empty");
}
