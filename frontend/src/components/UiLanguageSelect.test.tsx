// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/UiLanguageSelect.test.tsx
SUMMARY
    Verifies the UI-language control and crash-screen language selection.
BASIC IDEA
    Drive standard select changes and assert accessible names and document lang.
INPUTS / INPUT SOURCES
    The locale provider and a deliberately failing child.
EXPECTED OUTPUT
    A named select with native focus order; crash recovery remains bilingual.
================================================================================
*/
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import UiLanguageSelect from "./UiLanguageSelect";
import ErrorBoundary from "./ErrorBoundary";
import { I18nContext, I18nProvider } from "../i18n/I18nProvider";
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
it("exposes a native language select with a visible name", () => {
  render(<I18nProvider><UiLanguageSelect /></I18nProvider>);
  const select = screen.getByRole("combobox", { name: "UIの言語" }) as HTMLSelectElement;
  expect(select.value).toBe("ja");
  expect(select.hasAttribute("tabindex")).toBe(false);
  fireEvent.change(select, { target: { value: "en" } });
  expect(screen.getByRole("combobox", { name: "UI language" })).toBe(select);
  expect(document.documentElement.lang).toBe("en");
});
it("lets a person change locale after the application crashes", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const swallow = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener("error", swallow);
  function Broken(): never { throw new Error("<untrusted>"); }
  try {
    render(<I18nProvider><ErrorBoundary><Broken /></ErrorBoundary></I18nProvider>);
    expect(screen.getByRole("heading", { name: "問題が発生しました。" })).toBeTruthy();
    expect(screen.getByText("<untrusted>").innerHTML).toBe("&lt;untrusted&gt;");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    expect(screen.getByRole("button", { name: "Reload the application" })).toBeTruthy();
  } finally {
    window.removeEventListener("error", swallow);
  }
});

it("keeps minimal recovery available when the translator itself throws", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const swallow = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener("error", swallow);
  function Broken(): never { throw new Error("original failure"); }
  try {
    render(<I18nContext.Provider value={{ locale: "ja", setLocale: () => {}, t: () => { throw new Error("catalog failure"); } }}>
      <ErrorBoundary><Broken /></ErrorBoundary>
    </I18nContext.Provider>);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "再読み込み / Reload" })).toBeTruthy();
  } finally { window.removeEventListener("error", swallow); }
});
