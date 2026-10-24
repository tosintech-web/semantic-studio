// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/HierarchyActions.test.tsx
SUMMARY
    Localized outline actions keep menu identity, focus and action IDs.
BASIC IDEA
    Use rowActions and RowMenu under the real locale provider, including a
    caller with a fresh close callback on each render as the examples menu has.
INPUTS / INPUT SOURCES
    A synthetic class row and stable action identifiers.
EXPECTED OUTPUT
    Updated labels with the same focused item, keyboard behavior and chosen ID.
================================================================================
*/
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import { rowActions, RowMenu } from "./HierarchyActions";
afterEach(cleanup);
it("keeps the focused action across a UI switch with a changing caller callback", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const choose = vi.fn();
  function Harness() {
    const { t } = useI18n();
    return <RowMenu label="<b>Employee</b>" items={rowActions("class", false, null, false, t)} anchor={{ top: 0, left: 0 }} onChoose={choose} onClose={() => undefined} />;
  }
  render(<I18nProvider><UiLanguageSelect /><Harness /></I18nProvider>);
  const menu = screen.getByRole("menu", { name: "<b>Employee</b>の操作" });
  fireEvent.keyDown(menu, { key: "ArrowDown" });
  const rename = screen.getByRole("menuitem", { name: "名前を変更" });
  expect(document.activeElement).toBe(rename);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("menuitem", { name: "Rename" })).toBe(rename);
  expect(document.activeElement).toBe(rename);
  fireEvent.click(rename);
  expect(choose).toHaveBeenCalledWith("rename");
  expect(document.querySelector("b")).toBeNull();
});
