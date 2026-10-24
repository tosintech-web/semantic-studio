// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/RuleEditor.test.tsx
SUMMARY
    SHACL rule editing keeps values, hidden fields and selected identities when
    the user changes UI language.
BASIC IDEA
    Read-only precision guidance preserves original drafts/data and identities;
    language changes do not repeat reads or submit rounded integer counts.

    Drive the real form in both languages and inspect the complete submitted
    rule. No API call or translating saved RDF is involved.
INPUTS / INPUT SOURCES
    Synthetic paths, an existing rule and the actual locale provider.
EXPECTED OUTPUT
    Current-language labels, previews and errors; unchanged submitted values.
================================================================================
*/
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import RuleEditor from "./RuleEditor";
import type { ShapeRule } from "../types";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

it("keeps a text rule draft and hidden fields across a UI language switch", () => {
  const initial: ShapeRule = { path: ["https://example.org/name"], pathLabel: "name <b>{value}</b>", pathKind: "attribute", datatype: "xsd:string", minCount: 2, pattern: "^[A-Z]{3}$", class: "https://example.org/Hidden", classLabel: "Hidden" };
  const onSubmit = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><RuleEditor modelOntologyId="synthetic-model" paths={[{ path: initial.path, label: initial.pathLabel!, kind: "attribute", datatype: "xsd:string" }]} initial={initial} languages={["ja", "en"]} busy={false} onSubmit={onSubmit} onCancel={vi.fn()} /></I18nProvider>);
  expect(screen.getByRole("group", { name: "ルールを変更" })).toBeTruthy();
  const field = screen.getByRole("spinbutton", { name: "最小件数" });
  fireEvent.change(field, { target: { value: "3" } });
  const pattern = screen.getByRole("textbox", { name: "パターン（正規表現）" });
  expect((pattern as HTMLInputElement).value).toBe("^[A-Z]{3}$");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(within(screen.getByRole("group", { name: "How many" })).getByRole("spinbutton", { name: "at least" })).toBe(field);
  expect((field as HTMLInputElement).value).toBe("3");
  expect(screen.getByRole("textbox", { name: "Pattern, a regular expression" })).toBe(pattern);
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
  expect(onSubmit).toHaveBeenCalledWith({ ...initial, minCount: 3 });
  expect(document.querySelector(".rule-preview b")).toBeNull();
});

it("shows a current-language problem without changing the numeric bounds", () => {
  const initial: ShapeRule = { path: ["https://example.org/name"], pathLabel: "name", pathKind: "name", minCount: 3, maxCount: 1 };
  const onSubmit = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><RuleEditor modelOntologyId="synthetic-model" paths={[{ path: initial.path, label: "name", kind: "name" }]} initial={initial} languages={["ja", "en"]} busy={false} onSubmit={onSubmit} onCancel={vi.fn()} /></I18nProvider>);
  expect(screen.getByText("最小件数3が最大件数1を超えているため、このルールは満たせません。")).toBeTruthy();
  expect(screen.getByRole("button", { name: "ルールを保存" }).getAttribute("aria-disabled")).toBe("true");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText("At least 3 is more than at most 1; the rule could never be met.")).toBeTruthy();
  expect((screen.getByRole("spinbutton", { name: "from" }) as HTMLInputElement).value).toBe("3");
  expect((screen.getByRole("spinbutton", { name: "to" }) as HTMLInputElement).value).toBe("1");
  expect(onSubmit).not.toHaveBeenCalled();
});

it("blocks unsafe integer counts without rounding the draft, then submits an exact supported count", () => {
  const initial: ShapeRule = { path: ["https://example.test/name"], pathLabel: "name", pathKind: "attribute", datatype: "xsd:string", minCount: 2 };
  const onSubmit = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><RuleEditor modelOntologyId="synthetic-model" paths={[{ path: initial.path, label: "name", kind: "attribute", datatype: "xsd:string" }]}
    initial={initial} languages={["ja", "en"]} busy={false} onSubmit={onSubmit} onCancel={vi.fn()} /></I18nProvider>);
  const field = screen.getByRole("spinbutton", { name: "最小件数" }) as HTMLInputElement;
  const exact = "9007199254740993";
  fireEvent.change(field, { target: { value: exact } });
  expect(screen.getByText("件数・文字数が9,007,199,254,740,991を超える場合は、値を正確に保持するためTurtleで編集してください。")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(field.value).toBe(exact);
  expect(screen.getByText("Edit counts or lengths above 9,007,199,254,740,991 in Turtle to preserve their exact value.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ minCount: 3 }));
});
