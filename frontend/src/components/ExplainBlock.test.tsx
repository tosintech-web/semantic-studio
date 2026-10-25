// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/ExplainBlock.test.tsx
SUMMARY
    Localized explanation paragraphs retain plain text and linked entity targets.
BASIC IDEA
    Change the real UI locale while the same facts and description remain open.
INPUTS / INPUT SOURCES
    Synthetic RDF explanation metadata with hostile-looking labels and prose.
EXPECTED OUTPUT
    Localized headings/facts, unchanged author text and the original navigation IRI.
================================================================================
*/
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import ExplainBlock from "./ExplainBlock";
afterEach(cleanup);
it("rephrases linked facts and preserves author text on language changes", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const navigate = vi.fn();
  const parent = { iri: "https://example.org/parent", label: "<b>Animal{child}</b>" };
  render(<I18nProvider><UiLanguageSelect /><ExplainBlock label="犬" language="ja" terms={[]} onNavigate={navigate}
    explain={{ kind: "class", parents: [parent], description: { text: "元の説明{parent}<b>。", lang: "ja" } }} /></I18nProvider>);
  expect(screen.getByRole("heading", { name: "わかりやすい説明" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "<b>Animal{child}</b>" }));
  expect(navigate).toHaveBeenCalledWith(parent.iri);
  expect(document.querySelector(".explain-block b")).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("heading", { name: "In plain words" })).toBeTruthy();
  expect(screen.getByText(/元の説明\{parent\}<b>。/)).toBeTruthy();
  expect(navigate).toHaveBeenCalledTimes(1);
});

it("updates standard definitions by IRI and keeps the glossary disclosure open", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const iri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  render(<I18nProvider><UiLanguageSelect /><ExplainBlock label="犬" terms={[
    { iri, name: "type", prefixed: "rdf:type", definition: "English compatibility value" },
    { iri: "urn:custom", name: "Custom", prefixed: "custom", definition: "Original custom definition" },
  ]} explain={{ kind: "class", description: null }} onNavigate={vi.fn()} /></I18nProvider>);
  fireEvent.click(screen.getByText("用語の意味（2件）"));
  expect(document.querySelector("details")?.open).toBe(true);
  expect(screen.getByText(/対象がどの種類に属するかを示します/)).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(document.querySelector("details")?.open).toBe(true);
  expect(screen.getByText(/says what kind of thing something is/)).toBeTruthy();
  expect(screen.getByText(/Original custom definition/)).toBeTruthy();
});
