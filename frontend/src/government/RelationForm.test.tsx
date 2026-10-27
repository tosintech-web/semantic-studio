// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/RelationForm.test.tsx
SUMMARY
    Exercises native dated government forms and reviewed submissions.
BASIC IDEA
    Use the real project store with API doubles and inspect user-visible controls.
INPUTS / INPUT SOURCES
    Synthetic organization choices, history preview and command responses.
EXPECTED OUTPUT
    Explicit identity selection, retained drafts and no unreviewed mutation.
================================================================================
*/
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { renderEn as render } from '../testutils/i18n';
import { opened,changed,PID,VIEW,PAGE,BASIS } from '../testutils/government';
import {projectStore} from '../state/projectStore';
import RelationForm from './RelationForm';
const mocks=vi.hoisted(()=>({openProject:vi.fn(),runCommand:vi.fn(),listData:vi.fn(),getGovernmentView:vi.fn(),getCountryChoices:vi.fn(),previewGovernmentCommand:vi.fn()}));
vi.mock('../api',async original=>({...await original<typeof import('../api')>(),...mocks}));
const A='urn:synthetic:a',B='urn:synthetic:b';
beforeEach(async()=>{
 projectStore._reset();Object.values(mocks).forEach(m=>m.mockReset());
 mocks.openProject.mockResolvedValue(opened('government-organizations-v1'));mocks.runCommand.mockResolvedValue(changed());
 mocks.listData.mockResolvedValue({generation:0,snapshots:[]});mocks.getCountryChoices.mockResolvedValue(PAGE);
 mocks.getGovernmentView.mockResolvedValue({...VIEW,organizations:{...VIEW.organizations,items:[{iri:A,label:'Ministry A'},{iri:B,label:'Ministry B'}],total:2},names:{items:[],total:0,offset:0,limit:50},changes:{items:[],total:0,offset:0,limit:50},existences:{items:[],total:0,offset:0,limit:50}});
 mocks.previewGovernmentCommand.mockResolvedValue({dryRun:true,basis:'review-a',revision:0,delta:{added:['A B C'],removed:[],addedTotal:1,removedTotal:0},warnings:[]});
 await projectStore.open(PID);
});
afterEach(()=>{cleanup();projectStore._reset();vi.restoreAllMocks();});

it('reviews a directed relation and invalidates review after a draft change',async()=>{
 const saved=vi.fn();render(<RelationForm projectId={PID} onSaved={saved} onCancel={vi.fn()}/>);
 await screen.findAllByRole('option',{name:/Ministry A/});
 fireEvent.change(screen.getByRole('combobox',{name:'Subject organization'}),{target:{value:A}});
 fireEvent.change(screen.getByRole('combobox',{name:'Related organization'}),{target:{value:B}});
 fireEvent.change(screen.getByLabelText('Source 1'),{target:{value:'Synthetic gazette'}});
 fireEvent.click(screen.getByRole('button',{name:'Review changes'}));
 await screen.findByText('A B C');expect(mocks.runCommand).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Description'),{target:{value:'Changed after review'}});
 expect(screen.queryByRole('checkbox',{name:'I reviewed all changes'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Review changes'}));
 await screen.findByRole('checkbox',{name:'I reviewed all changes'});
 fireEvent.click(screen.getByRole('checkbox',{name:'I reviewed all changes'}));
 fireEvent.click(screen.getByRole('button',{name:'Apply reviewed changes'}));await act(async()=>{});
 expect(mocks.runCommand.mock.lastCall?.[2]).toBe('PutGovernmentRelation');
 expect(mocks.runCommand.mock.lastCall?.[3]).toMatchObject({subject:A,object:B,previewBasis:'review-a',referenceBasis:BASIS,description:'Changed after review'});
 expect(saved).toHaveBeenCalledTimes(1);
});
it('retains input after a stale command refusal',async()=>{
 mocks.runCommand.mockRejectedValueOnce(new Error('Stale'));
 render(<RelationForm projectId={PID} onSaved={vi.fn()} onCancel={vi.fn()}/>);
 await screen.findAllByRole('option',{name:/Ministry A/});
 fireEvent.change(screen.getByRole('combobox',{name:'Subject organization'}),{target:{value:A}});
 fireEvent.change(screen.getByRole('combobox',{name:'Related organization'}),{target:{value:B}});
 fireEvent.change(screen.getByLabelText('Source 1'),{target:{value:'Retained gazette'}});
 fireEvent.click(screen.getByRole('button',{name:'Review changes'}));
 await screen.findByRole('checkbox',{name:'I reviewed all changes'});fireEvent.click(screen.getByRole('checkbox',{name:'I reviewed all changes'}));
 fireEvent.click(screen.getByRole('button',{name:'Apply reviewed changes'}));await act(async()=>{});
 expect(screen.getByDisplayValue('Retained gazette')).toBeTruthy();
});

it('invalidates old review across reauthentication while retaining raw input',async()=>{
 const {configureTeam}=await import('../team/client');
 const props={projectId:PID,onSaved:vi.fn(),onCancel:vi.fn()};
 const ui=render(<RelationForm {...props}/>);
 await screen.findAllByRole('option',{name:/Ministry A/});
 fireEvent.change(screen.getByRole('combobox',{name:'Subject organization'}),{target:{value:A}});
 fireEvent.change(screen.getByRole('combobox',{name:'Related organization'}),{target:{value:B}});
 fireEvent.change(screen.getByLabelText('Source 1'),{target:{value:'Reauthentication draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Review changes'}));
 await screen.findByRole('checkbox',{name:'I reviewed all changes'});
 configureTeam({mode:'team',authenticated:false,user:null,csrf:null});
 ui.rerender(<RelationForm {...props}/>);
 expect(screen.queryByRole('checkbox',{name:'I reviewed all changes'})).toBeNull();
 expect(screen.getByDisplayValue('Reauthentication draft')).toBeTruthy();
 configureTeam({mode:'local',authenticated:false,user:null,csrf:null});
});

it('keeps a retained country selection basis across reauthentication until explicit reconfirmation',async()=>{
 const {configureTeam}=await import('../team/client');
 const props={projectId:PID,onSaved:vi.fn(),onCancel:vi.fn()};
 const ui=render(<RelationForm {...props}/>);
 await screen.findAllByRole('option',{name:/Ministry A/});
 fireEvent.change(screen.getByRole('combobox',{name:'Subject organization'}),{target:{value:A}});
 fireEvent.change(screen.getByLabelText('Relationship'),{target:{value:'urn:semantic-studio:government:v1#inCountry'}});
 await screen.findByRole('option',{name:/Synthetic country/});
 fireEvent.change(screen.getByRole('combobox',{name:'Choose country'}),{target:{value:PAGE.items[0].iri}});
 fireEvent.change(screen.getByLabelText('Source 1'),{target:{value:'Retained affiliation source'}});
 const newer={...BASIS,sourceToken:'source-after-reauth'};
 mocks.getGovernmentView.mockResolvedValue({...VIEW,referenceBasis:newer});
 configureTeam({mode:'team',authenticated:false,user:null,csrf:null});ui.rerender(<RelationForm {...props}/>);
 await act(async()=>{});
 fireEvent.click(screen.getByRole('button',{name:'Review changes'}));await screen.findByRole('checkbox',{name:'I reviewed all changes'});
 expect(mocks.previewGovernmentCommand.mock.lastCall?.[2]).toMatchObject({referenceBasis:BASIS,object:PAGE.items[0].iri});
 fireEvent.click(screen.getByRole('button',{name:'Refresh country authority'}));await act(async()=>{});
 fireEvent.click(screen.getByRole('button',{name:'Review changes'}));await act(async()=>{});
 expect(mocks.previewGovernmentCommand.mock.lastCall?.[2]).toMatchObject({referenceBasis:newer,object:PAGE.items[0].iri});
 configureTeam({mode:'local',authenticated:false,user:null,csrf:null});
});

it('lets a viewer leave a read-only relationship form without sending commands',async()=>{
 const {TeamContext}=await import('../team/TeamProvider');const cancel=vi.fn();
 render(<TeamContext.Provider value={{mode:'team',canEdit:false,canAdmin:false,suspended:false}}><RelationForm projectId={PID} targetIri="urn:existing:record" onSaved={vi.fn()} onCancel={cancel}/></TeamContext.Provider>);
 await act(async()=>{});fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 expect(cancel).toHaveBeenCalledTimes(1);expect(mocks.runCommand).not.toHaveBeenCalled();
});
