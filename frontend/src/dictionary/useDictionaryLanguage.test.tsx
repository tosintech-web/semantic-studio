// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/dictionary/useDictionaryLanguage.test.tsx
SUMMARY
    Checks that UI and dictionary language preferences remain independent.
BASIC IDEA
    Switch dictionaries and UI locale while keeping per-dictionary choices.
INPUTS / INPUT SOURCES
    Hook props, localStorage and the existing project language store.
EXPECTED OUTPUT
    Explicit Library language survives changes; project language never leaks.
================================================================================
*/
import { act, cleanup, renderHook, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import DictionaryLanguageSelect from "../components/DictionaryLanguageSelect";
import { I18nProvider } from "../i18n/I18nProvider";
import { useDictionaryLanguage } from "./useDictionaryLanguage";
import type { UiLocale } from "../i18n/types";
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
it("ui_switch_does_not_change_explicit_dictionary_language", () => {
  const { result, rerender, unmount } = renderHook(
    ({ uiLocale }: { uiLocale: UiLocale }) => useDictionaryLanguage({ ontologyId: "lib-a", projectLanguage: null, uiLocale }),
    { initialProps: { uiLocale: "ja" as UiLocale } });
  expect(result.current.language).toBe("ja");
  act(() => result.current.setLanguage("fr"));
  rerender({ uiLocale: "en" });
  expect(result.current.language).toBe("fr");
  unmount();
  const again = renderHook(() => useDictionaryLanguage({ ontologyId: "lib-a", projectLanguage: null, uiLocale: "ja" }));
  expect(again.result.current.language).toBe("fr");
});
it("project_language_does_not_leak_to_library", () => {
  const { result, rerender } = renderHook(({ id, projectLanguage }: { id: string; projectLanguage: string | null }) =>
    useDictionaryLanguage({ ontologyId: id, projectLanguage, uiLocale: "ja" }),
    { initialProps: { id: "project-model", projectLanguage: "en" as string | null } });
  expect(result.current.language).toBe("en");
  rerender({ id: "lib-a", projectLanguage: null });
  expect(result.current.language).toBe("ja");
  act(() => result.current.setLanguage("fr"));
  rerender({ id: "lib-b", projectLanguage: null });
  expect(result.current.language).toBe("ja");
  rerender({ id: "lib-a", projectLanguage: null });
  expect(result.current.language).toBe("fr");
});
it("ignores malformed stored preferences and tolerates blocked writes", () => {
  localStorage.setItem("semantic-studio.dictionaryLanguages.v1", JSON.stringify({ "lib-a": "<bad>", "lib-b": 12 }));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  const { result } = renderHook(() => useDictionaryLanguage({ ontologyId: "lib-a", projectLanguage: null, uiLocale: "ja" }));
  expect(result.current.language).toBe("ja");
  act(() => result.current.setLanguage("en"));
  expect(result.current.language).toBe("en");
});

it("applies a valid display language and explains invalid input without applying it", () => {
  const change = vi.fn();
  render(<I18nProvider><DictionaryLanguageSelect language="ja" onChange={change} /></I18nProvider>);
  const input = screen.getByRole("combobox", { name: "辞書の表示言語" });
  fireEvent.change(input, { target: { value: "not a tag" } });
  fireEvent.click(screen.getByRole("button", { name: "表示言語を適用" }));
  expect(change).not.toHaveBeenCalled();
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("ja、en、ja-JPなどの言語タグを入力してください。")).toBeTruthy();
  fireEvent.change(input, { target: { value: "fr" } });
  fireEvent.click(screen.getByRole("button", { name: "表示言語を適用" }));
  expect(change).toHaveBeenCalledWith("fr");
});
