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
    Whole translated sentences, annotation-value refusal facts, safe fallback
    and unchanged substituted data.
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

it.each([
  [
    {
      "code": "editing.value.kind_required",
      "args": {}
    },
    "A value needs a kind: text, typed or link.",
    "値の種類を指定してください：テキスト、型付きの値、またはリンク。"
  ],
  [
    {
      "code": "editing.value.text_required",
      "args": {}
    },
    "A value needs its text.",
    "値のテキストを指定してください。"
  ],
  [
    {
      "code": "editing.value.language_datatype",
      "args": {}
    },
    "A value cannot carry both a language and a datatype; RDF allows one or the other.",
    "値に言語とデータ型を同時に指定することはできません。RDFではいずれか一方を指定します。"
  ],
  [
    {
      "code": "editing.value.invalid_language",
      "args": {
        "language": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a well-formed language tag (for example en or fr).",
    "「<b>{literal}犬」は有効な言語タグではありません（例：ja、en）。"
  ],
  [
    {
      "code": "editing.value.empty_text",
      "args": {}
    },
    "A text value cannot be empty.",
    "テキストの値は空にできません。"
  ],
  [
    {
      "code": "editing.value.invalid_kind",
      "args": {}
    },
    "A value's kind is text, typed or link.",
    "値の種類は、テキスト、型付きの値、またはリンクを指定してください。"
  ],
  [
    {
      "code": "editing.value.datatype_required",
      "args": {}
    },
    "A typed value needs a datatype.",
    "型付きの値にはデータ型を指定してください。"
  ],
  [
    {
      "code": "editing.value.unsupported_datatype",
      "args": {
        "datatype": "<b>{literal}犬"
      }
    },
    "<b>{literal}犬 is not one of the offered datatypes (xsd:string, xsd:integer, xsd:decimal, xsd:boolean, xsd:date, xsd:dateTime, xsd:anyURI).",
    "「<b>{literal}犬」は選択可能なデータ型ではありません（xsd:string、xsd:integer、xsd:decimal、xsd:boolean、xsd:date、xsd:dateTime、xsd:anyURI）。"
  ],
  [
    {
      "code": "editing.value.type_required",
      "args": {}
    },
    "A value type needs a kind: text, typed or link.",
    "値の型には、テキスト、型付きの値、またはリンクの種類を指定してください。"
  ],
  [
    {
      "code": "editing.value.invalid_type_kind",
      "args": {}
    },
    "A value type's kind is text, typed or link.",
    "値の型の種類は、テキスト、型付きの値、またはリンクを指定してください。"
  ],
  [
    {
      "code": "editing.value.invalid_integer",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid integer (expected a whole number such as 42).",
    "「<b>{literal}犬」は有効な整数ではありません（例：42）。"
  ],
  [
    {
      "code": "editing.value.invalid_decimal",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid decimal (expected a number such as 4.5).",
    "「<b>{literal}犬」は有効な小数ではありません（例：4.5）。"
  ],
  [
    {
      "code": "editing.value.invalid_double",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid number (expected a number such as 4.5 or 1E3).",
    "「<b>{literal}犬」は有効な数値ではありません（例：4.5、1E3）。"
  ],
  [
    {
      "code": "editing.value.invalid_float",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid number (expected a number such as 4.5 or 1E3).",
    "「<b>{literal}犬」は有効な数値ではありません（例：4.5、1E3）。"
  ],
  [
    {
      "code": "editing.value.invalid_boolean",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid boolean (expected true or false).",
    "「<b>{literal}犬」は有効な真偽値ではありません（true または false を指定してください）。"
  ],
  [
    {
      "code": "editing.value.invalid_date",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid date (expected YYYY-MM-DD).",
    "「<b>{literal}犬」は有効な日付ではありません（YYYY-MM-DD形式）。"
  ],
  [
    {
      "code": "editing.value.invalid_dateTime",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid date and time (expected YYYY-MM-DDThh:mm:ss).",
    "「<b>{literal}犬」は有効な日時ではありません（YYYY-MM-DDThh:mm:ss形式）。"
  ],
  [
    {
      "code": "editing.value.invalid_gYear",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid year (expected a year such as 2026).",
    "「<b>{literal}犬」は有効な年ではありません（例：2026）。"
  ],
  [
    {
      "code": "editing.value.invalid_uri",
      "args": {
        "value": "<b>{literal}犬"
      }
    },
    "\"<b>{literal}犬\" is not a valid URI (it is empty or contains a space).",
    "「<b>{literal}犬」は有効なURIではありません。空の値や空白を含む値は指定できません。"
  ]
])("renders annotation-value refusal facts in either UI locale: %j", (wire, english, japanese) => {
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "Unchanged original detail", translator("en"))).toBe(english);
  expect(renderServerMessage(wire, "Unchanged original detail", translator("ja"))).toBe(japanese);
});

it("keeps an exact RDF constraint integer beyond JavaScript's safe numeric range", () => {
  const limit = "9223372036854775809";
  const wire = { code: "validation.violation.min_count.attribute", args: {
    focus: [{ text: "対象 <b>{focus}" }], path: [{ code: "words.path.name", args: {} }], have: 0, limit,
  } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "", translator("ja"))).toBe(`「対象 <b>{focus}」の名前は0件です。このルールでは${limit}件以上が必要です。`);
  expect(renderServerMessage(wire, "", translator("en"))).toContain(`is ${limit};`);
  expect(wire.args.limit).toBe(limit);
});

it("preserves unknown and regional language tags as raw facts beside translated language names", () => {
  const wire = { code: "validation.violation.language.allowed.tagged", args: {
    focus: [{ text: "対象" }], path: [{ code: "words.path.name", args: {} }], value: [{ text: '"値"@zz-Private' }],
    language: [{ text: "zz-Private" }], allowed: [{ code: "words.language.en", args: {} }, { text: " (en-US)" }],
  } };
  expect(renderServerMessage(wire, "", translator("ja"))).toBe('「対象」の名前の値"値"@zz-Privateには言語zz-Privateが指定されています。このルールで使用できる言語英語 (en-US)には含まれていません。');
  expect(renderServerMessage(wire, "", translator("en"))).toContain("English (en-US)");
});
