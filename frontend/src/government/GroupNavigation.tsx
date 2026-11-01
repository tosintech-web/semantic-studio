/*
================================================================================
FILE: frontend/src/government/GroupNavigation.tsx
SUMMARY
    Home tabs for country masters, organization masters and vocabulary models.
BASIC IDEA
    Read manifest summaries only, page matching groups and host the existing
    vocabulary library as the default panel. Native tab keys move selection
    and focus together; opening and creation retain application guards.
    Master rows reuse project cards so their management menus stay reachable.
INPUTS / INPUT SOURCES
    Project summaries, edit permission, guarded callbacks, project actions and
    the existing vocabulary library panel.
EXPECTED OUTPUT
    Named native navigation, stable identity choices and no eager graph reads.
================================================================================
*/
import {useEffect,useId,useMemo,useRef,useState,type ReactNode} from 'react';
import {useI18n} from '../i18n/I18nProvider';
import {renderServerError} from '../i18n/serverMessage';
import {domainGroups} from '../home/libraryOrder';
import type {ProjectSummary,ProjectTemplate} from '../types';
import type {DomainProfile} from './types';
import ProjectCard, {type ProjectActions} from '../components/ProjectsSection';
interface Props {
 projects:ProjectSummary[];onOpen:(id:string)=>void;onCreate:(template:ProjectTemplate)=>void;
 canEdit:boolean;busy?:boolean;loading?:boolean;error?:unknown;children?:ReactNode;
 projectActions?:ProjectActions;busyId?:string|null;
}
const TABS = [
 {id:'countries-v1',label:'government.countriesTitle'},
 {id:'government-organizations-v1',label:'government.organizationsTitle'},
 {id:'models',label:'home.models'},
] as const;
type Category = DomainProfile['id'] | 'models';
export default function GroupNavigation({projects,onOpen,onCreate,canEdit,busy=false,loading=false,error,children,projectActions,busyId}:Props) {
 const {t}=useI18n(),id=useId();
 const [selected,setSelected]=useState<Category>('models'),[query,setQuery]=useState(''),[offset,setOffset]=useState(0);
 const tabRefs=useRef<(HTMLButtonElement|null)[]>([]);
 const groups=useMemo(()=>selected==='models'?[]:domainGroups(projects,selected).filter(project=>`${project.name}\n${project.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[projects,selected,query]);
 // A deleted final row must not strand the reader beyond the remaining pages.
 const pageOffset=Math.min(offset,Math.max(0,Math.ceil(groups.length/50)-1)*50);
 useEffect(()=>{if(offset!==pageOffset)setOffset(pageOffset);},[offset,pageOffset]);
 const choose=(role:Category)=>{setSelected(role);setQuery('');setOffset(0);};
 const country=selected==='countries-v1';
 return <nav className="government-group-navigation" aria-label={t('government.groupNavigation')}>
 <div className="government-group-buttons" role="tablist" aria-label={t('government.groupNavigation')}>
 {TABS.map((tab,index)=><button key={tab.id} ref={node=>{tabRefs.current[index]=node;}}
   id={`${id}-tab-${tab.id}`} type="button" role="tab" aria-selected={selected===tab.id}
   aria-controls={`${id}-panel-${tab.id}`} tabIndex={selected===tab.id?0:-1}
   onClick={()=>choose(tab.id)} onKeyDown={event=>{
     const next=event.key==='ArrowRight'?(index+1)%TABS.length:event.key==='ArrowLeft'?(index+TABS.length-1)%TABS.length:event.key==='Home'?0:event.key==='End'?TABS.length-1:null;
     if(next===null)return;
     event.preventDefault();choose(TABS[next].id);tabRefs.current[next]?.focus();
   }}>{t(tab.label)}</button>)}
 </div>
 {TABS.map(tab=><div key={tab.id} id={`${id}-panel-${tab.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab.id}`} hidden={selected!==tab.id}>
 {selected===tab.id&&(tab.id==='models'?children:<section className="government-master-panel" aria-label={t(country?'government.countryGroups':'government.organizationGroups')}>
 <h2>{t(country?'government.countryGroups':'government.organizationGroups')}</h2>
 <button type="button" className="primary" aria-describedby={!canEdit?`${id}-permission`:undefined} aria-disabled={!canEdit||busy||loading} onClick={()=>{if(canEdit&&!busy&&!loading)onCreate(country?'countries':'government-organizations');}}>{t(country?'government.createCountryGroup':'government.createOrganizationGroup')}</button>
 {!canEdit&&<p id={`${id}-permission`}>{t('government.groupsReadOnly')}</p>}
 {!!error&&<><p className="detail-error">{renderServerError(error,t)}</p><details><summary>{t('common.details')}</summary><pre>{error instanceof Error?error.message:String(error)}</pre></details></>}
 {loading?<p role="status">{t('home.loading')}</p>:!error&&<>
 <label htmlFor={`${id}-search`}>{t('government.searchGroups')}</label><input id={`${id}-search`} type="search" value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setOffset(0);}}/>
 <p role="status">{t('government.groupCounts',{shown:groups.slice(pageOffset,pageOffset+50).length,total:groups.length})}</p>
 {!groups.length&&<p>{t(canEdit?'government.noGroups':'government.noGroupsReadOnly')}</p>}
 <ul>{groups.slice(pageOffset,pageOffset+50).map(project=><li key={project.id}>
 {projectActions?<ProjectCard project={project} layout="row" busy={busyId===project.id} disabled={busy} {...projectActions}/>
 :<button type="button" title={project.name} aria-disabled={busy} aria-label={t('home.openName',{name:`${project.name} · ${project.id}`})} onClick={()=>{if(!busy)onOpen(project.id);}}>{project.name}</button>}
 <code>{project.id}</code></li>)}</ul>
 <button type="button" aria-disabled={pageOffset===0} onClick={()=>{if(pageOffset>0)setOffset(Math.max(0,pageOffset-50));}}>{t('government.previousPage')}</button>
 <button type="button" aria-disabled={pageOffset+50>=groups.length} onClick={()=>{if(pageOffset+50<groups.length)setOffset(pageOffset+50);}}>{t('government.nextPage')}</button>
 </>}
 </section>)}
 </div>)}
 </nav>;
}
