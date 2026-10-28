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

it('synchronizes an untouched country connection with refreshed accepted metadata',async()=>{
 const first=opened('government-organizations-v1').project;
 const next={...first,domainProfile:{...first.domainProfile!,countryProjectId:'prj-333333333333'}};
 const sources=[opened('countries-v1',BASIS.sourceProjectId).project,opened('countries-v1','prj-333333333333').project];
 const props={projects:sources,language:'en',onProjectsChanged:vi.fn()};
 const ui=render(<GovernmentWorkspace {...props} project={first}/>);await act(async()=>{});
 ui.rerender(<GovernmentWorkspace {...props} project={next}/>);await act(async()=>{});
 expect((screen.getByRole('combobox',{name:'Country group'})as HTMLSelectElement).value).toBe('prj-333333333333');
 expect(projectStore.hasPendingForms()).toBe(false);
});
it('retains an intentional connection selection during accepted metadata refresh',async()=>{
 const first=opened('government-organizations-v1').project;
 const next={...first,domainProfile:{...first.domainProfile!,countryProjectId:'prj-333333333333'}};
 const sources=[BASIS.sourceProjectId,'prj-333333333333','prj-444444444444'].map(id=>opened('countries-v1',id).project);
 const props={projects:sources,language:'en',onProjectsChanged:vi.fn()};
 const ui=render(<GovernmentWorkspace {...props} project={first}/>);await act(async()=>{});
 fireEvent.change(screen.getByRole('combobox',{name:'Country group'}),{target:{value:'prj-444444444444'}});
 ui.rerender(<GovernmentWorkspace {...props} project={next}/>);await act(async()=>{});
 expect((screen.getByRole('combobox',{name:'Country group'})as HTMLSelectElement).value).toBe('prj-444444444444');
 expect(projectStore.hasPendingForms()).toBe(true);
});

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

it("owns government label responses by dictionary language independently of English UI", async () => {
  const project=opened("government-organizations-v1").project;
  let finishOld!:(value:unknown)=>void;
  mocks.getGovernmentView.mockReturnValueOnce(new Promise(resolve=>{finishOld=resolve;}));
  const row=(label:string)=>({...VIEW,organizations:{items:[{iri:'urn:org',label,existenceState:'active',nameConfirmed:true}],total:1,offset:0,limit:50}});
  mocks.getGovernmentView.mockResolvedValue(row('日本語組織'));
  const props={project,projects:[],onProjectsChanged:vi.fn()};
  const ui=render(<GovernmentWorkspace {...props} language="en"/>);
  await act(async()=>{});
  ui.rerender(<GovernmentWorkspace {...props} language="ja"/>);
  await screen.findByRole('button',{name:'日本語組織'});
  expect(mocks.getGovernmentView.mock.lastCall?.[2]).toMatchObject({displayLanguage:'ja'});
  await act(async()=>{finishOld(row('Old English name'));});
  expect(screen.queryByRole('button',{name:'Old English name'})).toBeNull();
  expect(screen.getByRole('button',{name:'New relationship'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'New relationship'}));await act(async()=>{});
  expect(mocks.getGovernmentView.mock.lastCall?.[2]).toMatchObject({displayLanguage:'ja'});
});
