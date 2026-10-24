/*
================================================================================
FILE: frontend/src/modeling/dataSentences.ts
================================================================================

SUMMARY
    The words the data import says (csv-data-import 5.2 to 5.7): the label
    every place puts on snapshot data (*from people.csv, imported 2 October
    2026; sample: first 2,000 of 12,480 rows*), the preview's rows as
    sentences (*Bob is a Person. Bob's birth date is "yesterday" — not a
    date, kept as text.*), the import report's lines -- links to rows no
    snapshot holds among them (5.9) -- the identifier check, the one word
    a snapshot's row gives its report, and a workbook's sheet and header
    row as the pickers offer them (5.8).

BASIC IDEA
    The learner's safeguard (Section 7) is that bad data is shown and
    snapshot data is never mistaken for the model, and both are sentences,
    so they are built here once and tested without rendering. Every value
    is the server's text, put into a sentence as text: nothing is read as
    markup or used as a pattern.

    The sample is part of the label itself, never a separate badge, so no
    place can show where data came from and forget that it is a sample
    (5.6, AC-6).

    An explicit UI locale (English by default for embedded callers) controls
    whole message templates and the local calendar date format. English keeps
    its original day-month-year wording and inflections; Japanese never
    inflects authors' class names. Unknown type identities stay literal.

INPUTS / INPUT SOURCES
    - DataSource, PreviewRow, ImportReportData and IdCheck, as the server
      sends them.

EXPECTED OUTPUT
    - dataLabel, sampleWords, importedOn, rowList, previewSentences,
      reportLines, unmatchedLines, reportWord, idProblems, typeWord;
      sheetOption and headerRowOption for a workbook's pickers (5.8), and
      rowLimitSentence from the actual inspection counts.
================================================================================
*/

import { translate } from "../i18n/format";
import type { Translator, UiLocale } from "../i18n/types";
import { a } from "./sentences";
import { plural } from "./shapeSentences";
import type { DataInspection, DataSource, IdCheck, ImportReportData, PreviewRow, RowList } from "../types";

const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const TYPE_WORDS = {
  date: "date", dateTime: "dateTime", integer: "integer", decimal: "number",
  double: "number", float: "number", boolean: "boolean", gYear: "year",
} as const;

/** In the browser's own time zone, preserving the English day-month order. */
export function importedOn(iso: string, locale: UiLocale = "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ja-JP", {
    day: "numeric", month: "long", year: "numeric",
  }).format(date);
}

export function sampleWords(source: Pick<DataSource, "rows" | "total" | "sample">, locale: UiLocale = "en"): string | null {
  return source.sample ? tFor(locale)("dataWords.sample", { rows: source.rows, total: source.total }) : null;
}

/** The sample stays part of the provenance label itself, in every view. */
export function dataLabel(source: Pick<DataSource, "source" | "importedAt" | "rows" | "total" | "sample">, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const label = t("dataWords.source", { source: source.source, date: importedOn(source.importedAt, locale) });
  const sample = sampleWords(source, locale);
  return sample ? t("dataWords.sourceSample", { label, sample }) : label;
}

export function rowList(list: RowList, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const shown = list.rows.map(n => n.toLocaleString(locale));
  const more = list.count - list.rows.length;
  if (shown.length === 0) return "";
  if (shown.length === 1 && more === 0) return t("dataWords.row.one", { row: list.rows[0] });
  if (more > 0) return t("dataWords.row.more", { shown: shown.join(t("dataWords.separator")), more });
  return t("dataWords.row.many", { head: shown.slice(0, -1).join(t("dataWords.separator")), last: shown[shown.length - 1] });
}

/** Known XML Schema short names; unknown values are never catalog keys. */
export function typeWord(datatype: string | null | undefined, many = false, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const key = datatype ?? "";
  const number = many ? "many" : "one";
  if (own(TYPE_WORDS, key)) return t(`dataWords.type.${TYPE_WORDS[key as keyof typeof TYPE_WORDS]}.${number}`);
  return t(`dataWords.type.unknown.${number}`, { type: datatype ?? t(`dataWords.type.default.${number}`) });
}

function quoted(value: string): string {
  return `"${value}"`;
}

export function previewSentences(row: PreviewRow, className: string, locale: UiLocale = "en"): string[] {
  const t = tFor(locale);
  if (row.skipped || !row.subject) return [t("dataWords.preview.skipped", { row: row.row })];
  const who = row.name ?? t("dataWords.rowName", { row: row.row });
  const sentences = [t("dataWords.preview.class", { who, kind: locale === "en" ? a(className) : className })];
  for (const value of row.values) {
    if (value.kind === "link") {
      sentences.push(t("dataWords.preview.link", { who, name: value.label, value: quoted(value.value) }));
    } else if (value.fits === false) {
      sentences.push(t("dataWords.preview.invalid", { who, name: value.label, value: quoted(value.value), type: typeWord(value.datatype, false, locale) }));
    } else {
      sentences.push(t("dataWords.preview.value", { who, name: value.label, value: value.datatype ? value.value : quoted(value.value) }));
    }
  }
  return sentences;
}

function rows(n: number, locale: UiLocale): string {
  return tFor(locale)(n === 1 ? "dataWords.rows.one" : "dataWords.rows.many", { count: n });
}

export function reportLines(
  report: ImportReportData,
  className: string,
  source?: Pick<DataSource, "rows" | "total" | "sample">,
  locale: UiLocale = "en",
): string[] {
  const t = tFor(locale);
  const kind = locale === "en" && report.individuals !== 1 ? plural(className) : className;
  const made = t("dataWords.made", { count: report.individuals, kind });
  const sample = sampleWords(source ?? { rows: report.rowsRead, total: report.total, sample: report.sample }, locale);
  const lines = [t("dataWords.reportSummary", { rows: rows(report.rowsRead, locale), made, sample: sample ? t("dataWords.sampleParen", { sample }) : "" })];
  if (report.skipped.count) lines.push(t("dataWords.skipped", { rows: rows(report.skipped.count, locale), where: rowList(report.skipped, locale) }));
  if (report.repeated.count) lines.push(t("dataWords.repeated", { rows: rows(report.repeated.count, locale), where: rowList(report.repeated, locale) }));
  for (const kept of report.keptAsText) {
    lines.push(t(kept.count === 1 ? "dataWords.kept.one" : "dataWords.kept.many", { column: kept.column, count: kept.count, type: typeWord(kept.datatype, kept.count !== 1, locale), where: rowList(kept, locale) }));
  }
  for (const empty of report.empty) lines.push(t("dataWords.empty", { column: empty.column, count: empty.count }));
  lines.push(...unmatchedLines(report, locale));
  if (report.clean) lines.push(t("dataWords.clean"));
  return lines;
}

export function unmatchedLines(report: ImportReportData, locale: UiLocale = "en"): string[] {
  const t = tFor(locale);
  return (report.unmatched ?? []).map(u => t(u.count === 1 ? "dataWords.unmatched.one" : "dataWords.unmatched.many", {
    column: u.column, count: u.count, kind: u.className, where: rowList(u, locale),
  }));
}

export function reportWord(report: ImportReportData, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  const kept = report.keptAsText.reduce((sum, k) => sum + k.count, 0);
  const unmatched = (report.unmatched ?? []).reduce((sum, u) => sum + u.count, 0);
  const parts: string[] = [];
  if (kept) parts.push(t(kept === 1 ? "dataWords.word.kept.one" : "dataWords.word.kept.many", { count: kept }));
  if (unmatched) parts.push(t(unmatched === 1 ? "dataWords.word.unmatched.one" : "dataWords.word.unmatched.many", { count: unmatched }));
  if (report.skipped.count) parts.push(t("dataWords.word.skipped", { rows: rows(report.skipped.count, locale) }));
  if (report.repeated.count) parts.push(t("dataWords.word.repeated", { rows: rows(report.repeated.count, locale) }));
  return parts.length ? parts.join(t("dataWords.separator")) : t("dataWords.word.clean");
}

export function idProblems(check: IdCheck, locale: UiLocale = "en"): string[] {
  const t = tFor(locale);
  const out: string[] = [];
  if (check.missing.count) out.push(t(check.missing.count === 1 ? "dataWords.id.missing.one" : "dataWords.id.missing.many", {
    count: check.missing.count, column: String(check.column), where: rowList(check.missing, locale),
  }));
  if (check.repeats) out.push(t(check.repeats === 1 ? "dataWords.id.repeated.one" : "dataWords.id.repeated.many", {
    count: check.repeats, column: String(check.column), where: rowList(check.repeated, locale),
  }));
  return out;
}

export function sheetOption(sheet: { name: string; rows: number }, locale: UiLocale = "en"): string {
  return tFor(locale)("dataWords.sheet", { name: sheet.name, rows: rows(sheet.rows, locale) });
}

export function headerRowOption(row: { row: number; cells: string[]; unread?: boolean }, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  if (row.unread) return t("dataWords.rowName", { row: row.row });
  if (row.cells.length === 0) return t("dataWords.headerEmpty", { row: row.row });
  const shown = row.cells.map(c => c.length > 24 ? `${c.slice(0, 23)}…` : c);
  return t("dataWords.header", { row: row.row, cells: shown.join(t("dataWords.separator")) });
}

/** The actual file/sheet counts and cap, never a parsed server sentence. */
export function rowLimitSentence(inspection: Pick<DataInspection, "format" | "total" | "limit">, locale: UiLocale = "en"): string {
  return tFor(locale)(inspection.format === "xlsx" ? "dataImport.limit.sheet" : "dataImport.limit.file", {
    total: inspection.total, limit: inspection.limit,
  });
}
