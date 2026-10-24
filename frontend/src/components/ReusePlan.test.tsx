// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/ReusePlan.test.tsx
SUMMARY
    Reuse-plan language changes preserve the fetched plan and parent-name draft.
BASIC IDEA
    Render a synthetic RDFS sharing plan through the real locale provider,
    switch UI language while editing, and inspect the command's original facts.
INPUTS / INPUT SOURCES
    A mocked planShare result, original entity references and a command spy.
EXPECTED OUTPUT
    Localized choices and retained notices without refetch, lost draft, duplicate
    announcements or rewritten command arguments.
================================================================================
*/
import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { renderProjectAnnouncement, type ProjectNoticeDetail } from "../modeling/projectNotices";
import { makeKindOf, planAlready, givenAnnouncement, sharedAnnouncement } from "../modeling/sentences";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import ReusePlan from "./ReusePlan";
const { planShare } = vi.hoisted(() => ({ planShare: vi.fn() }));
vi.mock("../api", async (original) => ({ ...await original<typeof import("../api")>(), planShare }));
afterEach(cleanup);
it("keeps a shared-parent draft on UI switch and submits its exact name", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const property = { iri: "https://example.test/p", label: "hasName" };
  const cls = { iri: "https://example.test/b", label: "Team" };
  planShare.mockResolvedValue({ revision: 2, plan: {
    case: "D", property: { ...property, kind: "attribute" },
    domain: { form: "one", classes: [{ iri: "https://example.test/a", label: "Employee", type: "rdfs" }] },
    choices: { subclass: false, union: false, parent: true, up: [] }, imported: [], turtle: null,
  } });
  const run = vi.fn().mockResolvedValue({ revision: 3 });
  const done = vi.fn();
  render(<I18nProvider><UiLanguageSelect /><ReusePlan pid="prj-synthetic" ontologyId="model" property={property} cls={cls}
    runner={{ busy: false, errors: {}, run, clear: vi.fn(), alive: () => true }} onDone={done} onCancel={vi.fn()} />
  </I18nProvider>);
  const field = await screen.findByRole("textbox", { name: "Employee、Teamに共通する種類は何ですか？例：Worker" });
  fireEvent.change(field, { target: { value: "<b>従事者</b>" } });
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByRole("textbox", { name: "What is every Employee and Team? For example, Worker" })).toBe(field);
  expect((field as HTMLInputElement).value).toBe("<b>従事者</b>");
  expect(planShare).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Give Employee and Team this parent" }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(run).toHaveBeenCalledWith("reuse", "ShareDomain", { property: property.iri, class: cls.iri, how: "parent", parentLabel: "<b>従事者</b>" }, expect.any(Function));
});


it.each(["given", "shared", "subclass", "already"] as const)("retains %s reuse notice facts across UI changes without repeating plan or command", async mode => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const property = { iri: "https://example.test/p", label: "hasName <b>{p}" };
  const cls = { iri: "https://example.test/b", label: "Team" };
  const parent = { iri: "https://example.test/a", label: "Employee", type: "owl" };
  planShare.mockReset();
  planShare.mockResolvedValue({ revision: 2, plan: {
    case: mode === "given" ? "A" : mode === "already" ? "B" : "D", property: { ...property, kind: "attribute" },
    domain: { form: mode === "given" ? "none" : "one", classes: mode === "given" ? [] : [parent] },
    via: parent, choices: { subclass: mode === "subclass", union: mode === "shared", parent: false, up: [] }, imported: [], turtle: null,
  } });
  const run = vi.fn();
  const already = vi.fn();
  function Harness() {
    const [notice, setNotice] = useState<unknown>("");
    const { locale, t } = useI18n();
    run.mockImplementation(async (_field, _command, _args, announce) => {
      const result = { revision: 3, label: "Original operation" };
      setNotice(announce(result));
      return result;
    });
    return <><output data-testid="reuse-notice">{typeof notice === "string" ? notice : renderProjectAnnouncement({ text: "", id: 0, detail: notice as ProjectNoticeDetail }, locale, t)}</output>
      <ReusePlan pid="prj-synthetic" ontologyId="model" property={property} cls={cls}
        runner={{ busy: false, errors: {}, run, clear: vi.fn(), alive: () => true }} onDone={vi.fn()} onCancel={vi.fn()}
        onAlready={(text, facts) => { already(text); setNotice(facts ?? text); }} />
    </>;
  }
  render(<I18nProvider><UiLanguageSelect /><Harness /></I18nProvider>);
  if (mode === "already") await waitFor(() => expect(already).toHaveBeenCalledTimes(1));
  else {
    const name = mode === "given" ? "はい" : mode === "subclass" ? makeKindOf("Team", "Employee", "ja") : "共有する";
    fireEvent.click(await screen.findByRole("button", { name }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  }
  const expected = (locale: "ja" | "en") => mode === "given" ? givenAnnouncement(property.label, "Team", locale)
    : mode === "shared" ? sharedAnnouncement(property.label, ["Employee", "Team"], locale)
    : mode === "already" ? planAlready(property.label, "Team", "Employee", locale)
    : locale === "en" ? `Team is now a kind of Employee, and has ${property.label}.` : `TeamはEmployeeの下位クラスとなり、「${property.label}」を持つようになりました。`;
  expect(screen.getByTestId("reuse-notice").textContent).toBe(expected("ja"));
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByTestId("reuse-notice").textContent).toBe(expected("en"));
  expect(planShare).toHaveBeenCalledTimes(1);
  expect(run).toHaveBeenCalledTimes(mode === "already" ? 0 : 1);
  expect(already).toHaveBeenCalledTimes(mode === "already" ? 1 : 0);
  expect(screen.getByTestId("reuse-notice").querySelector("b")).toBeNull();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("does not repeat a no-change reuse notice when the same class props are recreated", async () => {
  const property = { iri: "https://example.test/p", label: "hasName" };
  const cls = { iri: "https://example.test/c", label: "Team" };
  planShare.mockReset();
  planShare.mockResolvedValue({ revision: 2, plan: {
    case: "B", property: { ...property, kind: "attribute" },
    domain: { form: "one", classes: [cls] }, via: cls,
    choices: { subclass: false, union: false, parent: false, up: [] }, imported: [], turtle: null,
  } });
  const already = vi.fn();
  const runner = { busy: false, errors: {}, run: vi.fn(), clear: vi.fn(), alive: () => true };
  const tree = () => <I18nProvider><ReusePlan pid="synthetic" ontologyId="model" property={{ ...property }} cls={{ ...cls }}
    runner={runner} onDone={vi.fn()} onCancel={vi.fn()} onAlready={already} /></I18nProvider>;
  const view = render(tree());
  await waitFor(() => expect(already).toHaveBeenCalledTimes(1));
  view.rerender(tree());
  expect(already).toHaveBeenCalledTimes(1);
  expect(planShare).toHaveBeenCalledTimes(1);
  expect(runner.run).not.toHaveBeenCalled();
});
