// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/ConceptRelations.test.tsx
================================================================================

SUMMARY
    The first test for ConceptRelations (X-12, T-23): a concept's mapping
    rows read by the target's name -- an imported concept's label, which they
    showed as its raw IRI (PR #49 review) -- with the IRI in the title, and
    by the IRI only for a target with no name.

BASIC IDEA
    The concept's blocks are read out of node details by entityModel, as the
    form reads them, so the row's name is the one the server's term carries.
    The runner is a stub: no command is sent here.

INPUTS / INPUT SOURCES
    - A mocked api.ts (the picker's search is never reached).

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../api", () => ({ searchNodes: vi.fn() }));

import { entityModel } from "../modeling/entity";
import type { NodeDetails, TermRef } from "../types";
import ConceptRelations from "./ConceptRelations";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import type { Runner } from "./EditParts";

const EX = "http://example.org/fruit#";
const SKOS = "http://www.w3.org/2004/02/skos/core#";

const term = (value: string, label: string | null, prefixed: string | null): TermRef => ({
  type: "uri",
  value,
  label: label ?? undefined,
  prefixed: prefixed ?? undefined,
});

function concept(mappings: [string, TermRef][]): NodeDetails {
  return {
    iri: EX + "Apple",
    prefixed: "fruit:Apple",
    label: "Apple",
    kind: "concept",
    outgoing: mappings.map(([p, o]) => ({ predicate: term(SKOS + p, p, `skos:${p}`), object: o })),
    incoming: [],
    outgoingTotal: mappings.length,
    incomingTotal: 0,
  } as NodeDetails;
}

const runner: Runner = { busy: false, errors: {}, run: vi.fn(), clear: vi.fn(), alive: () => true };

function show(details: NodeDetails) {
  render(
    <ConceptRelations
      ontologyId="prj-1-model"
      iri={details.iri}
      name="Apple"
      model={entityModel(details, "en", ["en"])}
      runner={runner}
      onSelect={vi.fn()}
    />,
  );
}

afterEach(cleanup);

describe("ConceptRelations: a mapping row (T-23)", () => {
  it("shows an imported concept by its label, with its IRI in the title", () => {
    const imported = "http://example.org/imported#Malus";
    show(concept([["exactMatch", term(imported, "Malus", "imp:Malus")]]));
    const link = screen.getByRole("link", { name: "Malus" });
    expect(link.getAttribute("href")).toBe(imported);
    expect(link.getAttribute("title")).toBe(imported);
    expect(screen.queryByText(imported)).toBeNull();
    expect(screen.getByRole("button", { name: "Remove the exact match Malus" })).toBeTruthy();
  });

  it("falls back to the IRI only when the target has no name", () => {
    const bare = "http://dbpedia.org/resource/Apple";
    show(concept([["closeMatch", term(bare, null, null)]]));
    expect(screen.getByRole("link", { name: bare }).getAttribute("href")).toBe(bare);
  });

  it("a target that cannot be a link is its name as text", () => {
    show(concept([["relatedMatch", term("urn:x:pome", "Pome", null)]]));
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Pome").getAttribute("title")).toBe("urn:x:pome");
  });
});

const iri = "https://example.test/concept";
function model() {
  return entityModel({ iri, prefixed: "ex:concept", label: "犬", kind: "concept", outgoing: [], incoming: [], outgoingTotal: 0, incomingTotal: 0 }, "ja", []);
}
it("keeps mapping kind and target draft when switching UI language", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const run = vi.fn().mockResolvedValue({ revision: 2 });
  render(<I18nProvider><UiLanguageSelect /><ConceptRelations ontologyId="model" iri={iri} name="犬" model={model()}
    runner={{ busy: false, errors: {}, run, clear: vi.fn(), alive: () => true }} onSelect={vi.fn()} /></I18nProvider>);
  expect(screen.getByRole("heading", { name: "関連する概念" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "対応付けを追加" }));
  const kind = screen.getByRole("combobox", { name: "対応付けの種類" });
  fireEvent.change(kind, { target: { value: "closeMatch" } });
  const target = screen.getByRole("textbox", { name: "対応先の概念へのリンク" });
  fireEvent.change(target, { target: { value: "https://example.test/犬" } });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("combobox", { name: "Kind of mapping" })).toBe(kind);
  expect((kind as HTMLSelectElement).value).toBe("closeMatch");
  expect(screen.getByRole("textbox", { name: "Link to the other concept" })).toBe(target);
  expect((target as HTMLInputElement).value).toBe("https://example.test/犬");
  fireEvent.click(screen.getByRole("button", { name: "Add mapping" }));
  await waitFor(() => expect(run).toHaveBeenCalledWith("mapping", "AddMapping", { concept: iri, kind: "closeMatch", target: "https://example.test/犬" }));
});
it("renders unknown mapping kinds as original text and keeps unsafe targets inert", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const data = model();
  data.mappings = [{ kind: "toString", target: { iri: "javascript:alert(1)", label: "<b>参照先</b>" } }];
  data.related = [{ iri: "https://example.test/other", label: "猫" }];
  data.topOf = [{ iri: "https://example.test/scheme", label: "動物" }];
  const run = vi.fn();
  render(<I18nProvider><ConceptRelations ontologyId="model" iri={iri} name="犬" model={data}
    runner={{ busy: false, errors: {}, run, clear: vi.fn(), alive: () => true }} onSelect={vi.fn()} /></I18nProvider>);
  expect(screen.getByText("toString:")).toBeTruthy();
  expect(screen.getByText("<b>参照先</b>")).toBeTruthy();
  expect(document.querySelector("a, b")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "toStringの対応先<b>参照先</b>を外す" }));
  expect(run).toHaveBeenCalledWith("mappingList", "RemoveMapping", { concept: iri, kind: "toString", target: "javascript:alert(1)" });
  fireEvent.click(screen.getByRole("button", { name: "犬と猫の関連を外す" }));
  expect(run).toHaveBeenCalledWith("relatedList", "RemoveRelated", { concept: iri, related: "https://example.test/other" });
});
