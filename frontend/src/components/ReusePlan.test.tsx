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
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import UiLanguageSelect from "./UiLanguageSelect";
import ReusePlan from "./ReusePlan";
import { DictionaryLanguageContext } from "../dictionary/useDictionaryLanguage";
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

it.each(["plan", "request"])("translates %s refusal at render time and preserves escaped original details", async mode => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  const property = { iri: "https://example.test/p", label: "関係 <b>{name}" };
  const legacy = "Original refusal <img>{name}";
  const wire = { code: "editing.guard.share_expression", args: { name: property.label } };
  planShare.mockReset();
  if (mode === "plan") planShare.mockResolvedValue({ revision: 1, plan: {
    case: null, refused: legacy, refusedUiMessage: wire, property: { ...property, kind: "relationship" },
    domain: { form: "expression", classes: [] },
  } });
  else planShare.mockRejectedValue(Object.assign(new Error(legacy), { uiMessage: wire }));
  const run = vi.fn();
  const { container } = render(<I18nProvider><UiLanguageSelect /><ReusePlan pid="prj-synthetic" ontologyId="model"
    property={property} cls={null} runner={{ busy: false, errors: {}, run, clear: vi.fn(), alive: () => true }}
    onDone={vi.fn()} onCancel={vi.fn()} /></I18nProvider>);
  await screen.findByText(`「${property.label}」の所属先はTurtleのクラス式で定義されています。Turtleで編集してください。`);
  const summary = screen.getByText("技術的な詳細");
  fireEvent.click(summary);
  const details = summary.closest("details")!;
  details.open = true;
  summary.focus();
  expect(details.querySelector("pre")?.textContent).toBe(legacy);
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(screen.getByText(`The domain of ${property.label} is a class expression written in Turtle. Edit it there.`)).toBeTruthy();
  expect(screen.getByText("Technical details").closest("details")).toBe(details);
  expect(details.open).toBe(true);
  expect(document.activeElement).toBe(summary);
  expect(planShare).toHaveBeenCalledTimes(1);
  expect(run).not.toHaveBeenCalled();
  expect(container.querySelector("b, img")).toBeNull();
});

it("uses a localized fallback for unknown plan metadata and keeps its original reason accessible", async () => {
  localStorage.removeItem("semantic-studio.uiLocale.v1");
  planShare.mockReset();
  const property = { iri: "https://example.test/p", label: "p" };
  planShare.mockResolvedValue({ revision: 1, plan: { case: null, refused: "Future reason <img>",
    refusedUiMessage: { code: "future.refusal", args: {} }, property: { ...property, kind: "attribute" },
    domain: { form: "expression", classes: [] } } });
  const { container } = render(<I18nProvider><UiLanguageSelect /><ReusePlan pid="prj-synthetic" ontologyId="model"
    property={property} cls={null} runner={{ busy: false, errors: {}, run: vi.fn(), clear: vi.fn(), alive: () => true }}
    onDone={vi.fn()} onCancel={vi.fn()} /></I18nProvider>);
  await screen.findByText("操作を完了できませんでした。詳細を確認してください。");
  expect(container.querySelector("pre")?.textContent).toBe("Future reason <img>");
  const details = container.querySelector("details");
  fireEvent.change(screen.getByRole("combobox", { name: "UIの言語" }), { target: { value: "en" } });
  expect(container.querySelector("details")).toBe(details);
  expect(planShare).toHaveBeenCalledTimes(1);
  expect(container.querySelector("img")).toBeNull();
});


it("rereads plan names in the dictionary language without losing a focused shared-parent draft", async () => {
  localStorage.setItem("semantic-studio.uiLocale.v1","en");
  planShare.mockReset();
  const property = { iri:"https://synthetic.example/p",label:"hasName" };
  const cls = { iri:"https://synthetic.example/D",label:"Team" };
  planShare.mockImplementation(async (_pid,_property,_cls,lang) => ({ revision:2,plan:{
    case:"D",property:{...property,kind:"attribute"},
    domain:{form:"one",classes:[{iri:"https://synthetic.example/C",label:lang === "ja" ? "従業員" : "Employee",type:"rdfs"}]},
    choices:{subclass:false,union:false,parent:true,up:[]},imported:[],turtle:null,
  }}));
  const run = vi.fn();
  const runner = {busy:false,errors:{},run,clear:vi.fn(),alive:()=>true};
  const draw = (language:string) => <DictionaryLanguageContext.Provider value={language}><I18nProvider><UiLanguageSelect />
    <ReusePlan pid="prj-synthetic" ontologyId="model" property={property} cls={cls} runner={runner} onDone={vi.fn()} onCancel={vi.fn()} />
    </I18nProvider></DictionaryLanguageContext.Provider>;
  const view=render(draw("en"));
  const field = await screen.findByRole("textbox",{name:"What is every Employee and Team? For example, Worker"});
  fireEvent.change(field,{target:{value:"Synthetic parent draft"}});field.focus();
  await act(async()=>{view.rerender(draw("ja"));});
  expect(screen.getByRole("textbox",{name:"What is every 従業員 and Team? For example, Worker"})).toBe(field);
  expect((field as HTMLInputElement).value).toBe("Synthetic parent draft");
  expect(document.activeElement).toBe(field);
  const reads=planShare.mock.calls.length;
  fireEvent.change(screen.getByRole("combobox",{name:"UI language"}),{target:{value:"ja"}});
  expect(planShare).toHaveBeenCalledTimes(reads);expect(run).not.toHaveBeenCalled();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});


it("drops an old target's plan and parent draft while the next target is being read", async () => {
  localStorage.setItem("semantic-studio.uiLocale.v1","en");planShare.mockReset();
  const property={iri:"https://synthetic.example/p",label:"hasName"},cls={iri:"https://synthetic.example/D",label:"Team"};
  const plan=(label:string)=>({revision:2,plan:{case:"D",property:{...property,kind:"attribute"},
    domain:{form:"one",classes:[{iri:"https://synthetic.example/C",label,type:"rdfs"}]},
    choices:{subclass:false,union:false,parent:true,up:[]},imported:[],turtle:null}});
  let resolveOlder!: (value:unknown)=>void, resolveNext!: (value:unknown)=>void;
  const older=new Promise(resolve=>{resolveOlder=resolve;}), next=new Promise(resolve=>{resolveNext=resolve;});
  planShare.mockImplementation((pid,_property,_cls,lang)=>pid === "prj-next" ? next : lang === "fr" ? older : Promise.resolve(plan("Employee")));
  const runner={busy:false,errors:{},run:vi.fn(),clear:vi.fn(),alive:()=>true};
  const draw=(pid:string,lang:string)=><DictionaryLanguageContext.Provider value={lang}><I18nProvider>
    <ReusePlan pid={pid} ontologyId="model" property={property} cls={cls} runner={runner} onDone={vi.fn()} onCancel={vi.fn()} />
    </I18nProvider></DictionaryLanguageContext.Provider>;
  const view=render(draw("prj-first","en"));
  const field=await screen.findByRole("textbox",{name:"What is every Employee and Team? For example, Worker"});
  fireEvent.change(field,{target:{value:"First target draft"}});
  await act(async()=>{view.rerender(draw("prj-first","fr"));});
  await act(async()=>{view.rerender(draw("prj-next","en"));});
  expect(screen.queryByRole("textbox")).toBeNull();
  await act(async()=>{resolveNext(plan("Next employee"));});
  const current=screen.getByRole("textbox",{name:"What is every Next employee and Team? For example, Worker"});
  expect((current as HTMLInputElement).value).toBe("");
  await act(async()=>{resolveOlder(plan("Older employee"));});
  expect(screen.getByRole("textbox",{name:"What is every Next employee and Team? For example, Worker"})).toBe(current);
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});

it("recovers a failed name read when the dictionary language is changed", async () => {
  localStorage.setItem("semantic-studio.uiLocale.v1", "en"); planShare.mockReset();
  const property = {iri:"https://synthetic.example/p",label:"hasName"};
  planShare.mockRejectedValueOnce(new Error("Original read failure")).mockResolvedValue({revision:2,plan:{
    case:"D",property:{...property,kind:"attribute"},domain:{form:"one",classes:[{iri:"https://synthetic.example/C",label:"従業員",type:"rdfs"}]},
    choices:{subclass:false,union:false,parent:true,up:[]},imported:[],turtle:null,
  }});
  const draw = (language:string) => <DictionaryLanguageContext.Provider value={language}><I18nProvider>
    <ReusePlan pid="prj-synthetic" ontologyId="model" property={property} cls={{iri:"https://synthetic.example/D",label:"Team"}}
      runner={{busy:false,errors:{},run:vi.fn(),clear:vi.fn(),alive:()=>true}} onDone={vi.fn()} onCancel={vi.fn()} />
    </I18nProvider></DictionaryLanguageContext.Provider>;
  const view = render(draw("en"));
  await screen.findByText("Original read failure", {selector:"pre"});
  await act(async () => { view.rerender(draw("ja")); });
  expect(screen.queryByText("Original read failure", {selector:"pre"})).toBeNull();
  expect(screen.getByRole("textbox",{name:"What is every 従業員 and Team? For example, Worker"})).toBeTruthy();
  localStorage.removeItem("semantic-studio.uiLocale.v1");
});
