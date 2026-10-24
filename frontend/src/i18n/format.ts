/*
================================================================================
FILE: frontend/src/i18n/format.ts
SUMMARY
    Pure translation and locale-aware number/date formatting.
BASIC IDEA
    Own-key lookup prevents prototype keys; missing entries fall back to English.
INPUTS / INPUT SOURCES
    UI locale, message code, primitive arguments and ISO timestamps.
EXPECTED OUTPUT
    Plain strings for React text, never HTML or translated RDF.
================================================================================
*/

import { en } from "./en";
import { ja } from "./ja";
import type { Primitive, UiLocale } from "./types";

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const COMMON = { ja: "操作を完了できませんでした。詳細を確認してください。", en: "The operation could not be completed. Check the details." };

// The runtime boundary accepts unknown server codes. The consumer's t() is
// narrower: MessageArgs enforces the right arguments before the code ships.
export function translate(locale: UiLocale, code: string, args: Record<string, Primitive> = {}): string {
  const catalog = locale === "ja" ? ja : en;
  const local = own(catalog, code) ? catalog[code as keyof typeof catalog] : undefined;
  const english = own(en, code) ? en[code as keyof typeof en] : undefined;
  const template = typeof local === "string" ? local : typeof english === "string" ? english : COMMON[locale];
  let valid = true;
  const rendered = template.replace(/\{(\w+)\}/g, (_placeholder, key: string) => {
    if (!own(args, key) || (args[key] !== null && !["string", "number", "boolean"].includes(typeof args[key]))) {
      valid = false;
      return "";
    }
    const value = args[key];
    return value === null ? translate(locale, "common.notSet") : typeof value === "number" ? formatNumber(locale, value) : String(value);
  });
  return valid ? rendered : COMMON[locale];
}

export function formatNumber(locale: UiLocale, value: number): string {
  return Number.isFinite(value) ? new Intl.NumberFormat(locale).format(value) : translate(locale, "common.notSet");
}

export function formatDateTime(locale: UiLocale, iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return translate(locale, "common.notSet");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
