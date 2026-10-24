/*
================================================================================
FILE: frontend/src/modeling/dataSentences.test.ts
================================================================================

SUMMARY
    The words the data import says (csv-data-import 5.2 to 5.7): the label on
    snapshot data with a sample's words in it, row lists, the preview's
    sentences, the import report's lines and word, and the identifier check;
    links to no row and a workbook's pickers (Stage B). Japanese templates
    retain literal names/values and unknown types, including prototype keys,
    without English inflections; existing English wording stays covered.

BASIC IDEA
    Pure functions, tested without rendering. Dates are fixed at midday UTC
    so the date in words is the same in every time zone the suite runs in.

INPUTS / INPUT SOURCES
    - modeling/dataSentences.ts, on values built here.

EXPECTED OUTPUT
    - Pass/fail per assertion.
================================================================================
*/

import { describe, expect, it } from "vitest";
import {
  dataLabel,
  headerRowOption,
  idProblems,
  importedOn,
  previewSentences,
  reportLines,
  reportWord,
  rowList,
  sampleWords,
  sheetOption,
  unmatchedLines,
  typeWord,
} from "./dataSentences";
import type { ImportReportData } from "../types";

// Midday, so the date is the same in every time zone a test runs in.
const WHEN = "2026-10-02T12:00:00Z";

const whole = { id: "people-abc123", source: "people.csv", importedAt: WHEN, rows: 3, total: 3, sample: false };
const cut = { ...whole, rows: 2000, total: 12480, sample: true };

function report(changes: Partial<ImportReportData> = {}): ImportReportData {
  return {
    rowsRead: 2000,
    total: 2000,
    sample: false,
    individuals: 1986,
    statements: 8000,
    skipped: { count: 0, rows: [] },
    repeated: { count: 0, rows: [] },
    keptAsText: [],
    empty: [],
    clean: true,
    ...changes,
  };
}

describe("the label on snapshot data (5.6)", () => {
  it("names the file and the date in words", () => {
    expect(importedOn(WHEN)).toBe("2 October 2026");
    expect(dataLabel(whole)).toBe("from people.csv, imported 2 October 2026");
  });

  it("carries the sample's words in the label itself, so no place can drop them", () => {
    expect(sampleWords(cut)).toBe("sample: first 2,000 of 12,480 rows");
    expect(dataLabel(cut)).toBe("from people.csv, imported 2 October 2026; sample: first 2,000 of 12,480 rows");
    expect(sampleWords(whole)).toBeNull();
  });
});

describe("row lists", () => {
  it("reads one, a few, and many", () => {
    expect(rowList({ count: 1, rows: [7] })).toBe("row 7");
    expect(rowList({ count: 2, rows: [2, 4] })).toBe("rows 2 and 4");
    expect(rowList({ count: 14, rows: [7, 19, 230] })).toBe("rows 7, 19, 230 and 11 more");
    expect(rowList({ count: 3, rows: [1, 2, 1200] })).toBe("rows 1, 2 and 1,200");
  });
});

describe("the preview as sentences (5.5)", () => {
  it("says a value that does not fit is kept as text", () => {
    const sentences = previewSentences(
      {
        row: 2,
        subject: "http://example.org/data/person/2",
        name: "Bob",
        values: [
          { column: "born", label: "birth date", value: "yesterday", kind: "value", datatype: "date", fits: false },
          { column: "age", label: "age", value: "41", kind: "value", datatype: "integer", fits: true },
          { column: "nick", label: "nickname", value: "Bobby", kind: "value" },
          { column: "org", label: "member of", value: "acme", kind: "link", target: "http://x/acme" },
        ],
      },
      "Person",
    );
    expect(sentences).toEqual([
      "Bob is a Person.",
      'Bob\'s birth date is "yesterday" — not a date, kept as text.',
      "Bob's age is 41.",
      'Bob\'s nickname is "Bobby".',
      'Bob\'s member of: the one with id "acme".',
    ]);
  });

  it("names a row without a name by its number, and one without an id as skipped", () => {
    expect(previewSentences({ row: 3, subject: "http://x/3", name: null, values: [] }, "Organization")).toEqual([
      "Row 3 is an Organization.",
    ]);
    expect(previewSentences({ row: 4, subject: null, name: null, values: [], skipped: true }, "Person")).toEqual([
      "Row 4 has no id, so nothing is made from it.",
    ]);
  });

  it("treats text as text, never as markup", () => {
    const [, sentence] = previewSentences(
      { row: 1, subject: "http://x/1", name: "<b>Al</b>", values: [{ column: "n", label: "note", value: "<img>", kind: "value" }] },
      "Person",
    );
    expect(sentence).toBe('<b>Al</b>\'s note is "<img>".');
  });
});

describe("the import report (5.5)", () => {
  it("reads the spec's lines", () => {
    const lines = reportLines(
      report({
        clean: false,
        skipped: { count: 14, rows: [7, 19, 230] },
        keptAsText: [{ column: "born", datatype: "date", count: 40, rows: [2, 52] }],
        empty: [{ column: "notes", count: 1240 }],
      }),
      "Person",
    );
    expect(lines).toEqual([
      "2,000 rows, 1,986 People",
      "14 rows without an id (rows 7, 19, 230 and 11 more)",
      "born: 40 values are not dates, kept as text (rows 2, 52 and 38 more)",
      "notes: 1,240 empty, nothing written",
    ]);
  });

  it("says a cut file is a sample on its first line", () => {
    const [first] = reportLines(report({ total: 12480, sample: true }), "Person");
    expect(first).toBe("2,000 rows, 1,986 People (sample: first 2,000 of 12,480 rows)");
  });

  it("says a clean import is clean, and gives the row its word", () => {
    const lines = reportLines(report(), "concept");
    expect(lines[lines.length - 1]).toBe("Every row has an id and every value fits its type.");
    expect(reportWord(report())).toBe("clean");
    expect(
      reportWord(report({ clean: false, keptAsText: [{ column: "a", datatype: "date", count: 1000, rows: [] }] })),
    ).toBe("1,000 values kept as text");
  });
});

describe("the identifier check (5.3)", () => {
  it("says what is missing and what repeats", () => {
    expect(
      idProblems({
        column: "id",
        ok: false,
        missing: { count: 14, rows: [7, 19, 230] },
        repeats: 3,
        repeated: { count: 4, rows: [8, 9, 10, 11] },
      }),
    ).toEqual(["14 rows have no id (rows 7, 19, 230 and 11 more).", "id is not unique: 3 values repeat (rows 8, 9, 10 and 11)."]);
    expect(idProblems({ column: "id", ok: true, missing: { count: 0, rows: [] }, repeats: 0, repeated: { count: 0, rows: [] } })).toEqual([]);
  });
});

describe("Stage B: links that match no row (5.9) and a workbook's pickers (5.8)", () => {
  const ORG = { column: "org", className: "Organization", classIri: "http://x#Organization" };

  it("says a link to no row as the spec does, on the report and in the row's word", () => {
    const unmatched = [{ ...ORG, count: 12, rows: [3, 9, 14] }];
    expect(unmatchedLines(report({ clean: false, unmatched }))).toEqual([
      "org: 12 values match no Organization row (rows 3, 9, 14 and 9 more)",
    ]);
    const lines = reportLines(report({ clean: false, unmatched }), "Person");
    expect(lines[lines.length - 1]).toBe("org: 12 values match no Organization row (rows 3, 9, 14 and 9 more)");
    expect(lines).not.toContain("Every row has an id and every value fits its type.");
    expect(reportWord(report({ clean: false, unmatched }))).toBe("12 links to no row");
    expect(reportWord(report({ clean: false, unmatched: [{ ...ORG, count: 1, rows: [3] }] }))).toBe("1 link to no row");
    expect(unmatchedLines(report({ clean: false, unmatched: [{ ...ORG, count: 1, rows: [3] }] }))).toEqual([
      "org: 1 value matches no Organization row (row 3)",
    ]);
    // A report written before Stage B has no unmatched list at all.
    expect(unmatchedLines(report())).toEqual([]);
  });

  it("names a sheet with its rows, and a header row by its first cells", () => {
    expect(sheetOption({ name: "Orgs", rows: 1 })).toBe("Orgs (1 row)");
    expect(sheetOption({ name: "Big", rows: 5000 })).toBe("Big (5,000 rows)");
    expect(headerRowOption({ row: 2, cells: [] })).toBe("Row 2 (empty)");
    expect(headerRowOption({ row: 2, cells: [], unread: true })).toBe("Row 2");
    expect(headerRowOption({ row: 3, cells: ["id", "name"] })).toBe("Row 3: id, name");
    expect(headerRowOption({ row: 1, cells: ["Organizations of the whole wide world"] })).toBe(
      "Row 1: Organizations of the wh…",
    );
  });
});


describe("Japanese data descriptions keep source facts and user text", () => {
  it("keeps the sample, filename and local calendar date in the provenance label", () => {
    const source = { ...cut, source: "日本語 <b>{sample}</b>.csv" };
    expect(importedOn(WHEN, "ja")).toBe("2026年10月2日");
    expect(importedOn("invalid date {value}", "ja")).toBe("invalid date {value}");
    expect(dataLabel(source, "ja")).toBe("日本語 <b>{sample}</b>.csvから、2026年10月2日に取り込み；サンプル：全12,480行のうち先頭2,000行");
    expect(sampleWords(whole, "ja")).toBeNull();
  });

  it("distinguishes shown rows from unshown row counts", () => {
    expect(rowList({ count: 0, rows: [] }, "ja")).toBe("");
    expect(rowList({ count: 1, rows: [7] }, "ja")).toBe("7行目");
    expect(rowList({ count: 2, rows: [2, 4] }, "ja")).toBe("2、4行目");
    expect(rowList({ count: 14, rows: [7, 19, 230] }, "ja")).toBe("7、19、230行目、ほか11行");
  });

  it("describes every preview value without English inflections or rewriting its content", () => {
    expect(previewSentences({ row: 2, subject: "https://example.test/2", name: "<b>{who}</b>", values: [
      { column: "birth", label: "birth date", value: "yesterday", kind: "value", datatype: "date", fits: false },
      { column: "age", label: "age", value: "041", kind: "value", datatype: "integer", fits: true },
      { column: "note", label: "note", value: "<img>{value}", kind: "value" },
      { column: "org", label: "member of", value: "acme", kind: "link", target: "https://example.test/acme" },
    ] }, "Person", "ja")).toEqual([
      "<b>{who}</b>はPersonです。",
      '<b>{who}</b>の「birth date」は"yesterday"で、日付ではないため文字列として保持します。',
      "<b>{who}</b>の「age」は041です。",
      '<b>{who}</b>の「note」は"<img>{value}"です。',
      '<b>{who}</b>の「member of」は、IDが"acme"の項目を参照します。',
    ]);
    expect(previewSentences({ row: 3, subject: "https://example.test/3", name: null, values: [] }, "Organization", "ja")).toEqual(["3行目はOrganizationです。"]);
    expect(previewSentences({ row: 4, subject: null, name: null, values: [], skipped: true }, "Person", "ja")).toEqual(["4行目にはIDがないため、データを作成しません。"]);
  });

  it("keeps skipped, merged, invalid, empty and unmatched report details", () => {
    const data = report({ clean: false, total: 12480, sample: true,
      skipped: { count: 14, rows: [7, 19, 230] }, repeated: { count: 1, rows: [8] },
      keptAsText: [{ column: "born <b>{count}</b>", datatype: "date", count: 40, rows: [2, 52] }],
      empty: [{ column: "notes", count: 1240 }],
      unmatched: [{ column: "org", className: "Organization", classIri: "https://example.test/Org", count: 1, rows: [3] }],
    });
    expect(reportLines(data, "Person", undefined, "ja")).toEqual([
      "2,000行、Personを1,986件（サンプル：全12,480行のうち先頭2,000行）",
      "IDのない14行（7、19、230行目、ほか11行）",
      "既存のIDを繰り返す1行は、同じ個体に追加します（8行目）",
      "born <b>{count}</b>：40個の値は日付ではないため、文字列として保持（2、52行目、ほか38行）",
      "notes：1,240個の空欄には何も書き込みません",
      "org：1個の値に対応するOrganizationの行がありません（3行目）",
    ]);
    expect(reportWord(data, "ja")).toBe("40個の値を文字列として保持、対応する行のないリンク1件、IDのない14行、IDを繰り返す1行");
    expect(reportLines(report({ individuals: 1 }), "Person", undefined, "ja")).toEqual(["2,000行、Personを1件", "すべての行にIDがあり、すべての値が指定された型に適合しています。"]);
    expect(reportWord(report(), "ja")).toBe("問題なし");
  });

  it("shows identifier problems using the real column and affected rows", () => {
    expect(idProblems({ column: "ID <b>{count}</b>", ok: false, missing: { count: 1, rows: [4] }, repeats: 2, repeated: { count: 3, rows: [2, 3, 5] } }, "ja")).toEqual([
      "1行に「ID <b>{count}</b>」の値がありません（4行目）。",
      "「ID <b>{count}</b>」は一意ではありません：2個の値が繰り返されています（2、3、5行目）。",
    ]);
  });

  it("localizes known types and keeps unknown type identities", () => {
    expect(typeWord("date", false, "ja")).toBe("日付");
    expect(typeWord("integer", true, "ja")).toBe("整数");
    expect(typeWord(null, false, "ja")).toBe("指定された型の値");
    expect(typeWord("custom <b>{type}</b>", true, "ja")).toBe("custom <b>{type}</b>");
  });

  it.each(["constructor", "__proto__", "toString"])("treats inherited key %s as an unknown type", (datatype) => {
    expect(typeWord(datatype)).toBe(`a ${datatype}`);
    expect(typeWord(datatype, true)).toBe(datatype);
    expect(typeWord(datatype, false, "ja")).toBe(datatype);
  });

  it("keeps workbook identities and the existing bounded header-cell preview", () => {
    expect(sheetOption({ name: "日本語 <b>{rows}</b>", rows: 5000 }, "ja")).toBe("日本語 <b>{rows}</b>（5,000行）");
    expect(headerRowOption({ row: 2, cells: [] }, "ja")).toBe("2行目（空行）");
    expect(headerRowOption({ row: 2, cells: [], unread: true }, "ja")).toBe("2行目");
    expect(headerRowOption({ row: 3, cells: ["id", "name"] }, "ja")).toBe("3行目：id、name");
    expect(headerRowOption({ row: 1, cells: ["Organizations of the whole wide world"] }, "ja")).toBe("1行目：Organizations of the wh…");
  });
});
