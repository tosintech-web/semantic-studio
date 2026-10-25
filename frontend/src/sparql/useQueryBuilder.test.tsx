// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/sparql/useQueryBuilder.test.tsx
SUMMARY
    Verifies live language changes in a query already being built.
BASIC IDEA
    Return language-specific schema/names from the real API boundary and keep
    saved query structure and generated SPARQL unchanged while names refresh.
INPUTS / INPUT SOURCES
    Synthetic class, property and pinned individual.
EXPECTED OUTPUT
    Current dictionary names without rewriting IRIs, filters or query text.
================================================================================
*/
import { act, cleanup, fireEvent, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { useQueryBuilder } from "./useQueryBuilder";
import type { QuerySchema } from "../types";
import * as api from "../api";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "../components/UiLanguageSelect";
vi.mock("../api", () => ({ getQuerySchema: vi.fn(), getQueryNode: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("refreshes existing step property and pin names without changing the query", async () => {
  const schema = (ja: boolean): QuerySchema => ({ classes: [{ iri: "urn:Dog", label: ja ? "犬" : "Dog", prefixed: "urn:Dog", instances: 1, kind: "class" }], links: [],
    dataProperties: { "urn:Dog": [{ predicate: "urn:name", label: ja ? "名前" : "name", prefixed: "urn:name", datatype: "http://www.w3.org/2001/XMLSchema#string", datatypePrefixed: "xsd:string", count: 1 }] },
    superClasses: {}, namespaces: {}, truncated: false });
  vi.mocked(api.getQuerySchema).mockImplementation(async (_id, _imports, lang) => schema(lang === "ja"));
  vi.mocked(api.getQueryNode).mockImplementation(async (_id, iri, _imports, lang) => ({ iri, label: lang === "ja" ? "ポチ" : "Pochi", isClass: false, types: [] }));
  const { result, rerender } = renderHook(({ lang }) => useQueryBuilder("dictionary", true, false, 0, lang), { initialProps: { lang: "en" } });
  await waitFor(() => expect(result.current.schema).not.toBeNull());
  act(() => result.current.loadState({ steps: [{ classIri: "urn:Dog", label: "Dog", pin: { iri: "urn:dog1", label: "Pochi" }, props: [{ predicateIri: "urn:name", label: "name", optional: false, filter: { op: "=", value: "unchanged" } }] }], limit: 25, distinct: true, pathsMode: false, aggregate: "none" }, { id: "query-fixture", name: "Fixture" }));
  const text = result.current.sparql;
  rerender({ lang: "ja" });
  await waitFor(() => expect(result.current.state.steps[0].label).toBe("犬"));
  await waitFor(() => expect(result.current.state.steps[0].pin?.label).toBe("ポチ"));
  expect(result.current.state.steps[0].props[0].label).toBe("名前");
  expect(result.current.state.steps[0].props[0].filter?.value).toBe("unchanged");
  expect(result.current.sparql).toBe(text);
});
it("refreshes the same imports=true query schema after re-resolution", async () => {
  const empty: QuerySchema = { classes: [], links: [], dataProperties: {}, superClasses: {}, namespaces: {}, truncated: false };
  vi.mocked(api.getQuerySchema).mockResolvedValue(empty);
  const { rerender } = renderHook(({ generation }) => useQueryBuilder("dictionary", true, true, 0, "ja", generation), { initialProps: { generation: "1" } });
  await waitFor(() => expect(api.getQuerySchema).toHaveBeenCalledTimes(1));
  rerender({ generation: "2" }); await waitFor(() => expect(api.getQuerySchema).toHaveBeenCalledTimes(2));
});

const EMPTY_SCHEMA: QuerySchema = { classes: [], links: [], dataProperties: {}, superClasses: {}, namespaces: {}, truncated: false };
it.each(["ontology", "imports", "revision", "language", "generation", "text", "clear", "saved"])("ignores delayed query-node success and failure after %s changes", async change => {
  vi.mocked(api.getQuerySchema).mockResolvedValue(EMPTY_SCHEMA);
  let resolve!: (value: Awaited<ReturnType<typeof api.getQueryNode>>) => void;
  vi.mocked(api.getQueryNode).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const initial = { id: "a", imports: false, revision: 0, lang: "en", generation: "0" };
  const { result, rerender } = renderHook(p => useQueryBuilder(p.id, true, p.imports, p.revision, p.lang, p.generation), { initialProps: initial });
  await waitFor(() => expect(result.current.schema).not.toBeNull());
  let pending!: Promise<void>;
  act(() => { pending = result.current.addNode("urn:old"); });
  if (change === "text") act(() => result.current.openTextQuery("SELECT * {}"));
  else if (change === "clear") act(() => result.current.clear());
  else if (change === "saved") act(() => result.current.loadState({ ...result.current.state, steps: [] }, { id: "saved", name: "Saved" }));
  else rerender({ ...initial, ...(change === "ontology" ? { id: "b" } : change === "imports" ? { imports: true } : change === "revision" ? { revision: 1 } : change === "language" ? { lang: "ja" } : { generation: "1" }) });
  await act(async () => { resolve({ iri: "urn:old", label: "Old", isClass: true, types: [] }); await pending; });
  expect(result.current.state.steps).toEqual([]);
  expect(result.current.hint).toBeNull();
});
it("translates retained owned query hints on UI changes while preserving literal names", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  vi.mocked(api.getQuerySchema).mockResolvedValue(EMPTY_SCHEMA);
  vi.mocked(api.getQueryNode).mockResolvedValue({ iri: "urn:untyped", label: "名前 <b>{name}", isClass: false, types: [] });
  const wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider><UiLanguageSelect />{children}</I18nProvider>;
  const { result } = renderHook(() => useQueryBuilder("a", true), { wrapper });
  await waitFor(() => expect(result.current.schema).not.toBeNull());
  await act(async () => { await result.current.addNode("urn:untyped"); });
  expect(result.current.hint).toBe("この項目には型がないため、クエリのステップに使えません。");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(result.current.hint).toBe("That node has no type, so it cannot be used as a query step.");
  act(() => result.current.addClass("urn:A", "最初"));
  act(() => result.current.addClass("urn:B", "名前 <b>{name}"));
  expect(result.current.hint).toBe("No relationship connects “名前 <b>{name}” to the current path.");
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  expect(result.current.hint).toBe("現在のパスと「名前 <b>{name}」を結ぶ関連がありません。");
  expect(api.getQueryNode).toHaveBeenCalledTimes(1);
});

it("ignores a delayed query-node failure from the previous ontology", async () => {
  vi.mocked(api.getQuerySchema).mockResolvedValue(EMPTY_SCHEMA);
  let reject!: (error: Error) => void;
  vi.mocked(api.getQueryNode).mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  const { result, rerender } = renderHook(({ id }) => useQueryBuilder(id, true), { initialProps: { id: "a" } });
  await waitFor(() => expect(result.current.schema).not.toBeNull());
  let pending!: Promise<void>; act(() => { pending = result.current.addNode("urn:old"); });
  rerender({ id: "b" });
  await act(async () => { reject(new Error("old source")); await pending; });
  expect(result.current.hint).toBeNull();
});

it("retries a cancelled schema read on Query return, preserving completed cache entries", async () => {
  const schema = (label: string): QuerySchema => ({ ...EMPTY_SCHEMA, classes: [{ iri: "urn:A", label, prefixed: "urn:A", instances: 1, kind: "class" }] });
  vi.mocked(api.getQuerySchema).mockResolvedValueOnce(schema("English"));
  let old!: (value: QuerySchema) => void;
  let latest!: (value: QuerySchema) => void;
  vi.mocked(api.getQuerySchema).mockImplementationOnce(() => new Promise(r => { old = r; }))
    .mockImplementationOnce(() => new Promise(r => { latest = r; }));
  const { result, rerender } = renderHook(({ active, language }) => useQueryBuilder("a", active, false, 0, language), { initialProps: { active: true, language: "en" } });
  await waitFor(() => expect(result.current.schema?.classes[0].label).toBe("English"));
  rerender({ active: true, language: "ja" });
  expect(api.getQuerySchema).toHaveBeenCalledTimes(2);
  rerender({ active: false, language: "ja" });
  await act(async () => { old(schema("古い応答")); });
  rerender({ active: true, language: "ja" });
  expect(api.getQuerySchema).toHaveBeenCalledTimes(3);
  await act(async () => { latest(schema("日本語")); });
  expect(result.current.schema?.classes[0].label).toBe("日本語");
  expect(result.current.loadingSchema).toBe(false);
  rerender({ active: false, language: "ja" });
  rerender({ active: true, language: "ja" });
  expect(api.getQuerySchema).toHaveBeenCalledTimes(3);
  expect(result.current.schema?.classes[0].label).toBe("日本語");
});
