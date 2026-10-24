// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/InferredBlock.test.tsx
SUMMARY
    Inferred-detail failures retain source errors across UI language changes.
BASIC IDEA
    Reject the real read boundary and switch locale and project identity; neither
    rerenders nor late responses may replace current facts with a former error.
INPUTS / INPUT SOURCES
    Synthetic API errors and deferred about responses.
EXPECTED OUTPUT
    Localized explanations, escaped originals and project-scoped results.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import InferredBlock from "./InferredBlock";
import type { ReasoningAbout } from "../types";
const { getReasoningAbout } = vi.hoisted(() => ({ getReasoningAbout: vi.fn() }));
vi.mock("../api", () => ({ getReasoningAbout }));
const props = { projectId: "one", iri: "https://example.org/a", imports: false, resultKey: "1", revision: 1, label: "対象", onSelect: vi.fn() };
beforeEach(() => { getReasoningAbout.mockReset(); localStorage.removeItem("semantic-studio.uiLocale.v1"); });
afterEach(() => { cleanup(); localStorage.removeItem("semantic-studio.uiLocale.v1"); });
it.each([true, false])("keeps an about error as original details while the explanation changes locale (known=%s)", async (known) => {
  const original = "読み込み <img src=x> {iri}";
  getReasoningAbout.mockRejectedValue(Object.assign(new Error(original), { uiMessage: known
    ? { code: "reasoning.failed", args: {} } : { code: "future.reason", args: {} } }));
  await act(async () => { render(<I18nProvider><UiLanguageSelect /><InferredBlock {...props} /></I18nProvider>); });
  const detail = screen.getByText(original).closest("details")!;
  expect(detail).toBeTruthy(); detail.open = true;
  expect(screen.getByText(known ? "推論中にエラーが発生して停止しました。詳細を確認してください。" : "操作を完了できませんでした。詳細を確認してください。")).toBeTruthy();
  const summary = within(detail).getByText("技術的な詳細"); summary.focus();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText(known ? "The reasoner stopped with an error. Check the original details." : "The operation could not be completed. Check the details.")).toBeTruthy();
  expect(screen.getByText(original).closest("details")).toBe(detail);
  expect(detail.open).toBe(true); expect(document.activeElement).toBe(summary);
  expect(detail.querySelector("img")).toBeNull(); expect(getReasoningAbout).toHaveBeenCalledTimes(1);
});
it("ignores a previous project's rejected about request", async () => {
  let reject!: (error: Error) => void;
  getReasoningAbout.mockReturnValueOnce(new Promise<ReasoningAbout>((_, no) => { reject = no; }));
  const view = render(<InferredBlock {...props} />);
  getReasoningAbout.mockResolvedValueOnce({ iri: props.iri, facts: [], neverMembers: true, stale: false });
  await act(async () => { view.rerender(<InferredBlock {...props} projectId="two" />); });
  await act(async () => { reject(new Error("old about failure")); });
  expect(screen.queryByText("old about failure")).toBeNull();
  expect(screen.getByText("対象 can never have members.")).toBeTruthy();
});
