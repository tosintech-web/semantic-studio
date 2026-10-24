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
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { useQueryBuilder } from "./useQueryBuilder";
import type { QuerySchema } from "../types";
import * as api from "../api";
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
