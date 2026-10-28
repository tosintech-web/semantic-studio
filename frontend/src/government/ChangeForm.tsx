/*
================================================================================
FILE: frontend/src/government/ChangeForm.tsx
SUMMARY
    Explicit identity, relationship, name and existence edits for reorganization.
BASIC IDEA
    Existing organizations are selected by stable IRI. Nothing is implicitly
    created or ended; every nested edit is reviewed and committed atomically.
INPUTS / INPUT SOURCES
    Complete draft, exact event/name records and paged organization choices.
EXPECTED OUTPUT
    Retained raw input and one reviewed command with one-step Undo.
================================================================================
*/
import {useEffect,useId,useRef,useState} from 'react';
import {useI18n} from '../i18n/I18nProvider';
import {makeUiMessage} from '../i18n/uiMessage';
import OperationError from '../components/OperationError';
import {projectStore} from '../state/projectStore';
import {SourcesEditor,usePendingEntry} from './EntryParts';
import {OrganizationPicker,RelationFields,NameFields,ExistenceFields,RecordPicker} from './HistoryParts';
import {HistoryReviewPanel,useHistoryAuthority,useHistoryReview} from './HistoryReview';
import {emptyChange,emptyRelation,emptyName,emptyExistence,validChange,validName} from './history';
import type {ChangeInput,NameInput} from './types';
import type {HistoryFormProps} from './RelationForm';
type Props=HistoryFormProps&{recordType?:'change'|'name'};
export default function ChangeForm(props:Props){return <Body key={`${props.projectId}|${props.recordType}|${props.targetIri??'new'}`} {...props}/>;}
function Body({projectId,targetIri,recordType='change',onSaved,onCancel}:Props) {
 const {t}=useI18n(),id=useId(),authority=useHistoryAuthority(projectId,targetIri);
 const primary=projectStore.getSnapshot().project?.primaryLanguage??'en';
 const [labels,setLabels]=useState<Record<string,string>>({});
 const [value,setValue]=useState<ChangeInput>(emptyChange),[name,setName]=useState<NameInput>(()=>emptyName(primary)),[dirty,setDirty]=useState(false),[unsupported,setUnsupported]=useState(false);const hydrated=useRef(false);
 useEffect(()=>{if(!authority.entry||hydrated.current)return;hydrated.current=true;setLabels(Object.fromEntries(authority.entry.organizations.items.map(r=>[r.iri,r.label])));if(targetIri){if(recordType==='name'){const row=authority.entry.names.items.find(r=>r.iri===targetIri);if(!row||row.unsupported.length||!row.entity||!row.value||!row.language)setUnsupported(true);else setName({...row,entity:row.entity,value:row.value,language:row.language});}else{const row=authority.entry.changes.items.find(r=>r.iri===targetIri);if(!row||row.unsupported.length)setUnsupported(true);else setValue({...emptyChange(),...row,relationEdits:[],nameEdits:[],existenceEdits:[]});}}},[authority.entry,targetIri,recordType]);
 usePendingEntry(projectId,dirty);
 const valid=(recordType==='name'?validName(name):validChange(value))&&Boolean(authority.basis)&&!authority.selectionConflict&&!unsupported&&!authority.loading&&authority.error===null;
 const review=useHistoryReview(projectId,recordType==='name'?'PutGovernmentName':'ApplyGovernmentChange',{...(recordType==='name'?name:value),referenceBasis:authority.basis},valid,iri=>{setDirty(false);onSaved(iri);});
 const busy=review.busy||authority.loading||unsupported||authority.error!==null;
 const update=(patch:Partial<ChangeInput>)=>{if(!busy){setValue({...value,...patch});setDirty(true);}};
 const remove=(key:'relationEdits'|'nameEdits'|'existenceEdits',index:number)=>{if(!busy){update({[key]:value[key].filter((_,i)=>i!==index)});window.setTimeout(()=>document.getElementById(`${id}-title`)?.focus(),0);}};
 return <form className="government-form" data-team-draft-complete={!dirty} aria-label={t(recordType==='name'?'government.nameHistoryEntry':'government.changeEntry')} onSubmit={e=>{e.preventDefault();void review.read();}} onKeyDown={e=>{if(e.key==='Escape'&&!review.mutating&&!review.suspended){e.preventDefault();e.stopPropagation();onCancel();}}}>
 <h2 id={`${id}-title`} tabIndex={-1}>{t(recordType==='name'?'government.nameHistoryEntry':'government.changeEntry')}</h2>
 {unsupported&&<p role="status">{t('government.unsupportedEntry')}</p>}{authority.error!==null&&<OperationError failure={{cause:authority.error,message:makeUiMessage('government.detailsUnavailable')}}/>}
 {recordType==='name'?<NameFields projectId={projectId} value={name} busy={busy} onChange={v=>{if(!busy){setName(v);setDirty(true);}}}/>:<>
 {authority.selectionConflict&&<p role="alert">{t('government.referenceSelectionChanged')}</p>}
 <p>{t('government.identityHelp')}</p>
 <label htmlFor={`${id}-kind`}>{t('government.changeKind')}</label><select id={`${id}-kind`} value={value.kind} aria-disabled={busy} onChange={e=>update({kind:e.target.value as ChangeInput['kind']})}>{(['merge','split','transfer','rename','other']as const).map(kind=><option key={kind} value={kind}>{t(`government.changeKind.${kind}`)}</option>)}</select>
 <label htmlFor={`${id}-date`}>{t('government.effectiveDate')}</label><input id={`${id}-date`} type="date" min="0001-01-01" max="9999-12-31" value={value.effectiveDate} aria-disabled={busy} onChange={e=>update({effectiveDate:e.target.value})}/>
 {(['originalIris','resultingIris']as const).map(key=><div key={key} id={`${id}-${key}`}><OrganizationPicker projectId={projectId} label={t(key==='originalIris'?'government.originalOrganizations':'government.resultingOrganizations')} value="" busy={busy||value[key].length>=100} onChange={(iri,row)=>{setLabels(v=>({...v,[iri]:row.label}));if(!value[key].includes(iri))update({[key]:[...value[key],iri]});}}/>
 <ul>{value[key].map(iri=><li key={iri}>{labels[iri]&&<span>{labels[iri]} · </span>}<code>{iri}</code><button type="button" aria-label={t('government.removeIdentity',{iri})} aria-disabled={busy} onClick={()=>{if(!busy){update({[key]:value[key].filter(v=>v!==iri)});window.setTimeout(()=>document.getElementById(`${id}-${key}`)?.querySelector('select')?.focus(),0);}}}>{t('government.removeSelection')}</button></li>)}</ul></div>)}
 {targetIri&&<p>{t('government.eventEditHelp')}</p>}
 {value.relationEdits.map((row,index)=><fieldset key={index}><legend>{t('government.relationEditNumber',{number:index+1})}</legend><RecordPicker projectId={projectId} kind="relations" busy={busy} onChange={v=>{if('subject'in v)update({relationEdits:value.relationEdits.map((r,i)=>i===index?v:r)});}}/><RelationFields projectId={projectId} value={row} busy={busy} onChange={v=>update({relationEdits:value.relationEdits.map((r,i)=>i===index?v:r)})} onBasis={authority.setBasis}/><button type="button" aria-disabled={busy} onClick={()=>remove('relationEdits',index)}>{t('government.removeEdit')}</button></fieldset>)}
 <button type="button" aria-disabled={busy||value.relationEdits.length>=100} onClick={()=>{if(!busy&&value.relationEdits.length<100)update({relationEdits:[...value.relationEdits,emptyRelation()]});}}>{t('government.addRelationEdit')}</button>
 {value.nameEdits.map((row,index)=><fieldset key={index}><legend>{t('government.nameEditNumber',{number:index+1})}</legend><RecordPicker projectId={projectId} kind="names" busy={busy} onChange={v=>{if('entity'in v)update({nameEdits:value.nameEdits.map((r,i)=>i===index?v:r)});}}/><NameFields projectId={projectId} value={row} busy={busy} onChange={v=>update({nameEdits:value.nameEdits.map((r,i)=>i===index?v:r)})}/><button type="button" aria-disabled={busy} onClick={()=>remove('nameEdits',index)}>{t('government.removeEdit')}</button></fieldset>)}
 <button type="button" aria-disabled={busy||value.nameEdits.length>=100} onClick={()=>{if(!busy&&value.nameEdits.length<100)update({nameEdits:[...value.nameEdits,emptyName(primary)]});}}>{t('government.addNameEdit')}</button>
 {value.existenceEdits.map((row,index)=><fieldset key={index}><legend>{t('government.existenceEditNumber',{number:index+1})}</legend><ExistenceFields projectId={projectId} value={row} busy={busy} onChange={v=>update({existenceEdits:value.existenceEdits.map((r,i)=>i===index?v:r)})}/><button type="button" aria-disabled={busy} onClick={()=>remove('existenceEdits',index)}>{t('government.removeEdit')}</button></fieldset>)}
 <button type="button" aria-disabled={busy||value.existenceEdits.length>=100} onClick={()=>{if(!busy&&value.existenceEdits.length<100)update({existenceEdits:[...value.existenceEdits,emptyExistence()]});}}>{t('government.addExistenceEdit')}</button>
 <SourcesEditor sources={value.sources} busy={busy} onChange={sources=>update({sources})}/>
 <label htmlFor={`${id}-description`}>{t('government.description')}</label><textarea id={`${id}-description`} value={value.description} maxLength={4096} aria-disabled={busy} onChange={e=>update({description:e.target.value})}/>
 </>}
 {!valid&&<p>{t('government.historyInputRequired')}</p>}<HistoryReviewPanel review={review}/>
 <button type="button" aria-disabled={review.busy} onClick={()=>{if(!review.busy)authority.refresh();}}>{t('government.refreshAuthority')}</button>
 <button type="button" aria-disabled={review.mutating||review.suspended} onClick={()=>{if(!review.mutating&&!review.suspended)onCancel();}}>{t('common.cancel')}</button>
 </form>;
}
