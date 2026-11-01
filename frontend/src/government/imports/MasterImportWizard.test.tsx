// @vitest-environment jsdom
/*
FILE: frontend/src/government/imports/MasterImportWizard.test.tsx
SUMMARY: Explicit review, source retention and stale response handling.
BASIC IDEA: Drive the modal through real controls and mocked API boundaries.
INPUTS / INPUT SOURCES: Synthetic CSV, project and signed batch.
EXPECTED OUTPUT: Apply requires an owned review and is never retried implicitly.
*/
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {screen,fireEvent,cleanup} from '@testing-library/react';
import {renderEn as render} from '../../testutils/i18n';
import Wizard from './MasterImportWizard';
import {projectStore} from '../../state/projectStore';
import {opened,PID,changed} from '../../testutils/government';
import {teamAuthEpoch,configureTeam} from '../../team/client';
const api=vi.hoisted(()=>({openProject:vi.fn(),listData:vi.fn(),inspectMasterImport:vi.fn(),prepareMasterImport:vi.fn(),reviewMasterImport:vi.fn(),applyMasterImport:vi.fn()}));
vi.mock('../../api',async original=>({...await original<typeof import('../../api')>(),...api}));
const batch={version:1,mode:'countries',source:{sha256:'s',filename:'test.csv',totalRows:1},operationNonce:'n',intents:[],mapping:{columns:[],defaults:{},rowOverrides:[]},selectedRows:[1]};
const report={basis:'basis',ready:true,noop:false,summary:{selected:1,excluded:0,created:1,updated:0,unchanged:0,errors:0,needsReview:0},rows:[{row:{rowId:1,record:2,startLine:2},status:'created',fields:[],issues:[]}],totalRows:1,offset:0,limit:50,warnings:[]};
beforeEach(async()=>{
 projectStore._reset();Object.values(api).forEach(v=>v.mockReset());
 api.openProject.mockResolvedValue(opened('countries-v1'));api.listData.mockResolvedValue({generation:0,snapshots:[]});await projectStore.open(PID);
 api.inspectMasterImport.mockResolvedValue({columns:['code','names'],positions:[{rowId:1,record:2,startLine:2}],evidence:[[{text:'AA',kind:'text'},{text:'Alpha',kind:'text'}]],totalRows:1,maxRows:2000,workbook:null});
 api.prepareMasterImport.mockResolvedValue({batch,receipt:'receipt',issues:[],summary:{selected:1,excluded:0},requiredBytes:100});
 api.reviewMasterImport.mockResolvedValue({report,resourceVersions:{workspace:3}});api.applyMasterImport.mockResolvedValue({...changed(),noop:false,importReport:report});
});
afterEach(()=>{cleanup();projectStore._reset();configureTeam({mode:"local",authenticated:false,user:null,csrf:null});vi.restoreAllMocks();});
function mount(){render(<Wizard owner={{pid:PID,session:projectStore.session(),authEpoch:teamAuthEpoch(),nonce:'n'}} country language="en" onClose={vi.fn()} onApplied={vi.fn()}/>);}
async function review(){fireEvent.change(screen.getByLabelText('CSV / Excel file (up to 5 MiB)'),{target:{files:[new File(['code,names\nAA,Alpha\n'],'test.csv')]}});fireEvent.click(screen.getByRole('button',{name:'Read source'}));await screen.findByText('Source data rows: 1');fireEvent.click(screen.getByRole('button',{name:'Prepare and review'}));await screen.findByRole('button',{name:'Confirm all selected rows'});}
it('requires explicit confirmation and exact reviewed team versions',async()=>{
 mount();await review();expect(api.applyMasterImport).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm all selected rows'}));await screen.findByText('Import completed. Undo restores this entire batch.');expect(api.applyMasterImport).toHaveBeenCalledWith(PID,{batch,receipt:'receipt'},'basis',{workspace:3},expect.any(String));
});
it('retains mapping after a refused confirmation without retry',async()=>{
 api.applyMasterImport.mockRejectedValue(new Error('Synthetic conflict'));mount();await review();fireEvent.click(screen.getByRole('button',{name:'Confirm all selected rows'}));await screen.findByText('Synthetic conflict');expect(api.applyMasterImport).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('Included row IDs')).toBeTruthy();
});
it('invalidates confirmation when a row is excluded',async()=>{
 mount();await review();fireEvent.click(screen.getByRole('button',{name:'Exclude this row and review again'}));expect(screen.queryByRole('button',{name:'Confirm all selected rows'})).toBeNull();
});

it('retains input and requires a fresh review after same-owner reauthentication',async()=>{
 const auth={mode:'team' as const,authenticated:true,user:{sub:'alice',email:'alice@example.test',role:'editor' as const,disabled:false,version:1},csrf:'initial-session'};
 configureTeam(auth);
 const owner={pid:PID,session:projectStore.session(),authEpoch:teamAuthEpoch(),nonce:'n'};
 const props={owner,country:true,language:'en',onClose:vi.fn(),onApplied:vi.fn()};
 const view=render(<Wizard {...props}/>);await review();
 configureTeam({...auth,csrf:'synthetic-new-session'});
 view.rerender(<Wizard {...props}/>);
 const rebind=screen.getByRole('button',{name:'Review retained input with this session'});
 expect((screen.getByRole('button',{name:'Confirm all selected rows'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(rebind);
 expect(screen.queryByRole('button',{name:'Confirm all selected rows'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Prepare and review'}));await screen.findByRole('button',{name:'Confirm all selected rows'});
 expect(api.prepareMasterImport).toHaveBeenCalledTimes(2);expect(api.applyMasterImport).not.toHaveBeenCalled();
 configureTeam({mode:'local',authenticated:false,user:null,csrf:null});
});

it('never reassigns retained source input to another member',async()=>{
 const user={sub:'alice',email:'alice@example.test',role:'editor' as const,disabled:false,version:1};
 configureTeam({mode:'team',authenticated:true,user,csrf:'first'});
 const props={owner:{pid:PID,session:projectStore.session(),authEpoch:teamAuthEpoch(),nonce:'n'},country:true,language:'en',onClose:vi.fn(),onApplied:vi.fn()};
 const view=render(<Wizard {...props}/>);await review();
 configureTeam({mode:'team',authenticated:true,user:{...user,sub:'bob'},csrf:'second'});view.rerender(<Wizard {...props}/>);
 expect(screen.queryByRole('button',{name:'Review retained input with this session'})).toBeNull();
 expect((screen.getByRole('button',{name:'Confirm all selected rows'}) as HTMLButtonElement).disabled).toBe(true);
 expect(api.applyMasterImport).not.toHaveBeenCalled();
});
