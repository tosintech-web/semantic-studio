// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/ChangeForm.test.tsx
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
import { opened,changed,PID,VIEW,PAGE } from '../testutils/government';
import {projectStore} from '../state/projectStore';
import ChangeForm from './ChangeForm';
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

it('supports multiple originals and results, shows the full review before applying',async()=>{
 render(<ChangeForm projectId={PID} onSaved={vi.fn()} onCancel={vi.fn()}/>);
 await screen.findAllByRole('option',{name:/Ministry A/});
 for(const role of ['Original organizations','Resulting organizations'])for(const iri of [A,B])fireEvent.change(screen.getByRole('combobox',{name:role}),{target:{value:iri}});
 fireEvent.change(screen.getByLabelText('Effective date'),{target:{value:'2030-04-01'}});
 fireEvent.change(screen.getByLabelText('Source 1'),{target:{value:'Synthetic merger Act'}});
 fireEvent.click(screen.getByRole('button',{name:'Review changes'}));await screen.findByText('A B C');
 expect(mocks.previewGovernmentCommand.mock.lastCall?.[2]).toMatchObject({originalIris:[A,B],resultingIris:[A,B],effectiveDate:'2030-04-01'});
 expect(screen.getByRole('button',{name:'Apply reviewed changes'}).getAttribute('aria-disabled')).toBe('true');
 fireEvent.click(screen.getByRole('checkbox',{name:'I reviewed all changes'}));fireEvent.click(screen.getByRole('button',{name:'Apply reviewed changes'}));await act(async()=>{});
 expect(mocks.runCommand.mock.lastCall?.[2]).toBe('ApplyGovernmentChange');
});
it('adds explicit name and existence edits without silently closing originals',async()=>{
 render(<ChangeForm projectId={PID} onSaved={vi.fn()} onCancel={vi.fn()}/>);
 await screen.findAllByRole('option',{name:/Ministry A/});
 fireEvent.click(screen.getByRole('button',{name:'Add name history'}));
 expect(screen.getByRole('group',{name:'Name history edit 1'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Add existence period'}));
 expect(screen.getByRole('group',{name:'Existence edit 1'})).toBeTruthy();
 expect(mocks.runCommand).not.toHaveBeenCalled();
});
