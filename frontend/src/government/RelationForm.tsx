/*
================================================================================
FILE: frontend/src/government/RelationForm.tsx
SUMMARY
    Reviews and registers one complete dated government relationship.
BASIC IDEA
    Load exact supported history, retain drafts and submit one validated Change.
INPUTS / INPUT SOURCES
    Project/record identity, paged native pickers and reference authority.
EXPECTED OUTPUT
    Explicit direction/period/source input with an exact RDF preview and Undo.
================================================================================
*/
import {useEffect,useRef,useState} from 'react';
import {useI18n} from '../i18n/I18nProvider';
import {makeUiMessage} from '../i18n/uiMessage';
import OperationError from '../components/OperationError';
import {useTeam} from '../team/TeamProvider';
import {usePendingEntry} from './EntryParts';
import {RelationFields} from './HistoryParts';
import {HistoryReviewPanel,useHistoryAuthority,useHistoryReview} from './HistoryReview';
import {emptyRelation,validRelation} from './history';
import type {RelationInput} from './types';
export interface HistoryFormProps {projectId:string;targetIri?:string;onSaved:(iri:string)=>void;onCancel:()=>void}
export default function RelationForm(props:HistoryFormProps){return <Body key={`${props.projectId}|${props.targetIri??'new'}`} {...props}/>;}
function Body({projectId,targetIri,onSaved,onCancel}:HistoryFormProps) {
 const {t}=useI18n(),team=useTeam(),authority=useHistoryAuthority(projectId,targetIri);
 const [value,setValue]=useState<RelationInput>(emptyRelation),[dirty,setDirty]=useState(false),[unsupported,setUnsupported]=useState(false);const hydrated=useRef(false);
 useEffect(()=>{if(!authority.entry||hydrated.current)return;hydrated.current=true;if(targetIri){const row=authority.entry.relations.items.find(r=>r.iri===targetIri);if(!row||row.unsupported.length)setUnsupported(true);else setValue(row);}},[authority.entry,targetIri]);
 usePendingEntry(projectId,dirty);
 const valid=validRelation(value)&&Boolean(authority.basis)&&!unsupported&&!authority.loading&&!authority.error;
 const review=useHistoryReview(projectId,'PutGovernmentRelation',{...value,referenceBasis:authority.basis},valid,iri=>{setDirty(false);onSaved(iri);});
 const busy=review.busy||authority.loading||unsupported||authority.error!==null;
 return <form className="government-form" data-team-draft-complete={!dirty} aria-label={t('government.relationEntry')} onSubmit={e=>{e.preventDefault();void review.read();}} onKeyDown={e=>{if(e.key==='Escape'&&!review.busy){e.preventDefault();e.stopPropagation();onCancel();}}}>
 <h2>{t('government.relationEntry')}</h2>{unsupported&&<p role="status">{t('government.unsupportedEntry')}</p>}
 {authority.error!==null&&<OperationError failure={{cause:authority.error,message:makeUiMessage('government.detailsUnavailable')}}/>}
 <RelationFields projectId={projectId} value={value} busy={busy} onChange={v=>{if(!busy){setValue(v);setDirty(true);}}} onBasis={authority.setBasis}/>
 {!valid&&<p>{t('government.historyInputRequired')}</p>}
 <HistoryReviewPanel review={review}/>
 <button type="button" aria-disabled={review.busy||team.suspended} onClick={()=>{if(!review.busy&&!team.suspended)authority.refresh();}}>{t('government.refreshAuthority')}</button>
 <button type="button" aria-disabled={review.busy} onClick={()=>{if(!review.busy)onCancel();}}>{t('common.cancel')}</button>
 </form>;
}
