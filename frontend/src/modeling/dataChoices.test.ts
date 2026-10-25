/*
================================================================================
FILE: frontend/src/modeling/dataChoices.test.ts
================================================================================

SUMMARY
    The data wizard's choice rules (csv-data-import 5.2 to 5.4): what each
    column starts as, one name per row, a choice in a select, a new
    attribute's suggested type, and why Next waits on each step -- for the
    sample choice, for the chosen class's own reading, and for the columns'
    choices before step 4. Japanese wording and offered labels retain the
    same values/decisions, and raw header keys never use object prototypes.

BASIC IDEA
    Pure functions, tested without rendering, as the module is kept out of
    the component for.

INPUTS / INPUT SOURCES
    - modeling/dataChoices.ts, on values built here.

EXPECTED OUTPUT
    - Pass/fail per assertion.
================================================================================
*/

import { describe, expect, it } from "vitest";
import {
  NEW_ATTRIBUTE,
  NEW_TYPES,
  newTypes,
  choiceValue,
  initialColumns,
  parseChoice,
  stepBlocked,
  suggestedType,
  withChoice,
} from "./dataChoices";
import type { ColumnProfile, DataInspection } from "../types";

const P = "http://example.org/shop#";

function profile(changes: Partial<ColumnProfile>): ColumnProfile {
  return {
    name: "c", empty: 0, unique: true, repeats: 0, wholeNumbers: false, numbers: false, dates: false,
    dateTimes: false, ...changes,
  };
}

describe("what each column starts as (5.4)", () => {
  it("takes the suggestions and marks them, and starts everything else at Ignore", () => {
    const { columns, suggested } = initialColumns(
      ["id", "name", "born", "notes"],
      { name: { as: "name" }, born: { as: "attribute", property: `${P}birthDate` } },
    );
    expect(columns).toEqual({
      id: { as: "ignore" },
      name: { as: "name" },
      born: { as: "attribute", property: `${P}birthDate` },
      notes: { as: "ignore" },
    });
    expect(suggested).toEqual(["name", "born"]);
  });

  it("keeps an earlier choice over a suggestion, for the columns the file still has", () => {
    const { columns, suggested } = initialColumns(
      ["name", "born"],
      { name: { as: "name" }, born: { as: "attribute", property: `${P}birthDate` } },
      { born: { as: "ignore" }, gone: { as: "name" } },
    );
    expect(columns).toEqual({ name: { as: "name" }, born: { as: "ignore" } });
    expect(suggested).toEqual(["name"]);
  });
});

describe("one name per row", () => {
  it("moves the name from one column to another", () => {
    const before = { a: { as: "name" as const }, b: { as: "ignore" as const } };
    expect(withChoice(before, "b", { as: "name" })).toEqual({ a: { as: "ignore" }, b: { as: "name" } });
  });
});

describe("a choice in a select", () => {
  it("round-trips", () => {
    for (const choice of [
      { as: "ignore" as const },
      { as: "name" as const },
      { as: "attribute" as const, property: `${P}born date` },
      { as: "relationship" as const, property: `${P}memberOf` },
    ]) {
      expect(parseChoice(choiceValue(choice))).toEqual(choice);
    }
    expect(parseChoice(NEW_ATTRIBUTE)).toBe(NEW_ATTRIBUTE);
  });
});

describe("a new attribute's type, from its values (5.4)", () => {
  it("suggests a whole number, a date, or text", () => {
    expect(suggestedType(profile({ wholeNumbers: true, numbers: true }))).toBe("integer");
    expect(suggestedType(profile({ dates: true }))).toBe("date");
    expect(suggestedType(profile({ numbers: true }))).toBe("decimal");
    expect(suggestedType(profile({}))).toBe("text");
  });
});

describe("why Next waits", () => {
  const inspection = { sample: true, kept: 2000, limit: 2000 } as DataInspection;
  it("waits for the sample choice past the limit (5.2)", () => {
    expect(stepBlocked(1, { inspection, options: {}, classIri: null })).toBe(
      "Choose to use the first 2,000 rows, or another file.",
    );
    expect(stepBlocked(1, { inspection, options: { sample: true }, classIri: null })).toBeNull();
    expect(stepBlocked(1, { inspection: null, options: {}, classIri: null })).toBe("Choose a file first.");
  });
  it("waits while the file is read again: the table shown may be the last read's (PR #54 review)", () => {
    const ready = { inspection, options: { sample: true }, classIri: null };
    expect(stepBlocked(1, { ...ready, reading: true })).toBe("Reading the file…");
    expect(stepBlocked(1, { ...ready, inspection: null, reading: true })).toBe("Reading the file…");
    expect(stepBlocked(1, { ...ready, reading: false })).toBeNull();
  });
  it("waits for what a row is, and for that class's own reading (PR #53 review)", () => {
    const base = { inspection, options: { sample: true } };
    expect(stepBlocked(2, { ...base, classIri: null })).toBe("Choose what each row is.");
    expect(stepBlocked(2, { ...base, classIri: `${P}Person`, basis: "reading" })).toBe("Checking the identifier…");
    expect(stepBlocked(2, { ...base, classIri: `${P}Person`, basis: "failed" })).toBe(
      "The identifier could not be checked. Try again.",
    );
    expect(stepBlocked(2, { ...base, classIri: `${P}Person`, basis: "ready" })).toBeNull();
  });

  it("waits on step 3 until the columns have choices, so step 4 always has them", () => {
    const base = { inspection, options: { sample: true }, classIri: `${P}Person` };
    expect(stepBlocked(3, { ...base, basis: "reading", columnsReady: false })).toBe("Reading what each column can become…");
    expect(stepBlocked(3, { ...base, basis: "failed", columnsReady: false })).toBe(
      "What each column can become could not be read. Try again.",
    );
    expect(stepBlocked(3, { ...base, basis: "ready", columnsReady: true })).toBeNull();
  });
});


it("localizes offered type labels without changing type identities", () => {
  expect(newTypes().map(type => type.label)).toEqual(NEW_TYPES.map(type => type.label));
  expect(newTypes("ja").map(type => type.label)).toEqual(["テキスト", "整数", "数値", "日付", "日時", "trueまたはfalse", "言語指定のないテキスト"]);
  expect(newTypes("ja").map(({ key, datatype }) => ({ key, datatype }))).toEqual(NEW_TYPES.map(({ key, datatype }) => ({ key, datatype })));
});

it.each(["__proto__", "constructor", "toString"])("keeps the literal header %s as an ordinary mapping key", (key) => {
  const result = initialColumns([key], {});
  expect(Object.keys(result.columns)).toEqual([key]);
  expect(result.columns[key]).toEqual({ as: "ignore" });
  expect(result.suggested).toEqual([]);
  const named = withChoice(result.columns, key, { as: "name" });
  expect(Object.prototype.hasOwnProperty.call(named, key)).toBe(true);
  expect(JSON.parse(JSON.stringify(named))[key]).toEqual({ as: "name" });
  const suggestions = Object.fromEntries([[key, { as: "attribute" as const, property: `${P}raw` }]]);
  expect(initialColumns([key], suggestions).columns[key]).toEqual(suggestions[key]);
});

describe("Japanese blocking reasons keep the same next-step decisions", () => {
  const found = { sample: true, kept: 2000, limit: 2000 } as DataInspection;
  const base = { inspection: found, options: { sample: true }, classIri: `${P}Person` };
  it.each([
    [1, { ...base, reading: true }, "ファイルを読み込み中…"],
    [1, { ...base, sheetChosen: false }, "先にシートを選択してください。"],
    [1, { ...base, inspection: null }, "先にファイルを選択してください。"],
    [1, { ...base, options: {} }, "先頭2,000行を使用するか、別のファイルを選択してください。"],
    [1, { ...base, inspection: { ...found, kept: 0 } }, "このファイルには取り込める行がありません。"],
    [2, { ...base, classIri: null }, "各行が何を表すか選択してください。"],
    [2, { ...base, basis: "failed" as const }, "識別子を確認できませんでした。再試行してください。"],
    [2, { ...base, basis: "reading" as const }, "識別子を確認中…"],
    [3, { ...base, columnsReady: false, basis: "failed" as const }, "各列の対応先を読み込めませんでした。再試行してください。"],
    [3, { ...base, columnsReady: false, basis: "reading" as const }, "各列の対応先を読み込み中…"],
  ] as const)("step %s: %s", (step, state, text) => {
    expect(stepBlocked(step, state, "ja")).toBe(text);
    expect(stepBlocked(step, state)).not.toBeNull();
  });
  it("keeps all ready steps ready", () => {
    expect(stepBlocked(1, base, "ja")).toBeNull();
    expect(stepBlocked(2, { ...base, basis: "ready" }, "ja")).toBeNull();
    expect(stepBlocked(3, { ...base, columnsReady: true }, "ja")).toBeNull();
  });
});
