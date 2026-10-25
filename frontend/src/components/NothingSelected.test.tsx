// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/NothingSelected.test.tsx
SUMMARY
    Localized authoring guidance retains model counts and creation focus targets.
BASIC IDEA
    Render the real panel under the locale provider and spy only on creation.
INPUTS / INPUT SOURCES
    Frozen synthetic model counts and a taxonomy flag.
EXPECTED OUTPUT
    Correct Japanese/English counts, unchanged data and the requested entity kind.
================================================================================
*/
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import { projectStore } from "../state/projectStore";
import NothingSelected from "./NothingSelected";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("localizes editing guidance and counts without changing the model or starting a draft", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const start = vi.spyOn(projectStore, "startCreating").mockReturnValue(1);
  const counts = Object.freeze({ classes: 1200, concepts: 4, relationships: 2, attributes: 3, examples: 1 });
  render(<I18nProvider><UiLanguageSelect /><NothingSelected counts={counts} taxonomy={false} /></I18nProvider>);
  expect(screen.getByRole("heading", { name: "項目が選択されていません" })).toBeTruthy();
  expect(screen.getByText("クラス：1,200件")).toBeTruthy();
  expect(screen.getByText("個体の例：1件")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText("1,200 classes")).toBeTruthy();
  expect(screen.getByText("1 example")).toBeTruthy();
  expect(counts.classes).toBe(1200);
  expect(start).not.toHaveBeenCalled();
});

it("offers creation of a concept for a taxonomy and keeps the button as the return-focus target", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const start = vi.spyOn(projectStore, "startCreating").mockReturnValue(1);
  render(<I18nProvider><NothingSelected counts={null} taxonomy /></I18nProvider>);
  expect(screen.getByText("集計中…")).toBeTruthy();
  const button = screen.getByRole("button", { name: "新しい概念" });
  fireEvent.click(button);
  expect(start).toHaveBeenCalledWith("concept", { from: button });
});
