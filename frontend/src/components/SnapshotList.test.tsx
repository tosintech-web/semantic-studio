// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/SnapshotList.test.tsx
================================================================================

SUMMARY
    The project's Data section (csv-data-import 5.7): each row's label, a
    sample's words included; the switch; Refresh at once, with the limit's
    two choices, and handing a header mismatch to the wizard; Edit as RML
    run, kept outside the engine, and refused; Remove after saying how many
    statements leave. None of it is a model change. Stage B: a workbook's
    snapshot refreshed by its sheet and header row, and its links to no row.
    A list that cannot be read says so once, with Try again (PR #53 review).

BASIC IDEA
    Owned refusal metadata changes language at render time without losing
    the original detail nodes, expanded panels or retained snapshot identity.

    api.ts is mocked and the real project store is opened on a fixed
    project, so every action's announcement and the refetched list are the
    store's own.

INPUTS / INPUT SOURCES
    - A mocked api.ts.

EXPECTED OUTPUT
    - Pass/fail per assertion.
================================================================================
*/

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { openProject, listData, updateData, refreshData, removeData, inspectData, runCommand } = vi.hoisted(() => ({
  openProject: vi.fn(),
  listData: vi.fn(),
  updateData: vi.fn(),
  refreshData: vi.fn(),
  removeData: vi.fn(),
  inspectData: vi.fn(),
  runCommand: vi.fn(),
}));

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  openProject,
  listData,
  updateData,
  refreshData,
  removeData,
  inspectData,
  runCommand,
}));

import { ApiError } from "../api";
import { projectStore } from "../state/projectStore";
import type { SnapshotSummary } from "../types";
import type { WizardStart } from "./DataWizard";
import SnapshotList from "./SnapshotList";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";

const PID = "prj-0123456789ab";
const PROJECT = {
  id: PID, name: "Shop", createdAt: "", updatedAt: "", baseIri: "http://x#", prefix: "x",
  primaryLanguage: "en", languages: [], documents: [], counts: {}, kind: "ontology" as const,
};
const MODEL = {
  doc: "model" as const, ontologyId: `${PID}-model`, revision: 4, dirty: false,
  canUndo: false, undoLabel: null, canRedo: false, redoLabel: null, triples: 1,
};
const REPORT = {
  rowsRead: 2000, total: 12480, sample: true, individuals: 2000, statements: 4000, skipped: { count: 0, rows: [] },
  repeated: { count: 0, rows: [] }, keptAsText: [{ column: "born", datatype: "date", count: 1000, rows: [2] }], empty: [], clean: false,
};
const SNAP: SnapshotSummary = {
  id: "people-abc123", source: "people.csv", importedAt: "2026-10-02T12:00:00Z", rows: 2000, total: 12480, sample: true,
  enabled: true, className: "Person", classIri: "http://x#Person", statements: 4000, individuals: 2000, report: REPORT,
  mapping: { status: "ok", message: null }, mappingText: '<#m> a rml:TriplesMap .',
};
const FILE = new File(["id\n1\n"], "people-2.csv");

let onWizard: ReturnType<typeof vi.fn<(start: WizardStart) => void>>;

async function setup(snapshots: SnapshotSummary[] = [SNAP], localized = false) {
  openProject.mockResolvedValue({ project: PROJECT, documents: [MODEL], recovery: { available: false, draftTime: null } });
  listData.mockResolvedValue({ generation: 1, snapshots });
  await act(async () => {
    await projectStore.open(PID);
  });
  onWizard = vi.fn<(start: WizardStart) => void>();
  await act(async () => {
    const list = <SnapshotList projectId={PID} onWizard={onWizard} />;
    render(localized ? <I18nProvider><UiLanguageSelect />{list}</I18nProvider> : list);
  });
}

async function press(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  projectStore._reset();
});
afterEach(() => { cleanup(); localStorage.removeItem("semantic-studio.uiLocale.v1"); });

describe("SnapshotList", () => {
  it("says there is no data yet, and offers the import", async () => {
    await setup([]);
    expect(screen.getByText(/No data yet/)).toBeTruthy();
    await press(screen.getByRole("button", { name: "Import data from CSV or Excel…" }));
    expect(onWizard).toHaveBeenCalledWith({ kind: "new" });
  });

  it("takes focus on its heading when the wizard hands back, never dropping it to the page (X4)", async () => {
    openProject.mockResolvedValue({ project: PROJECT, documents: [MODEL], recovery: { available: false, draftTime: null } });
    listData.mockResolvedValue({ generation: 1, snapshots: [SNAP] });
    await act(async () => {
      await projectStore.open(PID);
    });
    await act(async () => {
      render(<SnapshotList projectId={PID} onWizard={() => {}} focusOnMount />);
    });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Data" }));
  });

  it("labels each snapshot with where it came from, a sample's words included", async () => {
    await setup();
    expect(screen.getByText("from people.csv, imported 2 October 2026; sample: first 2,000 of 12,480 rows")).toBeTruthy();
    expect(screen.getByText(/2,000 People · 1,000 values kept as text/)).toBeTruthy();
  });

  it("switches a snapshot off, says so, and moves the generation without a model change", async () => {
    await setup();
    updateData.mockResolvedValue({ snapshot: { ...SNAP, enabled: false }, generation: 2 });
    listData.mockResolvedValue({ generation: 2, snapshots: [{ ...SNAP, enabled: false }] });
    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox"));
    });
    expect(updateData).toHaveBeenCalledWith(PID, SNAP.id, { enabled: false });
    expect(projectStore.getSnapshot().announcement.text).toBe(
      "Switched off people.csv: its data has left every view and validation.",
    );
    expect(projectStore.getSnapshot().data?.generation).toBe(2);
    expect(screen.getByText("Off: in no view")).toBeTruthy();
    expect(projectStore.getSnapshot().documents[0].revision).toBe(4);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("refreshes at once when the headers match, after step 1's checks", async () => {
    await setup();
    inspectData.mockResolvedValue({ sample: false, limit: 2000 });
    refreshData.mockResolvedValue({ status: "imported", snapshot: { ...SNAP, source: "people-2.csv" }, generation: 2 });
    await act(async () => {
      fireEvent.change(document.querySelector(".snapshot-row input[type=file]")!, { target: { files: [FILE] } });
    });
    expect(inspectData).toHaveBeenCalledWith(PID, { file: FILE }, {});
    expect(refreshData).toHaveBeenCalledWith(PID, SNAP.id, FILE, { sample: false });
    expect(projectStore.getSnapshot().announcement.text).toBe("Refreshed people.csv from people-2.csv.");
    expect(screen.getByRole("button", { name: "Report" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("asks the limit's two choices of a larger file, and hands a header mismatch to the wizard", async () => {
    await setup();
    inspectData.mockResolvedValue({ sample: true, total: 5000, kept: 2000, limit: 2000, limitSentence: "This file has 5,000 rows. Semantic Studio imports at most 2,000 rows." });
    await act(async () => {
      fireEvent.change(document.querySelector(".snapshot-row input[type=file]")!, { target: { files: [FILE] } });
    });
    expect(refreshData).not.toHaveBeenCalled();
    const limit = screen.getByRole("group", { name: "More rows than the tool takes" });
    expect(within(limit).getByText(/This file has 5,000 rows/)).toBeTruthy();
    const inspection = { columns: [] };
    refreshData.mockResolvedValue({ status: "mismatch", missing: ["born"], inspection, choices: null, generation: 1 });
    await press(within(limit).getByRole("button", { name: "Use the first 2,000 rows" }));
    expect(refreshData).toHaveBeenCalledWith(PID, SNAP.id, FILE, { sample: true });
    expect(onWizard).toHaveBeenCalledWith({
      kind: "refresh", snapshot: SNAP, file: FILE, options: { sample: true }, inspection, missing: ["born"], choices: null,
    });
  });

  it("reads a workbook's new version by the same sheet and header row, and counts its links to no row (Stage B)", async () => {
    const ORGS: SnapshotSummary = {
      ...SNAP, id: "orgs-def456", source: "orgs.xlsx", rows: 41, total: 41, sample: false,
      workbook: { sheet: "Orgs", headerRow: 3 },
      report: { ...REPORT, total: 41, sample: false, keptAsText: [],
        unmatched: [{ column: "parent", className: "Organization", classIri: "http://x#Organization", count: 2, rows: [4, 7] }] },
    };
    await setup([ORGS]);
    expect(screen.getByText(/· sheet Orgs · 2 links to no row/)).toBeTruthy();
    const book = new File(["PK"], "orgs-2.xlsx");
    inspectData.mockResolvedValue({ sample: false, limit: 2000, format: "xlsx" });
    refreshData.mockResolvedValue({ status: "imported", snapshot: { ...ORGS, source: "orgs-2.xlsx" }, generation: 2 });
    const input = document.querySelector(".snapshot-row input[type=file]") as HTMLInputElement;
    expect(input.getAttribute("accept")).toContain(".xlsx");
    await act(async () => {
      fireEvent.change(input, { target: { files: [book] } });
    });
    expect(inspectData).toHaveBeenCalledWith(PID, { file: book }, { sheet: "Orgs", headerRow: 3 });
    expect(refreshData).toHaveBeenCalledWith(PID, ORGS.id, book, { sheet: "Orgs", headerRow: 3, sample: false });
    // The refresh opened the report.
    expect(screen.getByText("parent: 2 values match no Organization row (rows 4 and 7)")).toBeTruthy();
  });

  it("edits the mapping as RML: run, kept outside the engine, or refused", async () => {
    await setup();
    await press(screen.getByRole("button", { name: "Edit as RML" }));
    const box = screen.getByLabelText("RML mapping of people.csv · mapping.rml.ttl") as HTMLTextAreaElement;
    expect(box.value).toBe(SNAP.mappingText);
    fireEvent.change(box, { target: { value: "edited" } });
    updateData.mockRejectedValue(new ApiError("rml:source must name this snapshot's own source.csv; this mapping names ../model.ttl.", 422));
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    });
    expect(screen.getByRole("alert").textContent).toBe("The operation could not be completed. Check the details.");
    const originalDetail = screen.getByText("rml:source must name this snapshot's own source.csv; this mapping names ../model.ttl.");
    expect(originalDetail.closest("details")?.querySelector("summary")?.textContent).toBe("Technical details");
    const outside = { ...SNAP, mapping: { status: "outside" as const, message: "rml:function is outside what Semantic Studio runs." } };
    updateData.mockResolvedValue({ snapshot: outside, generation: 2 });
    listData.mockResolvedValue({ generation: 2, snapshots: [outside] });
    await press(screen.getByRole("button", { name: "Apply" }));
    expect(updateData).toHaveBeenLastCalledWith(PID, SNAP.id, { mapping: "edited" });
    expect(screen.getByText("Mapping outside the engine.")).toBeTruthy();
    expect(screen.getByText("rml:function is outside what Semantic Studio runs.").closest("details")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh…" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("says how many statements leave before removing", async () => {
    await setup();
    await press(screen.getByRole("button", { name: "Remove…" }));
    const ask = screen.getByRole("group", { name: "Remove people.csv?" });
    expect(within(ask).getByText(/Its 4,000 statements leave every view and validation/)).toBeTruthy();
    removeData.mockResolvedValue({ removed: SNAP.id, statements: 4000, location: ".trash/data-people-abc123", generation: 2 });
    listData.mockResolvedValue({ generation: 2, snapshots: [] });
    await press(within(ask).getByRole("button", { name: "Remove" }));
    expect(removeData).toHaveBeenCalledWith(PID, SNAP.id);
    expect(projectStore.getSnapshot().announcement.text).toBe(
      "Removed people.csv: 4,000 statements left the views. Its folder is in the project's trash.",
    );
    expect(screen.getByText(/No data yet/)).toBeTruthy();
  });
});

describe("SnapshotList, when the list cannot be read", () => {
  it("says so, announces it, and Try again loads it with focus on the heading", async () => {
    // PR #53 review: a failed load left the tab reading for ever.
    openProject.mockResolvedValue({ project: PROJECT, documents: [MODEL], recovery: { available: false, draftTime: null } });
    listData.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => {
      await projectStore.open(PID);
    });
    await act(async () => {
      render(<SnapshotList projectId={PID} onWizard={() => {}} />);
    });

    const sentence = "The data snapshots could not be read: the server did not answer.";
    expect(screen.getByText("The data snapshots could not be read.")).toBeTruthy();
    expect(projectStore.getSnapshot().announcement.text).toBe(sentence);
    const raw = screen.getByText("Failed to fetch").closest("details");
    expect(raw).toBeTruthy();
    expect(raw?.open).toBe(false);
    expect(screen.queryByText(/Reading the project's data/)).toBeNull();

    // The server's own sentence, when it sent one.
    listData.mockRejectedValueOnce(new ApiError("There is no such project.", 404));
    const again = screen.getByRole("button", { name: "Try again" });
    again.focus();
    await press(again);
    expect(screen.getByText("The data snapshots could not be read.")).toBeTruthy();
    expect(screen.getByText("There is no such project.").closest("details")).toBeTruthy();

    listData.mockResolvedValueOnce({ generation: 1, snapshots: [SNAP] });
    const third = screen.getByRole("button", { name: "Try again" });
    third.focus();
    await press(third);
    expect(screen.getAllByText(/people\.csv/).length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Data" }));
    expect(projectStore.getSnapshot().dataError).toBeNull();
  });
});

describe("SnapshotList, a refresh that goes through step 1 (PR #54 review)", () => {
  const ORGS: SnapshotSummary = {
    ...SNAP, id: "orgs-def456", source: "orgs.xlsx", rows: 41, total: 41, sample: false,
    workbook: { sheet: "People", headerRow: 1 },
  };

  async function refreshWith(file: File) {
    const input = document.querySelector(".snapshot-row input[type=file]") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
  }

  it("a workbook whose sheet is gone opens step 1 with its sheets and the old sheet named", async () => {
    await setup([ORGS]);
    const sheets = [{ name: "Notes", rows: 0 }, { name: "Staff", rows: 12 }];
    const refused = { sheet: "", headerRow: 1, top: [], sheets };
    inspectData.mockRejectedValue(
      new ApiError("This workbook has no sheet named People.", 422, { message: "This workbook has no sheet named People.", kind: "not-text", workbook: refused }),
    );
    const book = new File(["PK"], "orgs-2.xlsx");
    await refreshWith(book);
    expect(refreshData).not.toHaveBeenCalled();
    expect(onWizard).toHaveBeenCalledWith({
      kind: "refresh", snapshot: ORGS, file: book, options: {}, inspection: null, workbook: refused,
      missing: [], choices: null,
      atFile: "This workbook has no sheet named People. Choose the sheet to refresh from.",
      atFileMessage: { code: "dataSnapshot.missingSheet", args: { sheet: "People" } },
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a CSV file's snapshot refreshed with a workbook goes through step 1, never its first sheet", async () => {
    await setup([SNAP]);
    const book = new File(["PK"], "people.xlsx");
    const workbook = { sheet: "Notes", headerRow: 1, top: [], sheets: [{ name: "Notes", rows: 3 }] };
    const found = { sample: false, limit: 2000, format: "xlsx", workbook };
    inspectData.mockResolvedValue(found);
    await refreshWith(book);
    expect(refreshData).not.toHaveBeenCalled();
    expect(onWizard).toHaveBeenCalledWith(expect.objectContaining({
      kind: "refresh", inspection: found, workbook, options: {},
      atFile: "This snapshot was read from a CSV file. Choose the sheet of this workbook to refresh from.",
    }));
  });

  it("a workbook's snapshot refreshed with a CSV file goes through step 1 too", async () => {
    await setup([ORGS]);
    const found = { sample: false, limit: 2000, format: "csv" };
    inspectData.mockResolvedValue(found);
    await refreshWith(FILE);
    expect(refreshData).not.toHaveBeenCalled();
    expect(onWizard).toHaveBeenCalledWith(expect.objectContaining({
      kind: "refresh", inspection: found, atFile: "This snapshot was read from a workbook. Check how this CSV file is read.",
    }));
  });
});


describe("Japanese snapshot operations retain facts and mounted state", () => {
  beforeEach(() => localStorage.removeItem("semantic-studio.uiLocale.v1"));

  it("keeps switches and an open removal confirmation when the UI language changes", async () => {
    await setup([SNAP], true);
    expect(screen.getByRole("heading", { name: "データ" })).toBeTruthy();
    expect(screen.getByText("Person：2,000件 · 1,000個の値を文字列として保持")).toBeTruthy();
    const toggle = screen.getByRole("checkbox", { name: "有効：すべてのビューに含める" });
    updateData.mockResolvedValue({ snapshot: { ...SNAP, enabled: false }, generation: 2 });
    listData.mockResolvedValue({ generation: 2, snapshots: [{ ...SNAP, enabled: false }] });
    await press(toggle);
    expect(projectStore.getSnapshot().announcement.uiMessage).toEqual({ code: "dataSnapshot.switchedOff", args: { source: SNAP.source } });
    expect(updateData).toHaveBeenCalledWith(PID, SNAP.id, { enabled: false });
    expect(screen.getByRole("checkbox", { name: "無効：ビューから除く" })).toBe(toggle);
    await press(screen.getByRole("button", { name: "削除…" }));
    const question = screen.getByRole("group", { name: "people.csvを削除しますか？" });
    expect(question.textContent).toContain("4,000件の記述");
    const announcement = projectStore.getSnapshot().announcement;
    const calls = listData.mock.calls.length;
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    expect(screen.getByRole("group", { name: "Remove people.csv?" })).toBe(question);
    expect(screen.getByRole("checkbox", { name: "Off: in no view" })).toBe(toggle);
    expect(projectStore.getSnapshot().announcement).toBe(announcement);
    expect(listData).toHaveBeenCalledTimes(calls);
    expect(removeData).not.toHaveBeenCalled();
    await press(within(question).getByRole("button", { name: "Keep" }));
    expect(screen.queryByRole("group", { name: "Remove people.csv?" })).toBeNull();
  });

  it("derives the limit explanation from counts and keeps the chosen file across locales", async () => {
    await setup([SNAP], true);
    inspectData.mockResolvedValue({ sample: true, total: 5000, kept: 2000, limit: 2000, format: "csv", limitSentence: "not a source for translation" });
    await act(async () => fireEvent.change(document.querySelector(".snapshot-row input[type=file]")!, { target: { files: [FILE] } }));
    const group = screen.getByRole("group", { name: "取り込み行数の上限" });
    expect(group.textContent).toContain("5,000行");
    expect(group.textContent).toContain("2,000行");
    expect(group.textContent).not.toContain("not a source for translation");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    expect(screen.getByRole("group", { name: "More rows than the tool takes" })).toBe(group);
    expect(inspectData).toHaveBeenCalledTimes(1);
    expect(refreshData).not.toHaveBeenCalled();
    refreshData.mockResolvedValue({ status: "mismatch", missing: ["born"], inspection: { columns: [] }, choices: null });
    await press(screen.getByRole("button", { name: "Use the first 2,000 rows" }));
    expect(refreshData).toHaveBeenCalledWith(PID, SNAP.id, FILE, { sample: true });
    expect(onWizard).toHaveBeenCalledWith(expect.objectContaining({ file: FILE, missing: ["born"], options: { sample: true } }));
  });

  it("keeps the raw failure object and derives action errors in the current language", async () => {
    await setup([SNAP], true);
    const error = new ApiError("original <img>{reason}", 422, null, { code: "request.invalid", args: {} });
    updateData.mockRejectedValue(error);
    await press(screen.getByRole("checkbox"));
    expect(screen.getByRole("alert").textContent).toBe("入力値を確認して再試行してください。");
    expect(screen.getByText(error.message).closest("details")?.querySelector("summary")?.textContent).toBe("技術的な詳細");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    expect(screen.getByRole("alert").textContent).toBe("Check the supplied values and try again.");
    expect(screen.getByText(error.message)).toBeTruthy();
    expect(updateData).toHaveBeenCalledTimes(1);
    expect(document.querySelector("img")).toBeNull();
  });

  it.each([false, true])("keeps the failed list's raw cause through locale changes and retry (metadata=%s)", async (known) => {
    const cause = known
      ? new ApiError("original <img>{cause}", 422, null, { code: "request.invalid", args: {} })
      : new TypeError("Failed to fetch <img>{cause}");
    openProject.mockResolvedValue({ project: PROJECT, documents: [MODEL], recovery: { available: false, draftTime: null } });
    listData.mockRejectedValue(cause);
    await act(async () => { await projectStore.open(PID); });
    render(<I18nProvider><UiLanguageSelect /><SnapshotList projectId={PID} onWizard={vi.fn()} /></I18nProvider>);
    expect(screen.getByText("データ一覧を読み込めませんでした。")).toBeTruthy();
    if (known) expect(screen.getByText("入力値を確認して再試行してください。")).toBeTruthy();
    expect(projectStore.getSnapshot().dataErrorCause?.error).toBe(cause);
    expect(projectStore.getSnapshot().announcement.uiMessage).toEqual({ code: "dataSnapshot.readFailed", args: {} });
    expect(screen.getByText(cause.message).closest("details")).toBeTruthy();
    const count = listData.mock.calls.length;
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    expect(screen.getByText("The data snapshots could not be read.")).toBeTruthy();
    if (known) expect(screen.getByText("Check the supplied values and try again.")).toBeTruthy();
    expect(listData).toHaveBeenCalledTimes(count);
    listData.mockResolvedValue({ generation: 2, snapshots: [SNAP] });
    await press(screen.getByRole("button", { name: "Try again" }));
    expect(projectStore.getSnapshot().dataErrorCause).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Data" }));
    expect(document.querySelector("img")).toBeNull();
  });
});

it("does not announce or refetch a previous project's completed data action", async () => {
  await setup();
  let finish!: (reply: { snapshot: SnapshotSummary; generation: number }) => void;
  updateData.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await press(screen.getByRole("checkbox"));
  expect(updateData).toHaveBeenCalledTimes(1);
  const nextId = "prj-111111111111";
  openProject.mockResolvedValue({ project: { ...PROJECT, id: nextId, name: "Other project" },
    documents: [{ ...MODEL, ontologyId: `${nextId}-model` }], recovery: { available: false, draftTime: null } });
  listData.mockResolvedValue({ generation: 1, snapshots: [] });
  await act(async () => { cleanup(); await projectStore.open(nextId); });
  const announcement = projectStore.getSnapshot().announcement;
  const calls = listData.mock.calls.length;
  await act(async () => { finish({ snapshot: { ...SNAP, enabled: false }, generation: 2 }); });
  expect(projectStore.getSnapshot().project?.id).toBe(nextId);
  expect(projectStore.getSnapshot().announcement).toBe(announcement);
  expect(listData).toHaveBeenCalledTimes(calls);
});

it("renders an unsupported mapping's facts in the active locale without reloading the snapshot", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const name = "rml:fn <b>{name}";
  const outside: SnapshotSummary = { ...SNAP, mapping: { status: "outside", message: "Original <img>{reason}",
    uiMessage: { code: "rml.unsupported", args: { name } } } };
  await setup([outside], true);
  expect(screen.getByText(`${name}は、このアプリで実行できるRMLの範囲外です。マッピングは他のRMLツールで使えるようそのまま保持し、データは変更しません。`)).toBeTruthy();
  const pre = screen.getByText("Original <img>{reason}", { selector: "pre" });
  const calls = listData.mock.calls.length;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText(`${name} is outside the supported RML subset. The mapping is kept unchanged for other RML tools, and the data stays as it was.`)).toBeTruthy();
  expect(screen.getByText("Original <img>{reason}", { selector: "pre" })).toBe(pre);
  expect(listData).toHaveBeenCalledTimes(calls);
});


it("rereads snapshot class names while preserving the mounted row and its controls", async () => {
  await setup(undefined, true);
  const row = document.querySelector(".snapshot-row");
  const control = document.querySelector(".snapshot-row button") as HTMLButtonElement;
  control.focus();
  listData.mockResolvedValue({ generation: 1, snapshots: [{ ...SNAP, className: "人" }] });
  await act(async () => { projectStore.setDisplayLanguage("ja"); });
  expect(screen.getByText(/人：2,000件/)).toBeTruthy();
  expect(document.querySelector(".snapshot-row")).toBe(row);
  expect(document.activeElement).toBe(control);
  const reads = listData.mock.calls.length;
  await act(async () => { fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } }); });
  expect(listData).toHaveBeenCalledTimes(reads);
  expect(updateData).not.toHaveBeenCalled(); expect(refreshData).not.toHaveBeenCalled();
});


it("keeps the previous list visible with a retry when a name refresh fails", async () => {
  await setup(undefined, true);
  const row = document.querySelector(".snapshot-row");
  const cause = new ApiError("Original name read <img>{value}", 422, null, { code: "request.invalid", args: {} });
  listData.mockRejectedValueOnce(cause);
  await act(async () => { projectStore.setDisplayLanguage("ja"); });
  expect(screen.getByText("データ一覧を読み込めませんでした。")).toBeTruthy();
  expect(document.querySelector(".snapshot-row")).toBe(row);
  const pre = screen.getByText("Original name read <img>{value}", { selector: "pre" });
  const details = pre.closest("details")!;
  fireEvent.click(details.querySelector("summary")!);
  const reads = listData.mock.calls.length;
  await act(async () => { fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } }); });
  expect(screen.getByText("The data snapshots could not be read.")).toBeTruthy();
  expect(screen.getByText("Original name read <img>{value}", { selector: "pre" })).toBe(pre);
  expect(details.open).toBe(true);
  expect(listData).toHaveBeenCalledTimes(reads);
  listData.mockResolvedValueOnce({ generation: 1, snapshots: [{ ...SNAP, className: "人" }] });
  await press(screen.getByRole("button", { name: "Try again" }));
  expect(screen.queryByText("The data snapshots could not be read.")).toBeNull();
  expect(projectStore.getSnapshot().dataError).toBeNull();
  expect(document.querySelector(".snapshot-row")).toBe(row);
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Data" }));
  expect(document.querySelector("img")).toBeNull();
});
