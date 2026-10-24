/*
================================================================================
FILE: frontend/src/components/LinkPanel.test.tsx
================================================================================

SUMMARY
    The link panel (relationships 5.2, AC-3, R14): a subclass or broader
    line read as its sentence, Remove this link as one command, the busy
    state, a refusal said in place with raw details, and both ends selectable.
    Delayed refusals and open technical details survive UI language changes.

BASIC IDEA
    Rendered alone over an open project store, with api.ts mocked, as the
    other form tests do.

INPUTS / INPUT SOURCES
    - A mocked api.ts (openProject, runCommand).

EXPECTED OUTPUT
    - Pass/fail per assertion.
================================================================================
*/

// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectStore } from "../state/projectStore";
import LinkPanel from "./LinkPanel";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";

const { openProject, runCommand } = vi.hoisted(() => ({ openProject: vi.fn(), runCommand: vi.fn() }));
vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, openProject, runCommand };
});

const EX = "http://example.org/shop#";
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

const SUBCLASS = {
  kind: "subClassOf" as const,
  source: EX + "Employee",
  target: EX + "Person",
  sourceLabel: "Employee",
  targetLabel: "Person",
};

beforeEach(async () => {
  projectStore._reset();
  openProject.mockReset();
  runCommand.mockReset();
  openProject.mockResolvedValue({
    project: {
      id: PID, name: "Shop", createdAt: "", updatedAt: "", baseIri: EX, prefix: "shop",
      primaryLanguage: "en", languages: [], documents: [{ file: "model.ttl", role: "model" }], counts: {}, kind: "ontology",
    },
    documents: [STATE],
    recovery: { available: false, draftTime: null },
  });
  await projectStore.open(PID);
});

afterEach(() => {
  cleanup();
  projectStore._reset();
});

describe("LinkPanel", () => {
  it("reads a subclass line as its sentence, named by it", () => {
    render(<LinkPanel link={SUBCLASS} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("complementary", { name: "Employee is a kind of Person" })).toBeTruthy();
  });

  it("reads a broader line the same way", () => {
    render(
      <LinkPanel
        link={{ kind: "broader", source: EX + "Apple", target: EX + "Fruit", sourceLabel: "Apple", targetLabel: "Fruit" }}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Apple is narrower than Fruit" })).toBeTruthy();
  });

  it("removes the link with one command, then closes", async () => {
    runCommand.mockResolvedValue({ revision: 3, label: "Removed", state: STATE });
    const onClose = vi.fn();
    render(<LinkPanel link={SUBCLASS} onSelect={vi.fn()} onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove this link" }));
    });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand.mock.calls[0].slice(2)).toEqual(["RemoveSubClassOf", { child: EX + "Employee", parent: EX + "Person" }]);
    expect(onClose).toHaveBeenCalled();
  });

  it("says Removing… while the command runs, and a refusal in place", async () => {
    let fail!: (e: Error) => void;
    runCommand.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    const onClose = vi.fn();
    render(<LinkPanel link={SUBCLASS} onSelect={vi.fn()} onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove this link" }));
    });
    const busy = screen.getByRole("button", { name: "Removing…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    await act(async () => fail(new Error("Employee is not a subclass of Person.")));
    expect(screen.getByRole("alert").textContent).toBe("The operation could not be completed. Check the details.");
    expect(screen.getByText("Employee is not a subclass of Person.").tagName).toBe("PRE");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("selects either end", () => {
    const onSelect = vi.fn();
    render(<LinkPanel link={SUBCLASS} onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Employee" }));
    fireEvent.click(screen.getByRole("button", { name: "Person" }));
    expect(onSelect.mock.calls).toEqual([[EX + "Employee"], [EX + "Person"]]);
  });

  it("a link with an end of the project's other kind says why, and offers no Remove (review)", () => {
    const reason = "Apple is a SKOS concept, read-only in an ontology. Edit it in Turtle, or change the project to a taxonomy.";
    render(
      <LinkPanel
        link={{ kind: "broader", source: EX + "Apple", target: EX + "Fruit", sourceLabel: "Apple", targetLabel: "Fruit", readOnly: reason }}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove this link" })).toBeNull();
  });

  it("reads a related line and removes it both ways with one RemoveRelated (5.8)", async () => {
    runCommand.mockResolvedValue({ revision: 3, label: "Removed", state: STATE });
    render(
      <LinkPanel
        link={{ kind: "related", source: EX + "Apple", target: EX + "Orchard", sourceLabel: "Apple", targetLabel: "Orchard" }}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Apple is related to Orchard" })).toBeTruthy();
    // Both ways: the ends are joined by *and*, never an arrow (PR #49 review).
    const ends = document.querySelector(".link-panel-ends")!;
    expect(ends.textContent).toBe("Apple and Orchard");
    expect(ends.textContent).not.toContain("→");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove this link" }));
    });
    expect(runCommand.mock.calls[0].slice(2)).toEqual(["RemoveRelated", { concept: EX + "Apple", related: EX + "Orchard" }]);
  });

  it("item 5: a refusal for one line is gone when another line is shown", async () => {
    runCommand.mockRejectedValueOnce(new Error("Employee is not a subclass of Person."));
    const { rerender } = render(<LinkPanel link={SUBCLASS} onSelect={vi.fn()} onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove this link" }));
    });
    expect(screen.getByRole("alert")).toBeTruthy();
    await act(async () => {
      rerender(
        <LinkPanel
          link={{ kind: "broader", source: EX + "Apple", target: EX + "Fruit", sourceLabel: "Apple", targetLabel: "Fruit" }}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );
    });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Technical details")).toBeNull();
    expect(screen.queryByText("Employee is not a subclass of Person.")).toBeNull();
  });
});


it("switches link guidance without changing references or removal arguments", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  runCommand.mockResolvedValue({ revision: 3, label: "Removed", state: STATE });
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const link = { ...SUBCLASS, sourceLabel: "<b>Employee</b>" };
  render(<I18nProvider><UiLanguageSelect /><LinkPanel link={link} onSelect={onSelect} onClose={onClose} /></I18nProvider>);
  expect(screen.getByRole("heading", { name: "<b>Employee</b>はPersonの一種です" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "パネルを閉じる" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "<b>Employee</b>" }));
  expect(onSelect).toHaveBeenCalledWith(EX + "Employee");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("heading", { name: "<b>Employee</b> is a kind of Person" })).toBeTruthy();
  expect(document.querySelector("b")).toBeNull();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove this link" })));
  expect(runCommand).toHaveBeenCalledWith(PID, "model", "RemoveSubClassOf", { child: EX + "Employee", parent: EX + "Person" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it.each([true, false])("retains a delayed runner refusal and its original details across locale changes (known=%s)", async known => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  let reject!: (error: unknown) => void;
  runCommand.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  const raw = "Original refusal <b>{literal}";
  const error = Object.assign(new Error(raw), known ? {
    uiMessage: { code: "editing.value.invalid_integer", args: { value: "値 <img>{value}" } },
  } : {});
  const close = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><LinkPanel link={SUBCLASS} onSelect={vi.fn()} onClose={close} /></I18nProvider>);
  fireEvent.click(screen.getByRole("button", { name: "この関係を外す" }));
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  await act(async () => reject(error));
  expect(screen.getByRole("alert").textContent).toBe(known
    ? '"値 <img>{value}" is not a valid integer (expected a whole number such as 42).'
    : "The operation could not be completed. Check the details.");
  const details = screen.getByText("Technical details");
  details.focus();
  fireEvent.click(details);
  expect(details.parentElement?.hasAttribute("open")).toBe(true);
  expect(screen.getByText(raw).tagName).toBe("PRE");
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  expect(screen.getByRole("alert").textContent).toBe(known
    ? "「値 <img>{value}」は有効な整数ではありません（例：42）。"
    : "操作を完了できませんでした。詳細を確認してください。");
  expect(screen.getByText("技術的な詳細")).toBe(details);
  expect(document.activeElement).toBe(details);
  expect(details.parentElement?.hasAttribute("open")).toBe(true);
  expect(screen.getByText(raw).tagName).toBe("PRE");
  expect(document.querySelector("img, b")).toBeNull();
  expect(runCommand).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});
