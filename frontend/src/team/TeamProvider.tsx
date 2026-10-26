/*
================================================================================
FILE: frontend/src/team/TeamProvider.tsx
SUMMARY
    Authentication gate, retained-input recovery, document history and version polling.
BASIC IDEA
    Native controls expose visible names and use the shared focus-visible rule.
    Team identity and input owners remain independent of interface language.
INPUTS / INPUT SOURCES
    Typed server responses and explicit user actions.
EXPECTED OUTPUT
    Accessible team controls without automatic replay or lost mounted inputs.
================================================================================
*/
import {createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from "react";
import type {ReactNode} from "react";
import {authStatus,teamVersions,logoutTeam,listSavedQueries,getLayout,getDocumentSource,listProjects,listOntologies} from "../api";
import {useI18n} from "../i18n/I18nProvider";
import {projectStore,useProjectSelector} from "../state/projectStore";
import UiLanguageSelect from "../components/UiLanguageSelect";
import {acceptTeamVersions,configureTeam,expectedTeamVersions,subscribeTeam} from "./client";
import {hasQueryDrafts,queryDraftGeneration,subscribeQueryDrafts,pendingQueryDrafts} from "./queryDrafts";
import {hasLayoutDrafts,layoutDraftGeneration,pendingLayoutDrafts,reviewLayoutDrafts,subscribeLayoutDrafts,type LayoutDraftOwner} from "./layoutDrafts";
import OperationError from "../components/OperationError";
import {makeUiMessage} from "../i18n/uiMessage";
import type {AuthStatus,ResourceVersions} from "./types";
import {LoginPanel} from "./LoginPanel";
import {AccountMenu} from "./AccountMenu";
import {ConflictPanel} from "./ConflictPanel";
interface TeamAccess {mode:"local"|"team";canEdit:boolean;canAdmin:boolean;suspended:boolean;hasUnsentInput?:(exceptEditor?:boolean)=>boolean}
export const TeamContext=createContext<TeamAccess>({mode:"local" as "local"|"team",canEdit:true,canAdmin:true,suspended:false});
export const useTeam=()=>useContext(TeamContext);
export function TeamProvider({children}:{children:ReactNode}){
 const {t,locale}=useI18n();const [status,setStatus]=useState<AuthStatus|null>(null);const [entered,setEntered]=useState(false);const [expired,setExpired]=useState(false);const [failed,setFailed]=useState(false);const [conflict,setConflict]=useState(false);const [notice,setNotice]=useState(false);
 useSyncExternalStore(subscribeLayoutDrafts,layoutDraftGeneration,layoutDraftGeneration);
 useSyncExternalStore(subscribeQueryDrafts,queryDraftGeneration,queryDraftGeneration);
 const [retryFailure,setRetryFailure]=useState<{owner:LayoutDraftOwner;cause:unknown}|null>(null);
 const retryRun=useRef(0);
 const deferredLayoutRefresh=useRef<{projectId:string;doc:string}|null>(null);
 const [accessChange,setAccessChange]=useState<AuthStatus|null>(null);
 const authRun=useRef(0);
 const owner=useRef<string|null>(null);const host=useRef<HTMLDivElement>(null);const dirtyFields=useRef(new Map<Element,string>());const [inputGeneration,setInputGeneration]=useState(0);
 const [review,setReview]=useState<{text:string;versions:ResourceVersions;owner:string}|null>(null);
 const [reviewBusy,setReviewBusy]=useState(false);const [reviewMoved,setReviewMoved]=useState(false);const reviewRun=useRef(0);
 const activeDoc=useProjectSelector(state=>state.activeDoc);
 const projectId=useProjectSelector(state=>state.project?.id??null);
 const editorDraft=useProjectSelector(state=>state.editorDraft!==null);
 const creating=useProjectSelector(state=>state.creating!==null);
 const [refreshing,setRefreshing]=useState(false);
 const reviewOwner=`${projectId??"workspace"}:${activeDoc}:${locale}`;
 const reviewOwnerRef=useRef(reviewOwner);reviewOwnerRef.current=reviewOwner;
 useEffect(()=>{reviewRun.current++;setReview(null);setReviewBusy(false);setReviewMoved(false);},[reviewOwner,expired]);
 // Detached inputs have completed or cancelled their form and no longer
 // own a pending edit. Search and filter inputs never enter this registry.
 for(const element of dirtyFields.current.keys()) if(!element.isConnected||element.getAttribute("data-team-draft-complete")==="true")dirtyFields.current.delete(element);
 const dirty=editorDraft||creating||dirtyFields.current.size>0||hasLayoutDrafts()||hasQueryDrafts();
 const cleanNow=(exceptEditor=false)=>{
  const current=projectStore.getSnapshot();
  return (exceptEditor||current.editorDraft===null)&&current.creating===null&&!hasLayoutDrafts()&&!hasQueryDrafts()&&
    ![...dirtyFields.current.keys()].some(element=>element.isConnected&&element.getAttribute("data-team-draft-complete")!=="true");
 };
 const reloadLatest=useRef<()=>Promise<void>>(async()=>{});
 void inputGeneration;
 // Rendering the original authoring controls while inert preserves component
 // state. Actual current privileges are shown outside and enforced by the API.
 const losesAccess=(next:AuthStatus)=>status?.mode==="team"&&(
  (status.user?.role!=="viewer"&&next.user?.role==="viewer")||
  (status.user?.role==="admin"&&next.user?.role!=="admin"));
 const refresh=async()=>{
   const run=++authRun.current;
   setFailed(false);
   try{const next=await authStatus();if(run!==authRun.current)return;
     // A different Google identity never inherits another person's retained
     // forms. Keep the original tree suspended until its owner signs in again.
     if(entered&&next.mode==="team"&&next.user?.sub!==owner.current){setExpired(true);return;}
     if(entered&&next.authenticated&&losesAccess(next)&&!cleanNow()){
       configureTeam(next);setAccessChange(next);setExpired(false);return;
     }
     configureTeam(next);setStatus(next);setAccessChange(null);
     if(next.mode==="local"||next.authenticated){
       if(!entered&&next.mode==="team"){const latest=await teamVersions();if(run!==authRun.current)return;acceptTeamVersions(latest.resourceVersions);}
       owner.current=next.user?.sub??null;setEntered(true);setExpired(false);
     }else setExpired(entered);
   }catch{if(run===authRun.current)setFailed(true);}
 };
 useEffect(()=>{void refresh();return()=>{authRun.current++;};},[]);
 useEffect(()=>subscribeTeam(event=>{
  if(event.kind==="expired")setExpired(true);else{reviewRun.current++;setReview(null);setReviewBusy(false);setConflict(true);setNotice(true);}
 }),[]);
 useEffect(()=>{
  if(status?.mode!=="team"||!status.authenticated||expired)return;
  let current=true;let running=false;
  const poll=async()=>{if(running)return;running=true;try{
   const identity=await authStatus();if(!current)return;
   if(!identity.authenticated||identity.user?.sub!==owner.current){setExpired(true);return;}
   if(losesAccess(identity)&&!cleanNow()){configureTeam(identity);setAccessChange(identity);return;}
   setAccessChange(null);
   if(identity.user?.role!==status.user?.role||identity.user?.version!==status.user?.version||identity.csrf!==status.csrf){configureTeam(identity);setStatus(identity);}
   const result=await teamVersions();if(!current)return;
   const base=expectedTeamVersions();if(Object.keys({...base,...result.resourceVersions}).some(key=>base[key]!==result.resourceVersions[key])){
    setConflict(true);
    if(cleanNow()){await reloadLatest.current();if(!cleanNow())setNotice(true);}
    else setNotice(true);
   }
  }catch{/* The next poll retries reads; mutations are never replayed. */}finally{running=false;}};
  const timer=setInterval(()=>void poll(),10000);return()=>{current=false;clearInterval(timer);};
 },[status,expired]);
 useEffect(()=>{
  const observer=new MutationObserver(()=>{
    let changed=false;for(const element of dirtyFields.current.keys())if(!element.isConnected||element.getAttribute("data-team-draft-complete")==="true"){dirtyFields.current.delete(element);changed=true;}
    if(changed)setInputGeneration(value=>value+1);
  });
  if(host.current)observer.observe(host.current,{childList:true,subtree:true,attributes:true,attributeFilter:["data-team-draft-complete"]});
  return()=>observer.disconnect();
 },[entered]);
 useEffect(()=>{if(expired||notice||accessChange!==null)host.current?.setAttribute("inert","");else host.current?.removeAttribute("inert");},[expired,notice,accessChange]);
 const reload=async()=>{
  if(!cleanNow()||refreshing)return;setRefreshing(true);setFailed(false);
  const ownerId=projectId;
  try{
   const latest=await teamVersions();
   if((projectStore.getSnapshot().project?.id??null)!==ownerId)return;
   if(!cleanNow())return;
   if(ownerId&&!await projectStore.reloadForTeam(()=>cleanNow()))return;
   acceptTeamVersions(latest.resourceVersions);window.dispatchEvent(new Event("semantic-studio-team-refresh"));
   setConflict(false);setNotice(false);dirtyFields.current.clear();
  }catch{setFailed(true);}finally{setRefreshing(false);}
 };
 reloadLatest.current=reload;
 const reviewLatest=async()=>{
  const run=++reviewRun.current;const identity=reviewOwner;
  setReview(null);setReviewBusy(true);setReviewMoved(false);setFailed(false);
  const current=()=>run===reviewRun.current&&identity===reviewOwnerRef.current;
  try{
   const before=(await teamVersions()).resourceVersions;
   const text=projectId?await Promise.all([getDocumentSource(projectId,activeDoc),getLayout(projectId,activeDoc)]).then(([source,layout])=>source.text+"\n\n"+JSON.stringify(layout,null,2)):
     [...await listProjects(),...await listOntologies()].map(item=>item.name).join("\n");
   const queries=await Promise.all([...new Set(pendingQueryDrafts().flatMap(owner=>owner.ontologyId?[owner.ontologyId]:[]))].map(ontology=>listSavedQueries(ontology)));
   const shown=queries.length?text+"\n\n"+JSON.stringify(queries.flat(),null,2):text;
   const after=(await teamVersions()).resourceVersions;
   if(!current())return;
   const keys=Object.keys({...before,...after});
   if(keys.some(key=>before[key]!==after[key])){setReviewMoved(true);return;}
   setReview({text:shown,versions:after,owner:identity});
  }catch{if(current())setFailed(true);}finally{if(current())setReviewBusy(false);}
 };
 const acceptReview=()=>{
  if(!review||review.owner!==reviewOwner||reviewBusy)return;
  if(projectId)reviewLayoutDrafts(projectId,activeDoc,review.versions);
  acceptTeamVersions(review.versions);setReview(null);setConflict(false);setNotice(false);
 };
 const logout=async()=>{if(!cleanNow()&&!window.confirm(t("team.logout.confirm")))return;try{await logoutTeam();setExpired(true);}catch{setFailed(true);}};
 const retryLayout=async(owner:LayoutDraftOwner)=>{
  const run=++retryRun.current;setRetryFailure(null);
  try{
   await owner.retry();
   if(projectStore.getSnapshot().project?.id===owner.projectId&&projectStore.getSnapshot().activeDoc===owner.doc){
    if(cleanNow())window.dispatchEvent(new Event("semantic-studio-team-refresh"));
    else deferredLayoutRefresh.current={projectId:owner.projectId,doc:owner.doc};
   }
  }catch(error){if(run===retryRun.current)setRetryFailure({owner,cause:error});}
 };
 useEffect(()=>{
  const pending=deferredLayoutRefresh.current;if(!pending)return;
  if(projectId!==pending.projectId||activeDoc!==pending.doc){deferredLayoutRefresh.current=null;return;}
  if(cleanNow()){deferredLayoutRefresh.current=null;window.dispatchEvent(new Event("semantic-studio-team-refresh"));}
 },[dirty,projectId,activeDoc]);
 const trackDraftControl=(target:EventTarget)=>{
  if(status?.mode!=="team")return;
  const previousSize=dirtyFields.current.size;
  if(!(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target instanceof HTMLButtonElement))return;
  if(target.closest(".turtle-editor, .create-form, .canvas-draft, .sparql-textarea"))return;
  // These containers own unsent draft choices across field rerenders and
  // wizard steps. Immediate commit controls outside them do not become drafts.
  const owner=target.closest(".rule-editor, .rule-builder, .canvas-attr-form, .example-field-input, .delete-strategy, .approval-scope, .save-row, .data-wizard, .new-project-dialog form");
  if(target instanceof HTMLButtonElement&&target.getAttribute("role")!=="switch")return;
  const choice=target instanceof HTMLButtonElement||target instanceof HTMLSelectElement||(target instanceof HTMLInputElement&&["checkbox","radio","file"].includes(target.type));
  if(target instanceof HTMLInputElement&&target.type==="search")return;
  if(owner)dirtyFields.current.set(owner,"draft");
  else if(choice){const form=target.closest("form");if(!form)return;dirtyFields.current.set(form,"draft");}
  else{
   if(!target.closest("form, .edit-section, .shape-form, .query-pinned.editing, .onto-rename, .modal"))return;
   if(!dirtyFields.current.has(target))dirtyFields.current.set(target,target.defaultValue);
   if(target.value===dirtyFields.current.get(target))dirtyFields.current.delete(target);
  }
  // Chrome checkpoints microtasks between capture and bubble listeners. A
  // new task lets the target onChange read native values before rerendering.
  if(previousSize!==dirtyFields.current.size)window.setTimeout(()=>setInputGeneration(value=>value+1),0);
 };
 if(!status||!entered)return <>{failed?<section className="team-panel" role="alert"><p>{t("team.refresh.failed")}</p><UiLanguageSelect/><button type="button" onClick={()=>void refresh()}>{t("common.retry")}</button></section>:status?<LoginPanel refresh={refresh}/>:<p role="status">{t("common.loading")}</p>}</>;
 return <TeamContext.Provider value={{mode:status.mode,suspended:expired||notice||accessChange!==null,canEdit:status.mode==="local"||(status.user?.role!=="viewer"),canAdmin:status.mode==="local"||(status.user?.role==="admin"),hasUnsentInput:(exceptEditor=false)=>!cleanNow(exceptEditor)}}>
  {status.mode==="team"&&<>
   {expired?<LoginPanel expired refresh={refresh}/>:status.user&&<AccountMenu user={accessChange?.user??status.user} logout={logout} resourceKey={projectId?`graph:${projectId}-${activeDoc}`:"workspace"}/>}
   {!expired&&accessChange?.user&&<section className="team-panel" aria-label={t("team.workspace")}>
    <UiLanguageSelect/><p role="status">{t("team.access.changed",{role:t(`team.role.${accessChange.user.role}`)})}</p>
    <button type="button" onClick={()=>void refresh()}>{t("team.refresh")}</button>
   </section>}
   {!expired&&!notice&&accessChange===null&&pendingLayoutDrafts().filter(draft=>draft.failed).map(draft=><button type="button" key={draft.id} aria-disabled={draft.busy} onClick={()=>{if(!draft.busy)void retryLayout(draft.owner);}}>{t("team.layout.retry",{project:draft.owner.name,document:draft.owner.doc+".ttl"})}</button>)}
   {retryFailure!==null&&<section aria-label={t("team.layout.retry",{project:retryFailure.owner.name,document:retryFailure.owner.doc+".ttl"})}><p>{t("team.layout.retry",{project:retryFailure.owner.name,document:retryFailure.owner.doc+".ttl"})}</p><OperationError failure={{cause:retryFailure.cause,message:makeUiMessage("canvasUI.layoutFailed")}}/></section>}
   {failed&&<p role="alert">{t("team.refresh.failed")}</p>}
   {!expired&&notice&&<ConflictPanel dirty={dirty} busy={reviewBusy||refreshing} review={review?.owner===reviewOwner?review.text:null} onReview={()=>void reviewLatest()} onAccept={acceptReview} onKeep={()=>setNotice(false)}/>}
   {!expired&&reviewMoved&&<p role="alert">{t("team.conflict.reviewChanged")}</p>}
   {!expired&&conflict&&!notice&&<p role="status">{t("team.poll.changed")} <button type="button" onClick={()=>setNotice(true)}>{t("team.conflict.title")}</button></p>}
   {status.user?.role==="viewer"&&<p role="status">{t("team.forbidden")}</p>}
  </>}
  <div ref={host} aria-hidden={expired||notice||accessChange!==null||undefined} className="team-app-host" onInputCapture={event=>trackDraftControl(event.target)} onChangeCapture={event=>trackDraftControl(event.target)} onClickCapture={event=>{
    const toggle=event.target instanceof Element?event.target.closest('button[role="switch"]'):null;
    if(toggle)trackDraftControl(toggle);
  }}>{children}</div>
 </TeamContext.Provider>;
}
