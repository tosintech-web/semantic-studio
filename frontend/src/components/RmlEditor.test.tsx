// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/RmlEditor.test.tsx
SUMMARY
    RML editing retains its draft and pending operation across UI languages.
BASIC IDEA
    Switch the real locale with a mounted editor, then inspect the exact API
    payload and raw error detail. The API is mocked, the editor is real.
INPUTS / INPUT SOURCES
    A synthetic snapshot, deferred API reply and structured/unknown errors.
EXPECTED OUTPUT
    Localized controls and error frame, unchanged RDF text and one apply call.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { updateData } = vi.hoisted(() => ({ updateData: vi.fn() }));
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), updateData }));
import { ApiError } from "../api";
import { I18nProvider } from "../i18n/I18nProvider";
import type { SnapshotSummary } from "../types";
import UiLanguageSelect from "./UiLanguageSelect";
import RmlEditor from "./RmlEditor";

const snapshot: SnapshotSummary = {
  id: "synthetic-snapshot", source: "日本語 <b>data</b>.csv", importedAt: "2026-10-24T00:00:00Z",
  rows: 1, total: 1, sample: false, enabled: true, className: "Person", classIri: "https://example.test/Person",
  statements: 1, individuals: 1, mapping: { status: "ok", message: null }, mappingText: "# original mapping",
  report: { rowsRead: 1, total: 1, sample: false, individuals: 1, statements: 1,
    skipped: { count: 0, rows: [] }, repeated: { count: 0, rows: [] }, keptAsText: [], empty: [], clean: true },
};
beforeEach(() => { localStorage.clear(); updateData.mockReset(); });
afterEach(() => { cleanup(); localStorage.clear(); });
const switchTo = (locale: string) => fireEvent.change(screen.getByRole("combobox"), { target: { value: locale } });

it("keeps the same draft, textarea and pending apply when the UI language changes", async () => {
  let resolve!: (reply: { snapshot: SnapshotSummary; generation: number }) => void;
  updateData.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const onApplied = vi.fn();
  const onCancel = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><RmlEditor projectId="synthetic" snapshot={snapshot} onApplied={onApplied} onCancel={onCancel} /></I18nProvider>);
  const field = screen.getByRole("textbox", { name: `${snapshot.source} のRMLマッピング · mapping.rml.ttl` });
  const draft = '# 日本語 {value} <script>raw text</script>\n<#m> a <https://example.test/Map> .';
  fireEvent.change(field, { target: { value: draft } });
  switchTo("en");
  expect(screen.getByRole("textbox")).toBe(field);
  expect((field as HTMLTextAreaElement).value).toBe(draft);
  await act(async () => fireEvent.keyDown(field, { key: "Enter", ctrlKey: true }));
  expect(screen.getByText("Applying…")).toBeTruthy();
  switchTo("ja");
  expect(screen.getByText("適用中…")).toBeTruthy();
  expect(screen.getByRole("button", { name: "適用" }).getAttribute("aria-disabled")).toBe("true");
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "適用" })));
  expect(updateData).toHaveBeenCalledTimes(1);
  expect(updateData).toHaveBeenCalledWith("synthetic", snapshot.id, { mapping: draft });
  await act(async () => resolve({ snapshot, generation: 2 }));
  expect(onApplied).toHaveBeenCalledWith(snapshot);
  fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it.each([true, false])("renders current-language error text and untouched raw detail (metadata=%s)", async (known) => {
  const raw = "original failure <img src=x onerror=alert(1)> {name}";
  updateData.mockRejectedValue(new ApiError(raw, 422, raw, known ? { code: "request.invalid", args: {} } : undefined));
  const { container } = render(<I18nProvider><UiLanguageSelect /><RmlEditor projectId="synthetic" snapshot={snapshot} onApplied={vi.fn()} onCancel={vi.fn()} /></I18nProvider>);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "適用" })));
  expect(screen.getByRole("alert").textContent).toBe(known ? "入力値を確認して再試行してください。" : "操作を完了できませんでした。詳細を確認してください。");
  expect(screen.getByText(raw)).toBeTruthy();
  switchTo("en");
  expect(screen.getByRole("alert").textContent).toBe(known ? "Check the supplied values and try again." : "The operation could not be completed. Check the details.");
  expect(screen.getByText("Technical details")).toBeTruthy();
  expect(screen.getByText(raw)).toBeTruthy();
  expect(container.querySelector("img")).toBeNull();
  expect(updateData).toHaveBeenCalledTimes(1);
});
