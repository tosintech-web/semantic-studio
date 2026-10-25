/*
================================================================================
FILE: frontend/src/modeling/values.test.ts
================================================================================

SUMMARY
    The annotation value rules the form checks before sending (AC-2): each
    of the seven datatypes, text and its language, links, and the values the
    command layer is sent.

BASIC IDEA
    The examples are the server's own (authoring-foundations 5.4.1): a date of
    2026-13-01, an integer of 4.5, a boolean of "yes". The sentences are
    asserted word for word, because the point of the copy is that the form
    says what the server would.

INPUTS / INPUT SOURCES
    - modeling/values.ts.

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { translate } from "../i18n/format";
import type { Translator } from "../i18n/types";
import { describe, expect, it } from "vitest";
import { describeValue, toValue, typeFromKey, typeKey, valueProblem, valueTypeChoices, VALUE_TYPES } from "./values";

const typed = (datatype: string) => ({ kind: "typed" as const, datatype });

describe("valueProblem", () => {
  it.each([
    ["xsd:date", "2026-13-01", '"2026-13-01" is not a valid date (expected YYYY-MM-DD).'],
    ["xsd:date", "2026-02-30", '"2026-02-30" is not a valid date (expected YYYY-MM-DD).'],
    ["xsd:integer", "4.5", '"4.5" is not a valid integer (expected a whole number such as 42).'],
    ["xsd:boolean", "yes", '"yes" is not a valid boolean (expected true or false).'],
    ["xsd:decimal", "4,5", '"4,5" is not a valid decimal (expected a number such as 4.5).'],
    ["xsd:dateTime", "2026-09-28T25:00:00", '"2026-09-28T25:00:00" is not a valid date and time (expected YYYY-MM-DDThh:mm:ss).'],
    ["xsd:anyURI", "a b", '"a b" is not a valid URI (it is empty or contains a space).'],
  ])("refuses %s %j in the server's words", (datatype, raw, sentence) => {
    expect(valueProblem(typed(datatype), raw)).toBe(sentence);
  });

  it.each([
    ["xsd:date", "2024-02-29"],
    ["xsd:date", "2026-09-28Z"],
    ["xsd:integer", "-42"],
    ["xsd:decimal", ".5"],
    ["xsd:boolean", "false"],
    ["xsd:dateTime", "2026-09-28T24:00:00"],
    ["xsd:string", ""],
  ])("accepts %s %j", (datatype, raw) => {
    expect(valueProblem(typed(datatype), raw)).toBeNull();
  });

  it("refuses empty text and a malformed language tag", () => {
    expect(valueProblem({ kind: "text" }, "  ", "en")).toBe("A text value cannot be empty.");
    expect(valueProblem({ kind: "text" }, "Rechnung", "de_DE")).toMatch(/not a well-formed language tag/);
    expect(valueProblem({ kind: "text" }, "Rechnung", "de-DE")).toBeNull();
  });

  it("refuses a link with no scheme or a space", () => {
    expect(valueProblem({ kind: "link" }, "example.org/page")).toMatch(/not a full address/);
    expect(valueProblem({ kind: "link" }, "https://example.org/a page")).toMatch(/space/);
    expect(valueProblem({ kind: "link" }, "https://example.org/page")).toBeNull();
  });
});

describe("the values sent", () => {
  it("text keeps its language; a typed value names its datatype", () => {
    expect(toValue({ kind: "text" }, "Facture", "fr")).toEqual({ kind: "text", value: "Facture", lang: "fr" });
    expect(toValue(typed("xsd:date"), " 2026-09-28 ")).toEqual({
      kind: "typed",
      value: "2026-09-28",
      datatype: "xsd:date",
    });
    expect(toValue({ kind: "link" }, " https://x.org/ ")).toEqual({ kind: "link", value: "https://x.org/" });
  });

  it("every offered type round-trips through its select key", () => {
    for (const option of VALUE_TYPES) expect(typeKey(typeFromKey(option.key))).toBe(option.key);
    expect(VALUE_TYPES.filter((t) => t.type.kind === "typed")).toHaveLength(7);
  });

  it("describes a value's kind in words", () => {
    expect(describeValue({ kind: "text", value: "x", lang: "fr" })).toBe("text (fr)");
    expect(describeValue({ kind: "typed", value: "2026-09-28", datatype: "xsd:date" })).toBe("date");
    expect(describeValue({ kind: "link", value: "https://x.org/" })).toBe("link");
  });
});


const ja = ((code, args) => translate("ja", code, args)) as Translator;
it.each([
  ["xsd:integer", "4.5", "「4.5」は整数ではありません（例：42）。"],
  ["xsd:decimal", "4,5", "「4,5」は小数ではありません（例：4.5）。"],
  ["xsd:boolean", "yes", "「yes」は真偽値ではありません（trueまたはfalseを指定してください）。"],
  ["xsd:date", "2026-02-30", "「2026-02-30」は有効な日付ではありません（YYYY-MM-DD形式）。"],
  ["xsd:dateTime", "2026-09-28T25:00:00", "「2026-09-28T25:00:00」は有効な日時ではありません（YYYY-MM-DDThh:mm:ss形式）。"],
])("localizes %s refusal without changing validation", (datatype, raw, expected) => {
  expect(valueProblem(typed(datatype), raw, undefined, ja)).toBe(expected);
});
it("localizes value choices and descriptions while preserving their identity", () => {
  const choices = valueTypeChoices(ja);
  expect(choices.map(c => [c.key, c.type])).toEqual(VALUE_TYPES.map(c => [c.key, c.type]));
  expect(choices[0].label).toBe("言語付きテキスト");
  expect(describeValue({ kind: "text", value: "犬", lang: "ja" }, ja)).toBe("テキスト（ja）");
  expect(describeValue({ kind: "typed", value: "x", datatype: "__proto__" }, ja)).toBe("__proto__");
  expect(valueProblem({ kind: "text" }, "犬", "de_DE", ja)).toBe("「de_DE」は有効な言語タグではありません（例：ja、en、fr）。");
  expect(valueProblem({ kind: "link" }, "bad link", undefined, ja)).toBe("リンクに空白は使用できません。");
});
