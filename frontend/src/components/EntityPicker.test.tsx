// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/EntityPicker.test.tsx
SUMMARY
    Picker composition, cancellation, import filtering and retained error details.
BASIC IDEA
    Exercise the visible combobox against controlled candidate results.
INPUTS / INPUT SOURCES
    Single-character input, key events and a mocked API boundary.
EXPECTED OUTPUT
    Composition never selects; only eligible candidates are offered. The primary
    error stays linked to the input and its original details survive UI changes.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DictionaryViewContext } from "../dictionary/DictionaryViewContext";
import EntityPicker from "./EntityPicker";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
const { searchNodes } = vi.hoisted(() => ({ searchNodes: vi.fn() }));
vi.mock("../api", () => ({ searchNodes }));
beforeEach(() => { vi.useFakeTimers(); searchNodes.mockReset(); searchNodes.mockResolvedValue([
  { id: "own", label: "Own", kind: "class", degree: 0 },
  { id: "import", label: "Imported", kind: "class", degree: 0, importedFrom: "Example", match: { reason: "alias", value: "別名", truncated: false } },
]); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("waits for composition and prevents Enter from accepting its candidate", async () => {
  const onPick = vi.fn();
  render(<EntityPicker ontologyId="one" kind="class" label="Parent" onPick={onPick} onCancel={vi.fn()} importedOnly />);
  const input = screen.getByRole("combobox");
  fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: "犬" } });
  await act(async () => { vi.advanceTimersByTime(1000); }); expect(searchNodes).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input); await act(async () => { vi.advanceTimersByTime(300); });
  expect(screen.getAllByRole("option")).toHaveLength(1); expect(screen.getByText("Alias: 別名")).toBeTruthy();
  fireEvent.keyDown(input, { key: "Enter", isComposing: true }); expect(onPick).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" }); expect(onPick).toHaveBeenCalledWith("import", "Imported");
});
it("Escape dismisses results, then cancels without a late response reopening them", async () => {
  const cancel = vi.fn(); render(<EntityPicker ontologyId="one" kind="class" label="Parent" onPick={vi.fn()} onCancel={cancel} />);
  const input = screen.getByRole("combobox"); fireEvent.change(input, { target: { value: "a" } });
  await act(async () => { vi.advanceTimersByTime(300); });
  fireEvent.keyDown(input, { key: "Escape" }); expect(screen.queryByRole("option")).toBeNull();
  fireEvent.keyDown(input, { key: "Escape" }); expect(cancel).toHaveBeenCalledOnce();
});
it("refreshes unchanged imports=true after its view generation changes", async () => {
  const props = { ontologyId: "one", kind: "class" as const, label: "Parent", onPick: vi.fn(), onCancel: vi.fn() };
  const { rerender } = render(<DictionaryViewContext.Provider value={{ revision: 1, viewGeneration: "old" }}><EntityPicker {...props} /></DictionaryViewContext.Provider>);
  const input = screen.getByRole("combobox"); fireEvent.change(input, { target: { value: "a" } });
  await act(async () => { vi.advanceTimersByTime(300); });
  rerender(<DictionaryViewContext.Provider value={{ revision: 1, viewGeneration: "new" }}><EntityPicker {...props} /></DictionaryViewContext.Provider>);
  expect(screen.queryByRole("option")).toBeNull();
  await act(async () => { vi.advanceTimersByTime(300); }); expect(searchNodes).toHaveBeenCalledTimes(2);
});

it("keeps a search failure's original details and updates its linked description without another search", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const cause = Object.assign(new Error("Original picker failure <img>{query}"), { uiMessage: { code: "ontology.not_found", args: {} } });
  searchNodes.mockRejectedValue(cause);
  render(<I18nProvider><UiLanguageSelect /><EntityPicker ontologyId="one" kind="class" label="Parent" onPick={vi.fn()} onCancel={vi.fn()} /></I18nProvider>);
  const input = screen.getByRole("combobox", { name: "Parent" });
  fireEvent.change(input, { target: { value: "犬" } });
  await act(async () => vi.advanceTimersByTime(300));
  const descriptionId = input.getAttribute("aria-describedby")!;
  const description = document.getElementById(descriptionId)!;
  expect(description.textContent).toBe("指定された辞書は見つかりません。");
  expect(description.querySelector("details")).toBeNull();
  const details = document.querySelector<HTMLDetailsElement>(".entity-picker details.technical-details")!;
  expect(details.open).toBe(false);
  expect(details.querySelector("pre")?.textContent).toBe(cause.message);
  details.open = true;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(document.getElementById(descriptionId)).toBe(description);
  expect(description.textContent).toBe("The ontology could not be found.");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(details.open).toBe(true);
  expect(details.querySelector("img")).toBeNull();
  expect(searchNodes).toHaveBeenCalledTimes(1);
});
