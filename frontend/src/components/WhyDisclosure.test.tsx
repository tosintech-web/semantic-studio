// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/WhyDisclosure.test.tsx
================================================================================

SUMMARY
    Why? (axioms-and-reasoning 5.6, AC-5): a disclosure that asks for the
    reason only when opened, lists its premises each marked stated or
    inferred in words, offers an inferred premise its own Why?, shows a
    class's rule as a sentence with no link, and says when there is no
    plain reason.

BASIC IDEA
    Display metadata translates retained results and accessible labels without
    changing selection IRIs, open details, focus or the original fetched data.

    Failed reads preserve original details across locale changes, and a pending
    response cannot migrate to another project's disclosure.

    api.ts is mocked; each test hands getWhy the reasons a server would
    give, and walks the disclosure open, then a nested one.

INPUTS / INPUT SOURCES
    - A mocked getWhy.

EXPECTED OUTPUT
    - Pass/fail.
================================================================================
*/

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import type { WhyReason } from "../types";
import WhyDisclosure from "./WhyDisclosure";

const { getWhy } = vi.hoisted(() => ({ getWhy: vi.fn() }));
vi.mock("../api", () => ({ getWhy }));

const X = "http://example.org/shop#";
const T = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const MANAGER: WhyReason = {
  family: "defining",
  sentence: "Alice is a Person and Alice manages bob ..., and a Manager is exactly a Person that manages at least one Employee",
  premises: [
    { s: `${X}alice`, p: T, o: `${X}Person`, sentence: "Alice is a Person", inferred: true },
    { s: `${X}alice`, p: `${X}manages`, o: `${X}bob`, sentence: "Alice manages bob", inferred: false },
    {
      s: `${X}Manager`,
      p: "http://www.w3.org/2002/07/owl#equivalentClass",
      o: null,
      sentence: "a Manager is exactly a Person that manages at least one Employee",
      inferred: false,
    },
  ],
};

const PERSON: WhyReason = {
  family: "domainRange",
  sentence: "Alice works for Acme, and whoever works for something is a Person",
  premises: [
    { s: `${X}alice`, p: `${X}worksFor`, o: `${X}acme`, sentence: "Alice works for Acme", inferred: false },
    {
      s: `${X}worksFor`,
      p: "http://www.w3.org/2000/01/rdf-schema#domain",
      o: `${X}Person`,
      sentence: "whoever works for something is a Person",
      inferred: false,
    },
  ],
};

// Braced: a function returned from beforeEach is run as its cleanup.
beforeEach(() => {
  getWhy.mockReset();
});
afterEach(cleanup);

async function open(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

describe("Why? (5.6)", () => {
  it("is a disclosure that asks for its reason only when first opened", async () => {
    getWhy.mockResolvedValue(MANAGER);
    const onSelect = vi.fn();
    render(
      <WhyDisclosure
        projectId="prj-1"
        fact={{ s: `${X}alice`, p: T, o: `${X}Manager` }}
        label="Alice is a Manager"
        onSelect={onSelect}
      />,
    );
    const button = screen.getByRole("button", { name: "Why? Alice is a Manager" });
    expect(button.textContent).toBe("Why?");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(getWhy).not.toHaveBeenCalled();
    await open(button);
    expect(getWhy).toHaveBeenCalledWith("prj-1", { s: `${X}alice`, p: T, o: `${X}Manager` });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const region = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(region).toBeTruthy();
    expect(within(region).getByText("Because:")).toBeTruthy();
    // Each premise marked in words; a rule is a sentence, stated, no Why?.
    const lines = within(region).getAllByRole("listitem");
    expect(lines.map((li) => li.querySelector(".why-mark")!.textContent)).toEqual(["inferred", "stated", "stated"]);
    expect(within(lines[1]).queryByRole("button", { name: /^Why\?/ })).toBeNull();
    expect(within(lines[2]).queryByRole("button", { name: /^Why\?/ })).toBeNull();
    // A premise's sentence selects its entity.
    fireEvent.click(within(lines[1]).getByRole("button", { name: "Alice manages bob" }));
    expect(onSelect).toHaveBeenCalledWith(`${X}alice`);
    // Closed and opened again: no second request.
    await open(button);
    await open(button);
    expect(getWhy).toHaveBeenCalledTimes(1);
  });

  it("gives an inferred premise its own Why?, walking back one step at a time", async () => {
    getWhy.mockImplementation(async (_pid: string, fact: { o: string }) => (fact.o === `${X}Manager` ? MANAGER : PERSON));
    render(<WhyDisclosure projectId="prj-1" fact={{ s: `${X}alice`, p: T, o: `${X}Manager` }} label="Alice is a Manager" />);
    await open(screen.getByRole("button", { name: "Why? Alice is a Manager" }));
    const nested = screen.getByRole("button", { name: "Why? Alice is a Person" });
    expect(nested.getAttribute("aria-expanded")).toBe("false");
    await open(nested);
    expect(getWhy).toHaveBeenLastCalledWith("prj-1", { s: `${X}alice`, p: T, o: `${X}Person` });
    const region = document.getElementById(nested.getAttribute("aria-controls")!)!;
    expect(within(region).getByText("Alice works for Acme")).toBeTruthy();
    expect(within(region).getByText("whoever works for something is a Person")).toBeTruthy();
  });

  it("says when there is no plain reason, and when a fact was stated", async () => {
    getWhy.mockResolvedValue({
      family: null,
      sentence: "Concluded by the reasoner (OWL 2 RL); Semantic Studio has no plain-words reason for this one.",
      premises: [],
    });
    render(<WhyDisclosure projectId="prj-1" fact={{ s: "a", p: "p", o: "b" }} label="a p b" />);
    await open(screen.getByRole("button", { name: "Why? a p b" }));
    expect(screen.getByText(/has no plain-words reason for this one/)).toBeTruthy();
    cleanup();
    getWhy.mockResolvedValue({ family: "stated", sentence: "Alice manages bob (stated).", premises: [] });
    render(<WhyDisclosure projectId="prj-1" fact={{ s: "a", p: "p", o: "b" }} label="a p b" />);
    await open(screen.getByRole("button", { name: "Why? a p b" }));
    expect(screen.getByText("Alice manages bob (stated).")).toBeTruthy();
  });

  it("says what went wrong when the reason cannot be read", async () => {
    getWhy.mockRejectedValue(new Error("That fact is not in the last result."));
    render(<WhyDisclosure projectId="prj-1" fact={{ s: "a", p: "p", o: "b" }} label="a p b" />);
    await open(screen.getByRole("button", { name: "Why? a p b" }));
    expect(screen.getByRole("alert").textContent).toBe("The operation could not be completed. Check the details.");
    expect(screen.getByText("That fact is not in the last result.").closest("details")).toBeTruthy();
  });
});


it("keeps the loaded reason open when labels and premise marks change language", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  getWhy.mockResolvedValue(MANAGER);
  render(<I18nProvider><UiLanguageSelect /><WhyDisclosure projectId="prj-1" fact={{ s: "a", p: "p", o: "b" }} label="Alice is a Manager" /></I18nProvider>);
  const button = screen.getByRole("button", { name: "根拠：Alice is a Manager" });
  await open(button);
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText("根拠となる記述：")).toBeTruthy();
  expect(document.querySelector(".why-mark")?.textContent).toBe("推論結果");
  const region = document.getElementById(button.getAttribute("aria-controls")!);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("button", { name: "Why? Alice is a Manager" })).toBe(button);
  expect(document.getElementById(button.getAttribute("aria-controls")!)).toBe(region);
  expect(document.querySelector(".why-mark")?.textContent).toBe("inferred");
  expect(getWhy).toHaveBeenCalledTimes(1);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});


it.each([true, false])("retains the original failed reason and renders its metadata at the current UI locale (known=%s)", async (known) => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const original = "理由 <img src=x> {name}";
  const cause = Object.assign(new Error(original), { uiMessage: known
    ? { code: "reasoning.failed", args: {} } : { code: "future.reason", args: {} } });
  getWhy.mockRejectedValue(cause);
  render(<I18nProvider><UiLanguageSelect /><WhyDisclosure projectId="one" fact={{ s: "a", p: "p", o: "b" }} label="記述" /></I18nProvider>);
  await open(screen.getByRole("button", { name: "根拠：記述" }));
  const alert = screen.getByRole("alert");
  expect(alert.textContent).toBe(known ? "推論中にエラーが発生して停止しました。詳細を確認してください。" : "操作を完了できませんでした。詳細を確認してください。");
  const details = screen.getByText(original).closest("details")!;
  expect(details).toBeTruthy(); details.open = true;
  const summary = within(details).getByText("技術的な詳細"); summary.focus();
  expect(details.querySelector("img")).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("alert")).toBe(alert);
  expect(alert.textContent).toBe(known ? "The reasoner stopped with an error. Check the original details." : "The operation could not be completed. Check the details.");
  expect(screen.getByText(original).closest("details")).toBe(details);
  expect(details.open).toBe(true); expect(document.activeElement).toBe(summary);
  expect(getWhy).toHaveBeenCalledTimes(1);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it.each([
  ["resolve", "project"], ["reject", "project"], ["resolve", "fact"], ["reject", "fact"],
])("does not carry a pending reason into another target (%s, %s)", async (ending, target) => {
  let resolve!: (reason: WhyReason) => void;
  let reject!: (error: Error) => void;
  getWhy.mockReturnValueOnce(new Promise<WhyReason>((ok, no) => { resolve = ok; reject = no; }));
  const props = { fact: { s: "a", p: "p", o: "b" }, label: "fact" };
  const view = render(<WhyDisclosure projectId="one" {...props} />);
  await open(screen.getByRole("button", { name: "Why? fact" }));
  const next = { ...props, projectId: target === "project" ? "two" : "one", fact: { ...props.fact, o: target === "fact" ? "c" : "b" } };
  view.rerender(<WhyDisclosure {...next} />);
  expect(screen.getByRole("button", { name: "Why? fact" }).getAttribute("aria-expanded")).toBe("false");
  await act(async () => { ending === "resolve" ? resolve(MANAGER) : reject(new Error("old failure")); });
  expect(screen.queryByText(MANAGER.premises[0].sentence)).toBeNull();
  expect(screen.queryByText("old failure")).toBeNull();
  getWhy.mockResolvedValueOnce(PERSON);
  await open(screen.getByRole("button", { name: "Why? fact" }));
  expect(getWhy).toHaveBeenLastCalledWith(next.projectId, next.fact);
  expect(screen.getByText("Alice works for Acme")).toBeTruthy();
});


it("translates a loaded premise and its nested Why label while retaining the fetched reason", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const premise = { ...MANAGER.premises[0], uiMessage: { code: "reasoning.fact.type", args: { s: [{ text: "対象" }], o: [{ text: "分類" }] } } };
  getWhy.mockResolvedValue({ ...MANAGER, premises: [premise] });
  render(<I18nProvider><UiLanguageSelect /><WhyDisclosure projectId="one" fact={{ s: "a", p: "p", o: "b" }} label="記述" /></I18nProvider>);
  await open(screen.getByRole("button", { name: "根拠：記述" }));
  const nested = screen.getByRole("button", { name: "根拠：「対象」は「分類」の個体です。" });
  expect(screen.getByText(premise.sentence).closest("details")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("button", { name: "Why? 対象 is an instance of 分類." })).toBe(nested);
  expect(screen.getByText("対象 is an instance of 分類.")).toBeTruthy(); expect(getWhy).toHaveBeenCalledTimes(1);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});
