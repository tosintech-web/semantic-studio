/*
FILE: frontend/src/government/imports/MasterImportWizard.tsx
SUMMARY: Owner-bound source, mapping, review and atomic confirmation modal.
BASIC IDEA: Explicit steps retain source input and fence asynchronous ownership.
INPUTS / INPUT SOURCES: Local file, typed server reports and user choices.
EXPECTED OUTPUT: Accessible review and one atomic master update.
*/
import {useEffect,useReducer,useRef,useState} from 'react';
import {inspectMasterImport,prepareMasterImport,reviewMasterImport,applyMasterImport,downloadMasterTemplate} from '../../api';
import {useI18n} from '../../i18n/I18nProvider';
import {renderServerError,renderServerMessage} from '../../i18n/serverMessage';
import {useDialogTrap} from '../../components/useDialogTrap';
import {projectStore} from '../../state/projectStore';
import {teamAuthEpoch,teamInputOwner} from '../../team/client';
import {useTeam} from '../../team/TeamProvider';
import {triggerDownload} from '../../download';
import {usePendingEntry} from '../EntryParts';
import type {Inspection,Mapping,Mode,Options,Prepared,Reviewed,Review,ReviewOwner,Signed} from './types';
import {initial,transition} from './state';
import MappingStep from './MappingStep';
import ReviewStep from './ReviewStep';
import {FIELDS,SETS} from './fields';
export default function MasterImportWizard({owner,country,language,onClose,onApplied}:{owner:ReviewOwner;country:boolean;language:string;onClose:()=>void;onApplied:()=>void}) {
 const {t}=useI18n(),team=useTeam();const panel=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const [state,dispatch]=useReducer(transition,initial),stateRef=useRef(state);stateRef.current=state;
 const [authEpoch,setAuthEpoch]=useState(owner.authEpoch),[inputOwner]=useState(teamInputOwner);
 const [mode,setMode]=useState<Mode>(country?'countries':'organizations');
 const [file,setFile]=useState<File|null>(null),[options,setOptions]=useState<Options>({header:true});
 const [inspection,setInspection]=useState<Inspection|null>(null),[mapping,setMapping]=useState<Mapping>({columns:[],defaults:{},rowOverrides:[]}),[selected,setSelected]=useState<number[]>([]);
 const [prepared,setPrepared]=useState<Prepared|null>(null),[reviewed,setReviewed]=useState<Reviewed|null>(null),[error,setError]=useState<unknown>(null),[noop,setNoop]=useState(false);
 const [accepted,setAccepted]=useState<Review|null>(null);
 const request=useRef({basis:"",id:crypto.randomUUID()});const live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const owned=()=>live.current&&projectStore.getSnapshot().project?.id===owner.pid&&projectStore.session()===owner.session&&teamAuthEpoch()===authEpoch&&teamInputOwner()===inputOwner;
 const current=(token:number)=>owned()&&stateRef.current.token===token;
 const pending=!!file&&state.phase!=='result';usePendingEntry(owner.pid,pending);
 const close=()=>{if((!state.busy||!owned())&&(!pending||window.confirm(t('government.leave.confirm'))))onClose();};useDialogTrap(panel,heading,close);
 const canEdit=team.canEdit&&!team.suspended&&owned();
 const canRebind=team.canEdit&&!team.suspended&&projectStore.getSnapshot().project?.id===owner.pid&&projectStore.session()===owner.session&&teamInputOwner()===inputOwner&&teamAuthEpoch()!==authEpoch;
 const forgetReview=()=>{setPrepared(null);setReviewed(null);};
 const edit=()=>{dispatch({type:'edit'});forgetReview();setError(null);};
 const inspect=async()=>{if(!file||state.busy||!canEdit)return;const token=state.token;forgetReview();dispatch({type:'start'});setError(null);
  try {const value=await inspectMasterImport(owner.pid,file,mode,options);if(!current(token))return;setInspection(value);setSelected(Array.from({length:Math.min(value.totalRows,2000)},(_,i)=>i+1));setMapping({columns:value.columns.flatMap((name,column)=>(FIELDS[mode] as readonly string[]).includes(name)?[{column,field:name,op:SETS.has(name)?'append' as const:'set' as const,...(['names','aliases'].includes(name)?{language}:{} )}]:[]),defaults:{},rowOverrides:[]});dispatch({type:'inspected',token});}catch(cause){if(current(token)){setError(cause);dispatch({type:'failed',token});}}
 };
 const prepare=async()=>{if(!file||state.busy||!canEdit)return;const token=state.token;forgetReview();dispatch({type:'start'});setError(null);
  try {const p=await prepareMasterImport(owner.pid,file,mode,options,mapping,selected,owner.nonce);if(!current(token))return;setPrepared(p);if(!p.batch||!p.receipt){dispatch({type:'failed',token});return;}request.current.basis='';const r=await reviewMasterImport(owner.pid,{batch:p.batch,receipt:p.receipt});if(!current(token))return;setReviewed(r);dispatch({type:'reviewed',token});}catch(cause){if(current(token)){setError(cause);dispatch({type:'failed',token});}}
 };
 const signed=():Signed=>({batch:prepared!.batch!,receipt:prepared!.receipt!});
 const page=async(offset:number)=>{if(state.busy||!canEdit||!reviewed)return;const token=state.token;dispatch({type:'start'});
  try{const r=await reviewMasterImport(owner.pid,signed(),offset);if(!current(token))return;if(r.report.basis!==reviewed.report.basis){edit();return;}setReviewed(r);dispatch({type:'reviewed',token});}catch(cause){if(current(token)){setError(cause);dispatch({type:'failed',token});}}
 };
 const apply=async()=>{if(state.busy||!canEdit||!reviewed?.report.ready||!prepared?.batch||!prepared.receipt)return;const token=state.token;dispatch({type:'start'});setError(null);
  try{if(request.current.basis!==reviewed.report.basis)request.current={basis:reviewed.report.basis,id:crypto.randomUUID()};const value=await applyMasterImport(owner.pid,signed(),reviewed.report.basis,reviewed.resourceVersions,request.current.id);if(!current(token))return;setNoop(value.noop);setAccepted(value.importReport);projectStore.applied(value);dispatch({type:'applied',token});onApplied();}catch(cause){if(current(token)){setError(cause);dispatch({type:'failed',token});}}
 };
 const template=async(format:'csv'|'xlsx')=>{try{const result=await downloadMasterTemplate(owner.pid,mode,format);if(owned())triggerDownload(result.blob,result.filename);}catch(cause){if(owned())setError(cause);}};
 return <div className="dialog-backdrop"><div className="master-import-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby="master-import-title" aria-busy={state.busy}>
 {state.busy&&<p role="status">{t('common.loading')}</p>}
 <h2 id="master-import-title" tabIndex={-1} ref={heading}>{t('masterImport.title')}</h2><p>{t('masterImport.target',{id:owner.pid})}</p>
 <button type="button" disabled={state.busy&&owned()} onClick={close}>{t('about.close')}</button>
 {!canEdit&&<p role="alert">{t('masterImport.ownerChanged')}</p>}
 {canRebind&&<button type="button" onClick={()=>{setAuthEpoch(teamAuthEpoch());edit();}}>{t('masterImport.rebind')}</button>}
 {state.phase==='result'?<><p role="status">{t(noop?'masterImport.noop':'masterImport.complete')}</p>{accepted&&<p role="status">{t('masterImport.summary',{created:accepted.summary.created,updated:accepted.summary.updated,unchanged:accepted.summary.unchanged,errors:accepted.summary.errors,review:accepted.summary.needsReview,excluded:accepted.summary.excluded})}</p>}<button type="button" onClick={onClose}>{t('about.close')}</button></>:<>
 <fieldset disabled={state.busy}><legend>{t('masterImport.source')}</legend>
 {!country&&<label>{t('masterImport.mode')}<select value={mode} onChange={e=>{setMode(e.target.value as Mode);setInspection(null);edit();}}><option value="organizations">{t('masterImport.organizations')}</option><option value="relations">{t('masterImport.relations')}</option></select></label>}
 <label>{t('masterImport.file')}<input type="file" accept=".csv,.tsv,.xlsx" onChange={e=>{setFile(e.target.files?.[0]??null);setInspection(null);edit();}}/></label>
 <label><input type="checkbox" checked={options.header} onChange={e=>{setOptions({...options,header:e.target.checked});setInspection(null);edit();}}/>{t('masterImport.header')}</label>
 <label>{t('masterImport.separator')}<select value={options.separator??''} onChange={e=>{setOptions({...options,separator:e.target.value||undefined});setInspection(null);edit();}}><option value="">{t('masterImport.auto')}</option><option value=",">,</option><option value=";">;</option><option value={'\t'}>{t('masterImport.tab')}</option></select></label>
 <label>{t('masterImport.encoding')}<select value={options.encoding??''} onChange={e=>{setOptions({...options,encoding:e.target.value||undefined});setInspection(null);edit();}}><option value="">{t('masterImport.auto')}</option><option value="utf-8">UTF-8</option><option value="utf-8-sig">UTF-8 BOM</option><option value="windows-1252">Windows-1252</option></select></label>
 <label>{t('masterImport.sheet')}<input value={options.sheet??''} onChange={e=>{setOptions({...options,sheet:e.target.value||undefined});setInspection(null);edit();}}/></label>
 <label>{t('masterImport.headerRow')}<input type="number" min={1} max={1048576} value={options.headerRow??1} onChange={e=>{setOptions({...options,headerRow:Number(e.target.value)});setInspection(null);edit();}}/></label>
 <button type="button" disabled={!file||!canEdit} onClick={()=>void inspect()}>{t('masterImport.inspect')}</button>
 {(['csv','xlsx'] as const).map(format=><button type="button" key={format} onClick={()=>void template(format)}>{t('masterImport.template',{format})}</button>)}
 </fieldset>
 {inspection&&<><MappingStep inspection={inspection} mode={mode} mapping={mapping} onChange={v=>{setMapping(v);edit();}} selected={selected} onSelected={v=>{setSelected(v);edit();}} busy={state.busy} language={language}/>
 {inspection.totalRows>2000&&<p role="alert">{t('masterImport.tooMany')}</p>}
 <button type="button" disabled={state.busy||!canEdit||!selected.length||inspection.totalRows>2000} onClick={()=>void prepare()}>{t('masterImport.prepare')}</button></>}
 {!!prepared?.issues.length&&<ul role="alert">{prepared.issues.map((issue,i)=><li key={i}>{issue.row&&t('masterImport.line',{line:issue.row.startLine})} {renderServerMessage(issue,'',t)}<details><summary>{t('common.details')}</summary><code>{issue.reason}</code></details></li>)}</ul>}
 {reviewed&&<><ReviewStep report={reviewed.report} onPage={offset=>void page(offset)} onExclude={id=>{setSelected(selected.filter(v=>v!==id));setMapping({...mapping,rowOverrides:mapping.rowOverrides.filter(r=>r.rowId!==id)});edit();}} mapping={mapping} onMapping={v=>{setMapping(v);edit();}} busy={state.busy}/>
 <p>{t('masterImport.atomic')}</p><button type="button" className="primary" disabled={state.busy||!canEdit||!reviewed.report.ready} onClick={()=>void apply()}>{t(reviewed.report.noop?'masterImport.confirmNoop':'masterImport.apply')}</button></>}
 </>}
 {error!=null&&<div role="alert"><p>{renderServerError(error,t)}</p><details><summary>{t('common.details')}</summary><pre>{error instanceof Error?error.message:String(error)}</pre></details><p>{t('masterImport.retained')}</p></div>}
 </div></div>;
}
