// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/team/TeamHistoryRouting.test.tsx
SUMMARY
    Account history follows the active project document and rejects late reads.
BASIC IDEA
    Render the real provider, account controls and history against synthetic
    project selection so the integration cannot silently default to model RDF.
INPUTS / INPUT SOURCES
    Mocked authenticated status, document selection and delayed audit responses.
EXPECTED OUTPUT
    Shapes, model and workspace history remain attached to their actual owner.
================================================================================
*/
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {I18nProvider} from '../i18n/I18nProvider';
import {TeamProvider} from './TeamProvider';

const mocks=vi.hoisted(()=>({
 state:{project:{id:'p'} as {id:string}|null,activeDoc:'model',editorDraft:null,creating:null},
 authStatus:vi.fn(),teamVersions:vi.fn(),teamHistory:vi.fn(),
}));
vi.mock('../api',()=>({
 authStatus:mocks.authStatus,teamVersions:mocks.teamVersions,teamHistory:mocks.teamHistory,
 logoutTeam:vi.fn(),listSavedQueries:vi.fn(),getLayout:vi.fn(),getDocumentSource:vi.fn(),
 listProjects:vi.fn(),listOntologies:vi.fn(),teamUsers:vi.fn(),updateTeamUser:vi.fn(),loginTeam:vi.fn(),
}));
vi.mock('../state/projectStore',()=>({
 projectStore:{getSnapshot:()=>mocks.state},
 useProjectSelector:<T,>(selector:(state:typeof mocks.state)=>T)=>selector(mocks.state),
}));

const entry=(actor:string)=>({actor,operation:'POST /api/projects/p/documents/shapes/commands',after_version:2});
const shell=()=> <I18nProvider><TeamProvider><p>Workspace content</p></TeamProvider></I18nProvider>;
async function openHistory(){
 fireEvent.click(await screen.findByRole('button',{name:'Account: member@example.org'}));
 fireEvent.click(screen.getByRole('button',{name:'Change history'}));
}
beforeEach(()=>{
 vi.clearAllMocks();localStorage.setItem('semantic-studio.uiLocale.v1','en');
 mocks.state={project:{id:'p'},activeDoc:'model',editorDraft:null,creating:null};
 mocks.authStatus.mockResolvedValue({mode:'team',authenticated:true,user:{sub:'member',email:'member@example.org',role:'editor',disabled:false,version:1},csrf:'synthetic'});
 mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:1}});
 mocks.teamHistory.mockImplementation(async(key:string)=>({history:[entry(key)]}));
});
afterEach(()=>cleanup());

describe('current-document history routing',()=>{
 it('reads Shapes audit entries when Shapes is the active document',async()=>{
  mocks.state.activeDoc='shapes';render(shell());await openHistory();
  await waitFor(()=>expect(mocks.teamHistory).toHaveBeenCalledWith('graph:p-shapes',0));
  expect(await screen.findByText(/graph:p-shapes: Changed an item/)).toBeTruthy();
  expect(mocks.teamHistory).not.toHaveBeenCalledWith('graph:p-model',0);
 });
 it('follows document, project and Home selection without accepting an old document response',async()=>{
  let finishModel:(value:unknown)=>void=()=>{};
  mocks.teamHistory.mockImplementation((key:string)=>key==='graph:p-model'
   ?new Promise(resolve=>{finishModel=resolve;})
   :Promise.resolve({history:[entry(key)]}));
  const view=render(shell());await openHistory();
  await waitFor(()=>expect(mocks.teamHistory).toHaveBeenCalledWith('graph:p-model',0));
  mocks.state={...mocks.state,activeDoc:'shapes'};view.rerender(shell());
  expect(await screen.findByText(/graph:p-shapes: Changed an item/)).toBeTruthy();
  await act(async()=>finishModel({history:[entry('late model')]}));
  expect(screen.queryByText(/late model: Changed an item/)).toBeNull();
  mocks.state={...mocks.state,project:{id:'other'}};view.rerender(shell());
  expect(await screen.findByText(/graph:other-shapes: Changed an item/)).toBeTruthy();
  mocks.state={...mocks.state,project:null};view.rerender(shell());
  expect(await screen.findByText(/workspace: Changed an item/)).toBeTruthy();
  expect(screen.queryByText(/graph:other-shapes: Changed an item/)).toBeNull();
 });
});
