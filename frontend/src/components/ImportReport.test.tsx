// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/ImportReport.test.tsx
SUMMARY
    Import report localization preserves snapshot facts, sample provenance and
    authored text while switching an already mounted report's UI language.
BASIC IDEA
    Render the real report and language selector with synthetic data. Verify
    status semantics, report details and unchanged next-step callbacks.
INPUTS / INPUT SOURCES
    A synthetic snapshot/report and real locale provider, without API calls.
EXPECTED OUTPUT
    Current-language descriptions and actions, same DOM and raw data values.
================================================================================
*/
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import type { SnapshotSummary } from "../types";
import ImportReport from "./ImportReport";
import UiLanguageSelect from "./UiLanguageSelect";

const snapshot: SnapshotSummary = {
  id: "synthetic", source: "日本語 <b>{sample}</b>.csv", importedAt: "2026-10-02T12:00:00Z",
  rows: 2, total: 12, sample: true, enabled: true, className: "Person", classIri: "https://example.test/Person",
  statements: 4, individuals: 2, mapping: { status: "ok", message: null }, mappingText: "",
  report: { rowsRead: 2, total: 12, sample: true, individuals: 2, statements: 4,
    skipped: { count: 0, rows: [] }, repeated: { count: 0, rows: [] },
    keptAsText: [{ column: "born <img>{count}", datatype: "date", count: 1, rows: [2] }], empty: [], clean: false },
};
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

it("switches a visible report without losing its sample, details or callbacks", () => {
  const validate = vi.fn(), showData = vi.fn();
  const { container } = render(<I18nProvider><UiLanguageSelect /><ImportReport snapshot={snapshot} announce onValidate={validate} onShowData={showData} /></I18nProvider>);
  const report = container.querySelector(".import-report");
  const status = screen.getByRole("status");
  expect(status.textContent).toBe("2行、Personを2件（サンプル：全12行のうち先頭2行）");
  expect(screen.getByText("日本語 <b>{sample}</b>.csvから、2026年10月2日に取り込み；サンプル：全12行のうち先頭2行")).toBeTruthy();
  expect(screen.getByText("born <img>{count}：1個の値は日付ではないため、文字列として保持（2行目）")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "検証" }));
  expect(validate).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
  expect(container.querySelector(".import-report")).toBe(report);
  expect(screen.getByRole("status")).toBe(status);
  expect(status.textContent).toBe("2 rows, 2 People (sample: first 2 of 12 rows)");
  expect(screen.getByText("from 日本語 <b>{sample}</b>.csv, imported 2 October 2026; sample: first 2 of 12 rows")).toBeTruthy();
  expect(screen.getByText("born <img>{count}: 1 value is not a date, kept as text (row 2)")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show the data" }));
  expect(showData).toHaveBeenCalledTimes(1);
  expect(container.querySelector("img, b")).toBeNull();
});

it("does not announce a reopened report or offer missing next-step actions", () => {
  render(<I18nProvider><ImportReport snapshot={{ ...snapshot, className: null }} /></I18nProvider>);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByText("2行、項目を2件（サンプル：全12行のうち先頭2行）")).toBeTruthy();
});


it.each([
  [undefined, "concept"],
  [{ code: "words.kind.concept", args: {} }, "概念"],
  [{ code: "unknown.concept", args: {} }, "concept"],
] as const)("renders only a source-owned concept word and keeps authored or unknown names literal: %j", (message, name) => {
  render(<I18nProvider><ImportReport snapshot={{ ...snapshot, className: "concept", classNameUiMessage: message }} announce /></I18nProvider>);
  expect(screen.getByRole("status").textContent).toBe(`2行、${name}を2件（サンプル：全12行のうち先頭2行）`);
});
