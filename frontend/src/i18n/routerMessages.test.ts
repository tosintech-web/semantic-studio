/*
================================================================================
FILE: frontend/src/i18n/routerMessages.test.ts
SUMMARY
    Router refusal facts render in the current UI language without re-parsing data.
BASIC IDEA
    Exercise source fields containing braces/markup, a missing-line descriptor,
    and captured numeric limits through the production wire renderer.
INPUTS / INPUT SOURCES
    Real router message contracts and synthetic primitive argument values.
EXPECTED OUTPUT
    Locale-specific frames, exact raw identifiers and no invented line number.
================================================================================
*/
import { expect, it } from "vitest";
import { translate } from "./format";
import { renderServerMessage, validWireMessage } from "./serverMessage";
import type { Translator, UiLocale } from "./types";
const tFor = (locale: UiLocale) => ((code, args) => translate(locale, code, args)) as Translator;

it("keeps literal network identifiers intact inside both language frames", () => {
  const capability = "future:<img>{capability}";
  const wire = { code: "network.unknown_capability", args: { capability } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "Original detail", tFor("ja"))).toBe(`不明なネットワーク機能です：${capability}。`);
  expect(renderServerMessage(wire, "Original detail", tFor("en"))).toBe(`Unknown network capability: ${capability}.`);
  expect(wire.args.capability).toBe(capability);
});

it("renders a missing-line syntax failure without suggesting an unset line field", () => {
  const wire = { code: "parse.syntax_without_line", args: { format: "Turtle" } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "Not valid Turtle", tFor("ja"))).toBe("Turtleファイルの構文を確認してください。");
  expect(renderServerMessage(wire, "Not valid Turtle", tFor("en"))).toBe("Check the syntax of the Turtle file.");
  expect(validWireMessage({ ...wire, args: { ...wire.args, line: null } })).toBe(false);
});

it("formats captured statuses and timeout seconds without substituting placeholders in URLs", () => {
  const url = "https://example.test/<img>?q={status}";
  const wire = { code: "fetch.http_failed", args: { url, status: 451 } };
  expect(validWireMessage(wire)).toBe(true);
  expect(renderServerMessage(wire, "Original detail", tFor("ja"))).toBe(`「${url}」の取得に失敗しました（HTTP 451）。`);
  expect(renderServerMessage(wire, "Original detail", tFor("en"))).toBe(`Fetching ${url} failed with HTTP 451.`);
  const timeout = { code: "data.read_timeout", args: { seconds: 1234.5 } };
  expect(renderServerMessage(timeout, "Original detail", tFor("ja"))).toBe("データの読み込みが1,234.5秒を超えたため停止しました。");
  expect(renderServerMessage(timeout, "Original detail", tFor("en"))).toBe("Reading the data exceeded 1,234.5 seconds and was stopped.");
});
