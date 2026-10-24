/*
================================================================================
FILE: frontend/src/i18n/dataMessages.test.ts
SUMMARY
    Data-import frames keep numeric facts and technical names across UI locales.
BASIC IDEA
    Exercise representative numeric, column-list and refresh frames through the
    strict wire decoder; substituted text never becomes another template.
INPUTS / INPUT SOURCES
    Synthetic byte counts, technical predicates and column names with braces.
EXPECTED OUTPUT
    Locale-formatted numbers, literal names and stable original wire objects.
================================================================================
*/
import { expect, it } from "vitest";
import { renderServerMessage, validWireMessage } from "./serverMessage";
import { translate } from "./format";
import type { Translator } from "./types";
const t = (locale: "ja" | "en") => ((code, args) => translate(locale, code, args)) as Translator;

it("formats a limit's numeric facts in the display locale without rounding bytes into a misleading equal limit", () => {
  const wire = { code: "tabular.file_too_large", args: { bytes: 5242881, limit: 5 } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "", t("ja"))).toBe("このファイルは上限5MBを超えています（5,242,881バイト）。読み込み機能は、データとモデルの対応を学ぶためのものです。");
  expect(renderServerMessage(wire, "", t("en"))).toBe("This file exceeds the 5 MB limit (5,242,881 bytes). Imports are intended for learning how data maps to a model.");
  expect(wire.args.bytes).toBe(5242881);
});

it("renders missing column identities as flat raw parts, including template-like names", () => {
  const wire = { code: "rml.columns_missing", args: { columns: [{ text: "甲 <b>{columns}" }, { code: "words.list.and", args: {} }, { text: "乙 {name}" }] } };
  const original = JSON.stringify(wire);
  expect(renderServerMessage(wire, "", t("ja"))).toBe("マッピングが参照する列甲 <b>{columns}と乙 {name}が、このファイルにありません。");
  expect(renderServerMessage(wire, "", t("en"))).toBe("The mapping reads columns 甲 <b>{columns} and 乙 {name}, which this file does not have.");
  expect(JSON.stringify(wire)).toBe(original);
});

it("keeps the source facts and refresh instruction in one complete frame", () => {
  const wire = { code: "snapshots.refresh.source", args: { name: "../<img>{source}.csv", source: "source.csv" } };
  expect(renderServerMessage(wire, "", t("ja"))).toBe("rml:sourceは、このスナップショットのsource.csvを指定する必要がありますが、現在は「../<img>{source}.csv」です。保存されたコピーだけを読み取り、別のファイルやURLは読み込めません。 更新する前にマッピングを変更してください。");
  expect(renderServerMessage(wire, "", t("en"))).toContain("../<img>{source}.csv");
});

it("names an individual archive entry when its ratio exceeds the limit", () => {
  const wire = { code: "tabular.entry_compression_limit", args: { name: "xl/<b>{name}.xml", ratio: 1014, limit: 100 } };
  expect(renderServerMessage(wire, "", t("ja"))).toBe("ブック内の「xl/<b>{name}.xml」は圧縮時の1,014倍に展開され、上限の100倍を超えます。過度な展開による攻撃を防ぐため読み込めません。");
  expect(renderServerMessage(wire, "", t("en"))).toContain("Workbook entry xl/<b>{name}.xml expands to 1,014 times its size");
});
