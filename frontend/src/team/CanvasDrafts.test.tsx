// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/team/CanvasDrafts.test.tsx
SUMMARY
    Pending canvas writes retain their owner, payload and exact CAS baseline.
BASIC IDEA
    Drive the real data hook through a real team provider with controlled polls
    and failed layout writes; inspect explicit retry rather than auto resends.
INPUTS / INPUT SOURCES
    Synthetic canvas/source/version responses and user moves.
EXPECTED OUTPUT
    No polling rebase during debounce, safe owner-specific recovery and refresh.
================================================================================
*/
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useEffect,useState} from 'react';
import {TeamProvider} from './TeamProvider';
import {I18nProvider} from '../i18n/I18nProvider';
import {useCanvasData} from '../canvas/useCanvasData';
import {projectStore} from '../state/projectStore';
import {ApiError} from '../api';
import {configureTeam,expectedTeamVersions,observeTeamResponse} from './client';
import {hasLayoutDrafts,pendingLayoutDrafts,setLayoutDraft} from './layoutDrafts';
const mocks=vi.hoisted(()=>({authStatus:vi.fn(),teamVersions:vi.fn(),getCanvas:vi.fn(),putLayout:vi.fn(),openProject:vi.fn(),listData:vi.fn(),getDocumentSource:vi.fn(),getLayout:vi.fn(),closeProject:vi.fn()}));
vi.mock('../api',async original=>({...await original<typeof import('../api')>(),...mocks}));
const auth={mode:'team' as const,authenticated:true,user:{sub:'a',email:'a@example.test',role:'editor' as const,disabled:false,version:1},csrf:'x'};
const project=(id='p')=>({id,name:id,createdAt:'',updatedAt:'',baseIri:'https://example.test/',prefix:'x',primaryLanguage:'en',languages:[],documents:[],counts:{},kind:'ontology' as const});
const view=(x=0)=>({nodes:[{iri:'https://example.test/A',label:'A',kind:'class',attributes:[]},{iri:'https://example.test/B',label:'B',kind:'class',attributes:[]}],edges:[],total:1,limited:false,layout:{version:1,generation:x,positions:{'https://example.test/A':[x,0],'https://example.test/B':[x?99:0,100]},shown:null,viewport:{x,y:0,zoom:1}}});
let latest:ReturnType<typeof useCanvasData>|null=null;
function CanvasHarness({refreshGeneration=0}:{refreshGeneration?:number}){
 const data=useCanvasData('p','model',0,'en',null,refreshGeneration);latest=data;
 useEffect(()=>projectStore.registerFlush(data.flush),[data.flush]);
 return <><output aria-label="positions">{JSON.stringify(data.positions)}</output><button onClick={()=>data.move('https://example.test/A',[30,40])}>Move box</button><button onClick={()=>data.beginMove()}>Start viewport gesture</button><button onClick={()=>data.setViewport({x:20,y:10,zoom:2})}>Move viewport</button></>;
}
function ModeHarness(){const [visible,setVisible]=useState(true);return <><button onClick={()=>setVisible(false)}>Leave canvas</button>{visible&&<CanvasHarness/>}</>;}
beforeEach(async()=>{
 for(const draft of pendingLayoutDrafts())setLayoutDraft(draft.owner,false);
 configureTeam({mode:'local',authenticated:false,user:null,csrf:null});projectStore._reset();vi.clearAllMocks();
 localStorage.setItem('semantic-studio.uiLocale.v1','en');mocks.authStatus.mockResolvedValue(auth);mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:1}});mocks.getCanvas.mockResolvedValue(view());
 mocks.getDocumentSource.mockResolvedValue({text:'Latest source',revision:0,fromEditor:false});mocks.getLayout.mockResolvedValue(view(9).layout);
 mocks.listData.mockResolvedValue({generation:0,snapshots:[]});mocks.openProject.mockImplementation(async(id:string)=>({project:project(id),documents:[{doc:'model',ontologyId:id+'-model',revision:0,dirty:false,canUndo:false,canRedo:false,undoLabel:null,redoLabel:null,triples:1}],recovery:{available:false,draftTime:null}}));
 mocks.putLayout.mockImplementation(async()=>{await observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict',currentVersions:{workspace:2}}),{status:409}));throw new ApiError('conflict',409);});
 await projectStore.open('p');
});
afterEach(()=>{cleanup();for(const draft of pendingLayoutDrafts())setLayoutDraft(draft.owner,false);configureTeam({mode:'local',authenticated:false,user:null,csrf:null});vi.restoreAllMocks();});
describe('canvas team drafts',()=>{
 it('retains the baseline while a viewport gesture is still in progress',async()=>{
  let poll:()=>void=()=>{};vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  render(<I18nProvider><TeamProvider><CanvasHarness/></TeamProvider></I18nProvider>);
  await screen.findByRole('button',{name:'Start viewport gesture'});await waitFor(()=>expect(screen.getByLabelText('positions').textContent).toContain('example.test/A'));
  fireEvent.click(screen.getByRole('button',{name:'Start viewport gesture'}));mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});await act(async()=>{poll();});
  expect(expectedTeamVersions()).toEqual({workspace:1});expect(hasLayoutDrafts()).toBe(true);
 });
 it('keeps debounce/viewport work on the old baseline through polling and a failed save',async()=>{
  let poll:()=>void=()=>{};vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  render(<I18nProvider><TeamProvider><CanvasHarness/></TeamProvider></I18nProvider>);
  await waitFor(()=>expect(screen.getByLabelText('positions').textContent).toContain('[0,0]'));
  fireEvent.click(screen.getByRole('button',{name:'Move box'}));fireEvent.click(screen.getByRole('button',{name:'Move viewport'}));
  expect(hasLayoutDrafts()).toBe(true);
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});await act(async()=>{poll();});
  expect(expectedTeamVersions()).toEqual({workspace:1});expect(mocks.getCanvas).toHaveBeenCalledTimes(1);
  await act(async()=>{await new Promise(done=>setTimeout(done,1200));});
  expect(mocks.putLayout).toHaveBeenCalledTimes(1);
  expect(mocks.putLayout.mock.calls[0][3]).toEqual({workspace:1});expect(latest!.positions['https://example.test/A']).toEqual([30,40]);
  expect(hasLayoutDrafts()).toBe(true);
 });
 it('refreshes a clean layout when only the refresh generation changes',async()=>{
  configureTeam(auth);
  const mounted=render(<CanvasHarness/>);await waitFor(()=>expect(latest!.positions['https://example.test/A']).toEqual([0,0]));
  mocks.getCanvas.mockResolvedValue(view(9));mounted.rerender(<CanvasHarness refreshGeneration={1}/>);
  await waitFor(()=>expect(latest!.positions['https://example.test/A']).toEqual([9,0]));
  expect(mocks.getCanvas).toHaveBeenCalledTimes(2);expect(latest!.savedViewport).toEqual({x:9,y:0,zoom:1});expect(hasLayoutDrafts()).toBe(false);
 });
 it('retains a failed layout after mode unmount and never rebases it from a different project review',async()=>{
  render(<I18nProvider><TeamProvider><ModeHarness/></TeamProvider></I18nProvider>);
  await waitFor(()=>expect(latest!.positions['https://example.test/A']).toEqual([0,0]));
  fireEvent.click(screen.getByRole('button',{name:'Move box'}));
  // Leaving forces the first pending save; its conflict must retain the old
  // hook's payload/retry closure even though that canvas is now unmounted.
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Leave canvas'}));});
  await screen.findByRole('region',{name:'This item has changed'});
  expect(mocks.putLayout).toHaveBeenCalledTimes(1);expect(hasLayoutDrafts()).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Keep my input'}));
  await act(async()=>{await projectStore.open('other');});
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
  fireEvent.click(screen.getByRole('button',{name:'This item has changed'}));
  fireEvent.click(screen.getByRole('button',{name:'Load the latest version'}));
  await screen.findByRole('button',{name:'Use reviewed version for next attempt'});
  fireEvent.click(screen.getByRole('button',{name:'Use reviewed version for next attempt'}));
  expect(mocks.putLayout).toHaveBeenCalledTimes(1);
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Retry layout save for p (model.ttl)'}));});
  expect(mocks.putLayout).toHaveBeenCalledTimes(2);expect(mocks.putLayout.mock.calls[1][0]).toBe('p');expect(mocks.putLayout.mock.calls[1][3]).toEqual({workspace:1});
  fireEvent.click(screen.getByRole('button',{name:'Keep my input'}));
  await act(async()=>{await projectStore.open('p');});
  fireEvent.click(screen.getByRole('button',{name:'This item has changed'}));fireEvent.click(screen.getByRole('button',{name:'Load the latest version'}));
  await screen.findByRole('button',{name:'Use reviewed version for next attempt'});fireEvent.click(screen.getByRole('button',{name:'Use reviewed version for next attempt'}));
  mocks.putLayout.mockImplementation(async(_p,_d,layout)=>({...layout,generation:3}));
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Retry layout save for p (model.ttl)'}));});
  expect(mocks.putLayout.mock.calls[2][3]).toEqual({workspace:2});expect(mocks.putLayout.mock.calls[2][2].positions['https://example.test/A']).toEqual([30,40]);expect(mocks.putLayout.mock.calls[2][2].positions['https://example.test/B']).toEqual([99,100]);
  expect(hasLayoutDrafts()).toBe(false);
 });

 it('keeps the project and pending positions when Close cannot flush a team layout',async()=>{
  render(<I18nProvider><TeamProvider><CanvasHarness/></TeamProvider></I18nProvider>);
  await waitFor(()=>expect(latest!.positions['https://example.test/A']).toEqual([0,0]));
  fireEvent.click(screen.getByRole('button',{name:'Move box'}));
  await act(async()=>{await expect(projectStore.close()).rejects.toBeInstanceOf(ApiError);});
  expect(projectStore.getSnapshot().project?.id).toBe('p');expect(mocks.closeProject).not.toHaveBeenCalled();
  expect(latest!.positions['https://example.test/A']).toEqual([30,40]);expect(hasLayoutDrafts()).toBe(true);
 });
 it('does not restart a held debounce merely because its owner review was accepted',async()=>{
  render(<I18nProvider><TeamProvider><CanvasHarness/></TeamProvider></I18nProvider>);
  await waitFor(()=>expect(latest!.positions['https://example.test/A']).toEqual([0,0]));
  fireEvent.click(screen.getByRole('button',{name:'Move box'}));
  await act(async()=>{await observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict'}),{status:409}));});
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
  fireEvent.click(screen.getByRole('button',{name:'Load the latest version'}));await screen.findByRole('button',{name:'Use reviewed version for next attempt'});
  fireEvent.click(screen.getByRole('button',{name:'Use reviewed version for next attempt'}));
  await act(async()=>{await new Promise(done=>setTimeout(done,1100));});expect(mocks.putLayout).not.toHaveBeenCalled();expect(hasLayoutDrafts()).toBe(true);
 });

 it('notices a move begun while a version read is awaiting its response',async()=>{
  let poll:()=>void=()=>{};vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  render(<I18nProvider><TeamProvider><CanvasHarness/></TeamProvider></I18nProvider>);
  await waitFor(()=>expect(latest!.positions['https://example.test/A']).toEqual([0,0]));
  let resolve:(value:unknown)=>void=()=>{};mocks.teamVersions.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  await act(async()=>{poll();});
  fireEvent.click(screen.getByRole('button',{name:'Move box'}));
  await act(async()=>resolve({resourceVersions:{workspace:2}}));
  expect(expectedTeamVersions()).toEqual({workspace:1});expect(mocks.getCanvas).toHaveBeenCalledTimes(1);expect(latest!.positions['https://example.test/A']).toEqual([30,40]);
 });

});
