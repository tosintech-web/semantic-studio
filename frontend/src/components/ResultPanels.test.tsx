// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/ResultPanels.test.tsx
================================================================================

SUMMARY
    The result panels (shacl-authoring 5.6, 5.7, Section 6): Validate runs a
    check only when pressed and reads *Validating…* meanwhile; one panel per
    shape, collapsed at first, each header a button with aria-expanded and a
    name carrying its state word and counts; problems grouped by rule with
    the individual's name as a link; *and N more* past the cap; Expand all
    and Collapse all; the stale line after a change; the stopped message;
    and the summary read in the live region.

BASIC IDEA
    Owned refusal metadata changes language at render time without losing
    the original detail nodes, expanded panels or retained snapshot identity.

    api.ts is mocked and the real project store is opened on a fixed
    project, so Validate goes through the same action the Shapes view and
    the Turtle editor run.

INPUTS / INPUT SOURCES
    - A mocked api.ts.

EXPECTED OUTPUT
    - Pass/fail per assertion.
================================================================================
*/

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { openProject, validateProject, runCommand, listData } = vi.hoisted(() => ({
  openProject: vi.fn(),
  validateProject: vi.fn(),
  runCommand: vi.fn(),
  listData: vi.fn(),
}));

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  openProject,
  validateProject,
  runCommand,
  listData,
}));

import { projectStore } from "../state/projectStore";
import type { ValidationPanel, ValidationResult } from "../types";
import ResultPanels, { ValidateButton } from "./ResultPanels";
import type { WireMessage } from "../i18n/server-contracts";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";

const PROJECT = {
  id: "prj-0123456789ab", name: "Shop", createdAt: "", updatedAt: "", baseIri: "http://x#", prefix: "x",
  primaryLanguage: "en", languages: [], documents: [], counts: {}, kind: "ontology" as const,
};

function doc(name: "model" | "shapes", revision: number) {
  return {
    doc: name, ontologyId: `prj-0123456789ab-${name}`, revision, dirty: false,
    canUndo: false, undoLabel: null, canRedo: false, redoLabel: null, triples: 1,
  };
}

function panel(changes: Partial<ValidationPanel>): ValidationPanel {
  return {
    id: "http://x#PersonRules", name: "Person rules", state: "fails",
    target: { iri: "http://x#Person", label: "Person", one: "person", many: "people" },
    focusCount: 5, failingCount: 2, problemCount: 3, warningCount: 0,
    problems: [
      { focus: "http://x#bob", focusLabel: "Bob", group: "name", sentence: "Bob has no name; every Person must have at least 1.", value: null, severity: "violation" },
      { focus: "http://x#carol", focusLabel: "Carol", group: "name", sentence: "Carol has 2 names; every Person may have at most 1.", value: null, severity: "violation" },
      { focus: "http://x#erin", focusLabel: "Erin", group: "birth date", sentence: 'Erin\'s birth date "yesterday" is not a date.', value: '"yesterday"', severity: "violation" },
    ],
    problemsTotal: 3, error: null, ...changes,
  };
}

const RESULT: ValidationResult = {
  stopped: false, statements: 40, shapeCount: 3, durationMs: 3, revisions: { model: 2, shapes: 5 },
  shapes: [
    panel({}),
    panel({ id: "n", name: "Invoice rules", state: "nothing", focusCount: 0, failingCount: 0, problemCount: 0, problems: [], problemsTotal: 0,
      target: { iri: "http://x#Invoice", label: "Invoice", one: "invoice", many: "invoices" } }),
    panel({ id: "p", name: "Organization rules", state: "passes", focusCount: 4, failingCount: 0, problemCount: 0, problems: [], problemsTotal: 0,
      target: { iri: "http://x#Organization", label: "Organization", one: "organization", many: "organizations" } }),
  ],
};

let onSelect: ReturnType<typeof vi.fn<(iri: string) => void>>;
let onError: ReturnType<typeof vi.fn<(message: string) => void>>;

async function setup(result: ValidationResult = RESULT) {
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2), doc("shapes", 5)], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  validateProject.mockResolvedValue(result);
  onSelect = vi.fn<(iri: string) => void>();
  onError = vi.fn<(message: string) => void>();
  await act(async () => {
    render(
      <>
        <ValidateButton onError={onError} />
        <ResultPanels onSelect={onSelect} />
      </>,
    );
  });
}

async function validate() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Validate/ }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  projectStore._reset();
});
afterEach(cleanup);

describe("ResultPanels", () => {
  it("checks nothing until Validate is pressed", async () => {
    await setup();
    expect(validateProject).not.toHaveBeenCalled();
    expect(screen.getByText(/Nothing has been checked yet/)).toBeTruthy();
    await validate();
    expect(validateProject).toHaveBeenCalledTimes(1);
  });

  it("reads Validating… while a check runs, keeps focus, and dims the previous panels", async () => {
    await setup();
    await validate();
    let finish!: (r: ValidationResult) => void;
    validateProject.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const button = screen.getByRole("button", { name: /Validate/ });
    button.focus();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.textContent).toBe("Validating…");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button);
    // The previous panels stay until the new ones replace them.
    expect(screen.getByRole("button", { name: /Fails\. Person rules/ })).toBeTruthy();
    expect(document.querySelector(".result-panels.busy")).not.toBeNull();
    await act(async () => finish(RESULT));
    expect(button.textContent).toBe("Validate");
  });

  it("shows one collapsed panel per shape, failing first, each named with its state word and counts", async () => {
    await setup();
    await validate();
    const headers = screen.getAllByRole("button", { expanded: false });
    expect(headers.map((h) => h.getAttribute("aria-label"))).toEqual([
      "Fails. Person rules: 2 of 5 people fail (3 problems)",
      "Nothing to check. Invoice rules: no Invoice in the data yet",
      "Passes. Organization rules: all 4 organizations pass",
    ]);
    // Only headers render until a panel opens (Section 10).
    expect(screen.queryByText(/Bob has no name/)).toBeNull();
  });

  it("opens a panel onto its problems grouped by rule, and a name selects the individual", async () => {
    await setup();
    await validate();
    const header = screen.getByRole("button", { name: /Fails\. Person rules/ });
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    const body = document.getElementById(header.getAttribute("aria-controls")!)!;
    expect(within(body).getAllByRole("heading", { level: 5 }).map((h) => h.textContent)).toEqual(["name", "birth date"]);
    expect(within(body).getByText("Bob has no name; every Person must have at least 1.")).toBeTruthy();
    expect(within(body).getByText('Value: "yesterday"')).toBeTruthy();
    fireEvent.click(within(body).getByRole("button", { name: "Bob" }));
    expect(onSelect).toHaveBeenCalledWith("http://x#bob");
  });

  it("says how many more there are past the cap", async () => {
    await setup({ ...RESULT, shapes: [panel({ problemsTotal: 1070 })] });
    await validate();
    fireEvent.click(screen.getByRole("button", { name: /Fails\./ }));
    expect(screen.getByText("and 1,067 more")).toBeTruthy();
  });

  it("expands and collapses every panel", async () => {
    await setup();
    await validate();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.queryAllByRole("button", { expanded: false })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
  });

  it("shows the could-not-run reason in its panel", async () => {
    await setup({ ...RESULT, shapes: [panel({ state: "error", error: "sh:minCount must be an integer", problems: [], problemsTotal: 0 })] });
    await validate();
    fireEvent.click(screen.getByRole("button", { name: /Could not run\./ }));
    expect(screen.getByText(/sh:minCount must be an integer/)).toBeTruthy();
  });

  it("marks the result stale after a change, and clears it on the next check", async () => {
    await setup();
    await validate();
    expect(screen.queryByText(/changed since this check/)).toBeNull();
    runCommand.mockResolvedValue({ revision: 6, label: "Added a rule", state: doc("shapes", 6) });
    await act(async () => {
      await projectStore.command("AddRule", {}, undefined, "shapes");
    });
    expect(screen.getByText("The model, the shapes or the data changed since this check. Validate again.")).toBeTruthy();
    validateProject.mockResolvedValue({ ...RESULT, revisions: { model: 2, shapes: 6 } });
    await validate();
    expect(screen.queryByText(/changed since this check/)).toBeNull();
  });

  it("names the data a panel checked, a sample's words included (csv-data-import 5.6)", async () => {
    const people = { id: "people-abc123", source: "people.csv", importedAt: "2026-10-02T12:00:00Z", rows: 2000, total: 12480, sample: true };
    await setup({
      ...RESULT,
      revisions: { model: 2, shapes: 5, data: 1 },
      dataSources: [people],
      shapes: [panel({ data: [people.id] }), RESULT.shapes[2]],
    });
    await validate();
    // Under the header, whether the panel is open or not.
    expect(screen.getByText(
      "Checked data from people.csv, imported 2 October 2026; sample: first 2,000 of 12,480 rows",
    )).toBeTruthy();
    expect(screen.getAllByText(/^Checked data/)).toHaveLength(1);
    expect(screen.queryByText(/changed since this check/)).toBeNull();
    // A snapshot switched off since: stale, as an edit makes it.
    listData.mockResolvedValue({ generation: 2, snapshots: [] });
    await act(async () => {
      await projectStore.dataChanged("Switched off people.csv.");
    });
    expect(screen.getByText(/the data changed since this check/)).toBeTruthy();
  });

  it("says a check was stopped, with its size", async () => {
    await setup({ ...RESULT, stopped: true, shapes: [], statements: 120000, shapeCount: 12 });
    await validate();
    expect(screen.getByRole("alert").textContent).toBe(
      "The check took too long and was stopped. It was checking 12 shapes against 120,000 statements.",
    );
  });

  it("announces the summary in the project's live region", async () => {
    await setup();
    await validate();
    expect(projectStore.getSnapshot().announcement.text).toBe(
      "3 shapes: 1 passes, 1 fails, 1 has nothing to check.",
    );
  });

  it("reports a failed check to the caller", async () => {
    await setup();
    validateProject.mockRejectedValue(new Error("Open the project first."));
    await validate();
    expect(onError).toHaveBeenCalledWith("Open the project first.");
  });
});

describe("ResultPanels: Stage A follow-ups fixed in Stage B (5.9)", () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
  }

  it("runs one check at a time: a second press while one runs sends nothing (item 3)", async () => {
    await setup();
    const pending = deferred<ValidationResult>();
    validateProject.mockReturnValue(pending.promise);
    await validate();
    // The button is aria-disabled, not disabled, so a press still arrives.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Validating…" }));
    });
    await act(async () => {
      await projectStore.validate();
    });
    expect(validateProject).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(RESULT));
    expect(projectStore.getSnapshot().validating).toBe(false);
  });

  it("says nothing in the next project about a check that outlived its own (item 3)", async () => {
    await setup();
    const pending = deferred<ValidationResult>();
    validateProject.mockReturnValue(pending.promise);
    await validate();
    expect(screen.getByRole("button", { name: "Validating…" }).getAttribute("aria-disabled")).toBe("true");
    // Another project opens while the first one's check still runs.
    openProject.mockResolvedValue({
      project: { ...PROJECT, id: "prj-ba9876543210", name: "Library" },
      documents: [doc("model", 1)], recovery: { available: false, draftTime: null },
    });
    await act(async () => {
      await projectStore.open("prj-ba9876543210");
    });
    const opened = projectStore.getSnapshot().announcement.text;
    // The new project's Validate is free at once, not when the old check ends.
    expect(screen.getByRole("button", { name: "Validate" }).getAttribute("aria-disabled")).toBe("false");
    await act(async () => pending.resolve(RESULT));
    expect(projectStore.getSnapshot().validation).toBeNull();
    expect(projectStore.getSnapshot().announcement.text).toBe(opened);
    expect(projectStore.getSnapshot().validating).toBe(false);
  });

  it("drops the failure of a check that outlived its project, rather than showing it in the next", async () => {
    await setup();
    const pending = deferred<ValidationResult>();
    validateProject.mockReturnValue(pending.promise.then(() => Promise.reject(new Error("Gone."))));
    await validate();
    openProject.mockResolvedValue({
      project: { ...PROJECT, id: "prj-ba9876543210" },
      documents: [doc("model", 1)], recovery: { available: false, draftTime: null },
    });
    await act(async () => {
      await projectStore.open("prj-ba9876543210");
    });
    await act(async () => pending.resolve(RESULT));
    expect(onError).not.toHaveBeenCalled();
  });

  it("says why Validate cannot run in text tied to it, not only a tooltip (item 7)", async () => {
    openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2)], recovery: { available: false, draftTime: null } });
    await projectStore.open(PROJECT.id);
    await act(async () => {
      render(<ValidateButton onError={vi.fn()} blocked="Apply the text in the editor first." />);
    });
    const button = screen.getByRole("button", { name: "Validate" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const reason = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(reason?.textContent).toBe("Apply the text in the editor first.");
  });

  it("points a class with nothing to check at Add an example (item 8)", async () => {
    await setup();
    await validate();
    fireEvent.click(screen.getByRole("button", { name: /Nothing to check\. Invoice rules/ }));
    expect(
      screen.getByText("No Invoice is in the data yet, so there is nothing to check. Add an example from the Invoice form, then validate again."),
    ).toBeTruthy();
  });
});


it("keeps an expanded validation result and original problem facts on UI language switch", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2), doc("shapes", 5)], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  validateProject.mockResolvedValue(RESULT);
  const select = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><ValidateButton onError={vi.fn()} /><ResultPanels onSelect={select} /></I18nProvider>);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "検証" })));
  const header = screen.getByRole("button", { name: "不適合。Person rules：Person5件中2件が不適合（3件の問題）" });
  fireEvent.click(header);
  const result = projectStore.getSnapshot().validation;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("button", { name: "Fails. Person rules: 2 of 5 people fail (3 problems)" })).toBe(header);
  expect(header.getAttribute("aria-expanded")).toBe("true");
  expect(projectStore.getSnapshot().validation).toBe(result);
  fireEvent.click(screen.getByRole("button", { name: "Bob" }));
  expect(select).toHaveBeenCalledWith("http://x#bob");
  expect(validateProject).toHaveBeenCalledTimes(1);
});

it("translates a shape-engine refusal while preserving its original details and expanded panel", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2), doc("shapes", 5)], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  const error = "Engine <img>{error}";
  validateProject.mockResolvedValue({ ...RESULT, shapes: [panel({ state: "error", error,
    errorUiMessage: { code: "validation.shapes_refused", args: {} }, problems: [], problemsTotal: 0 })] });
  const { container } = render(<I18nProvider><UiLanguageSelect /><ValidateButton onError={vi.fn()} /><ResultPanels onSelect={vi.fn()} /></I18nProvider>);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "検証" })));
  const header = screen.getByRole("button", { name: /Person rules/ });
  fireEvent.click(header);
  expect(screen.getByText(/検証エンジンがこのルールを読み込めませんでした/)).toBeTruthy();
  const pre = screen.getByText(error, { selector: "pre" });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText(/The validation engine could not load this shape/)).toBeTruthy();
  expect(screen.getByText(error, { selector: "pre" })).toBe(pre);
  expect(header.getAttribute("aria-expanded")).toBe("true");
  expect(validateProject).toHaveBeenCalledTimes(1);
  expect(container.querySelector("img")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it.each([true, false])("renders generated violations (known metadata: %s) while keeping authored RDF text and selection intact", async known => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2), doc("shapes", 5)], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  const original = "Original generated <img>{focus}";
  const authored = "利用者の説明 <b>{focus} every Person";
  const generated = { focus: null, focusLabel: "a node without a name", group: "name", sentence: original, value: null, severity: "violation" as const,
    focusLabelUiMessage: { code: "words.validation.unnamed_node", args: {} },
    groupUiMessage: { code: "validation.term", args: { term: [{ code: "words.path.name", args: {} }] } },
    uiMessage: { code: known ? "validation.violation.min_count.attribute" : "future.violation", args: {
      focus: [{ code: "words.validation.unnamed_node", args: {} }], path: [{ code: "words.path.name", args: {} }], have: 0, limit: 2,
    } },
  };
  const user = { focus: "http://x#alice", focusLabel: "Alice <b>{label}", group: "name {user}", sentence: authored, value: "<i>{value}", severity: "warning" as const };
  validateProject.mockResolvedValue({ ...RESULT, shapes: [panel({ name: "Unnamed shape", nameUiMessage: { code: "words.validation.unnamed_shape", args: {} },
    problems: [generated, user], problemsTotal: 2 })] });
  const select = vi.fn();
  const { container } = render(<I18nProvider><UiLanguageSelect /><ValidateButton onError={vi.fn()} /><ResultPanels onSelect={select} /></I18nProvider>);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "検証" })));
  const header = screen.getByRole("button", { name: /名前のない検証ルール/ });
  fireEvent.click(header);
  expect(screen.getByRole("heading", { level: 5, name: "名前" })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 5, name: "name {user}" })).toBeTruthy();
  expect(screen.getByText("名前のないノード", { selector: ".result-who" })).toBeTruthy();
  expect(screen.getByText(known ? "「名前のないノード」の名前は0件です。このルールでは2件以上が必要です。" : "この値は検証ルールに適合していません。詳細を確認してください。", { selector: ".result-sentence" })).toBeTruthy();
  expect(screen.getByText(authored, { selector: ".result-sentence" })).toBeTruthy();
  const pre = screen.getByText(original, { selector: "pre" });
  const details = pre.closest("details")!; details.open = true;
  const summary = details.querySelector("summary")!; summary.focus();
  const stored = projectStore.getSnapshot().validation;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText(known ? "The minimum number of values for name on unnamed node is 2; the current count is 0." : "This value did not satisfy the rule. Check the original details.", { selector: ".result-sentence" })).toBeTruthy();
  expect(screen.getByText(original, { selector: "pre" })).toBe(pre);
  expect(details.open).toBe(true); expect(document.activeElement).toBe(summary);
  expect(screen.getByText(authored, { selector: ".result-sentence" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Alice <b>{label}" }));
  expect(select).toHaveBeenCalledWith("http://x#alice");
  expect(projectStore.getSnapshot().validation).toBe(stored);
  expect(validateProject).toHaveBeenCalledTimes(1);
  expect(container.querySelector("img, b, i")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

const violationCases: { name: string; wire: WireMessage; value: string; ja: string; en: string }[] = [
  { name: "datatype", value: '"bad"', wire: { code: "validation.violation.datatype", args: {
    focus: [{ text: "子 <b>{focus}" }], path: [{ code: "words.path.name", args: {} }], value: [{ text: '"bad"' }], datatype: "xsd:integer",
  } }, ja: '「子 <b>{focus}」の名前の値"bad"は、型xsd:integerとして使用できません。', en: '"bad" is not a valid xsd:integer value for name on 子 <b>{focus}.' },
  { name: "language", value: '"bad"@de', wire: { code: "validation.violation.language.project.tagged", args: {
    focus: [{ text: "子 <b>{focus}" }], path: [{ code: "words.path.name", args: {} }], value: [{ text: '"bad"@de' }],
    language: [{ code: "words.language.de", args: {} }, { text: " (de)" }],
    allowed: [{ code: "words.language.ja", args: {} }, { text: " (ja)" }, { code: "words.list.or", args: {} }, { code: "words.language.en", args: {} }, { text: " (en)" }],
  } }, ja: '「子 <b>{focus}」の名前の値"bad"@deには言語ドイツ語 (de)が指定されています。プロジェクトで使用できる言語日本語 (ja)または英語 (en)には含まれていません。', en: 'The name value "bad"@de on 子 <b>{focus} is tagged German (de), which is not among the project languages Japanese (ja) or English (en).' },
  { name: "range", value: "1", wire: { code: "validation.violation.min_inclusive", args: {
    focus: [{ text: "子 <b>{focus}" }], path: [{ code: "words.path.name", args: {} }], value: [{ text: "1" }], bound: [{ text: "10" }],
  } }, ja: "「子 <b>{focus}」の名前の値1は、最小値10より小さい値です。", en: "The name value 1 on 子 <b>{focus} is below the minimum 10." },
];

it.each(violationCases)("renders $name violation facts in both UI languages without changing the RDF value", async item => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2), doc("shapes", 5)], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  const original = `Legacy ${item.name} explanation <img>{value}`;
  validateProject.mockResolvedValue({ ...RESULT, shapes: [panel({ focusCount: 1, failingCount: 1, problemCount: 1,
    problems: [{ focus: "http://x#bob", focusLabel: "子 <b>{focus}", group: "name", sentence: original, uiMessage: item.wire, value: item.value, severity: "violation" }], problemsTotal: 1 })] });
  const { container } = render(<I18nProvider><UiLanguageSelect /><ValidateButton onError={vi.fn()} /><ResultPanels onSelect={vi.fn()} /></I18nProvider>);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "検証" })));
  fireEvent.click(screen.getByRole("button", { name: /Person rules/ }));
  expect(screen.getByText(item.ja, { selector: ".result-sentence" })).toBeTruthy();
  const pre = screen.getByText(original, { selector: "pre" });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText(item.en, { selector: ".result-sentence" })).toBeTruthy();
  expect(screen.getByText(original, { selector: "pre" })).toBe(pre);
  expect(container.querySelector(".result-value")?.textContent).toContain(item.value);
  expect(validateProject).toHaveBeenCalledTimes(1);
  expect(container.querySelector("b, img")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("translates a blank-value placeholder while keeping an identically worded RDF literal unchanged", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2), doc("shapes", 5)], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  const generated = { focus: "http://x#bob", focusLabel: "Bob", group: "works for", sentence: "Legacy class failure", value: "a node without a name", severity: "violation" as const,
    valueUiMessage: { code: "words.validation.unnamed_node", args: {} },
    uiMessage: { code: "validation.violation.class", args: { focus: [{ text: "Bob" }], path: [{ text: "works for" }],
      value: [{ code: "words.validation.unnamed_node", args: {} }], qualifier: [{ text: "Organization" }] } },
  };
  const authored = { focus: "http://x#alice", focusLabel: "Alice", group: "works for", sentence: "Authored", value: '"a node without a name"', severity: "warning" as const };
  validateProject.mockResolvedValue({ ...RESULT, shapes: [panel({ problems: [generated, authored], problemsTotal: 2 })] });
  render(<I18nProvider><UiLanguageSelect /><ValidateButton onError={vi.fn()} /><ResultPanels onSelect={vi.fn()} /></I18nProvider>);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "検証" })));
  fireEvent.click(screen.getByRole("button", { name: /Person rules/ }));
  expect(screen.getByText("値：名前のないノード", { selector: ".result-value" })).toBeTruthy();
  expect(screen.getByText('値："a node without a name"', { selector: ".result-value" })).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText("Value: unnamed node", { selector: ".result-value" })).toBeTruthy();
  expect(screen.getByText('Value: "a node without a name"', { selector: ".result-value" })).toBeTruthy();
  expect(validateProject).toHaveBeenCalledTimes(1);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("localizes sampled validation provenance and date on UI switches", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc("model", 2), doc("shapes", 5)], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  const source = { id: "sample", source: "名簿 <b>{file}.csv", importedAt: "2026-10-02T12:00:00Z", rows: 2000, total: 12480, sample: true };
  validateProject.mockResolvedValue({ ...RESULT, dataSources: [source], shapes: [panel({ data: [source.id] })] });
  const { container } = render(<I18nProvider><UiLanguageSelect /><ValidateButton onError={vi.fn()} /><ResultPanels onSelect={vi.fn()} /></I18nProvider>);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "検証" })); });
  expect(container.textContent).toContain("名簿 <b>{file}.csvから、2026年10月2日に取り込み；サンプル：全12,480行のうち先頭2,000行");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(container.textContent).toContain("from 名簿 <b>{file}.csv, imported 2 October 2026; sample: first 2,000 of 12,480 rows");
  expect(validateProject).toHaveBeenCalledTimes(1);
});
