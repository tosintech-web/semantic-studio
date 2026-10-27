// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/GovernmentView.test.tsx
SUMMARY
    Checks explicitly dated reads, late-response ownership and history labels.
BASIC IDEA
    Resolve two date requests in reverse order while preserving real controls.
INPUTS / INPUT SOURCES
    Synthetic dated view pages and API doubles.
EXPECTED OUTPUT
    Old responses never replace the current date, and history stays distinct.
================================================================================
*/
import {act,cleanup,fireEvent,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderEn as render} from '../testutils/i18n';
import {VIEW,PID} from '../testutils/government';
import GovernmentView from './GovernmentView';
const mocks=vi.hoisted(()=>({getGovernmentView:vi.fn(),downloadGovernmentProjection:vi.fn(),exportProject:vi.fn()}));
vi.mock('../api',async original=>({...await original<typeof import('../api')>(),...mocks}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('ignores an old date response and distinguishes whole history from projection',async()=>{
 let resolveOld!:(value:unknown)=>void;
 const old=new Promise(resolve=>{resolveOld=resolve;});
 const empty={items:[],total:0,offset:0,limit:50};
 const newRow={iri:'urn:new',label:'Current date organization',existenceState:'uncertain'};
 const current={...VIEW,organizations:{...empty,items:[newRow],total:1},at:'2030-01-01',names:empty,changes:empty,existences:empty,activeRelations:empty};
 mocks.getGovernmentView.mockReturnValueOnce(old).mockResolvedValue(current);
 const props={projectId:PID,at:'2020-01-01',onDateChange:vi.fn(),onSelect:vi.fn()};
 const ui=render(<GovernmentView {...props}/>);
 ui.rerender(<GovernmentView {...props} at="2030-01-01"/>);
 await screen.findByText('As of 2030-01-01');
 await act(async()=>{resolveOld({...current,organizations:{...empty,items:[{...newRow,label:'Old date organization'}],total:1},at:'2020-01-01'});await old;});
 expect(screen.queryByText('As of 2020-01-01')).toBeNull();
 expect(screen.queryByRole('button',{name:'Old date organization'})).toBeNull();
 expect(screen.getByRole('button',{name:'Current date organization'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Download all history (project ZIP)'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Download dated projection (Turtle)'})).toBeTruthy();
 fireEvent.click(screen.getByLabelText('Include organizations outside their existence period'));
 await act(async()=>{});
 expect(mocks.getGovernmentView.mock.lastCall?.[2]).toMatchObject({includeInactive:true});
});

it.each(['before start','at end','unknown boundary','period gap'])('does not present historical country values as affiliation on a date with %s',async()=>{
 const row={iri:'urn:org',label:'Ministry',existenceState:'active',countryIri:null,countryLabel:'',
  formCountryIri:'urn:historical-country',formCountryLabel:'Historical country',countryResolved:true,nameConfirmed:false};
 mocks.getGovernmentView.mockResolvedValue({...VIEW,organizations:{items:[row],total:1,offset:0,limit:50}});
 render(<GovernmentView projectId={PID} at="2030-01-01" onDateChange={vi.fn()} onSelect={vi.fn()}/>);
 await screen.findByRole('button',{name:'Ministry'});
 expect(screen.queryByText(/Historical country/)).toBeNull();
 expect(screen.getByText('No confirmed country affiliation on this date')).toBeTruthy();
 expect(screen.getByText('Name not confirmed for this date')).toBeTruthy();
});

it('identifies a missing active country even when multiple historical affiliations prevent single-record editing',async()=>{
 const row={iri:'urn:org',label:'Ministry',existenceState:'active',countryIri:'urn:missing-country',countryLabel:'missing-country',
  formCountryIri:null,formCountryLabel:'',countryResolved:false,nameConfirmed:true};
 mocks.getGovernmentView.mockResolvedValue({...VIEW,organizations:{items:[row],total:1,offset:0,limit:50}});
 render(<GovernmentView projectId={PID} at="2030-01-01" onDateChange={vi.fn()} onSelect={vi.fn()}/>);
 await screen.findByRole('button',{name:'Ministry'});
 expect(screen.getByText(/Unresolved country reference.*urn:missing-country/)).toBeTruthy();
 expect(screen.queryByText('Name not confirmed for this date')).toBeNull();
});

it('distinguishes active relationships from an endpoint with unknown existence',async()=>{
 const empty={items:[],total:0,offset:0,limit:50};
 const unknown={start:{date:null,open:false},end:{date:null,open:false}};
 const relation={iri:'urn:relation',subject:'urn:org',predicate:'http://www.w3.org/ns/org#unitOf',object:'urn:parent',subjectLabel:'Unit',objectLabel:'Ministry',period:unknown,sources:[],description:'',unsupported:[],state:'active'};
 mocks.getGovernmentView.mockResolvedValue({...VIEW,organizations:{...empty,items:[{iri:'urn:org',label:'Unit',existenceState:'uncertain'}],total:1},activeRelations:{...empty,items:[relation],total:1}});
 render(<GovernmentView projectId={PID} at="2030-01-01" onDateChange={vi.fn()} onSelect={vi.fn()}/>);
 await screen.findByText(/Relationship active on this date/);
 expect(screen.getByText(/Existence date unknown/)).toBeTruthy();
 expect(screen.queryByText('Existence confirmed for this date')).toBeNull();
});
