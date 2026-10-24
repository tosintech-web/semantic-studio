// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/DictionaryContext.test.tsx
SUMMARY
    Dictionary identity and save status in both supported UI languages.
BASIC IDEA
    Render presentation-only context; RDF language never changes its names.
INPUTS / INPUT SOURCES
    Name, editing state, document and saved/dirty/saving status.
EXPECTED OUTPUT
    Explicit readable context and full-value titles.
================================================================================
*/
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import DictionaryContext from "./DictionaryContext";
import { I18nProvider } from "../i18n/I18nProvider";
afterEach(cleanup);
it("distinguishes a read-only library from an unsaved project document", () => {
  const { rerender } = render(<DictionaryContext name="犬の辞書" editing={false} documentName={null} saveState="saved" />);
  expect(screen.getByText("Read only")).toBeTruthy();
  rerender(<DictionaryContext name="犬の辞書" editing documentName="model.ttl" saveState="dirty" />);
  expect(screen.getByText("Editing")).toBeTruthy(); expect(screen.getByText("Unsaved changes")).toBeTruthy();
  expect(screen.getByText("model.ttl")).toBeTruthy();
});
it("keeps full names and announces Japanese save state in text", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1"); const name = "長い辞書名".repeat(100);
  render(<I18nProvider><DictionaryContext name={name} editing documentName="model.ttl" saveState="saving" /></I18nProvider>);
  expect(screen.getByText(name).getAttribute("title")).toBe(name);
  expect(screen.getByText("保存中…")).toBeTruthy(); expect(screen.getByText("編集中")).toBeTruthy();
});
