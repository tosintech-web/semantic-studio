/*
================================================================================
FILE: frontend/src/government/GovernmentView.tsx
SUMMARY
    Dated organization lists, uncertain relationships and complete history pages.
BASIC IDEA
    Bind every response to project/revision/date/language/session. Keep unknown
    records visible, state real totals and distinguish archive from projection.
INPUTS / INPUT SOURCES
    Explicit local calendar date, accepted government view and download APIs.
EXPECTED OUTPUT
    Accessible date navigation, inspectable records and honest bounded pages.
================================================================================
*/
import {useEffect,useId,useRef,useState} from 'react';
import {getGovernmentView,downloadGovernmentProjection,exportProject} from '../api';
import {triggerDownload} from '../download';
import {useI18n} from '../i18n/I18nProvider';
import {makeUiMessage} from '../i18n/uiMessage';
import OperationError from '../components/OperationError';
import {useProjectSelector} from '../state/projectStore';
import {teamAuthEpoch} from '../team/client';
import {useTeam} from '../team/TeamProvider';
import ProblemText from './ProblemText';
import {RELATION_OPTIONS} from './history';
import type {GovernmentViewResult,Period,Page} from './types';
export type HistorySelection='organization'|'relation'|'change'|'name';
interface Props {projectId:string;at:string;onDateChange:(date:string)=>void;onSelect:(iri:string,kind?:HistorySelection)=>void}
export default function GovernmentView(props:Props){return <Body key={props.projectId} {...props}/>;}
function Body({projectId,at,onDateChange,onSelect}:Props) {
 const {t,locale}=useI18n(),team=useTeam(),id=useId();const revision=useProjectSelector(s=>s.documents.find(d=>d.doc==='model')?.revision??0);
 const [includeInactive,setIncludeInactive]=useState(false),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0),[query,setQuery]=useState('');
 const [result,setResult]=useState<{owner:string;data:GovernmentViewResult}|null>(null),[failure,setFailure]=useState<{owner:string;cause:unknown}|null>(null),[downloading,setDownloading]=useState(false);
 const owner=JSON.stringify([projectId,at,revision,locale,teamAuthEpoch(),includeInactive,offset,retry,query]);const current=useRef(owner);current.current=owner;const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{const refresh=()=>setRetry(r=>r+1);window.addEventListener('semantic-studio-team-refresh',refresh);return()=>window.removeEventListener('semantic-studio-team-refresh',refresh);},[]);
 useEffect(()=>{if(!at)return;let live=true;const c=new AbortController();getGovernmentView(projectId,at,{offset,includeInactive,displayLanguage:locale,query,signal:c.signal}).then(data=>{if(live)setResult({owner,data});}).catch(cause=>{if(live)setFailure({owner,cause});});return()=>{live=false;c.abort();};},[owner,projectId,at,offset,includeInactive,locale,query]);
 const data=result?.owner===owner?result.data:null,error=failure?.owner===owner?failure.cause:null;
 const period=(p:Period)=>`${p.start.date??t(p.start.open?'government.boundOpen':'government.boundUnknown')} → ${p.end.date??t(p.end.open?'government.boundOpen':'government.boundUnknown')}`;
 const download=async(projection:boolean)=>{if(downloading||team.suspended)return;setDownloading(true);const basis=owner,epoch=teamAuthEpoch();try{const file=await(projection?downloadGovernmentProjection(projectId,at):exportProject(projectId));if(mounted.current&&current.current===basis&&teamAuthEpoch()===epoch)triggerDownload(file.blob,file.filename);}catch(cause){if(mounted.current&&current.current===basis)setFailure({owner:basis,cause});}finally{if(mounted.current)setDownloading(false);}};
 const count=(page:Page<unknown>)=><p role="status">{t('government.entryCounts',{shown:page.items.length,total:page.total})}</p>;
 const relation=(row:GovernmentViewResult['relations']['items'][number])=><li key={row.iri}>
 <button type="button" onClick={()=>onSelect(row.iri,'relation')}>{row.subjectLabel} → {t(RELATION_OPTIONS.find(o=>o.iri===row.predicate)?.key??'government.relationship')} → {row.objectLabel}</button>
 <code>{row.iri}</code><p>{period(row.period)} · {t(`government.relationState.${row.state}`)}</p>{row.unsupported.length>0&&<p>{t('government.unsupportedEntry')}</p>}
 <p>{row.description}</p><ul>{row.sources.map((source,index)=><li key={index}>{source.value}</li>)}</ul></li>;
 const maximum=data?Math.max(data.organizations.total,data.relations.total,data.names.total,data.changes.total,data.existences.total,data.uncertain.total,data.activeRelations.total):0;
 return <section className="government-dated-view" aria-label={t('government.datedView')}>
 <label htmlFor={`${id}-date`}>{t('government.viewDate')}</label><input id={`${id}-date`} type="date" min="0001-01-01" max="9999-12-31" value={at} onChange={e=>{setOffset(0);onDateChange(e.target.value);}}/>
 <label><input type="checkbox" checked={includeInactive} onChange={e=>{setIncludeInactive(e.target.checked);setOffset(0);}}/>{t('government.includeInactive')}</label>
 <label htmlFor={`${id}-search`}>{t('government.searchEntries')}</label><input id={`${id}-search`} type="search" maxLength={200} value={query} onChange={e=>{setQuery(e.target.value);setOffset(0);}}/>
 <button type="button" onClick={()=>setRetry(r=>r+1)}>{t('common.retry')}</button>
 <p>{t('government.asOf',{date:at})}</p>
 <button type="button" aria-disabled={downloading||team.suspended} onClick={()=>void download(false)}>{t('government.downloadAllHistory')}</button>
 <button type="button" aria-disabled={downloading||team.suspended||!at} onClick={()=>{if(at)void download(true);}}>{t('government.downloadProjection')}</button>
 {error!==null&&<OperationError failure={{cause:error,message:makeUiMessage('government.detailsUnavailable')}}/>}
 {!data&&!error&&<p role="status">{t('common.loading')}</p>}
 {data&&<>
 {!data.referenceBasis&&<p role="status">{t('government.connectCountryGroup')}</p>}
 <h2>{t('government.organizationsTitle')}</h2>{count(data.organizations)}
 <ul className="government-entry-list">{data.organizations.items.map(row=><li key={row.iri}><button type="button" onClick={()=>onSelect(row.iri,'organization')}>{row.label}</button><code>{row.iri}</code>
 <p>{t(`government.existence.${row.existenceState}`)} · {row.countryLabel||row.formCountryLabel||row.formCountryIri}</p>{!row.countryResolved&&row.formCountryIri&&<p>{t('government.unresolvedReference',{iri:row.formCountryIri})}</p>}</li>)}</ul>
 <h2>{t('government.activeRelations')}</h2>{count(data.activeRelations)}<ul>{data.activeRelations.items.map(relation)}</ul>
 <h2>{t('government.uncertainRelations')}</h2>{count(data.uncertain)}<ul>{data.uncertain.items.map(relation)}</ul>
 <h2>{t('government.allHistory')}</h2>
 <h3>{t('government.relationships')}</h3>{count(data.relations)}<ul>{data.relations.items.map(relation)}</ul>
 <h3>{t('government.nameHistoryEntry')}</h3>{count(data.names)}<ul>{data.names.items.map(row=><li key={row.iri}><button type="button" onClick={()=>onSelect(row.iri,'name')}>{row.entityLabel}: {row.value} ({row.language})</button><code>{row.iri}</code><p>{period(row.period)} · {t(`government.nameState.${row.state}`)}</p>{row.unsupported.length>0&&<p>{t('government.unsupportedEntry')}</p>}<ul>{row.sources.map((s,i)=><li key={i}>{s.value}</li>)}</ul></li>)}</ul>
 <h3>{t('government.changes')}</h3>{count(data.changes)}<ul>{data.changes.items.map(row=><li key={row.iri}><button type="button" onClick={()=>onSelect(row.iri,'change')}>{t(['merge','split','transfer','rename','other'].includes(row.kind)?`government.changeKind.${row.kind}`:'government.changeKind.other')} · {row.effectiveDate}</button><code>{row.iri}</code><p>{row.originalIris.join(', ')} → {row.resultingIris.join(', ')}</p><p>{row.description}</p>{row.unsupported.length>0&&<p>{t('government.unsupportedEntry')}</p>}<ul>{row.sources.map((s,i)=><li key={i}>{s.value}</li>)}</ul></li>)}</ul>
 <h3>{t('government.existencePeriod')}</h3>{count(data.existences)}<ul>{data.existences.items.map(row=><li key={row.iri}>{row.entityLabel}<code>{row.iri}</code><p>{period(row.period)}</p>{row.unsupported.length>0&&<p>{t('government.unsupportedEntry')}</p>}</li>)}</ul>
 {data.diagnostics.length>0&&<section aria-label={t('government.diagnostics')}><h3>{t('government.diagnostics')}</h3><ul>{data.diagnostics.map((p,i)=><li key={i}><ProblemText code={p.code} iri={p.iri}/></li>)}</ul></section>}
 <p>{t('government.pageOffset',{offset})}</p><button type="button" aria-disabled={offset===0} onClick={()=>{if(offset>0)setOffset(Math.max(0,offset-50));}}>{t('government.previousPage')}</button>
 <button type="button" aria-disabled={offset+50>=maximum} onClick={()=>{if(offset+50<maximum)setOffset(offset+50);}}>{t('government.nextPage')}</button>
 </>}
 </section>;
}
