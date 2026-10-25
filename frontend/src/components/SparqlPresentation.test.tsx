// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/SparqlPresentation.test.tsx
SUMMARY
    UI language changes around the SPARQL preview and editor preserve query text.
BASIC IDEA
    Real editor state and highlighting, with callback spies at the execution
    boundary. Language changes must never run, replace, or reinterpret a query.
INPUTS / INPUT SOURCES
    Synthetic Unicode SPARQL and original authored notes under I18nProvider.
EXPECTED OUTPUT
    Localized controls, unchanged text/payloads and no automatic execution.
================================================================================
*/
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import SparqlEditor from "./SparqlEditor";
import SparqlPreview from "./SparqlPreview";
const QUERY = 'SELECT ?s WHERE { ?s ?p "犬<b>" }\n# {parent}';
afterEach(cleanup);

it("changes editor controls without losing a draft, changing its note or running it", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const run = vi.fn(); const change = vi.fn(); const download = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><SparqlEditor generated={QUERY} initialText={QUERY}
    textQuery={{ forkedFrom: null, name: "犬.rq", baseline: QUERY, runBlocked: null, note: "Original authored note", fresh: true, session: 1, resume: null }}
    namespaces={{}} running={false} error={null} saveLabel="保存" saveTitle="保存"
    onFork={vi.fn()} onChange={change} onRun={run} onSave={vi.fn()} onDownload={download}
    onOpenFile={vi.fn()} onBack={vi.fn()} onClose={vi.fn()} /></I18nProvider>);
  const area = screen.getByRole("textbox", { name: "SPARQLクエリ本文" }) as HTMLTextAreaElement;
  expect(document.activeElement).toBe(area);
  expect(area.value).toBe(QUERY);
  const draft = QUERY + "\nLIMIT 5";
  fireEvent.change(area, { target: { value: draft } });
  fireEvent.click(screen.getByRole("button", { name: ".rqをダウンロード" }));
  expect(download).toHaveBeenCalledWith(draft);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect((screen.getByRole("textbox", { name: "SPARQL query text" }) as HTMLTextAreaElement).value).toBe(draft);
  expect(screen.getByText("Original authored note")).toBeTruthy();
  expect(change).toHaveBeenCalledTimes(1);
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Run.*Ctrl\+Enter/ }));
  expect(run).toHaveBeenCalledWith(draft);
});

it("localizes preview actions while preserving every highlighted query line as plain text", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const edit = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><SparqlPreview sparql={QUERY} onEditAsText={edit} onNewTextQuery={vi.fn()} /></I18nProvider>);
  expect(screen.getByRole("button", { name: "新しいテキストクエリ" })).toBeTruthy();
  expect([...document.querySelectorAll(".sparql-code")].map(line => line.textContent).join("\n")).toBe(QUERY);
  expect(document.querySelector(".sparql-code b")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "テキストとして編集" }));
  expect(edit).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("button", { name: "Edit as text" })).toBeTruthy();
  expect([...document.querySelectorAll(".sparql-code")].map(line => line.textContent).join("\n")).toBe(QUERY);
});
