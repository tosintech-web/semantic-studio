// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/team/TeamProvider.test.tsx
SUMMARY
    Authentication gates initial data while preserving mounted input on expiry.
BASIC IDEA
    Use a real input and translated controls with synthetic team sessions.
INPUTS / INPUT SOURCES
    Mock status and version endpoints, explicit refusal notification.
EXPECTED OUTPUT
    Session recovery keeps component identity, raw input and locale independent.
================================================================================
*/
import {useEffect,useState} from 'react';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {TeamProvider,useTeam} from './TeamProvider';
import NewProjectDialog from '../components/NewProjectDialog';
import RuleBuilder from '../components/RuleBuilder';
import {ValueInput} from '../components/AnnotationAdder';
import {I18nProvider} from '../i18n/I18nProvider';
import {observeTeamResponse,expectedTeamVersions} from './client';
const mocks=vi.hoisted(()=>({authStatus:vi.fn(),teamVersions:vi.fn(),loginTeam:vi.fn(),logoutTeam:vi.fn(),teamUsers:vi.fn(),teamHistory:vi.fn(),listProjects:vi.fn(),listOntologies:vi.fn(),getDocumentSource:vi.fn(),getLayout:vi.fn()}));
vi.mock('../api',()=>mocks);
const status={mode:'team',authenticated:true,user:{sub:'a',email:'a@example.test',role:'editor',disabled:false,version:1},csrf:'x'};
function ControlledDraft(){
 const [value,setValue]=useState('');
 return <form><input aria-label="controlled draft" value={value} onChange={event=>setValue(event.target.value)}/></form>;
}
function HeldRuleChoice(){
 const [visible,setVisible]=useState(true);const [datatype,setDatatype]=useState('string');const [unique,setUnique]=useState(false);
 useEffect(()=>{const deleted=()=>setVisible(false);window.addEventListener('semantic-studio-team-refresh',deleted);return()=>window.removeEventListener('semantic-studio-team-refresh',deleted);},[]);
 return visible?<div className="rule-editor"><select aria-label="datatype draft" value={datatype} onChange={event=>setDatatype(event.target.value)}><option value="string">String</option><option value="integer">Integer</option></select><label>Unique language<input type="checkbox" checked={unique} onChange={event=>setUnique(event.target.checked)}/></label></div>:<p>Rule deleted by refresh</p>;
}
function ChoiceWizard(){
 const [step,setStep]=useState(1);const [encoding,setEncoding]=useState('utf8');
 return <section className="data-wizard" data-team-draft-complete={step===3}>{step===1?<select aria-label="mapping encoding" value={encoding} onChange={event=>setEncoding(event.target.value)}><option value="utf8">UTF8</option><option value="latin1">Latin1</option></select>:<p>{encoding}</p>}<button onClick={()=>setStep(value=>value+1)}>{step===1?'Next step':'Complete import'}</button></section>;
}
function RoleSensitiveEditor(){
 return useTeam().canEdit?<ControlledDraft/>:<p>Read-only replacement</p>;
}
function HeldOwlBuilder(){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const deleted=()=>setVisible(false);window.addEventListener('semantic-studio-team-refresh',deleted);return()=>window.removeEventListener('semantic-studio-team-refresh',deleted);},[]);
 const choices={properties:{items:[{iri:'https://example.test/p',label:'has part',kind:'relationship' as const}],total:1},classes:{items:[{iri:'https://example.test/A',label:'A'},{iri:'https://example.test/B',label:'B'}],total:2},things:{items:[],total:0}};
 return visible?<RuleBuilder cls="https://example.test/Item" name="Item" choices={choices} initial={{type:'every',property:'https://example.test/p',kind:'some',n:'1',filler:'https://example.test/A',value:'',with:null,other:null}} busy={false} onSubmit={()=>{}} onCancel={()=>setVisible(false)}/>:<p>OWL rule deleted by refresh</p>;
}
function HeldBooleanValue(){
 const [value,setValue]=useState('false');const [draft,setDraft]=useState(false);
 return <div className="example-field-input" data-team-draft-complete={!draft}><ValueInput type={{kind:'typed',datatype:'xsd:boolean'}} value={value} lang="en" languages={['en']} label="Boolean draft" onChange={next=>{setValue(next);setDraft(true);}}/><button onClick={()=>setDraft(false)}>Commit value</button></div>;
}
function OtherDraftChoice({owner}:{owner:string}){
 const [value,setValue]=useState('first');return <div className={owner}><select aria-label="Other draft choice" value={value} onChange={event=>setValue(event.target.value)}><option value="first">First</option><option value="second">Second</option></select></div>;
}
function EditPermissionProbe(){
 const team=useTeam();return <span data-testid="permission">{String(team.canEdit)}</span>;
}
describe('team authentication shell',()=>{
 beforeEach(()=>{vi.clearAllMocks();localStorage.setItem('semantic-studio.uiLocale.v1','en');mocks.authStatus.mockResolvedValue(status);mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:1}});mocks.listProjects.mockResolvedValue([{name:'Latest shared project'}]);mocks.listOntologies.mockResolvedValue([]);mocks.getLayout.mockResolvedValue({positions:{}});});
 afterEach(()=>{cleanup();vi.restoreAllMocks();});
 it('gates an unauthenticated workspace and exposes keyboard-native sign in and locale controls',async()=>{
  mocks.authStatus.mockResolvedValue({...status,authenticated:false,user:null,csrf:null});
  render(<I18nProvider><TeamProvider><input aria-label="draft" /></TeamProvider></I18nProvider>);
  await screen.findByRole('button',{name:'Sign in with Google'});
  expect(screen.queryByRole('textbox',{name:'draft'})).toBeNull();
  expect(screen.getByRole('combobox',{name:'UI language'})).toBeTruthy();
 });
 it('retains the exact mounted input through expiry, language change and same-user reauthentication',async()=>{
  render(<I18nProvider><TeamProvider><input aria-label="draft" defaultValue="犬 @ja" /><EditPermissionProbe/></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'draft'});
  fireEvent.change(input,{target:{value:'unsent <script>犬</script>'}});
  await act(()=>observeTeamResponse(new Response('{}',{status:401})));
  expect(document.contains(input)).toBe(true);
  expect(screen.getByTestId("permission").textContent).toBe("true");
  expect((input as HTMLInputElement).value).toBe('unsent <script>犬</script>');
  fireEvent.change(screen.getByRole('combobox',{name:'UI language'}),{target:{value:'ja'}});
  expect(screen.getByText(/未送信の入力は保持されます/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'ログイン状態を確認'}));
  await waitFor(()=>expect(screen.queryByText(/セッションの有効期限が切れました/)).toBeNull());
  expect(screen.getByRole('textbox',{name:'draft'})).toBe(input);
 });
 it('does not mix retained inputs with a different account after expiry',async()=>{
  render(<I18nProvider><TeamProvider><input aria-label="draft" defaultValue="owner-a" /></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'draft'});
  await act(()=>observeTeamResponse(new Response('{}',{status:401})));
  mocks.authStatus.mockResolvedValue({...status,user:{...status.user,sub:'b',email:'b@example.test'}});
  fireEvent.click(screen.getByRole('button',{name:'Check sign-in'}));
  await waitFor(()=>expect(mocks.authStatus).toHaveBeenCalledTimes(2));
  expect(input.closest('[inert]')).not.toBeNull();
  expect((input as HTMLInputElement).value).toBe('owner-a');
 });
 it('keeps latest review available for live authored forms and releases cancelled inputs',async()=>{
  const view=render(<I18nProvider><TeamProvider><form><input aria-label="draft" defaultValue="" /></form><input type="search" aria-label="search" /></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'draft'});
  fireEvent.input(screen.getByRole('searchbox'),{target:{value:'filter only'}});
  await act(()=>observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict'}),{status:409})));
  expect((screen.getByRole('button',{name:'Load the latest version'}) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.input(input,{target:{value:'unsent authored text'}});
  expect((screen.getByRole('button',{name:'Load the latest version'}) as HTMLButtonElement).disabled).toBe(false);
  view.rerender(<I18nProvider><TeamProvider><input type="search" aria-label="search" /></TeamProvider></I18nProvider>);
  await waitFor(()=>expect((screen.getByRole('button',{name:'Load the latest version'}) as HTMLButtonElement).disabled).toBe(false));
 });

 it('lets the target onChange read native input before dirty-state rerenders',async()=>{
  render(<I18nProvider><TeamProvider><ControlledDraft/></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'controlled draft'}) as HTMLInputElement;
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
  // Dispatch without fireEvent's act wrapper: browsers invoke capture and
  // bubble listeners as separate React event batches.
  setter.call(input,'native 犬');
  input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'native 犬'}));
  await waitFor(()=>expect(input.value).toBe('native 犬'));
 });

 it('reviews current shared content then explicitly accepts its versions while keeping unsent input',async()=>{
  render(<I18nProvider><TeamProvider><ControlledDraft/></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'controlled draft'}) as HTMLInputElement;
  fireEvent.input(input,{target:{value:'unsent 犬'}});
  await act(()=>observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict',currentVersions:{workspace:2}}),{status:409})));
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
  fireEvent.click(screen.getByRole('button',{name:'Load the latest version'}));
  await screen.findByText('Latest shared project');
  expect(expectedTeamVersions()).toEqual({workspace:1});
  fireEvent.click(screen.getByRole('button',{name:'Use reviewed version for next attempt'}));
  expect(expectedTeamVersions()).toEqual({workspace:2});
  expect(input.value).toBe('unsent 犬');
  expect(screen.getByRole('textbox',{name:'controlled draft'})).toBe(input);
 });

 it('suspends a retained dialog trap so recovery keeps keyboard focus and Escape cannot discard input',async()=>{
  const close=vi.fn();
  render(<I18nProvider><TeamProvider><NewProjectDialog library={[]} onCreate={async()=>{}} onClose={close}/></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'Name'}) as HTMLInputElement;
  await act(async()=>{fireEvent.input(input,{target:{value:'retained 犬'}});});
  await act(()=>observeTeamResponse(new Response('{}',{status:401})));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  const login=screen.getByRole('button',{name:'Sign in with Google'});login.focus();
  const tab=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});
  document.dispatchEvent(tab);
  expect(tab.defaultPrevented).toBe(false);
  expect(document.activeElement).toBe(login);
  fireEvent.keyDown(document,{key:'Escape'});
  expect(close).not.toHaveBeenCalled();
  expect(input.value).toBe('retained 犬');
 });

 it('lets dirty-input logout be cancelled and confirms without unmounting retained input',async()=>{
  mocks.logoutTeam.mockResolvedValue({authenticated:false});
  const confirm=vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<I18nProvider><TeamProvider><ControlledDraft/></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'controlled draft'}) as HTMLInputElement;
  await act(async()=>{fireEvent.input(input,{target:{value:'keep this 犬'}});});
  fireEvent.click(screen.getByRole('button',{name:'Account: a@example.test'}));
  fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(mocks.logoutTeam).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox',{name:'controlled draft'})).toBe(input);
  fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  await screen.findByRole('button',{name:'Check sign-in'});
  expect(mocks.logoutTeam).toHaveBeenCalledTimes(1);
  expect(input.isConnected).toBe(true);
  expect(input.value).toBe('keep this 犬');
 });

 it('rejects a moving latest snapshot without advancing the baseline or losing input',async()=>{
  render(<I18nProvider><TeamProvider><ControlledDraft/></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'controlled draft'}) as HTMLInputElement;
  fireEvent.input(input,{target:{value:'unsent while moving'}});
  await act(()=>observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict'}),{status:409})));
  mocks.teamVersions.mockResolvedValueOnce({resourceVersions:{workspace:2}}).mockResolvedValueOnce({resourceVersions:{workspace:3}});
  fireEvent.click(screen.getByRole('button',{name:'Load the latest version'}));
  await screen.findByText('The shared version changed during review. Load the latest version again.');
  expect(screen.queryByRole('button',{name:'Use reviewed version for next attempt'})).toBeNull();
  expect(expectedTeamVersions()).toEqual({workspace:1});
  expect(input.value).toBe('unsent while moving');
 });
 it('ignores a latest preview that resolves after UI language changes',async()=>{
  let resolve:(value:unknown)=>void=()=>{};
  mocks.listProjects.mockReturnValue(new Promise(done=>{resolve=done;}));
  render(<I18nProvider><TeamProvider><ControlledDraft/></TeamProvider></I18nProvider>);
  await screen.findByRole('textbox',{name:'controlled draft'});
  await act(()=>observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict'}),{status:409})));
  fireEvent.click(screen.getByRole('button',{name:'Load the latest version'}));
  fireEvent.change(screen.getByRole('combobox',{name:'UI language'}),{target:{value:'ja'}});
  await act(async()=>resolve([{name:'stale preview'}]));
  expect(screen.queryByText('stale preview')).toBeNull();
  expect(expectedTeamVersions()).toEqual({workspace:1});
 });

 it.each(['select','checkbox'])('retains an unsent rule %s choice through a remote-delete poll and cancelled logout',async kind=>{
  let poll:()=>void=()=>{};
  vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
  render(<I18nProvider><TeamProvider><HeldRuleChoice/></TeamProvider></I18nProvider>);
  const select=await screen.findByRole('combobox',{name:'datatype draft'}) as HTMLSelectElement;
  const check=screen.getByRole('checkbox',{name:'Unique language'}) as HTMLInputElement;
  if(kind==='select')fireEvent.change(select,{target:{value:'integer'}});else fireEvent.click(check);
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
  await act(async()=>{poll();});
  await screen.findByRole('region',{name:'This item has changed'});
  expect(document.contains(select)).toBe(true);
  expect(kind==='select'?select.value:check.checked).toBe(kind==='select'?'integer':true);
  expect(screen.queryByText('Rule deleted by refresh')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Keep my input'}));
  fireEvent.click(screen.getByRole('button',{name:'Account: a@example.test'}));
  fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  expect(confirm).toHaveBeenCalled();
  expect(mocks.logoutTeam).not.toHaveBeenCalled();
 });

 it('retains mapping choices between wizard steps and clears ownership only after completion',async()=>{
  let poll:()=>void=()=>{};
  vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);mocks.logoutTeam.mockResolvedValue({authenticated:false});
  render(<I18nProvider><TeamProvider><ChoiceWizard/></TeamProvider></I18nProvider>);
  fireEvent.change(await screen.findByRole('combobox',{name:'mapping encoding'}),{target:{value:'latin1'}});
  fireEvent.click(screen.getByRole('button',{name:'Next step'}));
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
  await act(async()=>{poll();});
  await screen.findByRole('region',{name:'This item has changed'});
  fireEvent.click(screen.getByRole('button',{name:'Keep my input'}));
  expect(screen.getByText('latin1')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Complete import'}));
  await act(async()=>{await new Promise(done=>setTimeout(done,0));});
  fireEvent.click(screen.getByRole('button',{name:'Account: a@example.test'}));
  fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  await screen.findByRole('button',{name:'Check sign-in'});
  expect(confirm).not.toHaveBeenCalled();
 });
 it('retains a new-project kind-only draft when another member changes the workspace',async()=>{
  let poll:()=>void=()=>{};
  vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  render(<I18nProvider><TeamProvider><NewProjectDialog library={[]} onCreate={async()=>{}} onClose={()=>{}}/></TeamProvider></I18nProvider>);
  const kind=await screen.findByRole('radio',{name:/^Ontology/}) as HTMLInputElement;
  fireEvent.click(kind);
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
  await act(async()=>{poll();});
  await screen.findByRole('region',{name:'This item has changed'});
  expect(kind.checked).toBe(true);expect(kind.isConnected).toBe(true);
 });

 it('suspends a dirty editor on role demotion and restores the same mounted input after access returns',async()=>{
  let poll:()=>void=()=>{};
  vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  render(<I18nProvider><TeamProvider><RoleSensitiveEditor/></TeamProvider></I18nProvider>);
  const input=await screen.findByRole('textbox',{name:'controlled draft'}) as HTMLInputElement;
  fireEvent.input(input,{target:{value:'unsent before role changed'}});
  mocks.authStatus.mockResolvedValue({...status,user:{...status.user,role:'viewer',version:2}});
  await act(async()=>{poll();});
  expect(input.isConnected).toBe(true);
  expect(input.closest('[inert]')).not.toBeNull();
  expect(screen.queryByText('Read-only replacement')).toBeNull();
  expect(screen.getByText(/Your role changed/)).toBeTruthy();
  mocks.authStatus.mockResolvedValue({...status,user:{...status.user,role:'editor',version:3}});
  fireEvent.click(screen.getByRole('button',{name:'Check sign-in'}));
  await screen.findByRole('textbox',{name:'controlled draft'});
  expect(screen.getByRole('textbox',{name:'controlled draft'})).toBe(input);
  expect(input.value).toBe('unsent before role changed');
 });

 it('retains a select-only actual OWL RuleBuilder draft through remote deletion and cancelled logout',async()=>{
  let poll:()=>void=()=>{};
  vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
  render(<I18nProvider><TeamProvider><HeldOwlBuilder/></TeamProvider></I18nProvider>);
  await screen.findByRole('combobox',{name:'Rule'});
  const filler=document.querySelector('.rule-builder select[id$="-filler"]') as HTMLSelectElement;
  expect(filler).not.toBeNull();
  fireEvent.change(filler,{target:{value:'https://example.test/B'}});
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
  await act(async()=>{poll();});
  expect(filler.isConnected).toBe(true);
  expect(filler.value).toBe('https://example.test/B');
  expect(screen.queryByText('OWL rule deleted by refresh')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Keep my input'}));
  fireEvent.click(screen.getByRole('button',{name:'Account: a@example.test'}));
  fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  expect(confirm).toHaveBeenCalled();expect(mocks.logoutTeam).not.toHaveBeenCalled();
 });

 it.each(['canvas-attr-form','example-field-input'])('owns pending select-only %s choices without a form ancestor',async owner=>{
  let poll:()=>void=()=>{};
  vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  const published=vi.fn();window.addEventListener('semantic-studio-team-refresh',published);
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
  try{
   render(<I18nProvider><TeamProvider><OtherDraftChoice owner={owner}/></TeamProvider></I18nProvider>);
   const select=await screen.findByRole('combobox',{name:'Other draft choice'}) as HTMLSelectElement;
   fireEvent.change(select,{target:{value:'second'}});mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});
   await act(async()=>{poll();});
   await screen.findByRole('region',{name:'This item has changed'});
   expect(published).not.toHaveBeenCalled();expect(select.value).toBe('second');
   fireEvent.click(screen.getByRole('button',{name:'Keep my input'}));fireEvent.click(screen.getByRole('button',{name:'Account: a@example.test'}));fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
   expect(confirm).toHaveBeenCalled();expect(mocks.logoutTeam).not.toHaveBeenCalled();
  }finally{window.removeEventListener('semantic-studio-team-refresh',published);}
 });
 it('owns an actual ValueInput boolean switch until successful value completion',async()=>{
  let poll:()=>void=()=>{};
  vi.spyOn(globalThis,'setInterval').mockImplementation(handler=>{poll=handler as ()=>void;return 0 as unknown as ReturnType<typeof setInterval>;});
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);mocks.logoutTeam.mockResolvedValue({authenticated:false});
  render(<I18nProvider><TeamProvider><HeldBooleanValue/></TeamProvider></I18nProvider>);
  fireEvent.click(await screen.findByRole('switch'));
  mocks.teamVersions.mockResolvedValue({resourceVersions:{workspace:2}});await act(async()=>{poll();});
  await screen.findByRole('region',{name:'This item has changed'});fireEvent.click(screen.getByRole('button',{name:'Keep my input'}));
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('button',{name:'Commit value'}));await act(async()=>{await new Promise(done=>setTimeout(done,0));});
  fireEvent.click(screen.getByRole('button',{name:'Account: a@example.test'}));fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  await screen.findByRole('button',{name:'Check sign-in'});expect(confirm).not.toHaveBeenCalled();
 });

});
