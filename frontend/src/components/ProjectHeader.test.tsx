/*
================================================================================
FILE: frontend/src/components/ProjectHeader.test.tsx
================================================================================

SUMMARY
    The project header (authoring-foundations 5.2, 5.4.2, Section 6, AC-10,
    AC-19): the status in words, Undo and Redo named by what they would do and
    unavailable without dropping focus, Save, the shortcuts anywhere except
    inside a text field, the polite live region, the document switcher, and
    the language menu with the display switch and missing counts; and the
    one-row bar of edit-page-rework 5.2: Turtle, the ⋯ menu by keyboard,
    Show canvas as a checkbox item, Save primary while unsaved. Operation
    notices follow UI-language changes without new requests, and retain only
    the result facts needed by their validation and reasoning summaries.

BASIC IDEA
    api.ts is mocked and the real store is opened on a fixed project, so
    pressing a control goes through the same action App's header runs.

INPUTS / INPUT SOURCES
    - A mocked api.ts.

EXPECTED OUTPUT
    - Pass/fail per assertion.
================================================================================
*/

// @vitest-environment jsdom

import { I18nProvider } from "../i18n/I18nProvider";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { renderEn as render } from "../testutils/i18n";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { openProject, undoChange, redoChange, saveDocument, getLanguageReport, updateProject, listData, validateProject, reasonProject, recoverProject, runCommand, getValidationResult, getReasoningResult } =
  vi.hoisted(() => ({
    openProject: vi.fn(),
    undoChange: vi.fn(),
    redoChange: vi.fn(),
    saveDocument: vi.fn(),
    getLanguageReport: vi.fn(),
    updateProject: vi.fn(),
    listData: vi.fn(),
    getValidationResult: vi.fn(),
    getReasoningResult: vi.fn(),
    validateProject: vi.fn(),
    reasonProject: vi.fn(),
    recoverProject: vi.fn(),
    runCommand: vi.fn(),
  }));

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  openProject,
  undoChange,
  redoChange,
  saveDocument,
  getLanguageReport,
  updateProject,
  listData,
  validateProject,
  getValidationResult,
  getReasoningResult,
  reasonProject,
  recoverProject,
  runCommand,
}));

import { projectStore } from "../state/projectStore";
import ProjectHeader from "./ProjectHeader";
import UiLanguageSelect from "./UiLanguageSelect";
import type { ReasoningResult, ValidationResult } from "../types";
import { validationSummary } from "../modeling/shapeSentences";
import { finishedLine, staleLine } from "../reasoning/reasonSentences";
import { makeUiMessage } from "../i18n/uiMessage";

const PROJECT = {
  id: "prj-0123456789ab",
  name: "Invoices",
  createdAt: "",
  updatedAt: "",
  baseIri: "http://x#",
  prefix: "x",
  primaryLanguage: "en",
  languages: ["fr"],
  documents: [{ file: "model.ttl", role: "model" as const }],
  counts: {},
};

function doc(changes: Record<string, unknown> = {}) {
  return {
    doc: "model" as const,
    ontologyId: "prj-0123456789ab-model",
    revision: 3,
    dirty: true,
    canUndo: true,
    undoLabel: "Created class Invoice",
    canRedo: false,
    redoLabel: null,
    triples: 12,
    ...changes,
  };
}

let handlers: {
  onSwitchDocument: ReturnType<typeof vi.fn<(doc: string) => void>>;
  onClose: ReturnType<typeof vi.fn<() => void>>;
  onError: ReturnType<typeof vi.fn<(error: unknown) => void>>;
  onSaveCopy: ReturnType<typeof vi.fn<() => void>>;
  onTurtle: ReturnType<typeof vi.fn<() => void>>;
};
let canvasToggle: ReturnType<typeof vi.fn<() => void>>;

async function renderHeader(changes: Record<string, unknown> = {}) {
  openProject.mockResolvedValue({
    project: PROJECT,
    documents: [doc(changes)],
    recovery: { available: false, draftTime: null },
  });
  await projectStore.open(PROJECT.id);
  handlers = {
    onSwitchDocument: vi.fn<(doc: string) => void>(),
    onClose: vi.fn<() => void>(),
    onError: vi.fn<(error: unknown) => void>(),
    onSaveCopy: vi.fn<() => void>(),
    onTurtle: vi.fn<() => void>(),
  };
  canvasToggle = vi.fn<() => void>();
  await act(async () => {
    render(
      <>
        <ProjectHeader {...handlers} canvas={{ on: true, onToggle: canvasToggle }} />
        <input aria-label="A text field" />
      </>,
    );
  });
}

const status = () => document.querySelector(".project-status")!.textContent;

/** Open the ⋯ menu and press one of its items. */
async function fromMenu(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("menuitem", { name }));
  });
}
const live = () => document.querySelector("[role=status]")!.textContent;

beforeEach(() => { projectStore._reset(); listData.mockResolvedValue({ generation: 1, snapshots: [] });
  getValidationResult.mockImplementation(async()=>projectStore.getSnapshot().validation);
  getReasoningResult.mockImplementation(async()=>projectStore.getSnapshot().reasoning);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProjectHeader", () => {
  it("names the project and says the status in words", async () => {
    await renderHeader();
    expect(screen.getByText("Invoices")).toBeTruthy();
    expect(status()).toBe("Unsaved changes");
    cleanup();
    projectStore._reset();
    await renderHeader({ dirty: false });
    expect(status()).toBe("Saved");
  });

  it("Undo and Redo carry what they would do, and are unavailable without being disabled", async () => {
    await renderHeader();
    const undo = screen.getByRole("button", { name: "Undo: Created class Invoice" });
    expect(undo.getAttribute("title")).toBe("Undo: Created class Invoice (Ctrl+Z)");
    const redo = screen.getByRole("button", { name: "Redo" });
    expect(redo.getAttribute("aria-disabled")).toBe("true");
    expect(redo.hasAttribute("disabled")).toBe(false);
    fireEvent.click(redo);
    expect(redoChange).not.toHaveBeenCalled();
  });

  it("undoing the last step keeps focus on Undo and announces what was undone (AC-10)", async () => {
    undoChange.mockResolvedValue({
      revision: 4,
      label: "Created class Invoice",
      state: doc({ revision: 4, canUndo: false, undoLabel: null, canRedo: true, redoLabel: "Created class Invoice" }),
    });
    await renderHeader();
    const undo = screen.getByRole("button", { name: "Undo: Created class Invoice" });
    undo.focus();
    await act(async () => {
      fireEvent.click(undo);
    });
    expect(undoChange).toHaveBeenCalledWith(PROJECT.id, "model");
    expect(undo.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(undo);
    expect(screen.getByRole("button", { name: "Redo: Created class Invoice" })).toBeTruthy();
    expect(live()).toBe("Undid: Created class Invoice. Unsaved changes.");
    expect(projectStore.getSnapshot().documents[0].revision).toBe(4);
  });

  it("Save saves and the status says so", async () => {
    saveDocument.mockResolvedValue({ savedAt: "now", state: doc({ dirty: false }) });
    await renderHeader();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(saveDocument).toHaveBeenCalledWith(PROJECT.id, "model", false);
    expect(status()).toBe("Saved");
    expect(live()).toBe("Saved.");
  });

  it("Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z and Ctrl+S work outside text fields", async () => {
    undoChange.mockResolvedValue({ revision: 4, label: "x", state: doc({ canRedo: true, redoLabel: "x" }) });
    redoChange.mockResolvedValue({ revision: 5, label: "x", state: doc({ canRedo: true, redoLabel: "x" }) });
    saveDocument.mockResolvedValue({ savedAt: "now", state: doc() });
    await renderHeader({ canRedo: true, redoLabel: "x" });
    for (const init of [
      { key: "z", ctrlKey: true },
      { key: "y", ctrlKey: true },
      { key: "Z", ctrlKey: true, shiftKey: true },
      { key: "s", ctrlKey: true },
    ]) {
      const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
      await act(async () => {
        document.body.dispatchEvent(event);
      });
      expect(event.defaultPrevented, init.key).toBe(true);
    }
    expect(undoChange).toHaveBeenCalledTimes(1);
    expect(redoChange).toHaveBeenCalledTimes(2);
    expect(saveDocument).toHaveBeenCalledTimes(1);
  });

  it("inside a text field the field's own undo wins", async () => {
    await renderHeader();
    const field = screen.getByLabelText("A text field");
    for (const key of ["z", "y", "s"]) {
      const event = new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true });
      await act(async () => {
        field.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(false);
    }
    expect(undoChange).not.toHaveBeenCalled();
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("the document switcher is labelled and hands the choice to App", async () => {
    await renderHeader();
    const select = screen.getByLabelText("Document") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["model.ttl (unsaved)"]);
    // Add shapes.ttl is in the ⋯ menu now, so the row stays one row.
    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    expect(screen.getByRole("menuitem", { name: "Add shapes.ttl" })).toBeTruthy();
  });

  it("the language menu switches the display language and says what is missing", async () => {
    getLanguageReport.mockResolvedValue({ entities: 40, languages: ["en", "fr"], missing: { en: 0, fr: 12 } });
    await renderHeader();
    await fromMenu("Language: en…");
    expect(screen.getByRole("group", { name: "Show names in" })).toBeTruthy();
    expect(screen.getByText(/12 of 40 entities have no name in fr/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: /^fr/ }));
    });
    expect(projectStore.getSnapshot().displayLanguage).toBe("fr");
    expect(live()).toBe("Showing names in fr.");
    // Escape in the panel gives focus back to ⋯, which names the language next time.
    fireEvent.keyDown(screen.getByRole("group", { name: "Show names in" }), { key: "Escape" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "More project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    expect(screen.getByRole("menuitem", { name: "Language: fr…" })).toBeTruthy();
  });

  it("adding a language checks the tag before asking the server", async () => {
    updateProject.mockResolvedValue({ ...PROJECT, languages: ["fr", "es"] });
    getLanguageReport.mockResolvedValue({ entities: 1, languages: ["en", "fr"], missing: { en: 0, fr: 0 } });
    await renderHeader();
    await fromMenu("Language: en…");
    const input = screen.getByLabelText("Add a language");
    fireEvent.change(input, { target: { value: "not a tag" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Use a language tag such as fr, es or pt-BR.")).toBeTruthy();
    expect(updateProject).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "es" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
    });
    expect(updateProject).toHaveBeenCalledWith(PROJECT.id, { languages: ["fr", "es"] });
  });

  it("a failed action goes to App's error bar", async () => {
    undoChange.mockRejectedValue(new Error("There is nothing to undo."));
    await renderHeader();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Undo: Created class Invoice" }));
    });
    expect(handlers.onError).toHaveBeenCalledWith(expect.objectContaining({ message: "There is nothing to undo." }));
  });
});


describe("ProjectHeader, found in code review", () => {
  it("Undo, Redo and Save go through the guard, keyboard included", async () => {
    await renderHeader({ canRedo: true, redoLabel: "x" });
    cleanup();
    const guard = vi.fn();
    await act(async () => {
      render(
        <ProjectHeader guard={guard} onSwitchDocument={vi.fn()} onClose={vi.fn()} onError={vi.fn()} onSaveCopy={vi.fn()} />,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo: Created class Invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo: x" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await act(async () => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(guard).toHaveBeenCalledTimes(4);
    expect(undoChange).not.toHaveBeenCalled();
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("saving every document leaves the active one where it was", async () => {
    openProject.mockResolvedValue({
      project: { ...PROJECT, documents: [...PROJECT.documents, { file: "shapes.ttl", role: "shapes" as const }] },
      documents: [doc(), { ...doc(), doc: "shapes" as const, ontologyId: "prj-0123456789ab-shapes" }],
      recovery: { available: false, draftTime: null },
    });
    await projectStore.open(PROJECT.id);
    saveDocument
      .mockResolvedValueOnce({ savedAt: "now", state: doc({ dirty: false }) })
      .mockResolvedValueOnce({ needsCommentsWarning: true, backup: "shapes.original.ttl" })
      .mockResolvedValueOnce({
        savedAt: "now",
        state: { ...doc({ dirty: false }), doc: "shapes" as const, ontologyId: "prj-0123456789ab-shapes" },
      });
    expect(await projectStore.saveAll()).toBe("warning");
    expect(projectStore.getSnapshot().activeDoc).toBe("model");
    expect(projectStore.getSnapshot().commentsWarning).toEqual({ doc: "shapes", backup: "shapes.original.ttl" });
    await projectStore.save(true);
    expect(saveDocument).toHaveBeenLastCalledWith(PROJECT.id, "shapes", true);
    expect(projectStore.getSnapshot().activeDoc).toBe("model");
  });

  it("one row: the name, the document, the status, Undo, Redo, Save, then Turtle and ⋯ (5.2)", async () => {
    await renderHeader();
    const row = document.querySelector(".project-header")!;
    const names = [...row.querySelectorAll(":scope > button, :scope > div > button")].map(
      (b) => b.getAttribute("aria-label") ?? b.textContent,
    );
    expect(names).toEqual(["Undo: Created class Invoice", "Redo", "Save", "Turtle", "More project actions"]);
    // Save a copy and Close project are no longer in the row: they are in ⋯.
    expect(screen.queryByRole("button", { name: "Save a copy" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close project" })).toBeNull();
    // The status is a dot beside its word, never the dot alone.
    expect(document.querySelector(".project-status-dot")!.getAttribute("aria-hidden")).toBe("true");
    expect(status()).toBe("Unsaved changes");
  });

  it("Save is the primary button while there are unsaved changes, and only then", async () => {
    await renderHeader();
    expect(screen.getByRole("button", { name: "Save" }).className).toBe("primary");
    cleanup();
    projectStore._reset();
    await renderHeader({ dirty: false });
    expect(screen.getByRole("button", { name: "Save" }).className).toBe("ghost");
  });

  it("Turtle opens the current document in View's editor, through App", async () => {
    await renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Turtle" }));
    expect(handlers.onTurtle).toHaveBeenCalledTimes(1);
  });

  it("the ⋯ menu: Language, Add shapes.ttl, Save a copy, Show canvas and Close project, by keyboard", async () => {
    await renderHeader();
    const more = screen.getByRole("button", { name: "More project actions" });
    expect(more.getAttribute("aria-haspopup")).toBe("menu");
    expect(more.getAttribute("aria-expanded")).toBe("false");
    await act(async () => {
      fireEvent.click(more);
    });
    expect(more.getAttribute("aria-expanded")).toBe("true");
    const menu = screen.getByRole("menu", { name: "More project actions" });
    const items = [...menu.querySelectorAll("[role^='menuitem']")].map((m) => m.textContent);
    expect(items).toEqual(["Language: en…", "Add shapes.ttl", "Save a copy", "✓Show canvas", "Close project"]);
    // Focus is on the first item; arrows, End and Home move it.
    expect(document.activeElement?.textContent).toBe("Language: en…");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toBe("Add shapes.ttl");
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement?.textContent).toBe("Close project");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toBe("Language: en…");
    // Show canvas is a checkbox item: its state is aria-checked, not colour.
    const canvas = screen.getByRole("menuitemcheckbox", { name: "Show canvas" });
    expect(canvas.getAttribute("aria-checked")).toBe("true");
    // Escape closes and gives focus back to ⋯.
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(more);
  });

  it("each ⋯ item does its one thing and leaves focus on ⋯", async () => {
    await renderHeader();
    await fromMenu("Save a copy");
    expect(handlers.onSaveCopy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "More project actions" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Show canvas" }));
    });
    expect(canvasToggle).toHaveBeenCalledTimes(1);
    await fromMenu("Close project");
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it("a press outside closes the menu", async () => {
    await renderHeader();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    });
    expect(screen.getByRole("menu", { name: "More project actions" })).toBeTruthy();
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText("A text field"));
    });
    expect(screen.queryByRole("menu", { name: "More project actions" })).toBeNull();
  });
});
it("distinguishes Japanese save state and edits dictionary display language without changing UI locale", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc({ dirty: true })], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  getLanguageReport.mockResolvedValue({ entities: 3, missing: { en: 0, fr: 1 } });
  render(<I18nProvider><ProjectHeader onSwitchDocument={vi.fn()} onClose={vi.fn()} onError={vi.fn()} onSaveCopy={vi.fn()} /></I18nProvider>);
  expect(screen.getByText("未保存の変更あり")).toBeTruthy();
  expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "プロジェクトのその他の操作" }));
  await act(async () => { fireEvent.click(screen.getByRole("menuitem", { name: "辞書の表示言語：en…" })); });
  fireEvent.click(screen.getByRole("radio", { name: /^fr/ }));
  expect(projectStore.getSnapshot().displayLanguage).toBe("fr");
  expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
});


it("renders structured snapshot notices in the current locale without changing their identity", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc()], recovery: { available: false, draftTime: null } });
  await act(async () => { await projectStore.open(PROJECT.id); });
  const source = "日本語 <b>{source}</b>.csv";
  const message = makeUiMessage("dataSnapshot.switchedOff", { source });
  await act(async () => { await projectStore.dataChanged(message); });
  const notice = projectStore.getSnapshot().announcement;
  expect(notice.uiMessage).toBe(message);
  const view = render(<I18nProvider><UiLanguageSelect /><ProjectHeader onSwitchDocument={vi.fn()} onClose={vi.fn()} onError={vi.fn()} onSaveCopy={vi.fn()} /></I18nProvider>);
  try {
    expect(notice.text).toBe(`Switched off ${source}: its data has left every view and validation.`);
    expect(live()).toBe(`${source}を無効にしました。すべてのビューと検証からデータを除きました。`);
    const region = screen.getByRole("status");
    const content = region.firstElementChild;
    const requests = listData.mock.calls.length;
    fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
    expect(live()).toBe(notice.text);
    expect(screen.getByRole("status")).toBe(region);
    expect(region.firstElementChild).toBe(content);
    expect(projectStore.getSnapshot().announcement).toBe(notice);
    expect(listData).toHaveBeenCalledTimes(requests);
    expect(region.querySelector("b")).toBeNull();
  } finally { view.unmount(); localStorage.removeItem("semantic-studio.uiLocale.v1"); }
});


/** Notifications belong to the operation; switching the UI only renders them again. */
describe("project operation notices", () => {
  beforeEach(() => { localStorage.removeItem("semantic-studio.uiLocale.v1"); });
  afterEach(() => { localStorage.removeItem("semantic-studio.uiLocale.v1"); });

  async function openLocalized() {
    openProject.mockResolvedValue({ project: PROJECT, documents: [doc()], recovery: { available: false, draftTime: null } });
    await act(async () => { await projectStore.open(PROJECT.id); });
    render(<I18nProvider><UiLanguageSelect /><ProjectHeader onSwitchDocument={vi.fn()} onClose={vi.fn()} onError={vi.fn()} onSaveCopy={vi.fn()} /></I18nProvider>);
  }
  function locale(value: "ja" | "en") {
    const before = projectStore.getSnapshot().announcement;
    const content = screen.getByRole("status").firstElementChild;
    fireEvent.change(screen.getByRole("combobox", { name: /UI/ }), { target: { value } });
    expect(projectStore.getSnapshot().announcement).toBe(before);
    expect(screen.getByRole("status").firstElementChild).toBe(content);
  }

  it("localizes opening, pending and completed saves, backup names and display language without replaying work", async () => {
    await openLocalized();
    expect(live()).toBe("Invoicesを開きました。未保存の変更があります。");
    locale("en");
    expect(live()).toBe("Opened Invoices. Unsaved changes.");
    let resolveSave!: (value: { state: ReturnType<typeof doc> }) => void;
    saveDocument.mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve; }));
    let pending!: ReturnType<typeof projectStore.save>;
    await act(async () => { pending = projectStore.save(); });
    expect(live()).toBe("Saving…");
    locale("ja");
    expect(live()).toBe("保存中…");
    expect(saveDocument).toHaveBeenCalledTimes(1);
    await act(async () => { resolveSave({ state: doc({ dirty: false }) }); await pending; });
    expect(live()).toBe("保存しました。");
    locale("en");
    expect(live()).toBe("Saved.");
    saveDocument.mockResolvedValueOnce({ state: doc({ dirty: false }) });
    await act(async () => { await projectStore.save(true); });
    expect(live()).toBe("Saved. The previous file was kept as model.original.ttl.");
    locale("ja");
    expect(live()).toBe("保存しました。変更前のファイルはmodel.original.ttlとして保持しています。");
    await act(async () => { projectStore.setDisplayLanguage("fr"); });
    expect(live()).toBe("名称の表示言語：fr。");
    locale("en");
    expect(live()).toBe("Showing names in fr.");
    expect(projectStore.getSnapshot().displayLanguage).toBe("fr");
    expect(saveDocument).toHaveBeenCalledTimes(2);
    expect(openProject).toHaveBeenCalledTimes(1);
  });

  it.each(["recover", "discard"] as const)("renders %s and cancelled-save notices in the current locale", async action => {
    await openLocalized();
    recoverProject.mockResolvedValueOnce({ documents: [doc()] });
    await act(async () => { await projectStore.recover(action); });
    expect(live()).toBe(action === "recover" ? "未保存の変更を復元しました。変更はまだ保存されていません。" : "未保存の変更を破棄しました。");
    locale("en");
    expect(live()).toBe(action === "recover" ? "Recovered the unsaved changes. Unsaved changes." : "Discarded the unsaved changes.");
    expect(recoverProject).toHaveBeenCalledTimes(1);
    await act(async () => { projectStore.cancelCommentsWarning(); });
    expect(live()).toBe("Not saved.");
    locale("ja");
    expect(live()).toBe("保存していません。");
  });

  it.each([false, true])("renders validation facts after a pending run (stopped=%s) without retaining panel content", async stopped => {
    await openLocalized();
    const result: ValidationResult = {
      stopped, statements: 24, shapeCount: 3, durationMs: 20, revisions: { model: 3, shapes: 1 },
      shapes: [{ id: "hidden-witness", name: "hidden-witness", state: "fails", target: null, focusCount: 4, failingCount: 1, problemCount: 1, warningCount: 0, problems: [], problemsTotal: 0, error: null }],
    };
    let resolve!: (value: ValidationResult) => void;
    validateProject.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    let pending!: ReturnType<typeof projectStore.validate>;
    await act(async () => { pending = projectStore.validate(); });
    expect(live()).toBe("検証中…");
    locale("en");
    expect(live()).toBe("Validating…");
    await act(async () => { expect(await projectStore.validate()).toBeNull(); });
    expect(validateProject).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(result); await pending; });
    expect(live()).toBe(validationSummary(result, "en"));
    expect(projectStore.getSnapshot().validation).toBe(result);
    expect(JSON.stringify(projectStore.getSnapshot().announcement)).not.toContain("hidden-witness");
    locale("ja");
    expect(live()).toBe(validationSummary(result, "ja"));
    expect(validateProject).toHaveBeenCalledTimes(1);
  });

  it.each(["fresh", "stale", "timeout"] as const)("renders %s reasoning completion in the active locale without replaying inference", async ending => {
    await openLocalized();
    const result: ReasoningResult = {
      status: ending === "timeout" ? "timedOut" : "done", key: "synthetic", includeData: false, imports: false,
      basis: { revision: 3, generation: 1, imports: false }, durationMs: 4200, statements: 12,
      sentence: ending === "timeout" ? "Original timeout diagnostic." : null,
      ...(ending === "timeout" ? { uiMessage: { code: "reasoning.timeout", args: { seconds: 7 } } } : {}),
      problems: [], groups: [{ kind: "kinds", total: 2, offset: 0, items: [{ s: "hidden-witness", p: "urn:p", o: "urn:o", sLabel: "hidden-witness", pLabel: "p", oLabel: "o", sentence: "hidden-witness" }] }],
      importedFacts: { kind: "imported", total: 0, offset: 0, items: [] }, stale: ending === "stale",
    };
    let resolve!: (value: ReasoningResult) => void;
    reasonProject.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    let pending!: ReturnType<typeof projectStore.reason>;
    await act(async () => { pending = projectStore.reason(false, false); });
    expect(live()).toBe("推論を開始しました。");
    locale("en");
    expect(live()).toBe("Reasoning started.");
    await act(async () => { expect(await projectStore.reason(false, false)).toBeNull(); });
    await act(async () => { resolve(result); await pending; });
    const english = ending === "stale" ? staleLine(result) : finishedLine(result);
    expect(live()).toBe(english.endsWith(".") ? english : `${english}.`);
    expect(projectStore.getSnapshot().reasoning).toBe(result);
    expect(JSON.stringify(projectStore.getSnapshot().announcement)).not.toContain("hidden-witness");
    locale("ja");
    expect(live()).toBe(ending === "stale" ? staleLine(result, "ja") : finishedLine(result, "ja"));
    expect(reasonProject).toHaveBeenCalledTimes(1);
  });
});


it("renders a command and its undo/redo labels and announcements from retained metadata in the current language", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  openProject.mockResolvedValue({ project: PROJECT, documents: [doc()], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  render(<I18nProvider><UiLanguageSelect /><ProjectHeader onSwitchDocument={vi.fn()} onClose={vi.fn()} onError={vi.fn()} onSaveCopy={vi.fn()} /></I18nProvider>);
  const name = "犬 <img>{name}";
  const label = `Created class ${name}`;
  const wire = { code: "command.created_class", args: { name } } as const;
  const created = { revision: 4, label, uiMessage: wire, state: doc({ revision: 4, undoLabel: label, undoUiMessage: wire }) };
  runCommand.mockResolvedValueOnce(created);
  await act(async () => { await projectStore.command("CreateClass", { label: name, iri: "urn:synthetic:dog" }); });
  const japaneseLabel = `クラス「${name}」の作成`;
  expect(screen.getByRole("button", { name: `元に戻す：${japaneseLabel}` })).toBeTruthy();
  expect(live()).toBe(`${japaneseLabel}が完了しました。未保存の変更があります。`);
  const notice = projectStore.getSnapshot().announcement;
  const span = screen.getByRole("status").firstElementChild;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("button", { name: `Undo: ${label}` })).toBeTruthy();
  expect(live()).toBe(`${label}. Unsaved changes.`);
  expect(projectStore.getSnapshot().announcement).toBe(notice);
  expect(screen.getByRole("status").firstElementChild).toBe(span);
  expect(runCommand).toHaveBeenCalledTimes(1);
  undoChange.mockResolvedValueOnce({ ...created, revision: 5, state: doc({ revision: 5, dirty: false, canUndo: false, undoLabel: null, canRedo: true, redoLabel: label, redoUiMessage: wire }) });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: `Undo: ${label}` })); });
  expect(live()).toBe(`Undid: ${label}. Saved.`);
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  expect(live()).toBe(`${japaneseLabel}を元に戻しました。保存済みです。`);
  expect(screen.getByRole("button", { name: `やり直す：${japaneseLabel}` })).toBeTruthy();
  redoChange.mockResolvedValueOnce({ ...created, revision: 6, state: doc({ revision: 6, undoLabel: label, undoUiMessage: wire }) });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: `やり直す：${japaneseLabel}` })); });
  expect(live()).toBe(`${japaneseLabel}をやり直しました。未保存の変更があります。`);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(live()).toBe(`Redid: ${label}. Unsaved changes.`);
  expect(undoChange).toHaveBeenCalledTimes(1);
  expect(redoChange).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").querySelector("img")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("keeps compound rule descriptors and the active shapes document intact across UI language changes", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const shapeName = "犬の確認 <img>{shape}";
  const custom = "備考 <b>{path}</b>";
  const wire = Object.freeze({ code: "command.added_rule", args: Object.freeze({ shape_name: shapeName,
    path: Object.freeze([
      Object.freeze({ code: "words.path.name", args: Object.freeze({}) }),
      Object.freeze({ code: "words.path.or", args: Object.freeze({}) }),
      Object.freeze({ text: custom }),
    ]),
  }) });
  const shapes = { ...doc(), doc: "shapes" as const, ontologyId: `${PROJECT.id}-shapes`, revision: 1, dirty: false, canUndo: false, undoLabel: null };
  openProject.mockResolvedValue({ project: { ...PROJECT, documents: [...PROJECT.documents, { file: "shapes.ttl", role: "shapes" }] }, documents: [doc({ dirty: false }), shapes], recovery: { available: false, draftTime: null } });
  await projectStore.open(PROJECT.id);
  projectStore.switchDocument("shapes");
  render(<I18nProvider><UiLanguageSelect /><ProjectHeader onSwitchDocument={vi.fn()} onClose={vi.fn()} onError={vi.fn()} onSaveCopy={vi.fn()} /></I18nProvider>);
  const english = `Added a rule on name or ${custom} to ${shapeName}`;
  const japanese = `ルールセット「${shapeName}」への名前または${custom}のルール追加`;
  const packet = { shape: "urn:synthetic:shape", rule: { path: ["http://www.w3.org/2000/01/rdf-schema#label", "urn:synthetic:notes"], minCount: 1 } };
  runCommand.mockResolvedValueOnce({ revision: 2, label: english, uiMessage: wire, state: { ...shapes, revision: 2, dirty: true, canUndo: true, undoLabel: english, undoUiMessage: wire } });
  await act(async () => { await projectStore.command("AddRule", packet); });
  expect(live()).toBe(`${japanese}が完了しました。未保存の変更があります。`);
  expect(screen.getByRole("button", { name: `元に戻す：${japanese}` })).toBeTruthy();
  const notice = projectStore.getSnapshot().announcement;
  const span = screen.getByRole("status").firstElementChild;
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(live()).toBe(`${english}. Unsaved changes.`);
  expect(screen.getByRole("button", { name: `Undo: ${english}` })).toBeTruthy();
  expect(projectStore.getSnapshot().announcement).toBe(notice);
  expect(screen.getByRole("status").firstElementChild).toBe(span);
  expect(projectStore.getSnapshot().activeDoc).toBe("shapes");
  expect(projectStore.getSnapshot().displayLanguage).toBe("en");
  expect(projectStore.getSnapshot().documents.find(d => d.doc === "shapes")?.undoUiMessage).toBe(wire);
  expect(runCommand).toHaveBeenCalledExactlyOnceWith(PROJECT.id, "shapes", "AddRule", packet, "en");
  expect(openProject).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").querySelector("img,b")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("reports a name-read error once and retries by reselecting the current dictionary language", async () => {
  getLanguageReport.mockResolvedValue({entities:1,languages:["en","fr"],missing:{en:0,fr:0}});
  await renderHeader();
  const result:ValidationResult={stopped:false,statements:1,shapeCount:0,shapes:[],durationMs:1,revisions:{model:3,shapes:null}};
  validateProject.mockResolvedValueOnce(result);await act(async()=>{await projectStore.validate();});
  getValidationResult.mockRejectedValueOnce(new Error("Original names failure <img>{raw}"));
  await fromMenu("Language: en…");
  await act(async()=>{fireEvent.click(screen.getByRole("radio",{name:/^fr/}));});
  expect(handlers.onError).toHaveBeenCalledTimes(1);
  const error=handlers.onError.mock.calls[0][0] as Error;
  expect(error.message).toBe("Original names failure <img>{raw}");
  await act(async()=>{fireEvent.click(screen.getByRole("radio",{name:/^fr/}));});
  expect(getValidationResult).toHaveBeenCalledTimes(2);
  expect(projectStore.getSnapshot().resultReadError).toBeNull();
  expect(handlers.onError).toHaveBeenCalledTimes(1);
  expect(validateProject).toHaveBeenCalledTimes(1);
});
