/*
================================================================================
FILE: frontend/src/modeling/dataChoices.ts
================================================================================

SUMMARY
    The data wizard's rules for its choices (csv-data-import 5.2 to 5.4):
    what each column starts as, one column at most as the name, how a
    choice is written in a select, the type a new attribute is suggested
    from its values, and why Next cannot be pressed yet.

BASIC IDEA
    One decision per step, and suggestions never applied silently (Section
    7): a column the server suggests starts at that choice and is marked
    *suggested*; every other column starts at Ignore. A choice the learner
    made earlier -- a snapshot's stored mapping, kept through a refresh
    whose headers changed -- wins over a suggestion, for every column the
    new file still has.

    Kept out of the component so the rules are tested without rendering,
    as dataSentences.ts is for the words. Explicit UI locale changes display
    labels and blocking reasons, never saved choice values or inferred types.
    Header-keyed records have no prototype and incoming maps use own keys,
    so names such as __proto__ and constructor remain literal column names.

INPUTS / INPUT SOURCES
    - The server's inspection (column profiles) and preview (suggestions).

EXPECTED OUTPUT
    - initialColumns, withChoice, choiceValue, parseChoice, suggestedType,
      NEW_TYPES (English compatibility), newTypes, stepBlocked.
================================================================================
*/

import { translate } from "../i18n/format";
import type { Translator, UiLocale } from "../i18n/types";

import type { ColumnChoice, ColumnProfile, DataInspection, DataOptions } from "../types";

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;

const XSD = "http://www.w3.org/2001/XMLSchema#";
const LANG_STRING = "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString";

/** The select value that opens the inline New attribute form. */
export const NEW_ATTRIBUTE = "new";

/** The types a new attribute can have, as the attribute form offers them. */
export function newTypes(locale: UiLocale = "en"): { key: string; label: string; datatype: string }[] {
  const t = tFor(locale);
  return [
    { key: "text", label: t("dataChoices.type.text"), datatype: LANG_STRING },
    { key: "integer", label: t("dataChoices.type.integer"), datatype: `${XSD}integer` },
    { key: "decimal", label: t("dataChoices.type.decimal"), datatype: `${XSD}decimal` },
    { key: "date", label: t("dataChoices.type.date"), datatype: `${XSD}date` },
    { key: "dateTime", label: t("dataChoices.type.dateTime"), datatype: `${XSD}dateTime` },
    { key: "boolean", label: t("dataChoices.type.boolean"), datatype: `${XSD}boolean` },
    { key: "string", label: t("dataChoices.type.string"), datatype: `${XSD}string` },
  ];
}

/** English compatibility for callers that use the stable type identities. */
export const NEW_TYPES = newTypes();

/** A new attribute's type, suggested from its column's values (5.4): all
 *  whole numbers make an integer, all dates a date. */
export function suggestedType(profile: ColumnProfile | undefined): string {
  if (!profile) return "text";
  if (profile.wholeNumbers) return "integer";
  if (profile.dates) return "date";
  if (profile.dateTimes) return "dateTime";
  if (profile.numbers) return "decimal";
  return "text";
}

/** What each column starts as, and which of those were suggested. */
export function initialColumns(
  columns: string[],
  suggestions: Record<string, ColumnChoice>,
  previous?: Record<string, ColumnChoice> | null,
): { columns: Record<string, ColumnChoice>; suggested: string[] } {
  const out: Record<string, ColumnChoice> = Object.create(null);
  const suggested: string[] = [];
  for (const column of columns) {
    const earlier = previous && own(previous, column) ? previous[column] : undefined;
    if (earlier) out[column] = earlier;
    else if (own(suggestions, column) && suggestions[column]) {
      out[column] = suggestions[column];
      suggested.push(column);
    } else out[column] = { as: "ignore" };
  }
  return { columns: withOneName(out), suggested };
}

function withOneName(columns: Record<string, ColumnChoice>): Record<string, ColumnChoice> {
  let named = false;
  const out: Record<string, ColumnChoice> = Object.create(null);
  for (const [column, choice] of Object.entries(columns)) {
    if (choice.as === "name") {
      out[column] = named ? { as: "ignore" } : choice;
      named = true;
    } else out[column] = choice;
  }
  return out;
}

/** One column's new choice. A second column made the name takes the name
 *  from the first, which goes back to Ignore: a row has one name. */
export function withChoice(
  columns: Record<string, ColumnChoice>,
  column: string,
  choice: ColumnChoice,
): Record<string, ColumnChoice> {
  const out: Record<string, ColumnChoice> = Object.create(null);
  for (const [name, current] of Object.entries(columns)) {
    out[name] = choice.as === "name" && current.as === "name" ? { as: "ignore" } : current;
  }
  out[column] = choice;
  return out;
}

/** A choice as a select's value. */
export function choiceValue(choice: ColumnChoice | undefined): string {
  if (!choice || choice.as === "ignore") return "ignore";
  if (choice.as === "name") return "name";
  return `${choice.as} ${choice.property ?? ""}`;
}

/** A select's value as a choice, or NEW_ATTRIBUTE. */
export function parseChoice(value: string): ColumnChoice | typeof NEW_ATTRIBUTE {
  if (value === NEW_ATTRIBUTE) return NEW_ATTRIBUTE;
  if (value === "name") return { as: "name" };
  const at = value.indexOf(" ");
  if (at > 0) {
    const as = value.slice(0, at);
    if (as === "attribute" || as === "relationship") return { as, property: value.slice(at + 1) };
  }
  return { as: "ignore" };
}

/** Why Next cannot be pressed on a step, or null when it can (Section 6).
 *
 *  Steps 2 and 3 wait for the server's reading of the chosen class: the
 *  identifier check and the fields (`basis`), as they are for the class
 *  and identifier now chosen -- never those of a class chosen before --
 *  and, on step 3, the columns' choices made from it. A failed reading
 *  says so and waits for Try again, so step 4 is never reached without
 *  choices (PR #53 review). */
export function stepBlocked(
  step: number,
  state: {
    inspection: DataInspection | null;
    options: DataOptions;
    classIri: string | null;
    basis?: "ready" | "reading" | "failed";
    columnsReady?: boolean;
    // A read of the file on its way: the table shown may be the last one's.
    reading?: boolean;
    // false while a workbook's sheet is still to be chosen (a refresh whose
    // sheet is gone).
    sheetChosen?: boolean;
  },
  locale: UiLocale = "en",
): string | null {
  const t = tFor(locale);
  if (step === 1) {
    if (state.reading) return t("dataChoices.blocked.reading");
    if (state.sheetChosen === false) return t("dataChoices.blocked.sheet");
    if (!state.inspection) return t("dataChoices.blocked.file");
    if (state.inspection.sample && !state.options.sample) {
      return t("dataChoices.blocked.sample", { limit: state.inspection.limit });
    }
    if (state.inspection.kept === 0) return t("dataChoices.blocked.empty");
  }
  if (step === 2) {
    if (!state.classIri) return t("dataChoices.blocked.class");
    if (state.basis === "failed") return t("dataChoices.blocked.idFailed");
    if (state.basis !== "ready") return t("dataChoices.blocked.idReading");
  }
  if (step === 3 && !state.columnsReady) {
    return state.basis === "failed"
      ? t("dataChoices.blocked.fieldsFailed")
      : t("dataChoices.blocked.fieldsReading");
  }
  return null;
}
