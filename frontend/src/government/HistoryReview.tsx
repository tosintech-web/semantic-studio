/*
================================================================================
FILE: frontend/src/government/HistoryReview.tsx
SUMMARY
    Owned history reads, immutable reviews and explicit atomic submission.
BASIC IDEA
    Retain raw drafts across refusals and authentication changes; invalidate
    review whenever its full proposal, document revision or session changes.
INPUTS / INPUT SOURCES
    Complete history payload, current project/session and detached preview APIs.
EXPECTED OUTPUT
    Paged RDF review, explicit acknowledgement and a standard command/Undo.
================================================================================
*/
import {useEffect,useRef,useState} from 'react';
import {getGovernmentView,previewGovernmentCommand} from '../api';
import {useRunner,RunnerErrorDetails} from '../components/EditParts';
import OperationError from '../components/OperationError';
import {useI18n} from '../i18n/I18nProvider';
import {makeUiMessage} from '../i18n/uiMessage';
import {projectStore,useProjectSelector} from '../state/projectStore';
import {useTeam} from '../team/TeamProvider';
import {teamAuthEpoch} from '../team/client';
import {localToday} from './form';
import ProblemText from './ProblemText';
import {proposalKey} from './history';
import {useGovernmentLanguage} from './DisplayLanguage';
import type {GovernmentViewResult,HistoryPreview,ReferenceBasis} from './types';

export function useHistoryAuthority(projectId:string,targetIri?:string) {
 const [entry,setEntry]=useState<GovernmentViewResult|null>(null),[basis,setBasis]=useState<ReferenceBasis|null>(null),[error,setError]=useState<unknown>(null),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 const hydrated=useRef(false),appliedRetry=useRef(0),epoch=teamAuthEpoch(),language=useGovernmentLanguage();
 useEffect(()=>{let live=true;const c=new AbortController();setLoading(true);setError(null);
 getGovernmentView(projectId,localToday(),{recordIri:targetIri,displayLanguage:language,signal:c.signal}).then(view=>{if(live&&teamAuthEpoch()===epoch){
  // Authentication and label refreshes retain the chosen reference token.
  // Only initial hydration or explicit authority refresh accepts a new one.
  if(!hydrated.current||appliedRetry.current!==retry)setBasis(view.referenceBasis);
  if(!hydrated.current){setEntry(view);hydrated.current=true;}
  appliedRetry.current=retry;setLoading(false);
 }}).catch(e=>{if(live){appliedRetry.current=retry;setError(e);setLoading(false);}});
 return()=>{live=false;c.abort();};},[projectId,targetIri,retry,epoch,language]);
 return {entry,basis,setBasis,error,loading,refresh:()=>setRetry(r=>r+1)};
}

export function useHistoryReview(projectId:string,command:string,args:Record<string,unknown>,valid:boolean,onSaved:(iri:string)=>void) {
 const team=useTeam(),runner=useRunner('model');const revision=useProjectSelector(s=>s.documents.find(d=>d.doc==='model')?.revision??0);
 const epoch=teamAuthEpoch(),key=proposalKey([projectId,command,args,revision,epoch]);const liveKey=useRef(key);liveKey.current=key;
 const [review,setReview]=useState<{key:string;data:HistoryPreview}|null>(null),[error,setError]=useState<unknown>(null),[loading,setLoading]=useState(false),[ack,setAck]=useState<string|null>(null);
 const flight=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const preview=review?.key===key?review.data:null;
 const busy=loading||runner.busy||!team.canEdit||team.suspended;
 const read=async()=>{
  if(flight.current||busy||!valid||projectStore.getSnapshot().project?.id!==projectId)return;
  flight.current=true;setLoading(true);setError(null);setReview(null);setAck(null);const owner=key,auth=teamAuthEpoch();
  try {const data=await previewGovernmentCommand(projectId,command,args);if(mounted.current&&liveKey.current===owner&&teamAuthEpoch()===auth)setReview({key:owner,data});}
  catch(e){if(mounted.current&&liveKey.current===owner)setError(e);}
  finally{flight.current=false;if(mounted.current)setLoading(false);}
 };
 const apply=async()=>{
  if(busy||!valid||!preview||ack!==key||projectStore.getSnapshot().project?.id!==projectId||teamAuthEpoch()!==epoch)return;
  const result=await runner.run('history',command,{...args,previewBasis:preview.basis});
  if(!mounted.current)return;
  setReview(null);setAck(null);
  if(result&&runner.alive())onSaved(result.created??String(args.iri??''));
 };
 return {busy,mutating:runner.busy,suspended:team.suspended,valid,read,apply,preview,error,runner,ack:ack===key,setAck:(v:boolean)=>setAck(v?key:null)};
}
export type HistoryReviewState=ReturnType<typeof useHistoryReview>;
export function HistoryReviewPanel({review}:{review:HistoryReviewState}) {
 const {t}=useI18n();const [offset,setOffset]=useState(0);const preview=review.preview;
 useEffect(()=>setOffset(0),[preview?.basis]);
 const statements=preview?[...preview.delta.removed.map(value=>({kind:'removed' as const,value})),...preview.delta.added.map(value=>({kind:'added' as const,value}))]:[];
 return <>{review.error!==null&&<OperationError failure={{cause:review.error,message:makeUiMessage('government.reviewFailed')}}/>}
 {review.runner.errors.history&&<p role="alert">{review.runner.errors.history}</p>}<RunnerErrorDetails runner={review.runner}/>
 <button type="submit" aria-disabled={review.busy||!review.valid}>{t('government.reviewChanges')}</button>
 {preview&&<section className="government-review" aria-label={t('government.reviewChanges')}>
 <p>{t('government.deltaCounts',{added:preview.delta.addedTotal,removed:preview.delta.removedTotal})}</p>
 <p role="status">{t('government.entryCounts',{shown:statements.slice(offset,offset+50).length,total:statements.length})}</p>
 <ol start={offset+1}>{statements.slice(offset,offset+50).map((row,i)=><li key={`${offset+i}`}><strong>{t(row.kind==='added'?'government.addedStatement':'government.removedStatement')}</strong> <code>{row.value}</code></li>)}</ol>
 <button type="button" aria-disabled={offset===0} onClick={()=>{if(offset>0)setOffset(Math.max(0,offset-50));}}>{t('government.previousPage')}</button>
 <button type="button" aria-disabled={offset+50>=statements.length} onClick={()=>{if(offset+50<statements.length)setOffset(offset+50);}}>{t('government.nextPage')}</button>
 {preview.warnings.map((warning,index)=><p key={index} role="status"><ProblemText code={warning.code} iri={warning.iri}/></p>)}
 <label><input type="checkbox" checked={review.ack} aria-disabled={review.busy} onChange={e=>{if(!review.busy)review.setAck(e.target.checked);}}/>{t('government.reviewAcknowledgement')}</label>
 <button type="button" className="primary" aria-disabled={review.busy||!review.ack} onClick={()=>void review.apply()}>{t('government.applyReviewedChanges')}</button>
 </section>}</>;
}
