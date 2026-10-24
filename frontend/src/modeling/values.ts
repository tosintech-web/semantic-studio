/*
================================================================================
FILE: frontend/src/modeling/values.ts
================================================================================

SUMMARY
    Annotation values in the editing form (visual-modeling 5.1.1): the value
    types offered, the default type for a property, and the check that refuses
    an invalid value before anything is sent (AC-2).

BASIC IDEA
    The command layer already refuses an invalid value with a sentence
    (authoring-foundations 5.4.1), and it stays the authority. This is the same
    rule run in the browser, so that "Add" can be unavailable while the value
    is wrong and the sentence can appear as the user types, rather than after
    a round trip. The patterns match the server's lexical checks; UI words
    live in whole catalog templates. If validation rules drift apart, the
    server still refuses and the form shows its refusal instead.

    A value type is what the user chooses ("Date"); a value is what the
    command takes ({kind: "typed", value, datatype: "xsd:date"}). The seven
    datatypes are the command layer's; text in a language and a link are the
    other two kinds.

INPUTS / INPUT SOURCES
    - What the user typed, the chosen type, and a language tag.

EXPECTED OUTPUT
    - valueTypeChoices, English-compatible VALUE_TYPES, typeKey/typeFromKey,
      valueProblem (a current-language sentence or null),
      toValue, describeValue (the kind shown beside an existing value).
================================================================================
*/

import { englishTranslator } from "../i18n/format";
import type { Translator } from "../i18n/types";
import { validLanguageTag } from "../projects/form";
import type { AnnotationValue, ValueType } from "../types";

/** The seven datatypes the command layer offers, by local name. */
export const DATATYPES = ["string", "integer", "decimal", "boolean", "date", "dateTime", "anyURI"] as const;
export type Datatype = (typeof DATATYPES)[number];

/** Every type the form offers, keyed for a <select>, with the words it shows. */
const VALUE_TYPE_IDENTITIES: { key: string; label: `values.type.${Datatype | "text" | "link"}`; type: ValueType }[] = [
  { key: "text", label: "values.type.text", type: { kind: "text" } },
  { key: "xsd:string", label: "values.type.string", type: { kind: "typed", datatype: "xsd:string" } },
  { key: "xsd:integer", label: "values.type.integer", type: { kind: "typed", datatype: "xsd:integer" } },
  { key: "xsd:decimal", label: "values.type.decimal", type: { kind: "typed", datatype: "xsd:decimal" } },
  { key: "xsd:boolean", label: "values.type.boolean", type: { kind: "typed", datatype: "xsd:boolean" } },
  { key: "xsd:date", label: "values.type.date", type: { kind: "typed", datatype: "xsd:date" } },
  { key: "xsd:dateTime", label: "values.type.dateTime", type: { kind: "typed", datatype: "xsd:dateTime" } },
  { key: "xsd:anyURI", label: "values.type.anyURI", type: { kind: "typed", datatype: "xsd:anyURI" } },
  { key: "link", label: "values.type.link", type: { kind: "link" } },
];

export function valueTypeChoices(t: Translator = englishTranslator): { key: string; label: string; type: ValueType }[] {
  return VALUE_TYPE_IDENTITIES.map(entry => ({ ...entry, label: t(entry.label) }));
}
export const VALUE_TYPES = valueTypeChoices();

const XSD = "http://www.w3.org/2001/XMLSchema#";

/** The datatype's local name, from xsd:date, the full IRI or date; else null. */
export function datatypeName(datatype: string | null | undefined): Datatype | null {
  if (!datatype) return null;
  const local = datatype.startsWith("xsd:")
    ? datatype.slice(4)
    : datatype.startsWith(XSD)
      ? datatype.slice(XSD.length)
      : datatype;
  return (DATATYPES as readonly string[]).includes(local) ? (local as Datatype) : null;
}

/** The <select> key for a type. */
export function typeKey(type: ValueType): string {
  if (type.kind !== "typed") return type.kind;
  return `xsd:${datatypeName(type.datatype) ?? "string"}`;
}

export function typeFromKey(key: string): ValueType {
  return (VALUE_TYPES.find((t) => t.key === key) ?? VALUE_TYPES[0]).type;
}

// editing.py's _LEXICAL, pattern for pattern.
const TZ = "(Z|[+-](0[0-9]|1[0-4]):[0-5][0-9])?";
const DATE = "(-?[0-9]{4,})-([0-9]{2})-([0-9]{2})";
type LexicalProblem = "values.problem.integer" | "values.problem.decimal" | "values.problem.boolean" | "values.problem.date" | "values.problem.dateTime";
const LEXICAL: Record<string, { pattern: RegExp; code: LexicalProblem }> = {
  integer: { pattern: /^[+-]?[0-9]+$/, code: "values.problem.integer" },
  decimal: {
    pattern: /^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$/,
    code: "values.problem.decimal",
  },
  boolean: { pattern: /^(true|false|1|0)$/, code: "values.problem.boolean" },
  date: { pattern: new RegExp(`^${DATE}${TZ}$`), code: "values.problem.date" },
  dateTime: {
    pattern: new RegExp(`^${DATE}T([0-9]{2}):([0-9]{2}):([0-9]{2})(\\.[0-9]+)?${TZ}$`),
    code: "values.problem.dateTime",
  },
};

function realDate(year: string, month: string, day: string): boolean {
  // As the server: a year Date cannot hold is checked against a leap year.
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const safe = y >= 1 && y <= 9999 ? y : 2000;
  if (m < 1 || m > 12 || d < 1) return false;
  const days = new Date(Date.UTC(safe, m, 0)).getUTCDate();
  return d <= days;
}

/** Why a value cannot be sent as this type, in the server's words; null if it can. */
export function valueProblem(type: ValueType, raw: string, lang?: string, t: Translator = englishTranslator): string | null {
  if (type.kind === "text") {
    if (!raw.trim()) return t("values.emptyText");
    if (lang !== undefined && !validLanguageTag(lang)) {
      return t("values.badLanguage", { value: lang });
    }
    return null;
  }
  if (type.kind === "link") {
    if (!raw.trim()) return t("values.emptyLink");
    if (/\s/.test(raw.trim())) return t("values.linkSpace");
    if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw.trim())) {
      return t("values.badLink", { value: raw.trim() });
    }
    return null;
  }
  const name = datatypeName(type.datatype) ?? "string";
  if (name === "string") return null;
  if (name === "anyURI") {
    return !raw || /\s/.test(raw) ? t("values.badUri", { value: raw }) : null;
  }
  const rule = LEXICAL[name];
  const match = rule.pattern.exec(raw);
  let ok = match !== null;
  if (ok && (name === "date" || name === "dateTime")) ok = realDate(match![1], match![2], match![3]);
  if (ok && name === "dateTime") {
    const [h, m, s] = [Number(match![4]), Number(match![5]), Number(match![6])];
    ok = (h < 24 && m < 60 && s < 60) || (h === 24 && m === 0 && s === 0);
  }
  return ok ? null : t(rule.code, { value: raw });
}

/** The value the command takes. Text keeps its language; a link and a typed
 *  value are sent as typed, trimmed only where spaces cannot be meant. */
export function toValue(type: ValueType, raw: string, lang?: string): AnnotationValue {
  if (type.kind === "text") return { kind: "text", value: raw, ...(lang ? { lang } : {}) };
  if (type.kind === "link") return { kind: "link", value: raw.trim() };
  const name = datatypeName(type.datatype) ?? "string";
  return { kind: "typed", value: name === "string" ? raw : raw.trim(), datatype: `xsd:${name}` };
}

/** The type of an existing value, for editing it in place. */
export function typeOfValue(value: AnnotationValue): ValueType {
  if (value.kind === "typed") return { kind: "typed", datatype: value.datatype ?? "xsd:string" };
  return { kind: value.kind };
}

/** What kind of value this is, using the UI language only for its description. */
export function describeValue(value: AnnotationValue, t: Translator = englishTranslator): string {
  if (value.kind === "text") return value.lang ? t("values.description.textLang", { language: value.lang }) : t("values.description.string");
  if (value.kind === "link") return t("values.description.link");
  const name = datatypeName(value.datatype);
  return name ? t(`values.description.${name}`) : (value.datatype ?? t("values.description.string"));
}
