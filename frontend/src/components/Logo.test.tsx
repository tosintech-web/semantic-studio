// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/Logo.test.tsx
SUMMARY
    Localized tagline with the original Semantic Studio identity and SVG mark.
BASIC IDEA
    Change the actual UI locale and verify that only the descriptive tagline
    changes, keeping the same mark and wordmark.
INPUTS / INPUT SOURCES
    Real locale provider and language selector; no network or RDF data.
EXPECTED OUTPUT
    Current-language tagline and preserved product identity.
================================================================================
*/
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import Logo from "./Logo";
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

it("translates the descriptive tagline while preserving the brand and mark", () => {
  render(<I18nProvider><UiLanguageSelect /><Logo /></I18nProvider>);
  const brand = screen.getByTitle("Semantic Studio");
  const mark = brand.querySelector("svg");
  const wordmark = brand.querySelector(".brand-name");
  expect(screen.getByText("オントロジー作業スペース")).toBeTruthy();
  expect(wordmark?.textContent).toBe("SEMANTICSTUDIO");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText("ONTOLOGY WORKSPACE")).toBeTruthy();
  expect(brand.querySelector("svg")).toBe(mark);
  expect(brand.querySelector(".brand-name")).toBe(wordmark);
  expect(mark?.getAttribute("aria-hidden")).toBe("true");
});
