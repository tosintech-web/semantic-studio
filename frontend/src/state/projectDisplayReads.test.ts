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
import type { ChangeResult, ReasoningResult, SnapshotListing, ValidationResult } from "../types";
const api = vi.hoisted(() => ({ openProject:vi.fn(), closeProject:vi.fn(), listData:vi.fn(),
  validateProject:vi.fn(), reasonProject:vi.fn(), getValidationResult:vi.fn(), getReasoningResult:vi.fn(), runCommand:vi.fn(), undoChange:vi.fn(), redoChange:vi.fn(), applyDocumentSource:vi.fn(), saveDocument:vi.fn(), updateProject:vi.fn() }));
vi.mock("../api", async original => ({ ...await original<typeof import("../api")>(), ...api }));
import { projectStore } from "./projectStore";
const PID="prj-0123456789ab";
const project={id:PID,name:"Synthetic",createdAt:"",updatedAt:"",baseIri:"https://synthetic.example/",prefix:"ex",primaryLanguage:"en",languages:["ja"],documents:[{file:"model.ttl",role:"model"}],counts:{}};
const document={doc:"model" as const,ontologyId:PID+"-model",revision:1,dirty:false,canUndo:false,canRedo:false,undoLabel:null,redoLabel:null,triples:12};
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


it.each(["command", "undo", "redo", "apply", "save"] as const)("ignores an old %s response after the same project is reopened", async operation => {
  const old = deferred<ChangeResult>();
  const result: ChangeResult = { revision:9,label:"Old operation",state:{...document,revision:9,dirty:true} };
  api.runCommand.mockReturnValueOnce(old.promise);
  api.undoChange.mockReturnValueOnce(old.promise);
  api.redoChange.mockReturnValueOnce(old.promise);
  api.applyDocumentSource.mockReturnValueOnce(old.promise);
  api.saveDocument.mockReturnValueOnce(old.promise);
  projectStore.setEditorDraft("Old draft");
  const pending = operation === "command" ? projectStore.command("SetComment",{})
    : operation === "undo" ? projectStore.undo() : operation === "redo" ? projectStore.redo()
    : operation === "apply" ? projectStore.applyEditor() : projectStore.save();
  await projectStore.close(true);
  await projectStore.open(PID);
  projectStore.setEditorDraft("New session draft");
  const before = projectStore.getSnapshot();
  old.resolve(result); await pending;
  expect(projectStore.getSnapshot()).toBe(before);
});

it("rereads snapshot names after a model change and rejects the earlier list", async () => {
  const older = deferred<SnapshotListing>();
  api.listData.mockReturnValueOnce(older.promise);
  const pending = projectStore.loadData();
  const current: SnapshotListing = { generation:8,snapshots:[] };
  api.listData.mockResolvedValue(current);
  api.runCommand.mockResolvedValue({revision:2,label:"Renamed class",state:{...document,revision:2,dirty:true}});
  await projectStore.command("SetLabel",{iri:"https://synthetic.example/C",value:"New name",lang:"en"});
  await vi.waitFor(() => expect(projectStore.getSnapshot().data).toBe(current));
  older.resolve({generation:3,snapshots:[]}); await pending;
  expect(projectStore.getSnapshot().data).toBe(current);
});


it("does not continue Save all into a reopened project's documents", async () => {
  api.openProject.mockResolvedValueOnce({project,documents:[{...document,dirty:true},{...document,doc:"shapes",dirty:true}],recovery:{available:false,draftTime:null}});
  await projectStore.open(PID);
  const old = deferred<{savedAt:string;state:typeof document}>();
  api.saveDocument.mockResolvedValue({savedAt:"2026-10-25T00:00:00Z",state:document}).mockReturnValueOnce(old.promise);
  const pending = projectStore.saveAll();
  await projectStore.close(true); await projectStore.open(PID);
  old.resolve({savedAt:"2026-10-25T00:00:00Z",state:document}); await pending;
  expect(api.saveDocument).toHaveBeenCalledTimes(1);
});


it("ignores a first-shapes command's late document listing after reopening", async () => {
  const reading = deferred<{project:typeof project;documents:typeof document[];recovery:{available:boolean;draftTime:null}}>();
  api.runCommand.mockResolvedValue({revision:2,label:"Created shape",state:{...document,doc:"shapes",revision:2}});
  api.openProject.mockReturnValueOnce(reading.promise);
  const pending = projectStore.command("CreateShape",{},undefined,"shapes");
  await vi.waitFor(() => expect(api.openProject).toHaveBeenCalledTimes(2));
  await projectStore.close(true); await projectStore.open(PID);
  const before = projectStore.getSnapshot();
  reading.resolve({project,documents:[{...document,revision:9}],recovery:{available:false,draftTime:null}});
  await pending;
  expect(projectStore.getSnapshot()).toBe(before);
});

it("does not reread a known empty snapshot list on every model edit", async () => {
  await projectStore.loadData(); api.listData.mockClear();
  api.runCommand.mockResolvedValue({revision:2,label:"Renamed class",state:{...document,revision:2,dirty:true}});
  await projectStore.command("SetLabel",{});
  expect(api.listData).not.toHaveBeenCalled();
});

it("retains the edit announcement when a background snapshot-name refresh fails", async () => {
  const listing: SnapshotListing = {generation:1,snapshots:[{
    id:"synthetic-snapshot",source:"synthetic.csv",importedAt:"2026-10-25T00:00:00Z",rows:1,total:1,sample:false,
    enabled:true,className:"Class",classIri:"https://synthetic.example/C",individuals:1,statements:1,
    report:{rowsRead:1,total:1,sample:false,individuals:1,statements:1,skipped:{count:0,rows:[]},repeated:{count:0,rows:[]},keptAsText:[],empty:[],clean:true},
    mapping:{status:"ok",message:null},
  }]};
  api.listData.mockResolvedValueOnce(listing); await projectStore.loadData();
  api.listData.mockRejectedValueOnce(new Error("Original name-read failure"));
  api.runCommand.mockResolvedValue({revision:2,label:"Renamed class",state:{...document,revision:2,dirty:true}});
  await projectStore.command("SetLabel",{});
  await vi.waitFor(() => expect(projectStore.getSnapshot().dataError).not.toBeNull());
  expect(projectStore.getSnapshot().data).toBe(listing);
  expect(projectStore.getSnapshot().announcement.detail).toMatchObject({kind:"change",label:"Renamed class"});
});


it.each(["reload", "languages"] as const)("ignores an old %s settings response after reopening", async operation => {
  const old = deferred<unknown>();
  if(operation === "reload") api.openProject.mockReturnValueOnce(old.promise);
  else api.updateProject.mockReturnValueOnce(old.promise);
  const pending = operation === "reload" ? projectStore.reload() : projectStore.setLanguages(["fr"]);
  await projectStore.close(true); await projectStore.open(PID);
  const before = projectStore.getSnapshot();
  old.resolve(operation === "reload"
    ? {project:{...project,name:"Old project reading"},documents:[{...document,revision:9}],recovery:{available:false,draftTime:null}}
    : {...project,name:"Old language settings",languages:["fr"]});
  await pending;
  expect(projectStore.getSnapshot()).toBe(before);
});
