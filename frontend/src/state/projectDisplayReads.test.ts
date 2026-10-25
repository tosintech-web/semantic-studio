// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/state/projectDisplayReads.test.ts
SUMMARY
    Read names follow the selected project language without repeating operations.
BASIC IDEA
    Hold real project-store results and control only API replies; resolve old
    reads after language changes, new checks or close/reopen of the same id.
INPUTS / INPUT SOURCES
    Bilingual synthetic result objects and deferred read/check responses.
EXPECTED OUTPUT
    Current-owner names, retained results on read failure and one check/run only.
================================================================================
*/
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReasoningResult, SnapshotListing, ValidationResult } from "../types";
const api = vi.hoisted(() => ({ openProject:vi.fn(), closeProject:vi.fn(), listData:vi.fn(),
  validateProject:vi.fn(), reasonProject:vi.fn(), getValidationResult:vi.fn(), getReasoningResult:vi.fn(), runCommand:vi.fn() }));
vi.mock("../api", async original => ({ ...await original<typeof import("../api")>(), ...api }));
import { projectStore } from "./projectStore";
const PID="prj-0123456789ab";
const project={id:PID,name:"Synthetic",createdAt:"",updatedAt:"",baseIri:"https://synthetic.example/",prefix:"ex",primaryLanguage:"en",languages:["ja"],documents:[{file:"model.ttl",role:"model"}],counts:{}};
const document={doc:"model",ontologyId:PID+"-model",revision:1,dirty:false,canUndo:false,canRedo:false,undoLabel:null,redoLabel:null,triples:12};
const enV: ValidationResult={stopped:false,statements:12,shapeCount:0,shapes:[],durationMs:1,revisions:{model:1,shapes:null,data:0}};
const jaV: ValidationResult={...enV,shapes:[]};
const enR: ReasoningResult={status:"done",key:"1",includeData:false,imports:false,basis:{revision:1,generation:0,imports:false},durationMs:1,statements:12,sentence:null,problems:[],groups:[],importedFacts:{kind:"imported",total:0,offset:0,items:[]},stale:false};
const jaR: ReasoningResult={...enR,groups:[]};
function deferred<T>() { let resolve!:(value:T)=>void; let reject!:(error:Error)=>void; const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;}); return {promise,resolve,reject}; }
beforeEach(async()=>{
  projectStore._reset();
  Object.values(api).forEach(mock=>mock.mockReset());
  api.openProject.mockResolvedValue({project,documents:[document],recovery:{available:false,draftTime:null}});
  api.closeProject.mockResolvedValue({closed:PID});
  api.listData.mockResolvedValue({generation:0,snapshots:[]});
  api.validateProject.mockResolvedValue(enV); api.reasonProject.mockResolvedValue(enR);
  api.getValidationResult.mockResolvedValue(jaV); api.getReasoningResult.mockResolvedValue(jaR);
  await projectStore.open(PID);
});
afterEach(()=>projectStore._reset());
async function initial() { await projectStore.validate(); await projectStore.reason(false,false); }

it("refreshes only result reads, preserving primary, documents, run token and notice identity",async()=>{
  await initial(); const before=projectStore.getSnapshot();
  projectStore.setDisplayLanguage("ja"); const notice=projectStore.getSnapshot().announcement.id;
  await vi.waitFor(()=>expect(projectStore.getSnapshot().reasoning).toBe(jaR));
  const now=projectStore.getSnapshot();
  expect(now.validation).toBe(jaV); expect(now.project?.primaryLanguage).toBe("en");
  expect(now.documents).toBe(before.documents); expect(now.reasoningToken).toBe(before.reasoningToken);
  expect(now.announcement.id).toBe(notice);
  expect(api.getValidationResult).toHaveBeenCalledWith(PID,"ja");
  expect(api.getReasoningResult).toHaveBeenCalledWith(PID,false,"ja");
  expect(api.validateProject).toHaveBeenCalledTimes(1); expect(api.reasonProject).toHaveBeenCalledTimes(1);
});

it("ignores an older language reply after a newer choice",async()=>{
  await initial(); const v=deferred<ValidationResult>(),r=deferred<ReasoningResult>();
  api.getValidationResult.mockReturnValueOnce(v.promise).mockResolvedValue(enV);
  api.getReasoningResult.mockReturnValueOnce(r.promise).mockResolvedValue(enR);
  projectStore.setDisplayLanguage("ja");
  await vi.waitFor(()=>expect(api.getValidationResult).toHaveBeenCalledTimes(1));
  projectStore.setDisplayLanguage("en");
  await vi.waitFor(()=>expect(api.getValidationResult).toHaveBeenCalledTimes(2));
  v.resolve(jaV); r.resolve(jaR); await Promise.resolve(); await Promise.resolve();
  expect(projectStore.getSnapshot().validation).toBe(enV); expect(projectStore.getSnapshot().reasoning).toBe(enR);
});

it("ignores a read that outlives closing and reopening the same project",async()=>{
  await initial(); const v=deferred<ValidationResult>(),r=deferred<ReasoningResult>();
  api.getValidationResult.mockReturnValue(v.promise); api.getReasoningResult.mockReturnValue(r.promise);
  projectStore.setDisplayLanguage("ja");
  await vi.waitFor(()=>expect(api.getValidationResult).toHaveBeenCalledTimes(1));
  await projectStore.close(true); await projectStore.open(PID);
  v.resolve(jaV);r.resolve(jaR);await Promise.resolve();await Promise.resolve();
  expect(projectStore.getSnapshot().validation).toBeNull();expect(projectStore.getSnapshot().reasoning).toBeNull();
});

it("retains the affected result and original cause on a name-read failure",async()=>{
  await initial(); api.getReasoningResult.mockRejectedValue(new Error("Original read <img>{raw}"));
  projectStore.setDisplayLanguage("ja");
  await vi.waitFor(()=>expect(projectStore.getSnapshot().resultReadError).toBeTruthy());
  expect(projectStore.getSnapshot().validation).toBe(jaV);expect(projectStore.getSnapshot().reasoning).toBe(enR);
  expect(projectStore.getSnapshot().resultReadError?.message).toBe("Original read <img>{raw}");
  expect(api.reasonProject).toHaveBeenCalledTimes(1);
});

it("reads the latest language when a check finishes after the language was changed",async()=>{
  const v=deferred<ValidationResult>();api.validateProject.mockReturnValueOnce(v.promise);
  const pending=projectStore.validate();projectStore.setDisplayLanguage("ja");
  v.resolve(enV);await pending;
  await vi.waitFor(()=>expect(projectStore.getSnapshot().validation).toBe(jaV));
  expect(api.validateProject).toHaveBeenCalledWith(PID,"en");expect(api.validateProject).toHaveBeenCalledTimes(1);
});


it("does not report an older name-read failure over a newer successful run",async()=>{
  await initial();const old=deferred<ReasoningResult>();
  api.getReasoningResult.mockReturnValueOnce(old.promise);
  projectStore.setDisplayLanguage("ja");
  await vi.waitFor(()=>expect(api.getReasoningResult).toHaveBeenCalledTimes(1));
  const fresh={...jaR,groups:[]};api.reasonProject.mockResolvedValueOnce(fresh);
  await projectStore.reason(false,false);
  old.reject(new Error("Old read failure"));
  await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  expect(projectStore.getSnapshot().reasoning).toBe(fresh);
  expect(projectStore.getSnapshot().resultReadError).toBeNull();
});


it("refreshes snapshot names on a display choice and ignores the older language response", async () => {
  const older = deferred<SnapshotListing>();
  const current: SnapshotListing = { generation: 7, snapshots: [] };
  api.listData.mockReturnValueOnce(older.promise).mockResolvedValue(current);
  const pending = projectStore.loadData();
  projectStore.setDisplayLanguage("ja");
  await vi.waitFor(() => expect(projectStore.getSnapshot().data).toBe(current));
  older.resolve({ generation: 3, snapshots: [] }); await pending;
  expect(projectStore.getSnapshot().data).toBe(current);
  expect(api.listData).toHaveBeenLastCalledWith(PID,"ja");
  expect(api.validateProject).not.toHaveBeenCalled(); expect(api.reasonProject).not.toHaveBeenCalled();
});

it("ignores a snapshot list from before closing and reopening the same project", async () => {
  const older = deferred<SnapshotListing>();
  api.listData.mockReturnValueOnce(older.promise);
  const pending = projectStore.loadData();
  await projectStore.close(true);
  const current: SnapshotListing = { generation: 9, snapshots: [] };
  api.listData.mockResolvedValueOnce(current);
  await projectStore.open(PID);
  await vi.waitFor(() => expect(projectStore.getSnapshot().data).toBe(current));
  older.resolve({ generation: 2, snapshots: [] }); await pending;
  expect(projectStore.getSnapshot().data).toBe(current);
});

it("ignores an older snapshot-read failure after a newer listing succeeds", async () => {
  const older = deferred<SnapshotListing>();
  api.listData.mockReturnValueOnce(older.promise);
  const pending = projectStore.loadData();
  const current: SnapshotListing = { generation: 8, snapshots: [] };
  api.listData.mockResolvedValueOnce(current);
  await projectStore.loadData();
  const notice = projectStore.getSnapshot().announcement.id;
  older.reject(new Error("Old list error"));
  await expect(pending).resolves.toBeNull();
  expect(projectStore.getSnapshot().data).toBe(current);
  expect(projectStore.getSnapshot().dataError).toBeNull();
  expect(projectStore.getSnapshot().announcement.id).toBe(notice);
});


it("issues commands in the chosen display language while retaining primary-language write arguments", async () => {
  projectStore.setDisplayLanguage("ja");
  const args = { iri: "https://synthetic.example/C", value: "Synthetic primary comment", lang: "en" };
  api.runCommand.mockImplementation(async (_pid,_doc,_name,_args,language) => ({ revision:2,label:"Set comment of Class C (en)",
    state:{...document,revision:2,dirty:true},
    uiMessage:{code:"command.set_comment",args:{name:language === "ja" ? "分類C" : "Class C",language:"en"}} }));
  await projectStore.command("SetComment",args);
  expect(api.runCommand).toHaveBeenCalledWith(PID,"model","SetComment",args,"ja");
  expect(projectStore.getSnapshot().announcement.detail).toMatchObject({ kind:"change",uiMessage:{args:{name:"分類C",language:"en"}} });
  expect(projectStore.getSnapshot().project?.primaryLanguage).toBe("en");
});
