// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/entities/useEntityPage.test.tsx
SUMMARY
    Pagination across changing dictionary sources without mixed generations.
BASIC IDEA
    Control API completion order and revision tokens at the hook boundary.
INPUTS / INPUT SOURCES
    View identity, local filters and deliberately delayed pages.
EXPECTED OUTPUT
    Reset offsets, bounded retry and no rows from another dictionary.
================================================================================
*/
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useEntityPage, type EntityPageOptions } from "./useEntityPage";
import type { EntityPage } from "./types";
const { getEntities } = vi.hoisted(() => ({ getEntities: vi.fn() }));
vi.mock("../api", () => ({ getEntities }));
const page = (revision: string, offset = 0): EntityPage => ({ revision, offset, limit: 50, total: 101, items: [{ iri: "https://example.org/"+revision, label: revision, kind: "concept", description: null, match: null, label_language: "ja", label_fallback: false, label_truncated: false, reference_only: false }] });
const opts: EntityPageOptions = { ontologyId: "one", language: "ja", imports: true, revision: 1, viewGeneration: "1", q: "", kind: "all", sort: "label" };
beforeEach(() => { getEntities.mockReset(); getEntities.mockResolvedValue(page("a")); });
afterEach(cleanup);
const settle = async () => { await act(async () => {}); };
it("requests 50 rows and resets offset when any dictionary condition changes", async () => {
  const { result, rerender } = renderHook(useEntityPage, { initialProps: opts }); await settle();
  expect(getEntities).toHaveBeenLastCalledWith("one", { q: "", kind: "all", sort: "label", imports: true, lang: "ja", offset: 0, limit: 50 }, expect.any(AbortSignal));
  await act(async () => { result.current.setOffset(50); });
  expect(getEntities.mock.calls[getEntities.mock.calls.length - 1][1].offset).toBe(50);
  rerender({ ...opts, viewGeneration: "2" }); expect(result.current.page).toBeNull(); await settle();
  expect(getEntities.mock.calls[getEntities.mock.calls.length - 1][1].offset).toBe(0);
});
it.each(["ontologyId", "language", "imports", "revision", "viewGeneration", "q", "kind", "sort"] as const)("discards a late old page after %s changes", async field => {
  let old!: (p: EntityPage) => void; getEntities.mockImplementationOnce(() => new Promise<EntityPage>(r => { old = r; }));
  const { result, rerender } = renderHook(useEntityPage, { initialProps: opts });
  const signal = getEntities.mock.calls[0][2] as AbortSignal;
  const next = { ...opts, [field]: field === "imports" ? false : field === "revision" ? 2 : field === "kind" ? "individual" : field === "sort" ? "iri" : "new" };
  rerender(next); expect(signal.aborted).toBe(true); expect(result.current.page).toBeNull(); await settle();
  await act(async () => { old(page("old")); }); expect(result.current.page?.revision).toBe("a");
});
it("restarts at zero once when a later page has a different token", async () => {
  const { result } = renderHook(useEntityPage, { initialProps: opts }); await settle();
  getEntities.mockResolvedValue(page("b", 50));
  await act(async () => { result.current.setOffset(50); });
  expect(getEntities.mock.calls.map(c => c[1].offset)).toEqual([0, 50, 0]);
  expect(result.current.page?.revision).toBe("b");
});
it("stops automatic retry on repeated source movement and lets the user reload", async () => {
  const { result } = renderHook(useEntityPage, { initialProps: opts }); await settle();
  getEntities.mockResolvedValueOnce(page("b", 50)).mockResolvedValueOnce(page("c"));
  await act(async () => { result.current.setOffset(50); });
  expect(getEntities).toHaveBeenCalledTimes(3); expect(result.current.page).toBeNull(); expect(result.current.updating).toBe(true);
  getEntities.mockResolvedValue(page("d")); await act(async () => { result.current.reload(); });
  expect(result.current.page?.revision).toBe("d"); expect(result.current.updating).toBe(false);
});
it("clears data on failure, preserving a retry operation", async () => {
  getEntities.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(useEntityPage, { initialProps: opts }); await settle();
  expect(result.current.page).toBeNull(); expect(result.current.error).toBeInstanceOf(Error);
  await act(async () => { result.current.reload(); }); expect(result.current.page?.revision).toBe("a");
});
