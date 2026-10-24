/*
================================================================================
FILE: frontend/src/i18n/format.test.ts
SUMMARY
    Verifies whole-message translation, safe fallbacks and locale formatting.
BASIC IDEA
    Assertions describe visible outputs, preserving substituted user values.
INPUTS / INPUT SOURCES
    Small catalog messages and explicit timestamps.
EXPECTED OUTPUT
    Japanese and English messages, unknown-code fallback, no locale data loss.
================================================================================
*/
import { describe, it, expect } from "vitest";
import { translate, formatNumber, formatDateTime } from "./format";
import type { Translator } from "./types";
import { ja } from "./ja";
import { en } from "./en";

describe("message formatting", () => {
  it("uses complete messages and preserves untrusted values as text", () => {
    expect(translate("ja", "load.success", { name: "<b>犬</b>" })).toBe("「<b>犬</b>」を読み込みました。");
    expect(translate("en", "load.success", { name: "犬" })).toBe('Loaded “犬”.');
  });
  it("never exposes unknown or prototype keys", () => {
    for (const code of ["unregistered", "__proto__", "constructor", "toString"]) {
      expect(translate("ja", code)).toBe("操作を完了できませんでした。詳細を確認してください。");
    }
  });
  it("falls back to English when a known Japanese entry is absent", () => {
    const original = ja["nav.home"];
    try {
      delete (ja as Partial<typeof ja>)["nav.home"];
      expect(translate("ja", "nav.home")).toBe("Home");
    } finally {
      ja["nav.home"] = original;
    }
  });
  it("catalogs have matching keys and placeholders", () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
    for (const code of Object.keys(en) as (keyof typeof en)[]) {
      const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();
      expect(placeholders(ja[code])).toEqual(placeholders(en[code]));
    }
  });
  it("formats numbers and timestamps without rewriting the instant", () => {
    expect(formatNumber("ja", 12345)).toBe("12,345");
    const iso = "2026-10-24T03:04:05Z";
    expect(formatDateTime("ja", iso)).toBe(new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)));
    expect(formatDateTime("ja", "not-a-date")).toBe("未設定");
    expect(formatDateTime("en", "")).toBe("Not set");
  });
});

// TypeScript checks the public consumer contract in npm run build as well.
function typeContract(t: Translator) {
  t("nav.home");
  t("load.success", { name: "犬" });
  // @ts-expect-error a load message needs its name
  t("load.success");
  // @ts-expect-error UI labels have no argument object
  t("nav.home", { name: "犬" });
  // @ts-expect-error user data must have the contracted primitive type
  t("load.success", { name: 4 });
}
void typeContract;
