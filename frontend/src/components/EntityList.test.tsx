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
import { I18nProvider } from "../i18n/I18nProvider";
import EntityList from "./EntityList";
import type { EntityPage } from "../entities/types";
const { getEntities } = vi.hoisted(() => ({ getEntities: vi.fn() }));
vi.mock("../api", () => ({ getEntities }));
const data: EntityPage = { total: 3036, offset: 0, limit: 50, revision: "one", items: Array.from({ length: 50 }, (_, i) => ({ iri: `https://example.org/${i}`, label: "犬", kind: "individual", description: "合成データ", match: null, label_language: "ja", label_fallback: false, label_truncated: false, reference_only: i === 1 })) };
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
  const kind = screen.getByRole("combobox", { name: "Kind" }); expect(within(kind).getAllByRole("option")).toHaveLength(6);
  for (const value of ["concept", "individual", "class", "properties", "other", "all"]) {
    fireEvent.change(kind, { target: { value } }); await act(async () => {});
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
  expect(screen.getByRole("combobox", { name: "種類" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "次のページ" })).toBeTruthy();
});
it("moves focus to the heading after paging and exposes each row's actual kind", async () => {
  await setup(); expect(screen.getAllByText("Individual")).toHaveLength(50);
  fireEvent.click(screen.getByRole("button", { name: "Next page" })); await act(async () => {});
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Entities" }));
});
