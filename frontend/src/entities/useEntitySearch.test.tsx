// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/entities/useEntitySearch.test.tsx
SUMMARY
    Candidate search timing, composition and generation isolation.
BASIC IDEA
    Drive the hook with fake time and deliberately late API answers.
INPUTS / INPUT SOURCES
    Search parameters and controlled candidate responses.
EXPECTED OUTPUT
    One request after 300ms, and no selectable stale results.
================================================================================
*/
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useEntitySearch, type EntitySearchParams } from "./useEntitySearch";
import type { VizNode } from "../types";
const { searchNodes } = vi.hoisted(() => ({ searchNodes: vi.fn() }));
vi.mock("../api", () => ({ searchNodes }));
const node = (id: string): VizNode => ({ id, label: id, kind: "class", degree: 0 });
const params: EntitySearchParams = { ontologyId: "one", language: "ja", imports: true, revision: 1, viewGeneration: "1:0", query: "犬", composing: false };
beforeEach(() => { vi.useFakeTimers(); searchNodes.mockReset(); searchNodes.mockResolvedValue([node("犬")]); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const tick = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
it("waits through composition and requests one Japanese character exactly 300ms after it ends", async () => {
  const { result, rerender } = renderHook((p: EntitySearchParams) => useEntitySearch(p), { initialProps: { ...params, composing: true } });
  await tick(1000); expect(searchNodes).not.toHaveBeenCalled();
  rerender(params); rerender({ ...params }); await tick(299); expect(searchNodes).not.toHaveBeenCalled();
  await tick(1); expect(searchNodes).toHaveBeenCalledTimes(1);
  expect(searchNodes).toHaveBeenCalledWith("one", "犬", true, undefined, expect.any(AbortSignal), 26, "ja");
  expect(result.current.results.map(n => n.id)).toEqual(["犬"]);
});
it("supports one Latin letter, but never searches an empty field", async () => {
  const { rerender } = renderHook(useEntitySearch, { initialProps: { ...params, query: " " } });
  await tick(300); expect(searchNodes).not.toHaveBeenCalled();
  rerender({ ...params, query: "a" }); await tick(300); expect(searchNodes).toHaveBeenCalledTimes(1);
});
it.each(["ontologyId", "language", "imports", "revision", "viewGeneration"] as const)("aborts and suppresses old answers when %s changes", async (field) => {
  let resolve!: (nodes: VizNode[]) => void;
  searchNodes.mockImplementationOnce(() => new Promise<VizNode[]>(r => { resolve = r; }));
  const { result, rerender } = renderHook(useEntitySearch, { initialProps: params });
  await tick(300); const signal = searchNodes.mock.calls[0][4] as AbortSignal;
  const next = { ...params, [field]: field === "imports" ? false : field === "revision" ? 2 : "changed" };
  rerender(next); expect(signal.aborted).toBe(true); expect(result.current.results).toEqual([]);
  await act(async () => { resolve([node("old")]); }); expect(result.current.results).toEqual([]);
  await tick(300); expect(result.current.results[0].id).toBe("犬");
});
it("clears completed results immediately, caps visible candidates at 25 and reports overflow/errors", async () => {
  searchNodes.mockResolvedValueOnce(Array.from({ length: 26 }, (_, i) => node(String(i))));
  const { result, rerender } = renderHook(useEntitySearch, { initialProps: params });
  await tick(300); expect(result.current.results).toHaveLength(25); expect(result.current.more).toBe(true);
  searchNodes.mockRejectedValueOnce(new Error("external detail"));
  rerender({ ...params, query: "猫" }); expect(result.current.results).toEqual([]);
  await tick(300); expect(result.current.error).toBeInstanceOf(Error); expect(result.current.more).toBe(false);
});
it("cancels a pending timer and request on unmount", async () => {
  const first = renderHook(useEntitySearch, { initialProps: params }); first.unmount(); await tick(300);
  expect(searchNodes).not.toHaveBeenCalled();
  const second = renderHook(useEntitySearch, { initialProps: params }); await tick(300);
  const signal = searchNodes.mock.calls[0][4] as AbortSignal; second.unmount(); expect(signal.aborted).toBe(true);
});
