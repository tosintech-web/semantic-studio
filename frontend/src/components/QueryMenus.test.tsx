// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/QueryMenus.test.tsx
SUMMARY
    Query-menu language changes preserve filters, path choices and generated SPARQL.
BASIC IDEA
    Controlled real menus edit QueryStep/StepLink state; generateSparql exposes
    the actual query before and after a UI switch, independent of visible labels.
INPUTS / INPUT SOURCES
    Synthetic property/link options and original IRI and literal values.
EXPECTED OUTPUT
    Localized accessible controls, stable inputs and unchanged query semantics.
================================================================================
*/
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import { emptyQueryState, type QueryStep, type StepLink } from "../sparql/types";
import { generateSparql } from "../sparql/generate";
import ClassPropsMenu from "./ClassPropsMenu";
import PredicateMenu from "./PredicateMenu";
const EX = "https://example.test/";
const prop = { predicate: EX + "name", label: "name", prefixed: "ex:name", datatype: "http://www.w3.org/2001/XMLSchema#string", datatypePrefixed: "xsd:string", count: 2 };
afterEach(cleanup);
it("preserves a selected property's filter and SPARQL on a UI switch", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  function Harness() {
    const [step, setStep] = useState<QueryStep>({ classIri: EX + "Animal", label: "<b>Animal</b>", props: [{ predicateIri: prop.predicate, label: prop.label, datatype: prop.datatype, optional: true, filter: { op: "contains", value: "犬" } }] });
    return <><ClassPropsMenu step={step} available={[prop]} onChange={patch => setStep({ ...step, ...patch })} onClose={vi.fn()} />
      <output data-testid="query">{generateSparql({ ...emptyQueryState(), steps: [step] })}</output></>;
  }
  render(<I18nProvider><UiLanguageSelect /><Harness /></I18nProvider>);
  const operator = screen.getByRole("combobox", { name: "フィルター演算子" });
  const value = screen.getByRole("textbox", { name: "nameのフィルター値" });
  fireEvent.change(value, { target: { value: "<b>猫</b>" } });
  const query = screen.getByTestId("query").textContent;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("combobox", { name: "Filter operator" })).toBe(operator);
  expect(screen.getByRole("textbox", { name: "Filter value for name" })).toBe(value);
  expect((value as HTMLInputElement).value).toBe("<b>猫</b>");
  expect(screen.getByTestId("query").textContent).toBe(query);
  expect(query).toContain('"<b>猫</b>"');
  expect(document.querySelector("b")).toBeNull();
});
it("keeps property-path modifier, direction and SPARQL across a UI switch", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const option = { predicate: EX + "parent", label: "parent", prefixed: "ex:parent", inverse: true, declared: true, count: 4 };
  function Harness() {
    const [link, setLink] = useState<StepLink>({ anchor: 0, predicates: [{ iri: option.predicate, inverse: true }], modifier: "", optional: false });
    const steps: QueryStep[] = [{ classIri: EX + "A", label: "A", props: [] }, { classIri: EX + "B", label: "B", props: [], link }];
    return <><PredicateMenu link={link} anchorLabel="A" targetLabel="B" options={[option]} onChange={patch => setLink({ ...link, ...patch })} onClose={vi.fn()} />
      <output data-testid="query">{generateSparql({ ...emptyQueryState(), steps })}</output></>;
  }
  render(<I18nProvider><UiLanguageSelect /><Harness /></I18nProvider>);
  const repeat = screen.getByRole("radio", { name: /\+（1回以上）/ });
  fireEvent.click(repeat);
  const query = screen.getByTestId("query").textContent;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("radio", { name: /\+ \(one or more\)/ })).toBe(repeat);
  expect((repeat as HTMLInputElement).checked).toBe(true);
  expect(screen.getByTestId("query").textContent).toBe(query);
  expect(query).toContain("^");
  expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
});
