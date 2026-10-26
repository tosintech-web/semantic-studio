// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/team/TeamHistory.test.tsx
SUMMARY
    History retains raw audit facts while localizing known operation categories.
BASIC IDEA
    Old resource reads must not populate a newly selected history owner;
    failed or overlapping pagination must not discard unseen audit records.
INPUTS / INPUT SOURCES
    Synthetic late/failed history pages, account markup and command identifiers.
EXPECTED OUTPUT
    Escaped raw facts and only the current owner's translated history.
================================================================================
*/
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {TeamHistory} from './TeamHistory';
const history=vi.hoisted(()=>vi.fn());
vi.mock('../api',()=>({teamHistory:history}));
beforeEach(()=>history.mockReset());
afterEach(()=>{cleanup();vi.clearAllMocks();});
const page=(start:number,count=50)=>Array.from({length:count},(_,i)=>({actor:`audit-${start+i}`,operation:'PUT /api/projects/p/documents/model/source'}));
describe('team history ownership',()=>{
 it('renders account text safely and known operations in the current UI language',async()=>{
  history.mockResolvedValue({history:[{actor:'<script>犬</script>',operation:'POST /api/projects/p/documents/model/commands',timestamp:'2026-10-25T00:00:00Z',after_version:2}]});
  const view=render(<TeamHistory resourceKey="graph:p-model"/>);
  expect(await screen.findByText(/<script>犬<\/script>: Changed an item/)).toBeTruthy();
  expect(view.container.querySelector('script')).toBeNull();
  expect(screen.getByText(/Revision 2/)).toBeTruthy();
  expect(screen.getByText('POST /api/projects/p/documents/model/commands')).toBeTruthy();
 });
 it('ignores history that arrives after the resource owner changes',async()=>{
  let resolve:(value:unknown)=>void=()=>{};
  history.mockReturnValueOnce(new Promise(done=>{resolve=done;})).mockResolvedValue({history:[{actor:'b',operation:'undo:request-b'}]});
  const view=render(<TeamHistory resourceKey="graph:a"/>);
  view.rerender(<TeamHistory resourceKey="graph:b"/>);
  expect(await screen.findByText('b: Undid a change')).toBeTruthy();
  await act(async()=>resolve({history:[{actor:'a',operation:'POST /api/projects'}]}));
  expect(screen.queryByText('a: Created an item')).toBeNull();
 });
 it('retries the failed page before reading the following page',async()=>{
  let fail=true;
  history.mockImplementation((_key:string,offset:number)=>{
   if(offset===50&&fail){fail=false;return Promise.reject(new Error('unavailable'));}
   return Promise.resolve({history:offset===0?page(0):offset===50?page(50):page(100,1)});
  });
  render(<TeamHistory resourceKey="graph:p"/>);
  await screen.findByText('audit-0: Changed an item');
  fireEvent.click(screen.getByRole('button',{name:'More changes'}));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'More changes'}));
  await screen.findByText('audit-50: Changed an item');
  expect(screen.getByText('audit-99: Changed an item')).toBeTruthy();
  expect(screen.getAllByRole('listitem')).toHaveLength(100);
  fireEvent.click(screen.getByRole('button',{name:'More changes'}));
  await screen.findByText('audit-100: Changed an item');
  expect(screen.getAllByRole('listitem')).toHaveLength(101);
  expect(screen.queryByRole('button',{name:'More changes'})).toBeNull();
  expect(history.mock.calls.map(call=>call[1])).toEqual([0,50,50,100]);
 });
 it('keeps a pending page from being skipped by a second activation',async()=>{
  let resolve:(value:unknown)=>void=()=>{};
  history.mockImplementation((_key:string,offset:number)=>offset===50
   ?new Promise(done=>{resolve=done;})
   :Promise.resolve({history:offset===0?page(0):page(100,1)}));
  render(<TeamHistory resourceKey="graph:p"/>);
  await screen.findByText('audit-0: Changed an item');
  const more=screen.getByRole('button',{name:'More changes'});more.focus();
  fireEvent.click(more);
  expect(more.getAttribute('aria-disabled')).toBe('true');
  expect(screen.getByRole('region',{name:'Change history'}).getAttribute('aria-busy')).toBe('true');
  fireEvent.click(more);
  await act(async()=>resolve({history:page(50)}));
  expect(screen.getByText('audit-50: Changed an item')).toBeTruthy();
  expect(screen.getAllByRole('listitem')).toHaveLength(100);
  expect(history.mock.calls.map(call=>call[1])).toEqual([0,50]);
  expect(document.activeElement).toBe(more);
  expect(more.getAttribute('aria-disabled')).toBe('false');
 });
});
