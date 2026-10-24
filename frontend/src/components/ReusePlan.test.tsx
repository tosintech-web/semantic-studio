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
    Localized choices with no refetch, lost draft or rewritten command argument.
================================================================================
*/
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
