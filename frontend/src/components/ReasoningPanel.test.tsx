// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/ReasoningPanel.test.tsx
================================================================================

SUMMARY
    Reason, Stop, Show inferred and the results panel (axioms-and-reasoning
    5.1 to 5.7, Section 6, AC-1, AC-2, AC-6): every state of Section 6's
    table, the start and the end announced and the seconds not, Stop, a
    result gone stale with Reason again, Include data snapshots, a group
    paged with Show more, facts about imported terms collapsed, and a run
    that outlives its project ignored. X-12: a failed Stop and a refused
    Reason said once, in the app's words; Show more paging by the result's
    own imports switch.

BASIC IDEA
    Display metadata translates retained results and accessible labels without
    changing selection IRIs, open details, focus or the original fetched data.

    Rejected reads preserve their original details and display facts through UI
    language changes without refetching or replacing retained content.

    The run lives in the project store, so the store is opened for real over
    a mocked api.ts, and the controls and the panel are rendered as App
    renders them. A run is a promise the test resolves when it chooses, so
    the Running state can be looked at before it ends.

INPUTS / INPUT SOURCES
    - A mocked api.ts: openProject, listData, reasonProject, stopReasoning,
      getReasoningPage, getWhy.

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectKind, ReasoningGroup, ReasoningResult } from "../types";

const { openProject, listData, reasonProject, stopReasoning, getReasoningPage, getWhy, getReasoningResult } = vi.hoisted(() => ({
  openProject: vi.fn(),
  listData: vi.fn(),
  reasonProject: vi.fn(),
  stopReasoning: vi.fn(),
  getReasoningPage: vi.fn(),
  getReasoningResult: vi.fn(),
  getWhy: vi.fn(),
}));

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  openProject,
  listData,
  reasonProject,
  stopReasoning,
  getReasoningPage,
  getReasoningResult,
  getWhy,
}));

import { ApiError } from "../api";
import { DictionaryLanguageContext } from "../dictionary/useDictionaryLanguage";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import { projectStore, useProjectSelector } from "../state/projectStore";
import ReasoningPanel, { ReasonControls } from "./ReasoningPanel";

const PID = "prj-0123456789ab";
const X = "http://example.org/shop#";
const T = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const NOW = { revision: 3, generation: 0, imports: false };

function fact(s: string, o: string, sentence: string) {
  return { s: X + s, p: T, o: X + o, sLabel: s, pLabel: "type", oLabel: o, sentence };
}

function group(kind: ReasoningGroup["kind"], items: ReturnType<typeof fact>[], total = items.length): ReasoningGroup {
  return { kind, total, offset: 0, items };
}

function result(changes: Partial<ReasoningResult> = {}): ReasoningResult {
  return {
    status: "done",
    key: "3+0|model|no-data",
    includeData: false,
    imports: false,
    basis: { revision: 3, generation: 0, imports: false },
    durationMs: 4200,
    statements: 39,
    sentence: null,
    problems: [
      {
        kind: "neverMembers",
        sentence: "Robot can never have members: it is a kind of Person and a kind of Organization, and no Person is an Organization.",
        subject: X + "Robot",
        causes: [
          { s: X + "Robot", p: "sub", o: X + "Person", sentence: "Robot is a kind of Person", inferred: false },
          { s: X + "Robot", p: "sub", o: X + "Organization", sentence: "Robot is a kind of Organization", inferred: false },
          { s: X + "Person", p: "dw", o: X + "Organization", sentence: "no Person is an Organization", inferred: false },
        ],
        reasoner: "Disjoint classes Person and Organization have a common individual a test member of Robot (the reasoner's words)",
      },
    ],
    groups: [
      group("kinds", [fact("Employee", "Agent", "Employee is a kind of Agent")]),
      group("same", []),
      group("memberships", [fact("alice", "Person", "Alice is a Person"), fact("acme", "Organization", "Acme is an Organization")]),
      group("links", []),
    ],
    importedFacts: group("imported", []),
    stale: false,
    ...changes,
  };
}

let onSelect: ReturnType<typeof vi.fn<(iri: string) => void>>;

function view(kind: ProjectKind | null = "ontology", now = NOW, hasData = false) {
  return (
    <>
      <ReasonControls kind={kind} now={now} hasData={hasData} />
      <ReasoningPanel projectId={PID} kind={kind} hasData={hasData} now={now} onSelect={onSelect} />
    </>
  );
}

async function setup(kind: ProjectKind | null = "ontology", hasData = false) {
  await projectStore.open(PID);
  onSelect = vi.fn<(iri: string) => void>();
  return render(view(kind, NOW, hasData));
}

/** A run the test answers when it chooses. */
function pending(): { answer: (r: ReasoningResult) => Promise<void> } {
  let resolve: (r: ReasoningResult) => void = () => {};
  reasonProject.mockReturnValue(new Promise<ReasoningResult>((done) => (resolve = done)));
  return {
    answer: async (r) => {
      await act(async () => {
        resolve(r);
      });
    },
  };
}

const said = () => projectStore.getSnapshot().announcement.text;
const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  projectStore._reset();
  openProject.mockResolvedValue({
    project: {
      id: PID, name: "Shop", createdAt: "", updatedAt: "", baseIri: X, prefix: "shop", primaryLanguage: "en",
      languages: [], documents: [], counts: {}, kind: "ontology",
    },
    documents: [
      {
        doc: "model", ontologyId: `${PID}-model`, revision: 3, dirty: false, canUndo: false, undoLabel: null,
        canRedo: false, redoLabel: null, triples: 39,
      },
    ],
    recovery: { available: false, draftTime: null },
  });
  listData.mockResolvedValue({ generation: 0, snapshots: [] });
  stopReasoning.mockResolvedValue({ stopped: true });
});
afterEach(cleanup);

describe("Reason and the results panel (Section 6)", () => {
  it("is empty before a run, says what reasoning does, and offers no Show inferred yet", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Reason" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Show inferred/ })).toBeNull();
    expect(screen.getByText(/draws conclusions about the classes and things you have/)).toBeTruthy();
    expect(screen.getByText("Press Reason to see what follows from your model.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Results" })).toBeTruthy();
    // No snapshot switched on: no data checkbox.
    expect(screen.queryByLabelText("Include data snapshots")).toBeNull();
  });

  it("announces the start, reads Stop on the same button while running, and announces the end", async () => {
    await setup();
    const run = pending();
    const button = screen.getByRole("button", { name: "Reason" });
    button.focus();
    await press("Reason");
    expect(said()).toBe("Reasoning started.");
    expect(reasonProject).toHaveBeenCalledWith(PID, false, false, "en");
    // One button whose name changes: focus is still on it.
    expect(button.textContent).toBe("Stop");
    expect(document.activeElement).toBe(button);
    // The seconds are counted on the status line, which is not a live region.
    const status = document.querySelector(".reasoning-status")!;
    expect(status.textContent).toMatch(/^Reasoning… \d+ s$/);
    expect(status.getAttribute("role")).toBeNull();
    expect(status.getAttribute("aria-live")).toBeNull();
    await run.answer(result());
    expect(said()).toBe("Reasoned in 4 s: 1 problem, 3 new facts.");
    expect(button.textContent).toBe("Reason");
    expect(status.textContent).toBe("Reasoned in 4 s: 1 problem, 3 new facts");
    // Show inferred: on after a run, pressed state in words and aria.
    const toggle = screen.getByRole("button", { name: /Show inferred/ });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(projectStore.getSnapshot().showInferred).toBe(true);
  });

  it("shows problems first, then the groups with their true counts, each fact a link with Why?", async () => {
    await setup();
    const run = pending();
    await press("Reason");
    await run.answer(result());
    const panel = screen.getByRole("region", { name: "Results: reasoned in 4 s" });
    const headings = within(panel).getAllByRole("heading").map((h) => h.textContent);
    // Empty groups are not listed.
    expect(headings).toEqual(["Results: reasoned in 4 s", "Problems (1)", "New kinds (1)", "New memberships (2)"]);
    // A problem's subject and each cause are links that select.
    fireEvent.click(within(panel).getByRole("button", { name: /^Robot can never have members/ }));
    expect(onSelect).toHaveBeenLastCalledWith(X + "Robot");
    const causes = within(panel).getByRole("list", { name: "Caused by" });
    expect(within(causes).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Robot is a kind of Person stated",
      "Robot is a kind of Organization stated",
      "no Person is an Organization stated",
    ]);
    fireEvent.click(within(causes).getByRole("button", { name: "no Person is an Organization" }));
    expect(onSelect).toHaveBeenLastCalledWith(X + "Person");
    // The probe's own words behind Why?, as a disclosure.
    const why = within(panel).getAllByRole("button", { name: "Why?" })[0];
    expect(why.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(why);
    expect(screen.getByText(/the reasoner's words/)).toBeTruthy();
    // Each fact: its sentence selects its subject, and it has its own Why?.
    fireEvent.click(within(panel).getByRole("button", { name: "Alice is a Person" }));
    expect(onSelect).toHaveBeenLastCalledWith(X + "alice");
    expect(within(panel).getByRole("button", { name: "Why? Alice is a Person" })).toBeTruthy();
    expect(screen.getByText(/Values in your data are checked by Validate \(SHACL\), not here\./)).toBeTruthy();
  });

  it("says when nothing follows and nothing contradicts", async () => {
    await setup();
    const run = pending();
    await press("Reason");
    await run.answer(result({ problems: [], groups: [], importedFacts: group("imported", []) }));
    expect(screen.getByText("Nothing new follows, and nothing contradicts.")).toBeTruthy();
  });

  it("stops a run with Stop, and says so", async () => {
    await setup();
    const run = pending();
    await press("Reason");
    await press("Stop");
    expect(stopReasoning).toHaveBeenCalledWith(PID);
    await run.answer(result({ status: "stopped", sentence: "Stopped. Nothing was concluded.", problems: [], groups: [] }));
    expect(screen.getAllByText("Stopped. Nothing was concluded.").length).toBeGreaterThan(0);
    expect(said()).toBe("Stopped. Nothing was concluded.");
    expect(screen.getByRole("button", { name: "Reason" })).toBeTruthy();
    // No marks to show for a run that concluded nothing.
    expect(screen.queryByRole("button", { name: /Show inferred/ })).toBeNull();
  });

  it.each([
    ["timedOut", "Stopped after 30 seconds. Try without the data snapshots, or with fewer imports."],
    ["failed", "The reasoner stopped with an error: the process ended with exit code 1"],
    [
      "tooLarge",
      "This project has 250,000 statements to reason over. Semantic Studio reasons over at most 200,000: try without the data snapshots, or with fewer imports.",
    ],
  ] as const)("ends %s with its sentence", async (status, sentence) => {
    await setup();
    const run = pending();
    await press("Reason");
    await run.answer(result({ status, sentence, problems: [], groups: [] }));
    expect(document.querySelector(".reasoning-ending")!.textContent).toBe(sentence);
    // Announced as a sentence: a reasoner's error line gets its full stop.
    expect(said()).toBe(sentence.endsWith(".") ? sentence : `${sentence}.`);
  });

  it("goes stale when the model moves: the panel says so, Show inferred hides, Reason again runs", async () => {
    const { rerender } = await setup();
    const run = pending();
    await press("Reason");
    await run.answer(result());
    expect(screen.getByRole("button", { name: /Show inferred/ })).toBeTruthy();
    rerender(view("ontology", { ...NOW, revision: 4 }));
    expect(screen.getByText("The model changed after this run.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Show inferred/ })).toBeNull();
    // The heading no longer claims the run's time for this model.
    expect(screen.getByRole("heading", { name: "Results" })).toBeTruthy();
    // The data generation and the imports switch count too.
    rerender(view("ontology", { ...NOW, generation: 2 }));
    expect(screen.getByText("The model changed after this run.")).toBeTruthy();
    rerender(view("ontology", { ...NOW, imports: true }));
    expect(screen.getByText("The model changed after this run.")).toBeTruthy();
    const again = pending();
    await press("Reason again");
    expect(reasonProject).toHaveBeenLastCalledWith(PID, false, true, "en");
    await again.answer(result({ basis: { revision: 3, generation: 0, imports: true } }));
    expect(screen.queryByText("The model changed after this run.")).toBeNull();
  });

  it("is not offered in a taxonomy", async () => {
    await setup("taxonomy");
    expect(screen.queryByRole("button", { name: "Reason" })).toBeNull();
    expect(screen.getByText("Reasoning is for ontology projects.")).toBeTruthy();
  });

  it("includes the snapshots only when asked, off by default", async () => {
    await setup("ontology", true);
    const box = screen.getByLabelText("Include data snapshots") as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(screen.getByText(/slower: about a second per 1,000 rows/)).toBeTruthy();
    const first = pending();
    await press("Reason");
    expect(reasonProject).toHaveBeenLastCalledWith(PID, false, false, "en");
    await first.answer(result());
    await act(async () => {
      fireEvent.click(box);
    });
    expect(box.checked).toBe(true);
    const second = pending();
    await press("Reason");
    expect(reasonProject).toHaveBeenLastCalledWith(PID, true, false, "en");
    await second.answer(result());
  });

  it("pages a long group with Show more, the true total always in its heading", async () => {
    await setup();
    const many = Array.from({ length: 200 }, (_, i) => fact(`e${i}`, "Person", `e${i} is a Person`));
    const run = pending();
    await press("Reason");
    await run.answer(result({ problems: [], groups: [group("memberships", many, 450)] }));
    expect(screen.getByRole("heading", { name: "New memberships (450)" })).toBeTruthy();
    expect(screen.getByText("200 of 450 shown")).toBeTruthy();
    getReasoningPage.mockResolvedValue({
      ...group("memberships", Array.from({ length: 200 }, (_, i) => fact(`f${i}`, "Person", `f${i} is a Person`)), 450),
      offset: 200,
      stale: false,
    });
    await press("Show more");
    expect(getReasoningPage).toHaveBeenCalledWith(PID, "memberships", 200, false);
    expect(screen.getByText("400 of 450 shown")).toBeTruthy();
    expect(screen.getByRole("button", { name: "f199 is a Person" })).toBeTruthy();
  });

  it("Show more pages the run it continues, by its imports switch, after the switch moved (PR #55 review)", async () => {
    const { rerender } = await setup();
    rerender(view("ontology", { ...NOW, imports: true }));
    const many = Array.from({ length: 200 }, (_, i) => fact(`e${i}`, "Person", `e${i} is a Person`));
    const run = pending();
    await press("Reason");
    await run.answer(
      result({ imports: true, basis: { ...NOW, imports: true }, problems: [], groups: [group("memberships", many, 450)] }),
    );
    // The switch goes off: the result is stale, and its pages are still its own.
    rerender(view("ontology", { ...NOW, imports: false }));
    getReasoningPage.mockResolvedValue({ ...group("memberships", many, 450), offset: 200, stale: true });
    await press("Show more");
    expect(getReasoningPage).toHaveBeenCalledWith(PID, "memberships", 200, true);
  });

  it("starts a group's pages again for a new run whose key reads the same (code review)", async () => {
    await setup();
    const many = (prefix: string) => Array.from({ length: 200 }, (_, i) => fact(`${prefix}${i}`, "Person", `${prefix}${i} is a Person`));
    const first = pending();
    await press("Reason");
    await first.answer(result({ problems: [], groups: [group("memberships", many("a"), 450)] }));
    getReasoningPage.mockResolvedValue({ ...group("memberships", many("b"), 450), offset: 200, stale: false });
    await press("Show more");
    expect(screen.getByText("400 of 450 shown")).toBeTruthy();
    // The same key text, another result: its own first page only.
    const second = pending();
    await press("Reason");
    await second.answer(result({ problems: [], groups: [group("memberships", many("c"), 450)] }));
    expect(screen.getByText("200 of 450 shown")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "b0 is a Person" })).toBeNull();
    expect(screen.getByRole("button", { name: "c0 is a Person" })).toBeTruthy();
  });

  it("counts facts about imported terms alone in one line, collapsed until opened", async () => {
    await setup();
    const run = pending();
    await press("Reason");
    await run.answer(
      result({ problems: [], importedFacts: group("imported", [fact("Agent", "Thing", "Agent is a kind of Thing")], 12) }),
    );
    const line = screen.getByRole("button", { name: "12 facts about imported terms" });
    expect(line.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Agent is a kind of Thing" })).toBeNull();
    fireEvent.click(line);
    expect(line.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Agent is a kind of Thing" })).toBeTruthy();
  });

  it("says a refused run once, in the panel's alert (PR #55 review)", async () => {
    await setup();
    reasonProject.mockRejectedValue(new ApiError("A run is already going.", 409));
    await press("Reason");
    expect(screen.getByRole("alert").textContent).toBe("The run could not be started: The operation could not be completed. Check the details.");
    expect(screen.getByText("A run is already going.").closest("details")).toBeTruthy();
    // The alert says it; the live region does not say it again.
    expect(said()).toBe("Reasoning started.");
    expect(screen.getByRole("button", { name: "Reason" })).toBeTruthy();
  });

  it("ignores a run that outlives its project, and the panel stays: it has no close (PR #55 review)", async () => {
    await setup();
    const run = pending();
    await press("Reason");
    await act(async () => {
      projectStore.reset();
    });
    await run.answer(result());
    expect(projectStore.getSnapshot().reasoning).toBeNull();
    expect(projectStore.getSnapshot().reasoningSince).toBeNull();
    cleanup();
    await setup();
    const second = pending();
    await press("Reason");
    await second.answer(result());
    // 5.3: the panel stays. A close unmounted it, focus fell to <body>, and
    // nothing brought it back.
    expect(screen.getByRole("region", { name: "Results: reasoned in 4 s" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
  });
});

describe("Focus and endings (PR #55 review)", () => {
  /** Record a change to the model as a command's answer would. */
  const edit = async (revision: number) => {
    const model = projectStore.getSnapshot().documents.find((d) => d.doc === "model")!;
    await act(async () => {
      projectStore.applied({ state: { ...model, revision, dirty: true }, label: "Renamed Robot" } as Parameters<
        typeof projectStore.applied
      >[0]);
    });
  };

  it("gives Reason again's focus to the results heading when its run is current", async () => {
    const { rerender } = await setup();
    const run = pending();
    await press("Reason");
    await run.answer(result());
    rerender(view("ontology", { ...NOW, imports: true }));
    const again = screen.getByRole("button", { name: "Reason again" });
    again.focus();
    const next = pending();
    await press("Reason again");
    // Still there while it runs, and still focused.
    expect(document.activeElement).toBe(again);
    await next.answer(result({ basis: { revision: 3, generation: 0, imports: true } }));
    expect(screen.queryByRole("button", { name: "Reason again" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Results: reasoned in 4 s" }));
  });

  it("gives the last Show more's focus to the first fact it showed", async () => {
    await setup();
    const many = Array.from({ length: 200 }, (_, i) => fact(`e${i}`, "Person", `e${i} is a Person`));
    const run = pending();
    await press("Reason");
    await run.answer(result({ problems: [], groups: [group("memberships", many, 250)] }));
    getReasoningPage.mockResolvedValue({
      ...group("memberships", Array.from({ length: 50 }, (_, i) => fact(`f${i}`, "Person", `f${i} is a Person`)), 250),
      offset: 200,
      stale: false,
    });
    screen.getByRole("button", { name: "Show more" }).focus();
    await press("Show more");
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "f0 is a Person" }));
  });

  it("presses Stop once: it is aria-disabled until the run's answer arrives", async () => {
    await setup();
    const run = pending();
    let stopped: (v: { stopped: boolean }) => void = () => {};
    stopReasoning.mockReturnValue(new Promise((done) => (stopped = done)));
    await press("Reason");
    const button = screen.getByRole("button", { name: "Stop" });
    expect(button.getAttribute("aria-disabled")).toBe("false");
    await press("Stop");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await press("Stop");
    await act(async () => {
      stopped({ stopped: true });
    });
    // The DELETE answered, the run's own answer not yet: still stopping.
    await press("Stop");
    expect(stopReasoning).toHaveBeenCalledTimes(1);
    await run.answer(result({ status: "stopped", sentence: "Stopped. Nothing was concluded.", problems: [], groups: [] }));
    expect(button.textContent).toBe("Reason");
    expect(button.getAttribute("aria-disabled")).toBe("false");
  });

  it("says a Stop that failed in the app's words, once, and Stop can be pressed again (PR #55 review)", async () => {
    await setup();
    const run = pending();
    // Fetch diagnostics stay in details; the alert uses the application words.
    stopReasoning.mockRejectedValue(new TypeError("Failed to fetch"));
    await press("Reason");
    await press("Stop");
    expect(screen.getByRole("alert").textContent).toBe(
      "The run could not be stopped: the server did not answer. Press Stop again.",
    );
    expect(screen.getByText("Failed to fetch").closest("details")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).not.toContain("Failed to fetch");
    expect(said()).toBe("Reasoning started.");
    // The server's own sentence, when it sent one.
    stopReasoning.mockRejectedValueOnce(new ApiError("There is no such project.", 404));
    await press("Stop");
    expect(screen.getByRole("alert").textContent).toBe(
      "The run could not be stopped: The operation could not be completed. Check the details. Press Stop again.",
    );
    expect(screen.getByText("There is no such project.").closest("details")).toBeTruthy();
    expect(said()).toBe("Reasoning started.");
    const button = screen.getByRole("button", { name: "Stop" });
    expect(button.getAttribute("aria-disabled")).toBe("false");
    stopReasoning.mockResolvedValue({ stopped: true });
    await press("Stop");
    expect(stopReasoning).toHaveBeenCalledTimes(3);
    await run.answer(result({ status: "stopped", sentence: "Stopped. Nothing was concluded.", problems: [], groups: [] }));
    // The run's answer replaces the failed Stop's sentence.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("announces a run that ends after an edit as stale, and shows it so", async () => {
    const { rerender } = await setup();
    const run = pending();
    await press("Reason");
    // An edit while it runs: the store and the view both move to revision 4.
    await edit(4);
    rerender(view("ontology", { ...NOW, revision: 4 }));
    await run.answer(result());
    expect(said()).toBe("Reasoned in 4 s, but the model changed meanwhile: Reason again.");
    expect(screen.getByText("The model changed after this run.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reason again" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Show inferred/ })).toBeNull();
    expect(document.querySelector(".reasoning-status")!.textContent).toBe("");
    // Reason again over the edited model is current, and said so.
    const again = pending();
    await press("Reason again");
    await again.answer(result({ basis: { revision: 4, generation: 0, imports: false } }));
    expect(said()).toBe("Reasoned in 4 s: 1 problem, 3 new facts.");
    expect(screen.queryByText("The model changed after this run.")).toBeNull();
  });

  it("announces a run that ends after the imports switch moved as stale", async () => {
    const { rerender } = await setup();
    const run = pending();
    await press("Reason");
    rerender(view("ontology", { ...NOW, imports: true }));
    await run.answer(result());
    expect(said()).toBe("Reasoned in 4 s, but the model changed meanwhile: Reason again.");
  });
});


it("changes reasoning controls and result headings without repeating the run", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  await projectStore.open(PID);
  onSelect = vi.fn();
  render(<I18nProvider><UiLanguageSelect />{view("ontology", NOW, true)}</I18nProvider>);
  const data = screen.getByRole("checkbox", { name: "データスナップショットを含める" });
  fireEvent.click(data);
  const run = pending();
  const control = screen.getByRole("button", { name: "推論" });
  await act(async () => fireEvent.click(control));
  expect(screen.getByRole("button", { name: "停止" })).toBe(control);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("button", { name: "Stop" })).toBe(control);
  expect((screen.getByRole("checkbox", { name: "Include data snapshots" }) as HTMLInputElement).checked).toBe(true);
  expect(reasonProject).toHaveBeenCalledTimes(1);
  await run.answer(result());
  const heading = screen.getByRole("heading", { name: "Results: reasoned in 4 s" });
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  expect(screen.getByRole("heading", { name: "推論結果：4秒で完了" })).toBe(heading);
  expect(screen.getByRole("heading", { name: "新しい所属関係（2件）" })).toBeTruthy();
  expect(reasonProject).toHaveBeenCalledTimes(1);
  expect(getReasoningPage).not.toHaveBeenCalled();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("renders timeout metadata and keeps original engine details separate", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  await projectStore.open(PID);
  onSelect = vi.fn();
  render(<I18nProvider><UiLanguageSelect />{view()}</I18nProvider>);
  const run = pending();
  await press("推論");
  await run.answer(result({ status: "timedOut", problems: [], groups: [], sentence: "Original diagnostic 999", uiMessage: { code: "reasoning.timeout", args: { seconds: 1.5 } } }));
  expect(document.querySelector(".reasoning-ending")?.textContent).toContain("1.5秒");
  expect(document.querySelector(".reasoning-ending")?.textContent).not.toContain("999");
  expect(screen.getByText("Original diagnostic 999").closest("details")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(document.querySelector(".reasoning-ending")?.textContent).toContain("1.5 seconds");
  expect(reasonProject).toHaveBeenCalledTimes(1);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});


it.each([["start", "Original <img>{diagnostic}"], ["stop", "Original <img>{diagnostic}"], ["start", ""]] as const)("renders a %s failure once in the current locale and keeps its original details (%s)", async (phase, diagnostic) => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  await projectStore.open(PID);
  onSelect = vi.fn();
  const error = new ApiError(diagnostic, 409, undefined, { code: "model.invalid_value", args: { value: "<b>値</b>", datatype: "xsd:integer" } });
  render(<I18nProvider><UiLanguageSelect />{view()}</I18nProvider>);
  const run = phase === "stop" ? pending() : null;
  if (phase === "start") reasonProject.mockRejectedValueOnce(error);
  else stopReasoning.mockRejectedValueOnce(error);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "推論" })); });
  if (phase === "stop") await act(async () => { fireEvent.click(screen.getByRole("button", { name: "停止" })); });
  const japanese = "「<b>値</b>」はxsd:integerの値として使用できません。";
  expect(screen.getByRole("alert").textContent).toBe(phase === "start" ? `推論を開始できませんでした：${japanese}` : `推論を停止できませんでした：${japanese}もう一度「停止」を押してください。`);
  expect(projectStore.getSnapshot().reasoningErrorCause).toEqual({ kind: phase, error });
  expect(document.querySelector(".reasoning details pre")?.textContent).toBe(error.message);
  expect(document.querySelector(".reasoning img, .reasoning b")).toBeNull();
  const notice = projectStore.getSnapshot().announcement;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  const english = '“<b>値</b>” is not a valid xsd:integer value.';
  expect(screen.getByRole("alert").textContent).toBe(phase === "start" ? `The run could not be started: ${english}` : `The run could not be stopped: ${english} Press Stop again.`);
  expect(projectStore.getSnapshot().announcement).toBe(notice);
  expect(reasonProject).toHaveBeenCalledTimes(1);
  expect(stopReasoning).toHaveBeenCalledTimes(phase === "stop" ? 1 : 0);
  if (run) await run.answer(result());
  else { reasonProject.mockResolvedValueOnce(result()); await act(async () => { await projectStore.reason(false, false); }); }
  expect(projectStore.getSnapshot().reasoningErrorCause).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("keeps a rejected result page's facts for current-language rendering and preserves its existing facts", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  await projectStore.open(PID);
  onSelect = vi.fn<(iri: string) => void>();
  const { container } = render(<I18nProvider><UiLanguageSelect />{view()}</I18nProvider>);
  const first = fact("alice", "Person", "Alice is a Person");
  reasonProject.mockResolvedValueOnce(result({ problems: [], groups: [group("memberships", [first], 201)] }));
  await press("推論");
  const error = new ApiError("Page error <b>{cause}", 422, undefined,
    { code: "model.invalid_value", args: { value: "<img>{value}", datatype: "xsd:integer" } });
  getReasoningPage.mockRejectedValueOnce(error);
  await press("続きを表示");
  expect(screen.getByRole("alert").textContent).toBe('「<img>{value}」はxsd:integerの値として使用できません。');
  expect(screen.getByText(error.message, { selector: "pre" })).toBeTruthy();
  const factButton = screen.getByRole("button", { name: "Alice is a Person" });
  const count = getReasoningPage.mock.calls.length;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("alert").textContent).toBe('“<img>{value}” is not a valid xsd:integer value.');
  expect(screen.getByRole("button", { name: "Alice is a Person" })).toBe(factButton);
  expect(getReasoningPage).toHaveBeenCalledTimes(count);
  expect(reasonProject).toHaveBeenCalledTimes(1);
  expect(container.querySelector(".reasoning img, .reasoning b")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});


it.each([true, false])("renders result facts, problems and causes from metadata without changing retained identities (known=%s)", async (known) => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  await projectStore.open(PID); onSelect = vi.fn();
  const described = { ...fact("alice", "Person", "Original fact <img>{s}"), uiMessage: { code: "reasoning.fact.type", args: { s: [{ text: "対象 <b>{s}" }], o: [{ text: "分類" }] } } };
  const returned = result({ groups: [group("memberships", [described])], problems: [{ kind: "irreflexive", subject: X + "alice", sentence: "Original conflict <img>",
    uiMessage: known ? { code: "reasoning.problem.irreflexive", args: { subject: [{ text: "対象 <b>{s}" }], property: [{ text: "関連" }] } } : { code: "future.conflict", args: {} },
    causes: [{ ...described, inferred: false }] }] });
  reasonProject.mockResolvedValueOnce(returned);
  const { container } = render(<I18nProvider><UiLanguageSelect />{view()}</I18nProvider>);
  await press("推論");
  const sentence = "「対象 <b>{s}」は「分類」の個体です。";
  const buttons = screen.getAllByRole("button", { name: sentence }); expect(buttons.length).toBe(2);
  const conflict = screen.getByRole("button", { name: known ? "「対象 <b>{s}」は「関連」で自分自身と結ばれていますが、この関係では自己への結び付けが禁止されています。" : "この記述については、推論の元の詳細を確認してください。" });
  const detail = screen.getByText("Original conflict <img>").closest("details")!; expect(detail).toBeTruthy(); detail.open = true;
  const summary = within(detail).getByText("技術的な詳細"); summary.focus();
  const notice = projectStore.getSnapshot().announcement;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getAllByRole("button", { name: "対象 <b>{s} is an instance of 分類." })).toEqual(buttons);
  expect(screen.getByRole("button", { name: known ? "対象 <b>{s} is linked to itself by 関連, which forbids self-links." : "Check the original reasoning details for this statement." })).toBe(conflict);
  expect(detail.open).toBe(true); expect(document.activeElement).toBe(summary);
  fireEvent.click(buttons[0]); expect(onSelect).toHaveBeenCalledWith(X + "alice");
  expect(projectStore.getSnapshot().announcement).toBe(notice);
  expect(reasonProject).toHaveBeenCalledTimes(1); expect(getReasoningPage).not.toHaveBeenCalled();
  expect(container.querySelector(".reasoning img, .reasoning b")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("restarts result pages for new read names and ignores the old language page", async () => {
  openProject.mockResolvedValueOnce({project:{id:PID,name:"Bilingual",createdAt:"",updatedAt:"",baseIri:X,prefix:"x",primaryLanguage:"en",languages:["ja"],documents:[],counts:{},kind:"ontology"},
    documents:[{doc:"model",ontologyId:PID+"-model",revision:3,dirty:false,canUndo:false,canRedo:false,undoLabel:null,redoLabel:null,triples:39}],recovery:{available:false,draftTime:null}});
  await projectStore.open(PID);onSelect=vi.fn();
  const named=(id:string,name:string)=>({...fact(id,"Person",`${name} is a Person`),sLabel:name,
    uiMessage:{code:"reasoning.fact.type",args:{s:[{text:name}],o:[{text:"Person"}]}}});
  const english=Array.from({length:200},(_,i)=>named(`n${i}`,`English${i}`));
  const japanese=Array.from({length:200},(_,i)=>named(`n${i}`,`日本語${i}`));
  const en=result({problems:[],groups:[group("memberships",english,201)]});
  const ja=result({problems:[],groups:[group("memberships",japanese,201)]});
  reasonProject.mockResolvedValueOnce(en);getReasoningResult.mockResolvedValueOnce(ja);
  function Display(){const language=useProjectSelector(s=>s.displayLanguage)??"en";return <DictionaryLanguageContext.Provider value={language}>{view("ontology",NOW)}</DictionaryLanguageContext.Provider>;}
  render(<Display/>);await press("Reason");
  let finish!:(value:unknown)=>void;
  getReasoningPage.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  await press("Show more");
  await act(async()=>{projectStore.setDisplayLanguage("ja");});
  expect(screen.getByRole("button",{name:"日本語0 is an instance of Person."})).toBeTruthy();
  await act(async()=>{finish({...group("memberships",[named("late","Old language page")],201),offset:200,stale:false});});
  expect(screen.queryByRole("button",{name:/Old language page/})).toBeNull();
  getReasoningPage.mockResolvedValueOnce({...group("memberships",[named("late","日本語末尾")],201),offset:200,stale:false});
  await press("Show more");
  expect(getReasoningPage).toHaveBeenLastCalledWith(PID,"memberships",200,false,"ja");
  expect(screen.getByRole("button",{name:"日本語末尾 is an instance of Person."})).toBeTruthy();
  expect(reasonProject).toHaveBeenCalledTimes(1);
});
