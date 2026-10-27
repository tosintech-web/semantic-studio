// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/OrganizationForm.test.tsx
SUMMARY
    Checks government registration with explicit country authority and dates.
BASIC IDEA
    Exercise native form controls and the real project command runner against
    typed API doubles, including a refusal that must preserve the draft.
INPUTS / INPUT SOURCES
    Synthetic domain schema, country candidate page and command results.
EXPECTED OUTPUT
    No country-free registration and no lost draft after a stale selection.
================================================================================
*/
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderEn as render } from "../testutils/i18n";
import { BASIS, changed, opened, PAGE, PID, COUNTRY_IRI, VIEW, UNKNOWN } from "../testutils/government";
import { projectStore } from "../state/projectStore";
import OrganizationForm from "./OrganizationForm";

const mocks = vi.hoisted(() => ({ openProject: vi.fn(), runCommand: vi.fn(), listData: vi.fn(), getCountryChoices: vi.fn(), getGovernmentView: vi.fn() }));
vi.mock("../api", async original => ({ ...(await original<typeof import("../api")>()), ...mocks }));
beforeEach(async () => {
  projectStore._reset();
  Object.values(mocks).forEach(mock => mock.mockReset());
  mocks.openProject.mockResolvedValue(opened("government-organizations-v1"));
  mocks.runCommand.mockResolvedValue(changed());
  mocks.listData.mockResolvedValue({ generation: 0, snapshots: [] });
  mocks.getCountryChoices.mockResolvedValue(PAGE);
  mocks.getGovernmentView.mockResolvedValue(VIEW);
  await projectStore.open(PID);
});
afterEach(() => { cleanup(); projectStore._reset(); });

it("registers the selected country, shared ORG kind and explicitly unknown periods", async () => {
  const onSaved = vi.fn();
  render(<OrganizationForm projectId={PID} onSaved={onSaved} onCancel={vi.fn()} />);
  await screen.findByRole("option", { name: /Synthetic country/ });
  await screen.findByRole("option", { name: "Formal organization" });
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "Synthetic ministry" } });
  fireEvent.change(screen.getByLabelText("Source 1"), { target: { value: "Synthetic Act" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Choose country" }), { target: { value: COUNTRY_IRI } });
  fireEvent.click(screen.getByRole("button", { name: "Save government organization" }));
  await act(async () => {});
  expect(mocks.runCommand.mock.lastCall?.[3]).toMatchObject({ names: [{ value: "Synthetic ministry", language: "en" }], kind: "Organization", countryIri: COUNTRY_IRI, referenceBasis: BASIS, countryPeriod: UNKNOWN, existencePeriod: UNKNOWN });
  expect(onSaved).toHaveBeenCalledTimes(1);
});

it("does not submit while the country is missing", async () => {
  mocks.getCountryChoices.mockResolvedValue({ ...PAGE, items: [], total: 0 });
  render(<OrganizationForm projectId={PID} onSaved={vi.fn()} onCancel={vi.fn()} />);
  await screen.findByText(/No matching countries/);
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "No country" } });
  fireEvent.change(screen.getByLabelText("Source 1"), { target: { value: "Synthetic Act" } });
  const button = screen.getByRole("button", { name: "Save government organization" });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(button);
  expect(mocks.runCommand).not.toHaveBeenCalled();
});

it("keeps draft input after stale refusal and requires explicit reselection", async () => {
  mocks.runCommand.mockRejectedValueOnce(Object.assign(new Error("Country source changed"), { status: 409, uiMessage: { code: "government.reference_stale", args: {} } }));
  render(<OrganizationForm projectId={PID} onSaved={vi.fn()} onCancel={vi.fn()} />);
  await screen.findByRole("option", { name: /Synthetic country/ });
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "Retained ministry" } });
  fireEvent.change(screen.getByLabelText("Source 1"), { target: { value: "Retained source" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Choose country" }), { target: { value: COUNTRY_IRI } });
  fireEvent.click(screen.getByRole("button", { name: "Save government organization" }));
  await screen.findByRole("alert");
  expect(screen.getByDisplayValue("Retained ministry")).toBeTruthy();
  expect(screen.getByDisplayValue("Retained source")).toBeTruthy();
  mocks.getCountryChoices.mockResolvedValue({ ...PAGE, basis: { ...BASIS, sourceToken: "source-b" } });
  fireEvent.click(screen.getByRole("button", { name: "Refresh countries" }));
  await act(async () => {});
  expect(mocks.runCommand.mock.lastCall?.[3].referenceBasis.sourceToken).toBe("source-a");
  fireEvent.change(screen.getByRole("combobox", { name: "Choose country" }), { target: { value: COUNTRY_IRI } });
  fireEvent.click(screen.getByRole("button", { name: "Save government organization" }));
  await act(async () => {});
  expect(mocks.runCommand.mock.lastCall?.[3].referenceBasis.sourceToken).toBe("source-b");
});
