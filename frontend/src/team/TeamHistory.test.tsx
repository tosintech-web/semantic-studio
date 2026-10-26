// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/team/TeamHistory.test.tsx
SUMMARY
    History retains raw audit facts while localizing known operation categories.
BASIC IDEA
    Old resource reads must not populate a newly selected history owner.
INPUTS / INPUT SOURCES
    Synthetic late history responses, account markup and command identifiers.
EXPECTED OUTPUT
    Escaped raw facts and only the current owner's translated history.
================================================================================
*/
import {act,cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {TeamHistory} from './TeamHistory';
const history=vi.hoisted(()=>vi.fn());
vi.mock('../api',()=>({teamHistory:history}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
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
});
