// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/GovernmentWorkspace.test.tsx
SUMMARY
    Proves group entry navigation, cancellation and reviewed country connection.
BASIC IDEA
    Keep the real project store/forms while API doubles supply synthetic groups.
INPUTS / INPUT SOURCES
    Paged entries, domain group summaries and exact metadata-preview tokens.
EXPECTED OUTPUT
    Drafts are confirmed before leaving and reference setup uses its review basis.
================================================================================
*/
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderEn as render } from "../testutils/i18n";
import { BASIS, changed, opened, PAGE, PID, VIEW } from "../testutils/government";
import { projectStore } from "../state/projectStore";
import GovernmentWorkspace from "./GovernmentWorkspace";

const mocks = vi.hoisted(() => ({ openProject: vi.fn(), runCommand: vi.fn(), listData: vi.fn(), getCountryChoices: vi.fn(), getGovernmentView: vi.fn(), previewDomainProfileChange: vi.fn(), updateProject: vi.fn() }));
vi.mock("../api", async original => ({ ...(await original<typeof import("../api")>()), ...mocks }));
beforeEach(async () => {
  projectStore._reset(); Object.values(mocks).forEach(mock => mock.mockReset());
  mocks.openProject.mockResolvedValue(opened()); mocks.runCommand.mockResolvedValue(changed());
  mocks.listData.mockResolvedValue({ generation: 0, snapshots: [] }); mocks.getCountryChoices.mockResolvedValue(PAGE); mocks.getGovernmentView.mockResolvedValue(VIEW);
  await projectStore.open(PID);
});
afterEach(() => { cleanup(); projectStore._reset(); vi.restoreAllMocks(); });

it("opens the country entry form and confirms before discarding input", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<GovernmentWorkspace project={opened().project} projects={[]} language="en" onProjectsChanged={vi.fn()} />);
  await screen.findByRole("button", { name: "Edit Synthetic country" });
  fireEvent.click(screen.getByRole("button", { name: "New country" }));
  fireEvent.change(screen.getByLabelText("Preferred name 1"), { target: { value: "Retained" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue("Retained")).toBeTruthy();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await screen.findByRole("button", { name: "New country" });
  expect(screen.queryByDisplayValue("Retained")).toBeNull();
});

it("reviews and confirms connection to an independent country group", async () => {
  const project = opened("government-organizations-v1").project;
  delete project.domainProfile!.countryProjectId;
  mocks.openProject.mockResolvedValue({ ...opened("government-organizations-v1"), project });
  await projectStore.open(PID);
  const source = opened("countries-v1", BASIS.sourceProjectId).project;
  mocks.previewDomainProfileChange.mockResolvedValue({ dryRun: true, basis: "settings-a", impact: { countryIris: [], unresolvedCountryIris: [] }, project });
  mocks.updateProject.mockResolvedValue({ ...project, domainProfile: { id: "government-organizations-v1", version: 1, countryProjectId: source.id } });
  render(<GovernmentWorkspace project={project} projects={[source]} language="en" onProjectsChanged={vi.fn()} />);
  const create = await screen.findByRole("button", { name: "New government organization" });
  expect(create.getAttribute("aria-disabled")).toBe("true");
  fireEvent.change(screen.getByRole("combobox", { name: "Country group" }), { target: { value: source.id } });
  fireEvent.click(screen.getByRole("button", { name: "Review country group change" }));
  await screen.findByRole("button", { name: "Apply connection" });
  fireEvent.click(screen.getByRole("button", { name: "Apply connection" }));
  await act(async () => {});
  expect(mocks.updateProject).toHaveBeenCalledWith(PID, { domainProfile: { id: "government-organizations-v1", version: 1, countryProjectId: source.id }, profileBasis: "settings-a" });
});

it("keeps the current group open when its referenced country group is unavailable", async () => {
  const project = opened("government-organizations-v1").project;
  const open = vi.fn();
  render(<GovernmentWorkspace project={project} projects={[]} language="en" onProjectsChanged={vi.fn()} onOpenProject={open} />);
  const button = await screen.findByRole("button", { name: "Open country group" });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(button);
  expect(open).not.toHaveBeenCalled();
});
