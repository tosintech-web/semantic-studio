// @vitest-environment jsdom
/*
FILE: frontend/src/releases/ReleasePanel.test.tsx
SUMMARY
    Reviewed release controls retain input and reject stale asynchronous results.
BASIC IDEA
    Mock only the API boundary and assert actual accessible form behavior.
INPUTS / INPUT SOURCES
    Synthetic release responses, roles and deferred operations.
EXPECTED OUTPUT
    Explicit review before approval, owner-bound results and retained errors.
*/
import {act,cleanup,fireEvent,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {renderEn} from '../testutils/i18n';
import ReleasePanel from './ReleasePanel';
const epoch=vi.hoisted(()=>({value:0}));
vi.mock('../team/client',()=>({teamAuthEpoch:()=>epoch.value}));
const api=vi.hoisted(()=>({previewRelease:vi.fn(),approveRelease:vi.fn(),listReleases:vi.fn(),downloadRelease:vi.fn()}));
vi.mock('../api',()=>api);
beforeEach(()=>{epoch.value=0;api.listReleases.mockResolvedValue({items:[],total:0,offset:0,limit:50});api.previewRelease.mockResolvedValue({previewDigest:'abc',basis:{resourceVersions:{workspace:3}},entityCount:2,statementCount:3,excludedByReason:{predicate:1},package:'UEs=',excludedViews:['imports','shapes','snapshots','inference']});});
afterEach(()=>{cleanup();vi.resetAllMocks();});
function fill(){fireEvent.change(screen.getByLabelText('Source'),{target:{value:'Synthetic'}});fireEvent.change(screen.getByLabelText('Data license'),{target:{value:'CC0'}});}
it('requires review and invalidates approval when metadata changes',async()=>{
 renderEn(<ReleasePanel projectId="p" role="admin" onClose={()=>{}}/>);fill();
 fireEvent.click(screen.getByRole('button',{name:'Create preview'}));
 await screen.findByText('2 entities, 3 statements');
 const approve=screen.getByRole('button',{name:'Approve version'});
 expect(approve.getAttribute('aria-disabled')).toBe('true');
 fireEvent.click(screen.getByLabelText('I reviewed all output files and their data license.'));
 expect(approve.getAttribute('aria-disabled')).toBe('false');
 fireEvent.change(screen.getByLabelText('Source'),{target:{value:'Changed'}});
 expect(screen.queryByText('2 entities, 3 statements')).toBeNull();
});
it('keeps metadata after a refusal and prevents a second pending approval',async()=>{
 let reject:(e:Error)=>void=()=>{};api.approveRelease.mockReturnValue(new Promise((_r,j)=>reject=j));
 renderEn(<ReleasePanel projectId="p" role="admin" onClose={()=>{}}/>);fill();
 fireEvent.click(screen.getByRole('button',{name:'Create preview'}));await screen.findByText('2 entities, 3 statements');
 fireEvent.click(screen.getByLabelText('I reviewed all output files and their data license.'));
 const button=screen.getByRole('button',{name:'Approve version'});fireEvent.click(button);fireEvent.click(button);
 await act(async()=>reject(new Error('unavailable')));
 expect((screen.getByLabelText('Source') as HTMLInputElement).value).toBe('Synthetic');
 expect(await screen.findByText('unavailable')).toBeTruthy();
 expect(api.approveRelease.mock.calls).toHaveLength(1);
});
it('discards late previews from the previous project',async()=>{
 let resolve:(v:unknown)=>void=()=>{};api.previewRelease.mockReturnValue(new Promise(r=>resolve=r));
 const view=renderEn(<ReleasePanel projectId="p" role="admin" onClose={()=>{}}/>);fill();fireEvent.click(screen.getByRole('button',{name:'Create preview'}));
 view.rerender(<ReleasePanel projectId="other" role="admin" onClose={()=>{}}/>);
 await act(async()=>resolve({entityCount:99,statementCount:99}));
 expect(screen.queryByText('99 entities, 99 statements')).toBeNull();
 expect((screen.getByLabelText('Source') as HTMLInputElement).value).toBe('');
});
it('gives viewers access to approved versions without preview or approval controls',async()=>{
 renderEn(<ReleasePanel projectId="p" role="viewer" onClose={()=>{}}/>);
 expect(screen.queryByRole('button',{name:'Create preview'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Approve version'})).toBeNull();
 await screen.findByText('No approved versions.');
});

it('invalidates previews and releases pending state after a renewed session',async()=>{
 let finish:(v:unknown)=>void=()=>{};
 api.previewRelease.mockReturnValueOnce(new Promise(r=>finish=r));
 const view=renderEn(<ReleasePanel projectId="p" role="admin" onClose={()=>{}}/>);fill();
 fireEvent.click(screen.getByRole('button',{name:'Create preview'}));
 epoch.value++;view.rerender(<ReleasePanel projectId="p" role="admin" onClose={()=>{}}/>);
 expect((screen.getByLabelText('Source') as HTMLInputElement).value).toBe('Synthetic');
 const button=screen.getByRole('button',{name:'Create preview'});
 expect(button.getAttribute('aria-disabled')).toBe('false');
 fireEvent.click(button);await screen.findByText('2 entities, 3 statements');
 await act(async()=>finish({entityCount:99,statementCount:99}));
 expect(screen.queryByText('99 entities, 99 statements')).toBeNull();
});
