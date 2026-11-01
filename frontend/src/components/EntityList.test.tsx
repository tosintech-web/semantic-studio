// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/EntityList.test.tsx
SUMMARY
    Full dictionary table, paging, filtering and identity-safe selection.
BASIC IDEA
    Drive a real table with controlled server pages, without a graph request.
INPUTS / INPUT SOURCES
    Fifty same-name entities, true totals and asynchronous page API responses.
EXPECTED OUTPUT
    Bounded rows, distinguishable IRIs, explicit counts and useful controls.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import UiLanguageSelect from "./UiLanguageSelect";
import { I18nProvider } from "../i18n/I18nProvider";
import EntityList from "./EntityList";
import type { EntityPage } from "../entities/types";
const { getEntities } = vi.hoisted(() => ({ getEntities: vi.fn() }));
vi.mock("../api", () => ({ getEntities }));
const data: EntityPage = { total: 3036, offset: 0, limit: 50, revision: "one", kind_counts: { individual: 3000, concept: 2, class: 10, properties: 20, other: 4 }, items: Array.from({ length: 50 }, (_, i) => ({ iri: `https://example.org/${i}`, label: "犬", kind: "individual", description: "合成データ", match: null, label_language: "ja", label_fallback: false, label_truncated: false, reference_only: i === 1 })) };
const props = { ontologyId: "one", language: "ja", imports: true, revision: 1, viewGeneration: "0", initialQuery: "", onSelect: vi.fn() };
beforeEach(() => { getEntities.mockReset(); getEntities.mockImplementation((_id, params) => Promise.resolve({ ...data, offset: params.offset })); props.onSelect.mockReset(); });
afterEach(cleanup);
const setup = async () => { const view = render(<EntityList {...props} />); await act(async () => {}); return view; };
it("renders 50 rows and the true total, disambiguating identical names by full IRI", async () => {
  await setup(); expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(51);
  expect(screen.getByRole("status").textContent).toContain("1–50 of 3,036");
  const buttons = screen.getAllByRole("button", { name: /^犬/ });
  expect(buttons).toHaveLength(50); expect(buttons[0].getAttribute("title")).toContain("https://example.org/0");
  fireEvent.click(buttons[1]); expect(props.onSelect).toHaveBeenCalledWith("https://example.org/1");
  expect(screen.getByText("Reference only")).toBeTruthy();
});
it("pages and resets to zero for all six kind groups and both sorts", async () => {
  await setup(); fireEvent.click(screen.getByRole("button", { name: "Next page" })); await act(async () => {});
  expect(getEntities.mock.calls[getEntities.mock.calls.length - 1][1].offset).toBe(50);
  const kind = screen.getByRole("tablist", { name: "Kind" }); expect(within(kind).getAllByRole("tab")).toHaveLength(6);
  for (const [value, name] of [["concept", "Concepts"], ["individual", "Individuals"], ["class", "Classes"], ["properties", "Properties"], ["other", "Other"], ["all", "All kinds"]]) {
    fireEvent.click(within(kind).getByRole("tab", { name })); await act(async () => {});
    expect(getEntities.mock.calls[getEntities.mock.calls.length - 1][1]).toMatchObject({ kind: value, offset: 0 });
  }
  fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value: "iri" } }); await act(async () => {});
  expect(getEntities.mock.calls[getEntities.mock.calls.length - 1][1]).toMatchObject({ sort: "iri", offset: 0 });
});
it("shows API failure and a retry without retaining old rows", async () => {
  getEntities.mockRejectedValueOnce(new Error("external failure")); await setup();
  expect(screen.queryByRole("table")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); await act(async () => {});
  expect(screen.getByRole("table")).toBeTruthy();
});
it("labels fields and buttons with Japanese UI messages", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  render(<I18nProvider><EntityList {...props} /></I18nProvider>); await act(async () => {});
  expect(screen.getByRole("heading", { name: "項目一覧" })).toBeTruthy();
  expect(screen.getByRole("tablist", { name: "種類" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "次のページ" })).toBeTruthy();
});
it("moves focus to the heading after paging and exposes each row's actual kind", async () => {
  await setup(); expect(screen.getAllByText("Individual")).toHaveLength(50);
  fireEvent.click(screen.getByRole("button", { name: "Next page" })); await act(async () => {});
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Entities" }));
});
it("re-renders a server error when the user switches UI locale", async () => {
  const error = Object.assign(new Error("Original English detail"), { uiMessage: { code: "reasoning.timeout", args: { seconds: 10 } } });
  getEntities.mockRejectedValue(error); localStorage.removeItem("semantic-studio.uiLocale.v1");
  render(<I18nProvider><UiLanguageSelect /><EntityList {...props} /></I18nProvider>); await act(async () => {});
  expect(screen.getByRole("status").textContent).toContain("推論を10秒で停止しました");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("status").textContent).toContain("Reasoning stopped after 10 seconds");
  expect(screen.getByText("Original English detail")).toBeTruthy();
});

it("uses complete-view classifications, including kinds absent from the visible rows", async () => {
  getEntities.mockResolvedValue({ ...data, kind_counts: { individual: 3035, class: 1 } });
  await setup();
  expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["All kinds", "Individuals", "Classes"]);
  expect(screen.getByRole("tab", { name: "All kinds" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByRole("tab", { name: "Concepts" })).toBeNull();
  expect(screen.getByRole("tabpanel", { name: "All kinds" })).toBeTruthy();
});
it("keeps dictionary kinds during pending requests and zero-result searches", async () => {
  vi.useFakeTimers();
  try {
    getEntities.mockResolvedValue({ ...data, kind_counts: { individual: 3035, class: 1 } });
    await setup();
    let finish!: (page: EntityPage) => void;
    getEntities.mockReturnValueOnce(new Promise<EntityPage>(resolve => { finish = resolve; }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search dictionary" }), { target: { value: "missing" } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.queryByRole("table")).toBeNull();
    await act(async () => { finish({ ...data, items: [], total: 0, kind_counts: { individual: 3035, class: 1 } }); });
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByText("No matching dictionary entries.")).toBeTruthy();
  } finally { vi.useRealTimers(); }
});
it("supports arrow/Home/End tab navigation and keeps focus after filtering", async () => {
  await setup();
  const all = screen.getByRole("tab", { name: "All kinds" });
  all.focus();
  fireEvent.keyDown(all, { key: "ArrowRight" }); await act(async () => {});
  const concepts = screen.getByRole("tab", { name: "Concepts" });
  expect(document.activeElement).toBe(concepts);
  expect(concepts.getAttribute("aria-selected")).toBe("true");
  expect(getEntities.mock.lastCall?.[1]).toMatchObject({ kind: "concept", offset: 0 });
  fireEvent.keyDown(concepts, { key: "End" }); await act(async () => {});
  expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Other" }));
  fireEvent.keyDown(document.activeElement!, { key: "Home" }); await act(async () => {});
  expect(document.activeElement).toBe(all);
  expect(screen.getAllByRole("tab").filter(tab => tab.getAttribute("aria-selected") === "true")).toHaveLength(1);
});
it("returns a disappearing selected kind and its focus to All after an edit", async () => {
  const view = await setup();
  const classes = screen.getByRole("tab", { name: "Classes" });
  classes.focus(); fireEvent.click(classes); await act(async () => {});
  getEntities.mockResolvedValue({ ...data, revision: "two", kind_counts: { individual: 3036 } });
  view.rerender(<EntityList {...props} revision={2} />); await act(async () => {});
  expect(screen.queryByRole("tab", { name: "Classes" })).toBeNull();
  const all = screen.getByRole("tab", { name: "All kinds" });
  expect(all.getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(all);
  expect(getEntities.mock.lastCall?.[1]).toMatchObject({ kind: "all", offset: 0 });
});
it("returns to All when a selected kind receives an older response without metadata", async () => {
  const view = await setup();
  fireEvent.click(screen.getByRole("tab", { name: "Classes" })); await act(async () => {});
  getEntities.mockResolvedValue({ ...data, revision: "two", kind_counts: undefined });
  view.rerender(<EntityList {...props} revision={2} />); await act(async () => {});
  const all = screen.getByRole("tab", { name: "All kinds" });
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  expect(all.getAttribute("aria-selected")).toBe("true");
  expect(all.tabIndex).toBe(0);
  expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(all.id);
  expect(getEntities.mock.lastCall?.[1]).toMatchObject({ kind: "all", offset: 0 });
});
it("shows All for an empty dictionary or an older response without kind metadata", async () => {
  getEntities.mockResolvedValue({ ...data, items: [], total: 0, kind_counts: {} });
  const view = await setup();
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  getEntities.mockResolvedValue({ ...data, kind_counts: undefined });
  view.rerender(<EntityList {...props} ontologyId="legacy" />); await act(async () => {});
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  expect(screen.getByRole("table")).toBeTruthy();
});

it("does not move an editing field's focus when its kind disappears", async () => {
  const content = (revision: number) => <><input aria-label="Edit draft" /><EntityList {...props} revision={revision} /></>;
  const view = render(content(1)); await act(async () => {});
  fireEvent.click(screen.getByRole("tab", { name: "Classes" })); await act(async () => {});
  const draft = screen.getByRole("textbox", { name: "Edit draft" }); draft.focus();
  getEntities.mockResolvedValue({ ...data, revision: "two", kind_counts: { individual: 3036 } });
  view.rerender(content(2)); await act(async () => {});
  expect(screen.queryByRole("tab", { name: "Classes" })).toBeNull();
  expect(document.activeElement).toBe(draft);
});
it("a pending page change cannot steal focus after choosing a kind tab", async () => {
  await setup();
  let oldPage!: (page: EntityPage) => void;
  getEntities.mockReturnValueOnce(new Promise<EntityPage>(resolve => { oldPage = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Next page" })); await act(async () => {});
  const classes = screen.getByRole("tab", { name: "Classes" }); classes.focus(); fireEvent.click(classes);
  await act(async () => {});
  await act(async () => { oldPage({ ...data, offset: 50 }); });
  expect(document.activeElement).toBe(classes);
  expect(getEntities.mock.lastCall?.[1]).toMatchObject({ kind: "class", offset: 0 });
});
