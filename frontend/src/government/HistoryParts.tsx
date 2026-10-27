/*
================================================================================
FILE: frontend/src/government/HistoryParts.tsx
SUMMARY
    Paged identity choices and native fields for dated government records.
BASIC IDEA
    Never resolve an entity by its name. Each picker owns bounded server pages
    and discards late reads; selecting a historical record explicitly loads it.
INPUTS / INPUT SOURCES
    Raw drafts, exact record DTOs and country/organization authority reads.
EXPECTED OUTPUT
    Accessible controlled edits with unknown/open dates kept explicit.
================================================================================
*/
import {useEffect,useId,useState} from 'react';
import {getGovernmentView} from '../api';
import {useProjectSelector} from '../state/projectStore';
import {teamAuthEpoch} from '../team/client';
import {useI18n} from '../i18n/I18nProvider';
import OperationError from '../components/OperationError';
import {makeUiMessage} from '../i18n/uiMessage';
import CountryPicker from './CountryPicker';
import {PeriodEditor,SourcesEditor} from './EntryParts';
import {localToday} from './form';
import {RELATION_OPTIONS} from './history';
import type {GovernmentViewResult,OrganizationView,RelationInput,NameInput,ExistenceInput,ReferenceBasis} from './types';

export function OrganizationPicker({projectId,label,value,onChange,busy}:{projectId:string;label:string;value:string;onChange:(iri:string,row:OrganizationView)=>void;busy:boolean}) {
 const {t,locale}=useI18n();const id=useId();const [query,setQuery]=useState(''),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const revision=useProjectSelector(s=>s.documents.find(d=>d.doc==='model')?.revision??0);
 const owner=JSON.stringify([projectId,query,offset,locale,retry,revision,teamAuthEpoch()]);
 const [result,setResult]=useState<{owner:string;view:GovernmentViewResult}|null>(null),[error,setError]=useState<{owner:string;cause:unknown}|null>(null);
 useEffect(()=>{let live=true;const c=new AbortController();getGovernmentView(projectId,localToday(),{query,offset,includeInactive:true,displayLanguage:locale,signal:c.signal})
 .then(view=>{if(live)setResult({owner,view});}).catch(cause=>{if(live)setError({owner,cause});});return()=>{live=false;c.abort();};},[owner,projectId,query,offset,locale]);
 const page=result?.owner===owner?result.view.organizations:null;
 return <fieldset><legend>{label}</legend>{value&&<p>{value}</p>}
 <label htmlFor={`${id}-search`}>{t('government.searchIdentity',{role:label})}</label><input id={`${id}-search`} type="search" value={query} maxLength={200} aria-disabled={busy} onChange={e=>{if(!busy){setQuery(e.target.value);setOffset(0);}}}/>
 <label htmlFor={`${id}-choose`}>{label}</label><select id={`${id}-choose`} value="" aria-disabled={busy||!page} onChange={e=>{const row=page?.items.find(r=>r.iri===e.target.value);if(!busy&&row)onChange(row.iri,row);}}><option value="">{t('government.chooseOrganization')}</option>{page?.items.map(row=><option key={row.iri} value={row.iri}>{row.label} · {row.iri}</option>)}</select>
 <p role="status">{page?t('government.entryCounts',{shown:page.items.length,total:page.total}):t('common.loading')}</p>
 {error?.owner===owner&&<OperationError failure={{cause:error.cause,message:makeUiMessage('government.detailsUnavailable')}}/>}
 <button type="button" aria-disabled={busy||offset===0} onClick={()=>{if(!busy&&offset>0)setOffset(Math.max(0,offset-50));}}>{t('government.previousPage')}</button>
 <button type="button" aria-disabled={busy||!page||offset+50>=page.total} onClick={()=>{if(!busy&&page&&offset+50<page.total)setOffset(offset+50);}}>{t('government.nextPage')}</button>
 <button type="button" aria-disabled={busy} onClick={()=>{if(!busy)setRetry(r=>r+1);}}>{t('common.retry')}</button></fieldset>;
}

export function RecordPicker({projectId,kind,onChange,busy}:{projectId:string;kind:'relations'|'names';onChange:(value:RelationInput|NameInput)=>void;busy:boolean}) {
 const {t,locale}=useI18n();const id=useId();const [offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const epoch=teamAuthEpoch(),revision=useProjectSelector(s=>s.documents.find(d=>d.doc==='model')?.revision??0);
 const [data,setData]=useState<GovernmentViewResult|null>(null),[error,setError]=useState<unknown>(null);
 useEffect(()=>{let live=true;const c=new AbortController();setData(null);setError(null);getGovernmentView(projectId,localToday(),{offset,displayLanguage:locale,signal:c.signal}).then(view=>{if(live)setData(view);}).catch(e=>{if(live)setError(e);});return()=>{live=false;c.abort();};},[projectId,kind,offset,locale,retry,epoch,revision]);
 const page=data?.[kind];
 return <fieldset><legend>{t('government.existingRecord')}</legend><label htmlFor={id}>{t('government.chooseRecord')}</label>
 <select id={id} value="" aria-disabled={busy||!page} onChange={e=>{const row=page?.items.find(r=>r.iri===e.target.value);if(!busy&&row&&!row.unsupported.length)onChange(row);}}><option value="">{t('government.newRecordHelp')}</option>{page?.items.map(row=><option key={row.iri} value={row.iri} disabled={row.unsupported.length>0}>{'subjectLabel'in row?`${row.subjectLabel} → ${row.objectLabel}`:`${row.entityLabel}: ${row.value}`} · {row.iri}</option>)}</select>
 {page&&<p>{t('government.entryCounts',{shown:page.items.length,total:page.total})}</p>}{error!==null&&<OperationError failure={{cause:error,message:makeUiMessage('government.detailsUnavailable')}}/>}
 <button type="button" aria-disabled={busy||offset===0} onClick={()=>{if(!busy&&offset>0)setOffset(Math.max(0,offset-50));}}>{t('government.previousPage')}</button>
 <button type="button" aria-disabled={busy||!page||offset+50>=page.total} onClick={()=>{if(!busy&&page&&offset+50<page.total)setOffset(offset+50);}}>{t('government.nextPage')}</button>
 <button type="button" aria-disabled={busy} onClick={()=>{if(!busy)setRetry(r=>r+1);}}>{t('common.retry')}</button></fieldset>;
}

export function RelationFields({projectId,value,onChange,busy,onBasis}:{projectId:string;value:RelationInput;onChange:(v:RelationInput)=>void;busy:boolean;onBasis:(v:ReferenceBasis)=>void}) {
 const {t}=useI18n();const id=useId();const country=value.predicate===RELATION_OPTIONS[0].iri;
 const update=(patch:Partial<RelationInput>)=>{if(!busy)onChange({...value,...patch});};
 return <><OrganizationPicker projectId={projectId} label={t('government.subjectOrganization')} value={value.subject} busy={busy} onChange={subject=>update({subject})}/>
 <label htmlFor={`${id}-predicate`}>{t('government.relationship')}</label><select id={`${id}-predicate`} value={value.predicate} aria-disabled={busy} onChange={e=>update({predicate:e.target.value,object:''})}>{RELATION_OPTIONS.map(option=><option key={option.iri} value={option.iri}>{t(option.key)}</option>)}</select>
 {country?<CountryPicker projectId={projectId} value={value.object} busy={busy} onChange={s=>{update({object:s.iri});onBasis(s.basis);}}/>:<OrganizationPicker projectId={projectId} label={t('government.relatedOrganization')} value={value.object} busy={busy} onChange={object=>update({object})}/>}
 <PeriodEditor label={t('government.relationPeriod')} period={value.period} busy={busy} onChange={period=>update({period})}/>
 <SourcesEditor sources={value.sources} busy={busy} onChange={sources=>update({sources})}/>
 <label htmlFor={`${id}-description`}>{t('government.description')}</label><textarea id={`${id}-description`} maxLength={4096} value={value.description} aria-disabled={busy} onChange={e=>update({description:e.target.value})}/></>;
}

export function NameFields({projectId,value,onChange,busy}:{projectId:string;value:NameInput;onChange:(v:NameInput)=>void;busy:boolean}) {
 const {t}=useI18n();const id=useId();const update=(patch:Partial<NameInput>)=>{if(!busy)onChange({...value,...patch});};
 return <><OrganizationPicker projectId={projectId} label={t('government.namedOrganization')} value={value.entity} busy={busy} onChange={entity=>update({entity})}/>
 <label htmlFor={`${id}-value`}>{t('government.historicalName')}</label><input id={`${id}-value`} value={value.value} maxLength={4096} aria-disabled={busy} onChange={e=>update({value:e.target.value})}/>
 <label htmlFor={`${id}-language`}>{t('government.historicalLanguage')}</label><input id={`${id}-language`} value={value.language} aria-disabled={busy} onChange={e=>update({language:e.target.value})}/>
 <PeriodEditor label={t('government.namePeriod')} period={value.period} busy={busy} onChange={period=>update({period})}/><SourcesEditor sources={value.sources} busy={busy} onChange={sources=>update({sources})}/></>;
}
export function ExistenceFields({projectId,value,onChange,busy}:{projectId:string;value:ExistenceInput;onChange:(v:ExistenceInput)=>void;busy:boolean}) {
 const {t}=useI18n();const update=(patch:Partial<ExistenceInput>)=>{if(!busy)onChange({...value,...patch});};
 return <><OrganizationPicker projectId={projectId} label={t('government.existingOrganization')} value={value.entity} busy={busy} onChange={(entity,row)=>update({entity,...(row.existencePeriod?{period:row.existencePeriod,sources:row.sources}:{})})}/>
 <PeriodEditor label={t('government.existencePeriod')} period={value.period} busy={busy} onChange={period=>update({period})}/><SourcesEditor sources={value.sources} busy={busy} onChange={sources=>update({sources})}/></>;
}
