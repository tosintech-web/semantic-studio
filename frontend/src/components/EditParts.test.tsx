// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/EditParts.test.tsx
SUMMARY
    Shared editing controls keep original drafts and current-language copy notices.
BASIC IDEA
    Render the real inline editor and copy hook under the locale provider,
    including a clipboard promise that resolves after the UI language changes.
INPUTS / INPUT SOURCES
    Synthetic text, a save spy and mocked browser clipboard capabilities.
EXPECTED OUTPUT
    No lost draft, unchanged saved text, truthful copy results and live translation.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import { InlineText, useCopy } from "./EditParts";
let clipboardBefore: PropertyDescriptor | undefined;
beforeEach(() => { clipboardBefore = Object.getOwnPropertyDescriptor(navigator, "clipboard"); });
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  if (clipboardBefore) Object.defineProperty(navigator, "clipboard", clipboardBefore);
  else Reflect.deleteProperty(navigator, "clipboard");
});
it("keeps an inline draft and submits it unchanged after switching UI language", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const save = vi.fn().mockResolvedValue(true);
  render(<I18nProvider><UiLanguageSelect /><InlineText label="定義" value={null} busy={false} onSave={save} /></I18nProvider>);
  expect(screen.getByText("未設定")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "定義を追加" }));
  const input = screen.getByRole("textbox", { name: "定義" });
  fireEvent.change(input, { target: { value: "<b>日本語の定義</b>" } });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("textbox", { name: "定義" })).toBe(input);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
  expect(save).toHaveBeenCalledWith("<b>日本語の定義</b>");
});
function Copier() {
  const [copy, region] = useCopy();
  return <><button onClick={() => copy("https://example.test/犬")}>copy</button>{region}</>;
}
it("keeps copy facts and renders both delayed and existing notices in the current language", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  let resolve!: () => void;
  const writeText = vi.fn(() => new Promise<void>(done => { resolve = done; }));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<I18nProvider><UiLanguageSelect /><Copier /></I18nProvider>);
  fireEvent.click(screen.getByRole("button", { name: "copy" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://example.test/犬"));
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  await act(async () => resolve());
  expect(screen.getByRole("status").textContent).toBe("Copied https://example.test/犬.");
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  expect(screen.getByRole("status").textContent).toBe("https://example.test/犬をコピーしました。");
});
it("reports an unavailable clipboard as failure", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  render(<I18nProvider><Copier /></I18nProvider>);
  fireEvent.click(screen.getByRole("button", { name: "copy" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("コピーできませんでした。"));
});
