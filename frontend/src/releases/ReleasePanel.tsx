/*
FILE: frontend/src/releases/ReleasePanel.tsx
SUMMARY
    Owner-bound, bilingual review and approval of immutable dictionary versions.
BASIC IDEA
    Keep metadata through refusals. Only the exact preview the user reviewed
    can be approved; project/session changes invalidate all asynchronous reads.
INPUTS / INPUT SOURCES
    Project identity, current role and authenticated release APIs.
EXPECTED OUTPUT
    Accessible review controls and explicit approval, separate from distribution.
*/
import {useEffect,useId,useRef,useState} from 'react';
import {previewRelease,approveRelease,listReleases,downloadRelease} from '../api';
import type {ReleasePreview,ReleaseSummary} from '../api';
import type {Role} from '../team/types';
import {teamAuthEpoch} from '../team/client';
import {useI18n} from '../i18n/I18nProvider';
import {useDialogTrap} from '../components/useDialogTrap';
import OperationError from '../components/OperationError';
import {triggerDownload} from '../download';

type Props={projectId:string;role:Role;onClose:()=>void;suspended?:boolean};
export default function ReleasePanel(props:Props){return <Session key={props.projectId} {...props}/>;}
function Session({projectId,role,onClose,suspended=false}:Props){
 const {t,locale}=useI18n();const id=useId();
 const panel=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useDialogTrap(panel,heading,onClose);
 const [source,setSource]=useState(''),[license,setLicense]=useState('');
 const [preview,setPreview]=useState<ReleasePreview|null>(null),[reviewed,setReviewed]=useState(false);
 const [items,setItems]=useState<ReleaseSummary[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0);
 const [error,setError]=useState<unknown>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[success,setSuccess]=useState(false);
 const readRun=useRef(0),seenEpoch=useRef(teamAuthEpoch());
 const run=useRef(0),reading=useRef(false),live=useRef(true),pending=useRef(false);
 const epoch=teamAuthEpoch();const owner=useRef(epoch);owner.current=epoch;
 useEffect(()=>{live.current=true;return()=>{live.current=false;run.current++;};},[]);
 const current=(basis:number)=>live.current&&owner.current===basis&&teamAuthEpoch()===basis;
 async function load(start:number){
  if(reading.current||suspended)return;reading.current=true;setLoading(true);const basis=teamAuthEpoch(),read=++readRun.current;
  try{const page=await listReleases(projectId,start,50);if(current(basis)){setItems(old=>start===0?page.items:[...old,...page.items]);setOffset(start+page.items.length);setTotal(page.total);setError(null);}}
  catch(e){if(current(basis))setError(e);}finally{if(read===readRun.current){reading.current=false;if(current(basis))setLoading(false);}}
 }
 useEffect(()=>{
  if(seenEpoch.current!==epoch){seenEpoch.current=epoch;run.current++;readRun.current++;pending.current=false;reading.current=false;setBusy(false);setLoading(false);setPreview(null);setReviewed(false);setError(null);setSuccess(false);}
 },[epoch]);
 useEffect(()=>{void load(0);},[projectId,epoch]);
 function changed(value:string,field:'source'|'license'){
  if(field==='source')setSource(value);else setLicense(value);
  run.current++;pending.current=false;setBusy(false);setPreview(null);setReviewed(false);setSuccess(false);
 }
 async function execute(approve:boolean){
  if(pending.current||suspended||role==='viewer'||approve&&(role!=='admin'||!reviewed||!preview)||!source.trim()||!license.trim())return;
  pending.current=true;setBusy(true);setError(null);setSuccess(false);const request=++run.current,basis=teamAuthEpoch();
  try{
   if(approve){await approveRelease(projectId,{source,license},preview!);if(current(basis)&&request===run.current){setPreview(null);setReviewed(false);setSuccess(true);void load(0);}}
   else {const result=await previewRelease(projectId,{source,license});if(current(basis)&&request===run.current){setPreview(result);setReviewed(false);}}
  }catch(e){if(current(basis)&&request===run.current){setError(e);if(approve){setPreview(null);setReviewed(false);}}}
  finally{if(current(basis)&&request===run.current){pending.current=false;setBusy(false);}}
 }
 async function download(rid:string){const basis=teamAuthEpoch();try{const result=await downloadRelease(projectId,rid);if(current(basis))triggerDownload(result.blob,result.filename);}catch(e){if(current(basis))setError(e);}}
 function previewDownload(){if(!preview)return;const bytes=Uint8Array.from(atob(preview.package),c=>c.charCodeAt(0));triggerDownload(new Blob([bytes],{type:'application/zip'}),'release-preview.zip');}
 return <><div className="modal-backdrop" aria-hidden="true"/><div ref={panel} className="about-panel release-panel" role="dialog" aria-modal="true" aria-labelledby={id} data-release-panel>
  <h2 ref={heading} tabIndex={-1} id={id}>{t('release.title')}</h2>
  <p>{t('release.note')}</p>
  {role!=='viewer'&&<>
   <label>{t('release.source')}<input value={source} onChange={e=>changed(e.target.value,'source')} data-team-draft-complete={success?'true':'false'}/></label>
   <label>{t('release.license')}<textarea value={license} onChange={e=>changed(e.target.value,'license')} data-team-draft-complete={success?'true':'false'}/></label>
   <button type="button" aria-disabled={busy||suspended||!source.trim()||!license.trim()} onClick={()=>void execute(false)}>{t('release.preview')}</button>
   {preview&&<section aria-label={t('release.preview')}>
    <p>{t('release.counts',{entities:preview.entityCount,statements:preview.statementCount})}</p>
    <p>{t('release.exclusions',{predicate:preview.excludedByReason.predicate??0,blankNode:preview.excludedByReason.blankNode??0})}</p>
    <p>{t('release.contentWarning')}</p>
    <button type="button" onClick={previewDownload}>{t('release.previewDownload')}</button>
    <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>{t('release.review')}</label>
   </section>}
   {role==='admin'&&<button type="button" aria-disabled={busy||suspended||!preview||!reviewed} onClick={()=>void execute(true)}>{t('release.approve')}</button>}
  </>}
  <p role="status" aria-live="polite">{busy?t('release.busy'):success?t('release.success'):''}</p>
  {error!==null&&<div role="alert"><OperationError failure={{cause:error}}/></div>}
  <section aria-label={t('release.title')} aria-busy={loading}>
   {!loading&&items.length===0&&<p>{t('release.empty')}</p>}
   <ul>{items.map(item=><li key={item.releaseId}><code>{item.releaseId}</code> <time>{new Date(item.approvedAt).toLocaleString(locale)}</time> <button type="button" onClick={()=>void download(item.releaseId)}>{t('release.download')}</button></li>)}</ul>
   <button type="button" aria-disabled={loading||suspended} onClick={()=>void load(0)}>{t('release.refresh')}</button>
   {offset<total&&<button type="button" aria-disabled={loading||suspended} onClick={()=>void load(offset)}>{t('release.more')}</button>}
  </section>
  <button type="button" onClick={onClose}>{t('release.close')}</button>
 </div></>;
}
