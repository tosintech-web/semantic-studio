// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/EntityPicker.test.tsx
SUMMARY
    Picker composition, cancellation and import filtering behavior.
BASIC IDEA
    Exercise the visible combobox against controlled candidate results.
INPUTS / INPUT SOURCES
    Single-character input, key events and a mocked API boundary.
EXPECTED OUTPUT
    Composition never selects; only eligible candidates are offered.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DictionaryViewContext } from "../dictionary/DictionaryViewContext";
import EntityPicker from "./EntityPicker";
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
