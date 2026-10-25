/*
================================================================================
FILE: frontend/src/i18n/limitMessages.test.ts
SUMMARY
    Refusal frames display captured byte and time limits in the current locale.
BASIC IDEA
    Check actual byte counts, exact large configured integers and raw setting
    identifiers through the production wire renderer rather than English parsing.
INPUTS / INPUT SOURCES
    Synthetic cap and timeout facts using the backend message contracts.
EXPECTED OUTPUT
    Localized units, intact identifiers and no rounding of large integer text.
================================================================================
*/
import { expect, it } from "vitest";
import { translate } from "./format";
import { renderServerMessage, validWireMessage } from "./serverMessage";
import type { Translator, UiLocale } from "./types";
const tFor = (locale: UiLocale) => ((code, args) => translate(locale, code, args)) as Translator;

it("renders the actual byte cap even when a legacy MB sentence would round it to zero", () => {
  const wire = { code: "request.layout_limit", args: { limit: 64 } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "A layout is at most 1 MB.", tFor("ja"))).toBe("レイアウトの容量は64バイトまでです。");
  expect(renderServerMessage(wire, "A layout is at most 1 MB.", tFor("en"))).toBe("A layout may contain at most 64 bytes.");
});

it("preserves an exact large configured cap and a literal setting name", () => {
  const limit = "1152921504606846977";
  const variable = "SYNTHETIC_<img>{limit}";
  const wire = { code: "request.file_limit", args: { limit, variable } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "Original detail", tFor("ja"))).toBe(`ファイルの容量が上限の${limit}バイトを超えています。環境変数「${variable}」で上限を変更できます。`);
  expect(wire.args.limit).toBe(limit);
});

it("formats captured timeout seconds in both language frames", () => {
  const wire = { code: "parse.text_timeout", args: { seconds: 1234.5 } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "Original detail", tFor("ja"))).toBe("テキストの解析が1,234.5秒を超えたため停止しました。");
  expect(renderServerMessage(wire, "Original detail", tFor("en"))).toBe("Parsing this text exceeded 1,234.5 seconds and was stopped.");
});
