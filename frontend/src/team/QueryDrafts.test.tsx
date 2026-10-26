// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/team/QueryDrafts.test.tsx
SUMMARY
    Saved visual-query edits keep the read baseline through remote changes.
BASIC IDEA
    Drive the real builder setter and provider poll, excluding read-only controls.
INPUTS / INPUT SOURCES
    Synthetic saved query, schema and concurrent resource versions.
EXPECTED OUTPUT
    Drafts block automatic refresh and clear only after save or cancellation.
================================================================================
*/
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import {TeamProvider} from './TeamProvider';import {I18nProvider} from '../i18n/I18nProvider';
import {useQueryBuilder} from '../sparql/useQueryBuilder';
import {configureTeam,expectedTeamVersions} from './client';import {hasQueryDrafts,pendingQueryDrafts,setQueryDraft} from './queryDrafts';
const mocks=vi.hoisted(()=>({authStatus:vi.fn(),teamVersions:vi.fn(),getQuerySchema:vi.fn()}));
vi.mock('../api',async original=>({...await original<typeof import('../api')>(),...mocks}));
let builder:ReturnType<typeof useQueryBuilder>|null=null;
function Harness(){builder=useQueryBuilder('o',true);return <><div className="query-pinned editing"><textarea className="sparql-textarea" aria-label="Text draft" onChange={event=>builder!.setText(event.target.value)}/></div><button onClick={()=>builder!.loadState({steps:[],limit:100,pathsMode:false,distinct:false,aggregate:'none'},{id:'q',name:'Shared'})}>Load saved</button><select aria-label="Aggregate draft" value={builder.state.aggregate} onChange={event=>builder!.setState({...builder!.state,aggregate:event.target.value as 'none'|'count'})}><option value="none">Rows</option><option value="count">Count</option></select></>;}
beforeEach(()=>{configureTeam({mode:'local',authenticated:false,user:null,csrf:null});for(const owner of pendingQueryDrafts())setQueryDraft(owner,false);vi.clearAllMocks();localStorage.setItem('semantic-studio.uiLocale.v1','en');mocks.authStatus.mockResolvedValue({mode:'team',authenticated:true,user:{sub:'a',email:'a@example.test',role:'editor',version:1,disabled:false},csrf:'x'});mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:1}});mocks.getQuerySchema.mockResolvedValue({classes:[],links:[],superClasses:{},dataProperties:{},namespaces:{},truncated:false});});
afterEach(()=>{cleanup();for(const owner of pendingQueryDrafts())setQueryDraft(owner,false);configureTeam({mode:'local',authenticated:false,user:null,csrf:null});vi.restoreAllMocks();});
describe('shared query draft ownership',()=>{
 it('retains newer edits through save acknowledgement and clears saved/cancelled definitions',async()=>{
  render(<I18nProvider><TeamProvider><Harness/></TeamProvider></I18nProvider>);await screen.findByRole('button',{name:'Load saved'});
  fireEvent.click(screen.getByRole('button',{name:'Load saved'}));expect(hasQueryDrafts()).toBe(false);
  act(()=>builder!.setSavePromptDraft(true));expect(hasQueryDrafts()).toBe(true);
  act(()=>builder!.setSavePromptDraft(false));expect(hasQueryDrafts()).toBe(false);
  const sent=builder!.state;
  fireEvent.change(screen.getByRole('combobox',{name:'Aggregate draft'}),{target:{value:'count'}});
  act(()=>builder!.markVisualSaved(sent));expect(hasQueryDrafts()).toBe(true);
  act(()=>builder!.markVisualSaved(builder!.state));expect(hasQueryDrafts()).toBe(false);
  fireEvent.change(screen.getByRole('combobox',{name:'Aggregate draft'}),{target:{value:'none'}});
  const oldSession=builder!.currentQuerySession();act(()=>builder!.discardQueryDraft());
  expect(hasQueryDrafts()).toBe(false);expect(builder!.currentQuerySession()).not.toBe(oldSession);
 });
 it('releases saved text without leaving a duplicate DOM draft owner',async()=>{
  let poll:()=>void=()=>{};vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  render(<I18nProvider><TeamProvider><Harness/></TeamProvider></I18nProvider>);await screen.findByRole('button',{name:'Load saved'});
  act(()=>builder!.openTextQuery('SELECT * WHERE {}',{opened:{id:'q',name:'Shared'}}));
  fireEvent.change(screen.getByRole('textbox',{name:'Text draft'}),{target:{value:'SELECT ?s WHERE {?s ?p ?o}'}});
  expect(hasQueryDrafts()).toBe(true);act(()=>builder!.markTextSaved('SELECT ?s WHERE {?s ?p ?o}'));
  expect(hasQueryDrafts()).toBe(false);mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});await act(async()=>{poll();});
  expect(expectedTeamVersions()).toEqual({workspace:2});
 });
 it('does not advance the baseline while an existing visual query has select-only definition edits',async()=>{
  let poll:()=>void=()=>{};vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  render(<I18nProvider><TeamProvider><Harness/></TeamProvider></I18nProvider>);await screen.findByRole('button',{name:'Load saved'});
  fireEvent.click(screen.getByRole('button',{name:'Load saved'}));fireEvent.change(screen.getByRole('combobox',{name:'Aggregate draft'}),{target:{value:'count'}});
  expect(hasQueryDrafts()).toBe(true);mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});await act(async()=>{poll();});
  expect(expectedTeamVersions()).toEqual({workspace:1});await screen.findByRole('region',{name:'This item has changed'});expect(builder!.state.aggregate).toBe('count');
 });
});
