// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/CountryForm.test.tsx
SUMMARY
    Proves complete country entry, retained languages and faithful existing edits.
BASIC IDEA
    Keep the real project store and command runner, mocking only the API boundary.
INPUTS / INPUT SOURCES
    Complete synthetic project and country detail replies.
EXPECTED OUTPUT
    Names, aliases and sources are saved without loss or stale-owner callbacks.
================================================================================
*/
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderEn as render } from "../testutils/i18n";
import { changed, opened, PID, COUNTRY_IRI, DETAIL_PAGE } from "../testutils/government";
import { projectStore } from "../state/projectStore";
import { I18nProvider, useI18n } from "../i18n/I18nProvider";
import CountryForm from "./CountryForm";

const mocks = vi.hoisted(() => ({ openProject: vi.fn(), runCommand: vi.fn(), listData: vi.fn(), getCountryChoices: vi.fn() }));
vi.mock("../api", async original => ({ ...(await original<typeof import("../api")>()), ...mocks }));
beforeEach(async () => {
  projectStore._reset();
  Object.values(mocks).forEach(mock => mock.mockReset());
  mocks.openProject.mockResolvedValue(opened());
  mocks.runCommand.mockResolvedValue(changed());
  mocks.listData.mockResolvedValue({ generation: 0, snapshots: [] });
  mocks.getCountryChoices.mockResolvedValue(DETAIL_PAGE);
  await projectStore.open(PID);
});
afterEach(() => { cleanup(); projectStore._reset(); });

it("sends one country command with explicit names, code and sources", async () => {
  const onSaved = vi.fn();
  render(<CountryForm projectId={PID} onSaved={onSaved} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "Synthetic country" } });
  fireEvent.change(screen.getByLabelText("Country code"), { target: { value: "SYN" } });
  fireEvent.change(screen.getByLabelText("Source 1"), { target: { value: "Synthetic source" } });
  fireEvent.click(screen.getByRole("button", { name: "Save country" }));
  await act(async () => {});
  expect(mocks.runCommand).toHaveBeenCalledWith(PID, "model", "CreateCountry", expect.objectContaining({ names: [{ value: "Synthetic country", language: "en" }], code: "SYN", sources: [{ kind: "text", value: "Synthetic source" }] }), "en");
  expect(onSaved).toHaveBeenCalledWith("http://example.org/data#new");
});

it("keeps all existing languages and aliases when one name is edited", async () => {
  render(<CountryForm projectId={PID} targetIri={COUNTRY_IRI} onSaved={vi.fn()} onCancel={vi.fn()} />);
  const field = await screen.findByDisplayValue("Synthetic country");
  fireEvent.change(field, { target: { value: "Renamed" } });
  fireEvent.click(screen.getByRole("button", { name: "Save country" }));
  await act(async () => {});
  expect(mocks.runCommand.mock.lastCall?.[3]).toMatchObject({ iri: COUNTRY_IRI, names: [{ value: "Renamed", language: "en" }, { value: "合成国", language: "ja" }], aliases: [{ value: "Alternative", language: "en" }] });
});

function Japanese() { const { setLocale } = useI18n(); return <button onClick={() => setLocale("ja")}>日本語</button>; }
it("changes guidance language without replacing draft values or RDF language", async () => {
  localStorage.setItem("semantic-studio.uiLocale.v1", "en");
  render(<I18nProvider><Japanese /><CountryForm projectId={PID} onSaved={vi.fn()} onCancel={vi.fn()} /></I18nProvider>);
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "Keep this text" } });
  fireEvent.click(screen.getByRole("button", { name: "日本語" }));
  expect(screen.getByDisplayValue("Keep this text")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "国を保存" }));
  await act(async () => {});
  expect(mocks.runCommand.mock.lastCall?.[3].names).toEqual([{ value: "Keep this text", language: "en" }]);
});

it("registers unsent input and allows Escape to request cancellation", () => {
  const onCancel = vi.fn();
  render(<CountryForm projectId={PID} onSaved={vi.fn()} onCancel={onCancel} />);
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "Unsent" } });
  expect(projectStore.hasPendingForms()).toBe(true);
  fireEvent.keyDown(screen.getByLabelText("Preferred name 1"), { key: "Escape" });
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it("does not complete a create after its project owner changes", async () => {
  let resolve!: (value: ReturnType<typeof changed>) => void;
  mocks.runCommand.mockReturnValue(new Promise<ReturnType<typeof changed>>(done => { resolve = done; }));
  const onSaved = vi.fn();
  const view = render(<CountryForm projectId={PID} onSaved={onSaved} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "Old owner" } });
  fireEvent.click(screen.getByRole("button", { name: "Save country" }));
  const next = "prj-333333333333";
  mocks.openProject.mockResolvedValue(opened("countries-v1", next));
  await act(async () => { await projectStore.open(next); });
  view.rerender(<CountryForm projectId={next} onSaved={onSaved} onCancel={vi.fn()} />);
  await act(async () => resolve(changed()));
  expect(onSaved).not.toHaveBeenCalled();
  expect(projectStore.getSnapshot().project?.id).toBe(next);
});

it("retries a failed detail read without creating an entry", async () => {
  mocks.getCountryChoices.mockRejectedValueOnce(new Error("Read failed"));
  render(<CountryForm projectId={PID} targetIri={COUNTRY_IRI} onSaved={vi.fn()} onCancel={vi.fn()} />);
  const retry = await screen.findByRole("button", { name: "Retry" });
  fireEvent.click(retry);
  await screen.findByDisplayValue("合成国");
  expect(mocks.runCommand).not.toHaveBeenCalled();
});
