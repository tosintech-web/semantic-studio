/*
================================================================================
FILE: frontend/src/government/GroupNavigation.tsx
SUMMARY
    Home system navigation for country and government organization groups.
BASIC IDEA
    Read manifest summaries only, page matching groups and delegate both opening
    and creation to existing application flows with their navigation guards.
INPUTS / INPUT SOURCES
    Project summaries, current edit permission and guarded parent callbacks.
EXPECTED OUTPUT
    Named native navigation, stable identity choices and no eager graph reads.
================================================================================
*/
import {useId,useMemo,useState} from 'react';
import {useI18n} from '../i18n/I18nProvider';
import {domainGroups} from '../home/libraryOrder';
import type {ProjectSummary,ProjectTemplate} from '../types';
import type {DomainProfile} from './types';
interface Props {projects:ProjectSummary[];onOpen:(id:string)=>void;onCreate:(template:ProjectTemplate)=>void;canEdit:boolean;busy?:boolean}
export default function GroupNavigation({projects,onOpen,onCreate,canEdit,busy=false}:Props) {
 const {t}=useI18n(),id=useId();const [selected,setSelected]=useState<DomainProfile['id']|null>(null),[query,setQuery]=useState(''),[offset,setOffset]=useState(0);
 const groups=useMemo(()=>selected?domainGroups(projects,selected).filter(project=>`${project.name}\n${project.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())):[],[projects,selected,query]);
 const choose=(role:DomainProfile['id'])=>{setSelected(role);setQuery('');setOffset(0);};
 const country=selected==='countries-v1';
 return <nav className="government-group-navigation" aria-label={t('government.groupNavigation')}>
 <div className="government-group-buttons">
 <button type="button" aria-pressed={country} aria-controls={selected?`${id}-list`:undefined} onClick={()=>choose('countries-v1')}>{t('government.countriesTitle')}</button>
 <button type="button" aria-pressed={selected==='government-organizations-v1'} aria-controls={selected?`${id}-list`:undefined} onClick={()=>choose('government-organizations-v1')}>{t('government.organizationsTitle')}</button>
 </div>
 {selected&&<section id={`${id}-list`} aria-label={t(country?'government.countryGroups':'government.organizationGroups')}>
 <h2>{t(country?'government.countryGroups':'government.organizationGroups')}</h2>
 <button type="button" className="primary" aria-describedby={!canEdit?`${id}-permission`:undefined} aria-disabled={!canEdit||busy} onClick={()=>{if(canEdit&&!busy)onCreate(country?'countries':'government-organizations');}}>{t(country?'government.createCountryGroup':'government.createOrganizationGroup')}</button>
 {!canEdit&&<p id={`${id}-permission`}>{t('government.groupsReadOnly')}</p>}
 <label htmlFor={`${id}-search`}>{t('government.searchGroups')}</label><input id={`${id}-search`} type="search" value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setOffset(0);}}/>
 <p role="status">{t('government.groupCounts',{shown:groups.slice(offset,offset+50).length,total:groups.length})}</p>
 {!groups.length&&<p>{t(canEdit?'government.noGroups':'government.noGroupsReadOnly')}</p>}
 <ul>{groups.slice(offset,offset+50).map(project=><li key={project.id}><button type="button" aria-disabled={busy} aria-label={t('home.openName',{name:`${project.name} · ${project.id}`})} onClick={()=>{if(!busy)onOpen(project.id);}}>{project.name} <span className="detail-note">{project.id}</span></button></li>)}</ul>
 <button type="button" aria-disabled={offset===0} onClick={()=>{if(offset>0)setOffset(Math.max(0,offset-50));}}>{t('government.previousPage')}</button>
 <button type="button" aria-disabled={offset+50>=groups.length} onClick={()=>{if(offset+50<groups.length)setOffset(offset+50);}}>{t('government.nextPage')}</button>
 </section>}
 </nav>;
}
