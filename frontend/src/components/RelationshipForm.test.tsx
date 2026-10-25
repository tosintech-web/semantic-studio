// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/RelationshipForm.test.tsx
================================================================================

SUMMARY
    The first tests of the relationship form, for attribute-reuse 5.3 and
    5.4 (AC-6, AC-9): *From* listing a shared start's every class with
    Remove (UnshareDomain) and *Add a class*; *Change from* only for one
    class; and two domain lines warned of under *From*, with **Share it**.

BASIC IDEA
    Warning metadata and original disclosures follow UI language while preserving
    class-group meaning, native focus and fix arguments.
    The form is rendered for an entity model built by entityModel from
    details shaped as /node sends them, with the api mocked as the other
    form tests mock it and the project store open.

INPUTS / INPUT SOURCES
    - Inline node details with `domain` and `warnings`.

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { entityModel } from "../modeling/entity";
import { projectStore } from "../state/projectStore";
import type { DomainReading, ModelWarning, NodeDetails } from "../types";
import { useRunner } from "./EditParts";
import RelationshipForm, { PropertyHead, Warnings } from "./RelationshipForm";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";

const { openProject, runCommand, planShare } = vi.hoisted(() => ({
  openProject: vi.fn(),
  runCommand: vi.fn(),
  planShare: vi.fn(),
}));
vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, openProject, runCommand, planShare };
});

const HR = "http://example.org/hr#";
const PID = "prj-0123456789ab";
const STATE = {
  doc: "model" as const,
  ontologyId: `${PID}-model`,
  revision: 2,
  dirty: true,
  canUndo: true,
  undoLabel: "x",
  canRedo: false,
  redoLabel: null,
  triples: 10,
};
const ref = (local: string) => ({ iri: HR + local, label: local });

function propertyDetails(kind: "datatypeProperty" | "objectProperty", domain: DomainReading): NodeDetails {
  return {
    iri: HR + "hasName",
    prefixed: "hr:hasName",
    label: "hasName",
    kind,
    outgoing: [
      {
        predicate: { type: "uri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" },
        object: { type: "uri", value: `http://www.w3.org/2002/07/owl#${kind === "datatypeProperty" ? "DatatypeProperty" : "ObjectProperty"}` },
      },
      // An end, so Swap is not disabled for the want of one.
      { predicate: { type: "uri", value: "http://www.w3.org/2000/01/rdf-schema#range" }, object: { type: "uri", value: HR + "Manager", label: "Manager" } },
      ...(domain.form === "one"
        ? [{ predicate: { type: "uri", value: "http://www.w3.org/2000/01/rdf-schema#domain" }, object: { type: "uri", value: domain.classes[0].iri, label: domain.classes[0].label } }]
        : []),
    ],
    incoming: [],
    outgoingTotal: 2,
    incomingTotal: 0,
    domain,
  } as NodeDetails;
}

const SEPARATE_TEXT =
  "hasName lists Employee and Team separately. In RDFS and OWL that means whatever hasName something is both an Employee and a Team. To mean either one, share it.";

function separate(needs?: "parentName"): ModelWarning {
  return {
    block: "domain",
    code: "separate",
    text: SEPARATE_TEXT,
    fix: { command: "ShareDomain", args: { property: HR + "hasName", how: needs ? "parent" : "union" }, label: "Share it", ...(needs ? { needs } : {}) },
  };
}

function Harness({ details, warnings }: { details: NodeDetails; warnings: ModelWarning[] }) {
  const runner = useRunner();
  return (
    <RelationshipForm
      ontologyId={`${PID}-model`}
      primaryLanguage="en"
      iri={details.iri}
      name={details.label}
      model={entityModel(details, "en", [])}
      runner={runner}
      onSelect={() => undefined}
      warnings={warnings}
    />
  );
}

async function show(domain: DomainReading, warnings: ModelWarning[] = []) {
  await act(async () => {
    render(<Harness details={propertyDetails("objectProperty", domain)} warnings={warnings} />);
  });
}

/** A form block is a section under its heading. */
const fromTo = () => screen.getByRole("heading", { name: "From and to" }).closest("section") as HTMLElement;

const UNION: DomainReading = { form: "union", classes: [ref("Employee"), ref("Contractor"), ref("Intern")] };
const TWO_LINES: DomainReading = { form: "separate", classes: [ref("Employee"), ref("Team")] };

beforeEach(async () => {
  projectStore._reset();
  for (const m of [openProject, runCommand, planShare]) m.mockReset();
  openProject.mockResolvedValue({
    project: {
      id: PID,
      name: "HR",
      createdAt: "",
      updatedAt: "",
      baseIri: HR,
      prefix: "hr",
      primaryLanguage: "en",
      languages: [],
      documents: [{ file: "model.ttl", role: "model" }],
      counts: {},
    },
    documents: [STATE],
    recovery: { available: false, draftTime: null },
  });
  await projectStore.open(PID);
  runCommand.mockResolvedValue({ revision: 3, label: "Done", state: STATE });
});

afterEach(() => {
  cleanup();
});

describe("From, for a shared start (attribute-reuse 5.3)", () => {
  it("lists every class with Remove, and Add a class; no Change from", async () => {
    await show(UNION);
    const block = fromTo();
    expect(within(block).getByText("Any one of these classes:")).toBeTruthy();
    for (const c of ["Employee", "Contractor", "Intern"]) {
      expect(within(block).getByRole("button", { name: `Remove ${c} from hasName` })).toBeTruthy();
    }
    expect(within(block).getByRole("button", { name: "Add a class to hasName" })).toBeTruthy();
    expect(within(block).queryByRole("button", { name: /the start of hasName/ })).toBeNull();
    await act(async () => within(block).getByRole("button", { name: "Remove Intern from hasName" }).click());
    expect(runCommand).toHaveBeenCalledWith(PID, "model", "UnshareDomain", { property: HR + "hasName", class: HR + "Intern" }, "en");
  });

  it("one class keeps Change from, and Add a class", async () => {
    await show({ form: "one", classes: [ref("Employee")] });
    const block = fromTo();
    expect(within(block).getByRole("button", { name: "Change the start of hasName" })).toBeTruthy();
    expect(within(block).getByRole("button", { name: "Add a class to hasName" })).toBeTruthy();
  });

  it("two domain lines are warned of under From, and Share it runs the Fix", async () => {
    await show(TWO_LINES, [separate()]);
    const block = fromTo();
    expect(within(block).getByText(SEPARATE_TEXT)).toBeTruthy();
    await act(async () => within(block).getByRole("button", { name: "Share it" }).click());
    expect(runCommand).toHaveBeenCalledWith(PID, "model", "ShareDomain", { property: HR + "hasName", how: "union" }, "en");
  });
});

describe("found in code review", () => {
  it("Swap is unavailable for a shared start: its end would become several classes", async () => {
    await show(UNION);
    const swap = within(fromTo()).getAllByRole("button").find((b) => b.textContent?.includes("Swap"))!;
    expect(swap.textContent).toContain("Swap");
    expect(swap.getAttribute("aria-disabled")).toBe("true");
    await act(async () => swap.click());
    expect(runCommand).not.toHaveBeenCalled();
  });
});


it("keeps an inverse-name draft and dictionary language while switching UI language", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const details = propertyDetails("objectProperty", { form: "one", classes: [ref("Employee")] });
  render(<I18nProvider><UiLanguageSelect /><Harness details={details} warnings={[]} /></I18nProvider>);
  expect(screen.getByRole("heading", { name: "始点と終点" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "逆向きの関係に名前を付ける…" }));
  const input = screen.getByRole("textbox", { name: "逆向きの関係の名前（en）" });
  fireEvent.change(input, { target: { value: "<b>雇用する</b>" } });
  expect(document.querySelector(".relate-sentence")?.textContent).toContain("<b>雇用する</b>");
  expect(document.querySelector(".relate-sentence b")).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("textbox", { name: "Name of the other way round (en)" })).toBe(input);
  expect((input as HTMLInputElement).value).toBe("<b>雇用する</b>");
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create" })));
  expect(runCommand).toHaveBeenCalledWith(PID, "model", "SetInverse", { property: HR + "hasName", label: "<b>雇用する</b>" }, "en");
});

it("localizes the property head and preserves the rule pointer's original references", () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const details = propertyDetails("objectProperty", { form: "one", classes: [ref("Employee")] });
  const select = vi.fn();
  render(<I18nProvider><PropertyHead model={entityModel(details, "en", [])} name={details.label} iri={details.iri} warnings={[]} />
    <RelationshipForm ontologyId={`${PID}-model`} primaryLanguage="en" iri={details.iri} name={details.label}
      model={entityModel(details, "en", [])} runner={{ busy: false, errors: {}, run: vi.fn(), clear: vi.fn(), alive: () => true }} onSelect={select} />
  </I18nProvider>);
  expect(screen.getByRole("heading", { name: "関係の説明" })).toBeTruthy();
  expect(document.querySelector(".form-sentence")?.textContent).toBe("Employeeは「hasName」という関連でManagerに結び付きます。");
  fireEvent.click(screen.getByRole("button", { name: "Employeeにルールを追加" }));
  expect(select).toHaveBeenCalledWith(HR + "Employee");
  expect(projectStore.getSnapshot().ruleDraft).toMatchObject({ cls: HR + "Employee", filler: HR + "Manager", property: HR + "hasName" });
});

it("localizes shared-domain controls and removes the original class", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  render(<I18nProvider><Harness details={propertyDetails("objectProperty", UNION)} warnings={[]} /></I18nProvider>);
  expect(screen.getByText("これらのクラスのいずれか：")).toBeTruthy();
  expect(screen.getByRole("button", { name: "hasNameにクラスを追加" })).toBeTruthy();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "hasNameからContractorを外す" })));
  expect(runCommand).toHaveBeenCalledWith(PID, "model", "UnshareDomain", { property: HR + "hasName", class: HR + "Contractor" }, "en");
});

it.each([true, false])("keeps warning details and fix identity through language changes (known=%s)", async known => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const args = { name: "逆 <b>{name}", from_name: "始点{from}", to_name: "終点<img>" };
  const warning = { text: "Original warning <b>{name}", block: "inverse" as const,
    ...(known ? { uiMessage: { code: "model.warning.inverse_ends", args } } : {}),
    fix: { command: "SetEnds", args: { property: "urn:test:p", domain: "urn:test:A", range: "urn:test:B" }, label: "Original fix",
      ...(known ? { uiMessage: { code: "model.fix.inverse_ends", args } } : {}) },
  };
  const run = vi.fn().mockResolvedValue({});
  render(<I18nProvider><UiLanguageSelect /><Warnings warnings={[warning]} block="inverse"
    runner={{ busy: false, errors: {}, run, clear: vi.fn(), alive: () => true }} /></I18nProvider>);
  const row = screen.getByRole("listitem");
  expect(row.querySelector("span")?.textContent).toBe(known
    ? "「逆 <b>{name}」の始点は始点{from}、終点は終点<img>であるべきです。" : "注意事項があります。詳細を確認してください。");
  const details = screen.getByText("技術的な詳細");
  details.focus(); fireEvent.click(details);
  const fix = screen.getByRole("button", { name: known ? "修正：「逆 <b>{name}」の始点を始点{from}、終点を終点<img>に設定" : "修正：Original fix" });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText("Technical details")).toBe(details);
  expect(details.parentElement?.hasAttribute("open")).toBe(true);
  expect(document.activeElement).toBe(details);
  expect(row.querySelector("span")?.textContent).toBe(known
    ? "逆 <b>{name} should go from 始点{from} to 終点<img>." : "There is a warning. Check the details.");
  expect(screen.getByText(warning.text).tagName).toBe("PRE");
  expect(document.querySelector("b, img")).toBeNull();
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(fix);
  expect(run).toHaveBeenCalledExactlyOnceWith("fix", "SetEnds", warning.fix.args);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it.each(["all", "any"] as const)("keeps the %s meaning of warning class groups after switching language", form => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const warning = { text: "Original group warning", block: "characteristics" as const,
    uiMessage: { code: `model.warning.reflexive.${form}`, args: { classes: [
      { text: "甲 <b>{a}" }, { code: form === "all" ? "words.list.and" : "words.list.or", args: {} }, { text: "乙 {b}" },
    ] } },
  };
  const run = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><Warnings warnings={[warning]} block="characteristics"
    runner={{ busy: false, errors: {}, run, clear: vi.fn(), alive: () => true }} /></I18nProvider>);
  expect(screen.getByRole("listitem").querySelector("span")?.textContent).toContain(form === "all" ? "クラス甲 <b>{a}と乙 {b}すべて" : "クラス甲 <b>{a}または乙 {b}のうち少なくとも1つ");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("listitem").querySelector("span")?.textContent).toContain(form === "all" ? "all of 甲 <b>{a} and 乙 {b}" : "at least one of 甲 <b>{a} or 乙 {b}");
  expect(run).not.toHaveBeenCalled();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("renders the shared-domain warning facts without rerunning its fix on language changes", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const warning = { ...separate(), uiMessage: { code: "model.warning.domain.relationship", args: {
    name: "hasName", classes: [{ text: "Employee" }, { code: "words.list.and", args: {} }, { text: "Team" }],
  } } };
  render(<I18nProvider><UiLanguageSelect /><Harness details={propertyDetails("objectProperty", TWO_LINES)} warnings={[warning]} /></I18nProvider>);
  const block = screen.getByText(SEPARATE_TEXT).closest<HTMLElement>('[role="group"]')!;
  expect(block.textContent).toContain("「hasName」の所属先がEmployeeとTeamとして別々に指定されています。");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(block.textContent).toContain("Separate domains Employee and Team on hasName");
  expect(runCommand).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(within(block).getByRole("button", { name: "Share it" })));
  expect(runCommand).toHaveBeenCalledExactlyOnceWith(PID, "model", "ShareDomain", { property: HR + "hasName", how: "union" }, "en");
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});
