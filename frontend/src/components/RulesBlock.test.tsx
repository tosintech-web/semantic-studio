// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/RulesBlock.test.tsx
================================================================================

SUMMARY
    axioms-and-reasoning Stage B, the class form's Rules block and its
    sentence builder (AC-8, AC-11, AC-12, Section 6): the rules as
    sentences; Add a rule through the builder, a group named by its
    sentence with a labelled field per blank, one command; Edit sending
    ReplaceRestriction with the old rule's key; Remove; a refusal under the
    builder and in the live region; warnings under their rule and said once;
    a rule outside the form read-only with Edit in Turtle; Check it in data
    too on shapes.ttl; a rule begun on the canvas opening the builder; and
    focus, which goes back to Add a rule after an add, to the next rule
    after a remove, and never to the page.

BASIC IDEA
    The block is rendered with its runner, the api mocked as the other form
    tests mock it, and the rules handed in by a harness that can change them,
    as a refetch for the new revision does.

INPUTS / INPUT SOURCES
    - Inline rules, shaped as /node sends them.

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import { useI18n } from "../i18n/I18nProvider";
import { renderProjectAnnouncement } from "../modeling/projectNotices";
import { builderSentence, EMPTY_BUILDER, itemSentence } from "../modeling/ruleSentences";
import { projectStore, useProjectStore } from "../state/projectStore";
import type { ClassRules, RuleItem, RuleRestriction } from "../types";
import { useRunner } from "./EditParts";
import RulesBlock from "./RulesBlock";

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

const ref = (local: string, label: string) => ({ iri: EX + local, label });

function some(local = "OrderLine", label = "Order line"): RuleRestriction {
  return {
    type: "restriction",
    form: "every",
    property: { ...ref("hasLine", "has line"), kind: "relationship" },
    kind: "some",
    filler: ref(local, label),
    n: null,
    with: null,
    key: { form: "every", property: EX + "hasLine", kind: "some", filler: EX + local, n: null },
    editable: true,
  };
}

const disjoint: RuleItem = { type: "disjoint", other: ref("Person", "Person"), editable: true };

const CHOICES = {
  properties: { items: [{ ...ref("hasLine", "has line"), kind: "relationship" as const }], total: 1 },
  classes: { items: [ref("Order", "Order"), ref("OrderLine", "Order line"), ref("Person", "Person")], total: 3 },
  things: { items: [], total: 0 },
};

function rulesOf(items: RuleItem[], extra: Partial<ClassRules> = {}): ClassRules {
  return { items, warnings: [], choices: CHOICES, ...extra };
}

let setRules: (rules: ClassRules) => void = () => undefined;
const onSelect = vi.fn();

function Harness({ initial }: { initial: ClassRules }) {
  const [rules, set] = useState(initial);
  setRules = set;
  const runner = useRunner();
  return <RulesBlock iri={EX + "Order"} name="Order" rules={rules} runner={runner} onSelect={onSelect} />;
}

async function show(rules: ClassRules) {
  await act(async () => {
    render(<Harness initial={rules} />);
  });
}

async function refetch(rules: ClassRules) {
  await act(async () => setRules(rules));
}

const said = () => projectStore.getSnapshot().announcement.text;

beforeEach(async () => {
  projectStore._reset();
  openProject.mockReset();
  runCommand.mockReset();
  onSelect.mockReset();
  openProject.mockResolvedValue({
    project: {
      id: PID,
      name: "Shop",
      createdAt: "",
      updatedAt: "",
      baseIri: EX,
      prefix: "shop",
      primaryLanguage: "en",
      languages: [],
      documents: [{ file: "model.ttl", role: "model" }],
      counts: {},
    },
    documents: [STATE],
    recovery: { available: false, draftTime: null },
  });
  await projectStore.open(PID);
  runCommand.mockImplementation(async (_p, _d, command: string) => ({ revision: 3, label: `Did ${command}`, state: STATE }));
});

afterEach(() => {
  cleanup();
});

describe("the Rules block (5.9)", () => {
  it("lists the rules as sentences under its heading, or says there are none", async () => {
    await show(rulesOf([some(), disjoint]));
    const block = screen.getByRole("region", { name: "What is true of every Order" });
    expect(within(block).getByText("Every Order has at least one line that is an Order line")).toBeTruthy();
    expect(within(block).getByText("No Order is a Person")).toBeTruthy();
    expect(within(block).getByText(/an Order with no line is not an error here/)).toBeTruthy();
    cleanup();
    await show(rulesOf([]));
    expect(screen.getByText("No rules yet.")).toBeTruthy();
  });

  it("adds a rule through the builder: one command, announced, focus back on Add a rule (R9, R14)", async () => {
    await show(rulesOf([]));
    fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));
    // A group named by its sentence; the first blank has focus.
    const group = screen.getByRole("group", { name: "Every Order …" });
    expect(document.activeElement).toBe(within(group).getByRole("combobox", { name: "Rule" }));
    // Each blank is a labelled field.
    fireEvent.change(within(group).getByRole("combobox", { name: "Relationship or attribute" }), {
      target: { value: EX + "hasLine" },
    });
    fireEvent.change(within(group).getByRole("combobox", { name: "What is true of it" }), { target: { value: "some" } });
    const add = within(group).getByRole("button", { name: "Add" });
    expect(add.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(add);
    expect(runCommand).not.toHaveBeenCalled();
    fireEvent.change(within(group).getByRole("combobox", { name: "That is a (class)" }), { target: { value: EX + "OrderLine" } });
    expect(screen.getByRole("group", { name: "Every Order has at least one line that is an Order line" })).toBe(group);
    await act(async () => {
      fireEvent.click(add);
    });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand.mock.calls[0].slice(1)).toEqual([
      "model",
      "AddRestriction",
      { class: EX + "Order", form: "every", property: EX + "hasLine", kind: "some", filler: EX + "OrderLine", n: null },
    ]);
    expect(said()).toBe("Added: Every Order has at least one line that is an Order line. Did AddRestriction.");
    expect(screen.queryByRole("group")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add a rule" })));
  });

  it("a number field for a count, and the pairs by the other class", async () => {
    await show(rulesOf([]));
    fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Relationship or attribute" }), { target: { value: EX + "hasLine" } });
    fireEvent.change(screen.getByRole("combobox", { name: "What is true of it" }), { target: { value: "atLeast" } });
    const n = screen.getByRole("spinbutton", { name: "How many (0 to 1,000)" });
    fireEvent.change(n, { target: { value: "3" } });
    expect(screen.getByRole("group").getAttribute("aria-label")).toBe("Every Order has at least 3 lines");
    fireEvent.change(screen.getByRole("combobox", { name: "Rule" }), { target: { value: "disjoint" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Never a (class)" }), { target: { value: EX + "Person" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
    });
    expect(runCommand.mock.calls[0].slice(2)).toEqual(["AddDisjointWith", { a: EX + "Order", b: EX + "Person" }]);
  });

  it("a refusal stands under the builder and is said in the live region; the builder stays (AC-10)", async () => {
    runCommand.mockRejectedValueOnce(new Error("Order already has this rule."));
    await show(rulesOf([]));
    fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Relationship or attribute" }), { target: { value: EX + "hasLine" } });
    fireEvent.change(screen.getByRole("combobox", { name: "What is true of it" }), { target: { value: "some" } });
    fireEvent.change(screen.getByRole("combobox", { name: "That is a (class)" }), { target: { value: EX + "OrderLine" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
    });
    const group = screen.getByRole("group");
    expect(within(group).getByText("Order already has this rule.")).toBeTruthy();
    expect(said()).toBe("Order already has this rule.");
  });

  it("Escape closes the builder and gives focus back to Add a rule", async () => {
    await show(rulesOf([]));
    fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Rule" }), { key: "Escape" });
    expect(screen.queryByRole("group")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add a rule" })));
  });

  it("Edit opens the builder on the rule, and Save sends ReplaceRestriction with its key", async () => {
    const rule = some();
    await show(rulesOf([rule]));
    fireEvent.click(screen.getByRole("button", { name: "Edit: Every Order has at least one line that is an Order line" }));
    fireEvent.change(screen.getByRole("combobox", { name: "What is true of it" }), { target: { value: "only" } });
    fireEvent.change(screen.getByRole("combobox", { name: "That is a (class)" }), { target: { value: EX + "OrderLine" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
    });
    expect(runCommand.mock.calls[0].slice(2)).toEqual([
      "ReplaceRestriction",
      {
        class: EX + "Order",
        form: "every",
        property: EX + "hasLine",
        kind: "only",
        filler: EX + "OrderLine",
        n: null,
        restriction: rule.key,
      },
    ]);
  });

  it("after a remove, focus goes to the next rule once the old one has gone, then to Add a rule", async () => {
    const first = some();
    const second = some("Person", "Person");
    await show(rulesOf([first, second]));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove: Every Order has at least one line that is an Order line" }));
    });
    expect(runCommand.mock.calls[0].slice(2)).toEqual(["RemoveRestriction", { class: EX + "Order", restriction: first.key }]);
    expect(said()).toMatch(/^Removed: Every Order has at least one line that is an Order line\./);
    await refetch(rulesOf([second]));
    await waitFor(() =>
      expect(document.activeElement?.textContent).toContain("Every Order has at least one line that is a Person"),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Remove: / }));
    });
    await refetch(rulesOf([]));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add a rule" })));
  });

  it("a rule outside the form is its Turtle, read-only, with Edit in Turtle (R12)", async () => {
    const turtle = "shop:Order rdfs:subClassOf [ owl:onProperty shop:hasLine ; owl:someValuesFrom [ owl:unionOf ( shop:A shop:B ) ] ] .";
    await show(rulesOf([{ type: "turtle", turtle, editable: false }, { ...some(), editable: false }]));
    expect(screen.getByText(turtle)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Edit:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove:/ })).toBeNull();
    expect(screen.getByText("(read-only)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit in Turtle" }));
    expect(projectStore.getSnapshot().editorTarget?.find).toEqual([`<${EX}Order>`, "shop:Order"]);
  });

  it("no Add a rule, Edit or Remove on a class this document does not define", async () => {
    await show(rulesOf([some()], { choices: null }));
    expect(screen.queryByRole("button", { name: "Add a rule" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove:/ })).toBeNull();
  });

  it("warnings stand under their rule, the rest under the heading, and a new one is said once", async () => {
    await show(rulesOf([disjoint]));
    const robot = "Robot can never have members: it would be a kind of Organization and of Person.";
    await refetch(
      rulesOf([disjoint], {
        warnings: [{ text: robot, disjoint: EX + "Person" }, { text: "Order can never have members: it is a kind of X." }],
      }),
    );
    const rule = screen.getByText("No Order is a Person").closest("li")!;
    expect(within(rule).getByText(robot)).toBeTruthy();
    expect(screen.getByText("Order can never have members: it is a kind of X.").closest("li")!.parentElement!.closest("li")).toBeNull();
    expect(said()).toBe(`Warning: ${robot} Order can never have members: it is a kind of X.`);
  });

  it("Check it in data too runs CheckInData on shapes.ttl (AC-12, R13)", async () => {
    const rule = some();
    await show(rulesOf([rule]));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Check it in data too: Every Order has at least one line that is an Order line" }),
      );
    });
    expect(runCommand.mock.calls[0].slice(1)).toEqual(["shapes", "CheckInData", { class: EX + "Order", restriction: rule.key }]);
    expect(said()).toBe("Did CheckInData. Validate checks it in your data.");
  });

  it("a rule begun on the canvas opens the builder with its class at the other end, once (AC-11)", async () => {
    await show(rulesOf([]));
    await act(async () => projectStore.startRule(EX + "Order", EX + "OrderLine"));
    const group = screen.getByRole("group", { name: "Every Order has at least one … that is an Order line" });
    expect((within(group).getByRole("combobox", { name: "That is a (class)" }) as HTMLSelectElement).value).toBe(EX + "OrderLine");
    expect(projectStore.getSnapshot().ruleDraft).toBeNull();
  });

  it("a canvas draft keeps its class when the relationship is chosen (code review)", async () => {
    await show(rulesOf([]));
    await act(async () => projectStore.startRule(EX + "Order", EX + "OrderLine"));
    fireEvent.change(screen.getByRole("combobox", { name: "Relationship or attribute" }), { target: { value: EX + "hasLine" } });
    expect((screen.getByRole("combobox", { name: "That is a (class)" }) as HTMLSelectElement).value).toBe(EX + "OrderLine");
    expect(screen.getByRole("group").getAttribute("aria-label")).toBe("Every Order has at least one line that is an Order line");
  });

  it("a canvas draft arriving while the builder is open starts it afresh (code review)", async () => {
    await show(rulesOf([]));
    fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Rule" }), { target: { value: "disjoint" } });
    await act(async () => projectStore.startRule(EX + "Order", EX + "Person"));
    expect((screen.getByRole("combobox", { name: "That is a (class)" }) as HTMLSelectElement).value).toBe(EX + "Person");
    expect(projectStore.getSnapshot().ruleDraft).toBeNull();
  });

  it("never disables a control: every one keeps its focus (aria-disabled)", async () => {
    await show(rulesOf([some(), disjoint]));
    fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));
    expect(document.querySelectorAll(".rules-block [disabled]").length).toBe(0);
  });
});

it("restores keyboard focus when the closing builder DOM commit completes", async () => {
  await show(rulesOf([]));
  fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Rule" }), { key: "Escape" });
  // The replacement button must be focused once React has committed it: a
  // zero-delay timer can run before that button exists under concurrent work.
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add a rule" }));
});


it("switches rule editing controls without changing the selected identifiers or count draft", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  await act(async () => { render(<I18nProvider><UiLanguageSelect /><Harness initial={rulesOf([])} /></I18nProvider>); });
  fireEvent.click(screen.getByRole("button", { name: "ルールを追加" }));
  const group = screen.getByRole("group", { name: "すべてのOrderは…" });
  fireEvent.change(within(group).getByRole("combobox", { name: "関係または属性" }), { target: { value: EX + "hasLine" } });
  fireEvent.change(within(group).getByRole("combobox", { name: "成立する条件" }), { target: { value: "atLeast" } });
  const count = within(group).getByRole("spinbutton", { name: "件数（0〜1,000）" });
  fireEvent.change(count, { target: { value: "3" } });
  expect(group.getAttribute("aria-label")).toBe("すべてのOrderは「has line」の値を3件以上持ちます");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("group", { name: "Every Order has at least 3 lines" })).toBe(group);
  expect(within(group).getByRole("spinbutton", { name: "How many (0 to 1,000)" })).toBe(count);
  expect((count as HTMLInputElement).value).toBe("3");
  expect(runCommand).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(within(group).getByRole("button", { name: "Add" })));
  expect(runCommand.mock.calls[0].slice(1)).toEqual(["model", "AddRestriction", { class: EX + "Order", form: "every", property: EX + "hasLine", kind: "atLeast", filler: null, n: 3 }]);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("rewords existing rules and capped choices while preserving the underlying rules", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const rules = rulesOf([some(), disjoint], { choices: { ...CHOICES, properties: { ...CHOICES.properties, total: 500 } } });
  const original = JSON.stringify(rules);
  await act(async () => { render(<I18nProvider><UiLanguageSelect /><Harness initial={rules} /></I18nProvider>); });
  expect(screen.getByRole("region", { name: "すべてのOrderに成立するルール" })).toBeTruthy();
  expect(screen.getByText("すべてのOrderは「has line」でOrder lineに少なくとも1件結び付きます")).toBeTruthy();
  expect(screen.getByText("OrderはPersonとは重なりません")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "ルールを追加" }));
  expect(screen.getByText("関係と属性500件のうち先頭1件を表示しています。他の項目のルールはTurtleで記述してください。")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText("No Order is a Person")).toBeTruthy();
  expect(screen.getByText("Showing the first 1 of 500 relationships and attributes; write a rule on another in Turtle.")).toBeTruthy();
  expect(JSON.stringify(rules)).toBe(original);
  expect(runCommand).not.toHaveBeenCalled();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});


function NoticeProbe() {
  const snapshot = useProjectStore();
  const { locale, t } = useI18n();
  return <output data-testid="notice"><span key={snapshot.announcement.id}>{renderProjectAnnouncement(snapshot.announcement, locale, t)}</span></output>;
}

it.each(["add", "change", "remove"] as const)("retains %s rule facts through a pending command and later UI changes", async action => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const initial = rulesOf(action === "add" ? [] : [some()]);
  initial.choices = { ...CHOICES, properties: { items: [...CHOICES.properties.items, { iri: EX + "Hidden", label: "HIDDEN-CHOICE-LABEL", kind: "relationship" }], total: 500 } };
  let finish!: (value: unknown) => void;
  runCommand.mockImplementationOnce(() => new Promise(done => { finish = done; }));
  const words = { add: ["Added", "added_restriction", "Added a rule on has line to Order"], change: ["Changed", "changed_restriction", "Changed a rule on has line of Order"], remove: ["Removed", "removed_restriction", "Removed a rule on has line from Order"] }[action];
  const state = { ...EMPTY_BUILDER, property: EX + "hasLine", kind: "atLeast" as const, n: "3" };
  await act(async () => { render(<I18nProvider><UiLanguageSelect /><NoticeProbe /><Harness initial={initial} /></I18nProvider>); });
  if (action === "remove") {
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^削除：/ })); });
  } else {
    fireEvent.click(screen.getByRole("button", { name: action === "add" ? "ルールを追加" : /^編集：/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "関係または属性" }), { target: { value: EX + "hasLine" } });
    fireEvent.change(screen.getByRole("combobox", { name: "成立する条件" }), { target: { value: "atLeast" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "件数（0〜1,000）" }), { target: { value: "3" } });
    // Remove the optional qualifier so the exact draft is three unqualified values.
    const qualifier = screen.getByRole("combobox", { name: /クラス|種類|値の型/ });
    fireEvent.change(qualifier, { target: { value: "" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: action === "add" ? "追加" : "ルールを保存" })); });
  }
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  await act(async () => { finish({ revision: 3, label: words[2], uiMessage: { code: `command.${words[1]}`, args: { property: "has line", name: "Order" } }, state: STATE }); });
  const english = action === "remove" ? itemSentence("Order", some(), "en")! : builderSentence("Order", state, CHOICES, "en");
  const japanese = action === "remove" ? itemSentence("Order", some(), "ja")! : builderSentence("Order", state, CHOICES, "ja");
  expect(screen.getByTestId("notice").textContent).toBe(`${words[0]}: ${english}. ${words[2]}.`);
  const notice = projectStore.getSnapshot().announcement;
  const span = screen.getByTestId("notice").firstElementChild;
  fireEvent.change(screen.getByRole("combobox", { name: "UI language" }), { target: { value: "ja" } });
  const operation = { add: "クラス「Order」へのhas lineに関する制約の追加", change: "クラス「Order」のhas lineに関する制約の変更", remove: "クラス「Order」からのhas lineに関する制約の削除" }[action];
  const prefix = { add: "ルールを追加しました", change: "ルールを変更しました", remove: "ルールを削除しました" }[action];
  expect(screen.getByTestId("notice").textContent).toBe(`${prefix}：${japanese}（${operation}）`);
  expect(projectStore.getSnapshot().announcement).toBe(notice);
  expect(screen.getByTestId("notice").firstElementChild).toBe(span);
  expect(JSON.stringify(notice)).not.toContain("HIDDEN-CHOICE-LABEL");
  expect(runCommand).toHaveBeenCalledTimes(1);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});


it.each(["known", "unknown", "newline"] as const)("keeps a %s warning as facts and never reannounces on a UI-only change", async mode => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  await act(async () => { render(<I18nProvider><UiLanguageSelect /><NoticeProbe /><Harness initial={rulesOf([])} /></I18nProvider>); });
  const warning = { text: mode === "newline" ? "Original <b>{name}\nsecond line" : "Original <b>{name} warning",
    ...(mode === "known" ? { uiMessage: { code: "validation.min_count", args: { name: "対象 <img>{name}", count: 2 } } } : {}),
  };
  await refetch(rulesOf([], { warnings: [warning] }));
  const notice = projectStore.getSnapshot().announcement;
  expect(screen.getByTestId("notice").textContent).toBe(mode === "known" ? "注意：「対象 <img>{name}」には2件以上の値が必要です。" : "注意：1件の注意事項があります。詳細を確認してください。");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByTestId("notice").textContent).toBe(mode === "known" ? "Warning: 対象 <img>{name} needs at least 2 values." : `Warning: ${warning.text}`);
  expect(notice.text).toBe(`Warning: ${warning.text}`);
  expect(projectStore.getSnapshot().announcement).toBe(notice);
  await refetch(rulesOf([], { warnings: [{ ...warning }] }));
  expect(projectStore.getSnapshot().announcement).toBe(notice);
  expect(runCommand).not.toHaveBeenCalled();
  expect(screen.getByTestId("notice").querySelector("b,img")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});
