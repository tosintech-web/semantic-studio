// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/NewEntityForm.test.tsx
================================================================================

SUMMARY
    The first tests of the names-first form, for attribute-reuse 5.1 (AC-1,
    AC-12): suggestions once the name has two characters and typing rests;
    only the project's own properties of the kind asked, the other kind
    never; an answer older than the latest dropped; Enter still Create; the
    live region saying the count once, never the list; the suggestions'
    buttons in the tab order between the name and More options; and the
    choice a refused Create gives, including its current-language display
    facts without changing the input draft.

BASIC IDEA
    The form is rendered alone with the api mocked: searchNodes and
    getNodeDetails answer as the server would, through promises a test can
    hold back to make one answer arrive after a newer one. Fake timers
    stand in for the 250 ms pause.

INPUTS / INPUT SOURCES
    - Inline search hits and node details.

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NodeDetails } from "../types";
import NewEntityForm from "./NewEntityForm";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import { SUGGEST_MS } from "./useSuggestions";

const { searchNodes, getNodeDetails } = vi.hoisted(() => ({ searchNodes: vi.fn(), getNodeDetails: vi.fn() }));
vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, searchNodes, getNodeDetails };
});

const HR = "http://example.org/hr#";
const XSD = "http://www.w3.org/2001/XMLSchema#";

function details(local: string, domain: NodeDetails["domain"], range?: { value: string; prefixed?: string; label?: string }): NodeDetails {
  return {
    iri: HR + local,
    prefixed: `hr:${local}`,
    label: local,
    outgoing: range
      ? [{ predicate: { type: "uri", value: "http://www.w3.org/2000/01/rdf-schema#range" }, object: { type: "uri", ...range } }]
      : [],
    incoming: [],
    outgoingTotal: 1,
    incomingTotal: 0,
    domain,
  } as NodeDetails;
}

const HAS_NAME = details(
  "hasName",
  { form: "one", classes: [{ iri: HR + "Employee", label: "Employee" }] },
  { value: XSD + "string", prefixed: "xsd:string" },
);
const HAS_NICK = details(
  "hasNick",
  { form: "union", classes: [{ iri: HR + "Employee", label: "Employee" }, { iri: HR + "Contractor", label: "Contractor" }] },
);

const onSubmit = vi.fn();
const onUse = vi.fn();

function show(kind: "datatypeProperty" | "objectProperty" = "datatypeProperty") {
  render(
    <NewEntityForm
      title="New attribute of Manager"
      primaryLanguage="en"
      datatypes
      onSubmit={onSubmit}
      onCancel={() => undefined}
      suggest={{ ontologyId: "prj-0123456789ab-model", kind, className: "Manager", onUse }}
    />,
  );
  return screen.getByLabelText("Name (en)") as HTMLInputElement;
}

async function type(field: HTMLInputElement, value: string) {
  await act(async () => {
    fireEvent.change(field, { target: { value } });
  });
}

async function pause(ms = SUGGEST_MS) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  // The search's and the details' promises settle.
  await act(async () => undefined);
  await act(async () => undefined);
}

const status = () => document.querySelector('[role="status"]')!.textContent;

beforeEach(() => {
  vi.useFakeTimers();
  for (const m of [searchNodes, getNodeDetails, onSubmit, onUse]) m.mockReset();
  searchNodes.mockResolvedValue([{ id: HR + "hasName" }, { id: HR + "hasNick" }]);
  getNodeDetails.mockImplementation(async (_id: string, iri: string) => (iri === HR + "hasName" ? HAS_NAME : HAS_NICK));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("suggestions while typing (attribute-reuse 5.1)", () => {
  it("waits for two characters and the pause, then lists what the project has", async () => {
    const field = show();
    await type(field, "h");
    await pause();
    expect(searchNodes).not.toHaveBeenCalled();
    await type(field, "ha");
    await pause(SUGGEST_MS - 1);
    expect(searchNodes).not.toHaveBeenCalled();
    await pause(1);
    // The document only, not its imports; one kind; five at most.
    expect(searchNodes).toHaveBeenCalledWith("prj-0123456789ab-model", "ha", false, "datatypeProperty", expect.any(AbortSignal), 5, undefined);
    expect(screen.getByText("Already in this project")).toBeTruthy();
    expect(screen.getByText("hasName, an attribute of Employee (text).")).toBeTruthy();
    expect(screen.getByText("hasNick, an attribute of Employee or Contractor.")).toBeTruthy();
    const use = screen.getByRole("button", { name: "Use it on Manager (hasName)" });
    expect(use.textContent).toBe("Use it on Manager");
    // The name says what is on screen first, then which one (label in name).
    expect(use.getAttribute("aria-label")!.startsWith(use.textContent!)).toBe(true);
    await act(async () => fireEvent.click(use));
    expect(onUse).toHaveBeenCalledWith({ iri: HR + "hasName", label: "hasName" });
  });

  it("asks for relationships only on Add relationship: the other kind is never listed", async () => {
    const field = show("objectProperty");
    await type(field, "rep");
    await pause();
    expect(searchNodes.mock.calls[0][3]).toBe("objectProperty");
  });

  it("drops an answer older than the latest", async () => {
    let release: (value: unknown) => void = () => undefined;
    searchNodes.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    searchNodes.mockResolvedValueOnce([{ id: HR + "hasNick" }]);
    const field = show();
    await type(field, "ha");
    await pause();
    await type(field, "hasN");
    await pause();
    expect(screen.getByText("hasNick, an attribute of Employee or Contractor.")).toBeTruthy();
    // The search it replaced was aborted (CF-4), and answering last it is not shown.
    expect((searchNodes.mock.calls[0][4] as AbortSignal).aborted).toBe(true);
    expect((searchNodes.mock.calls[1][4] as AbortSignal).aborted).toBe(false);
    await act(async () => release([{ id: HR + "hasName" }]));
    await pause(0);
    expect(screen.queryByText("hasName, an attribute of Employee (text).")).toBeNull();
  });

  it("shows nothing when the search fails, and Create still works", async () => {
    searchNodes.mockRejectedValue(new Error("down"));
    const field = show();
    await type(field, "hasName");
    await pause();
    expect(screen.queryByText("Already in this project")).toBeNull();
    await act(async () => {
      fireEvent.submit(field.form!);
    });
    expect(onSubmit).toHaveBeenCalledWith({ name: "hasName", datatype: "xsd:string" });
  });

  it("Enter in the name field still creates", async () => {
    const field = show();
    await type(field, "hasName");
    await pause();
    expect(screen.getByText("Already in this project")).toBeTruthy();
    await act(async () => {
      fireEvent.submit(field.form!);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("says the count once typing rests, never the list (5.5)", async () => {
    const field = show();
    expect(status()).toBe("");
    await type(field, "has");
    await pause();
    expect(status()).toBe("2 existing attributes match");
    searchNodes.mockResolvedValue([{ id: HR + "hasName" }]);
    await type(field, "hasNa");
    await pause();
    expect(status()).toBe("1 existing attribute matches");
  });

  it("puts the suggestions between the name and More options", async () => {
    const field = show();
    await type(field, "has");
    await pause();
    // jsdom has no sequential focus navigation: document order is the tab
    // order here, as no control sets a positive tabIndex.
    const order = [...document.querySelectorAll<HTMLElement>("input, button, select")];
    const use = screen.getByRole("button", { name: "Use it on Manager (hasName)" });
    const more = screen.getByRole("button", { name: "More options" });
    expect(order.indexOf(field)).toBe(0);
    expect(order.indexOf(use)).toBeGreaterThan(order.indexOf(field));
    expect(order.indexOf(use)).toBeLessThan(order.indexOf(more));
    expect(order.every((el) => el.tabIndex >= 0 || el.getAttribute("type") === "hidden")).toBe(true);
  });
});

describe("a Create refused because the name exists (5.1)", () => {
  it("offers the same choice in place of the sentence", () => {
    const onExisting = vi.fn();
    const onAnother = vi.fn();
    render(
      <NewEntityForm
        title="New attribute of Manager"
        primaryLanguage="en"
        error="There is already an attribute hasName, of Employee."
        existing={{ sentence: "There is already an attribute hasName, of Employee.", className: "Manager", onUse: onExisting, onAnother }}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getAllByText("There is already an attribute hasName, of Employee.")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Use it on Manager" }));
    expect(onExisting).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Choose another name" }));
    expect(onAnother).toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText("Name (en)"));
  });
});


it("keeps name, identifier and datatype drafts while switching UI language", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  render(<I18nProvider><UiLanguageSelect /><NewEntityForm title="Original title" primaryLanguage="en" datatypes onSubmit={onSubmit} onCancel={vi.fn()} /></I18nProvider>);
  const name = screen.getByRole("textbox", { name: "名前（en）" });
  fireEvent.change(name, { target: { value: "<b>請求書</b>" } });
  fireEvent.click(screen.getByRole("button", { name: "詳細オプション" }));
  fireEvent.change(screen.getByRole("textbox", { name: "識別子（省略時は名前から生成）" }), { target: { value: HR + "Invoice" } });
  fireEvent.change(screen.getByRole("combobox", { name: "値の型" }), { target: { value: "xsd:integer" } });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("textbox", { name: "Name (en)" })).toBe(name);
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(onSubmit).toHaveBeenCalledWith({ name: "<b>請求書</b>", iri: HR + "Invoice", datatype: "xsd:integer" });
});
it("rephrases existing suggestions and their count without refetching on UI switch", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  render(<I18nProvider><UiLanguageSelect /><NewEntityForm title="Original title" primaryLanguage="en" onSubmit={onSubmit} onCancel={vi.fn()}
    suggest={{ ontologyId: "prj-0123456789ab-model", kind: "datatypeProperty", className: "Manager", onUse }} /></I18nProvider>);
  await type(screen.getByRole("textbox", { name: "名前（en）" }) as HTMLInputElement, "ha");
  await pause();
  expect(screen.getByText("hasName：Employeeの属性（テキスト）。")).toBeTruthy();
  expect(status()).toBe("既存の属性が2件一致しました");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText("hasName, an attribute of Employee (text).")).toBeTruthy();
  expect(status()).toBe("2 existing attributes match");
  expect(searchNodes).toHaveBeenCalledTimes(1);
  expect(getNodeDetails).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Use it on Manager (hasName)" }));
  expect(onUse).toHaveBeenCalledWith({ iri: HR + "hasName", label: "hasName" });
});


it("renders a suggestion reply that arrives after the UI language changes", async () => {
  localStorage.setItem("semantic-studio.uiLocale.v1", "en");
  let release!: (nodes: { id: string }[]) => void;
  searchNodes.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  render(<I18nProvider><UiLanguageSelect /><NewEntityForm title="Original title" primaryLanguage="en" onSubmit={onSubmit} onCancel={vi.fn()}
    suggest={{ ontologyId: "prj-0123456789ab-model", kind: "datatypeProperty", className: "Manager", onUse }} /></I18nProvider>);
  await type(screen.getByRole("textbox", { name: "Name (en)" }) as HTMLInputElement, "ha");
  await pause();
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  await act(async () => release([{ id: HR + "hasName" }]));
  await pause(0);
  expect(screen.getByText("hasName：Employeeの属性（テキスト）。")).toBeTruthy();
  expect(status()).toBe("既存の属性が1件一致しました");
  expect(searchNodes).toHaveBeenCalledTimes(1);
});

it("keeps the existing-property choice and draft while localizing its producer facts", () => {
  vi.useRealTimers();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const existing = { sentence: "There is already an attribute <b>{name}.", className: "Manager",
    uiMessage: { code: "editing.guard.property_exists", args: { name: "<b>{name}", kind: [{ code: "words.kind.datatypeProperty", args: {} }] } },
    onUse: vi.fn(), onAnother: vi.fn() };
  render(<I18nProvider><UiLanguageSelect /><NewEntityForm title="Synthetic" primaryLanguage="ja"
    onSubmit={vi.fn()} onCancel={vi.fn()} existing={existing} /></I18nProvider>);
  expect(screen.getByText('属性「<b>{name}」はすでに存在します。')).toBeTruthy();
  const field = screen.getByRole("textbox", { name: "名前（ja）" });
  fireEvent.change(field, { target: { value: "新しい名前" } });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText('The datatype property <b>{name} already exists.')).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Name (ja)" })).toBe(field);
  expect((field as HTMLInputElement).value).toBe("新しい名前");
  expect(existing.onUse).not.toHaveBeenCalled();
});
