/*
================================================================================
FILE: frontend/src/i18n/serverMessage.test.ts
SUMMARY
    Validates and renders server message metadata under the current UI locale.
BASIC IDEA
    Treat metadata as untrusted, preserving legacy text only as caller details.
    Resolve flat noun words in the current locale without altering literal names
    or evaluating nested structures.
INPUTS / INPUT SOURCES
    Known, unknown and malformed wire objects and typed catalog translators.
EXPECTED OUTPUT
    Whole translated sentences, safe fallback and unchanged substituted data.
================================================================================
*/
import { expect, it } from "vitest";
import { renderServerMessage, validWireMessage } from "./serverMessage";
import { translate } from "./format";
import type { Translator } from "./types";
const translator = (locale: "ja" | "en") => ((code, args) => translate(locale, code, args)) as Translator;
it("uses the current locale on each render without storing translated error text", () => {
  const wire = { code: "validation.min_count", args: { name: "<b>犬</b>", count: 2 } };
  expect(renderServerMessage(wire, "Legacy", translator("ja"))).toBe("「<b>犬</b>」には2件以上の値が必要です。");
  expect(renderServerMessage(wire, "Legacy", translator("en"))).toBe("<b>犬</b> needs at least 2 values.");
});
it("renders representative parser/model/reasoning/limit contracts", () => {
  const t = translator("ja");
  expect(renderServerMessage({ code: "parse.syntax", args: { format: "Turtle", line: 3 } }, "", t)).toContain("Turtle");
  expect(renderServerMessage({ code: "model.invalid_value", args: { value: "犬", datatype: "xsd:integer" } }, "", t)).toContain("xsd:integer");
  expect(renderServerMessage({ code: "reasoning.timeout", args: { seconds: 10 } }, "", t)).toContain("10秒");
  expect(renderServerMessage({ code: "entities.page_too_large", args: { total: 3036, suggested_limit: 25 } }, "", t)).toContain("3,036");
});
it.each([
  undefined, null, {}, { code: "constructor", args: {} }, { code: "unknown", args: {} },
  { code: "reasoning.timeout", args: {} }, { code: "reasoning.timeout", args: { seconds: "ten" } },
  { code: "reasoning.timeout", args: { seconds: 1, extra: 2 } }, { code: "reasoning.timeout", args: { seconds: Infinity } },
])("uses an operation explanation for unknown or malformed metadata %j", wire => {
  expect(validWireMessage(wire)).toBe(false);
  expect(renderServerMessage(wire, "Raw external error", translator("ja"))).toBe("操作を完了できませんでした。詳細を確認してください。");
});
it("accepts explicit nullable arguments without inferring them from legacy English", () => {
  const wire = { code: "parse.syntax", args: { format: "Turtle", line: null } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "at line 999", translator("ja"))).not.toContain("999");
});

it("renders flat standard words and literal names in the current locale without changing the wire", () => {
  const wire = Object.freeze({ code: "command.added_rule", args: Object.freeze({
    shape_name: "犬 <img>{shape}", path: Object.freeze([
      Object.freeze({ code: "words.path.name", args: Object.freeze({}) }),
      Object.freeze({ code: "words.path.or", args: Object.freeze({}) }),
      Object.freeze({ text: "備考 <b>{value}</b>" }),
    ]),
  }) });
  const original = JSON.stringify(wire);
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "frozen English is not the source", translator("ja"))).toBe("ルールセット「犬 <img>{shape}」への名前または備考 <b>{value}</b>のルール追加");
  expect(renderServerMessage(wire, "", translator("en"))).toBe("Added a rule on name or 備考 <b>{value}</b> to 犬 <img>{shape}");
  expect(JSON.stringify(wire)).toBe(original);
});

it.each([
  undefined, "English fragment", {}, [1], [[{ text: "nested" }]],
  [{ text: 1 }], [{ text: "x", extra: true }],
  [{ code: "unknown.word", args: {} }], [{ code: "__proto__", args: {} }],
  [{ code: "constructor", args: {} }], [{ code: "toString", args: {} }],
  [{ code: "words.path.name" }], [{ code: "words.path.name", args: { extra: 1 } }],
  [{ code: "words.path.name", args: {}, text: "mixed" }],
  [{ code: "reasoning.stopped", args: {} }],
])("rejects malformed or non-word parts without evaluating them: %j", path => {
  const wire = { code: "command.added_rule", args: { shape_name: "Rules", path } };
  expect(validWireMessage(wire)).toBe(false);
  expect(renderServerMessage(wire, "Original diagnostic", translator("ja"))).toBe("操作を完了できませんでした。詳細を確認してください。");
});

it("handles a cyclic part list without recursion or mutation", () => {
  const path: unknown[] = [];
  path.push(path);
  expect(validWireMessage({ code: "command.added_rule", args: { shape_name: "Rules", path } })).toBe(false);
  expect(path[0]).toBe(path);
});

it("rejects a sparse part list rather than accepting missing elements as valid words", () => {
  const wire = { code: "command.added_rule", args: { shape_name: "Rules", path: new Array(2) } };
  expect(validWireMessage(wire)).toBe(false);
});

it("renders a word from its own fields when its prototype also has a text property", () => {
  const part = Object.assign(Object.create({ text: "wrong inherited text" }), { code: "words.path.name", args: {} });
  const wire = { code: "command.added_rule", args: { shape_name: "確認", path: [part] } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "", translator("ja"))).toBe("ルールセット「確認」への名前のルール追加");
});
