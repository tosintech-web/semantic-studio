// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/SideTabs.test.tsx
SUMMARY
    Localized authoring tabs preserve selected IDs, keyboard focus and custom text.
BASIC IDEA
    Use the real controlled tab state and locale provider; only selection callbacks
    are spied when custom tabs come from another producer.
INPUTS / INPUT SOURCES
    Default editing tabs, a result badge and original custom labels.
EXPECTED OUTPUT
    Current-language headings/counts with unchanged keyboard and selection behavior.
================================================================================
*/
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import SideTabs, { type SideTab } from "./SideTabs";
afterEach(cleanup);
function Harness() {
  const [tab, setTab] = useState<SideTab>("details");
  return <SideTabs tab={tab} onTab={setTab} badge={3}><p>{tab}</p></SideTabs>;
}
it("updates tab and badge names while keeping selection and focus on the same tab", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  render(<I18nProvider><UiLanguageSelect /><Harness /></I18nProvider>);
  expect(screen.getByRole("tablist", { name: "サイドパネル" })).toBeTruthy();
  const details = screen.getByRole("tab", { name: "詳細" });
  details.focus();
  fireEvent.keyDown(details, { key: "ArrowRight" });
  const reasoning = screen.getByRole("tab", { name: "推論、3件の新しい結果" });
  expect(reasoning.getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(reasoning);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("tab", { name: "Reasoning, 3 new" })).toBe(reasoning);
  expect(document.activeElement).toBe(reasoning);
  expect(screen.getByRole("tabpanel").textContent).toBe("reasoning");
});
it("preserves explicit producer labels and passes their original tab IDs", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const select = vi.fn();
  render(<I18nProvider><SideTabs tab="custom" onTab={select} label="Original panel" tabs={[{ id: "custom", name: "<b>Custom</b>" }]}><p>Original content</p></SideTabs></I18nProvider>);
  fireEvent.click(screen.getByRole("tab", { name: "<b>Custom</b>" }));
  expect(select).toHaveBeenCalledWith("custom");
  expect(document.querySelector(".side-tabs b")).toBeNull();
});
