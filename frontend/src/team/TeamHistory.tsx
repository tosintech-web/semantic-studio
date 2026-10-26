/*
================================================================================
FILE: frontend/src/team/TeamHistory.tsx
SUMMARY
    Team account, authentication and review controls.
BASIC IDEA
    Native controls expose visible names and use the shared focus-visible rule.
    Team identity and input owners remain independent of interface language.
INPUTS / INPUT SOURCES
    Typed server responses and explicit user actions.
EXPECTED OUTPUT
    Accessible team controls without automatic replay or lost mounted inputs.
================================================================================
*/
import {useEffect,useState} from "react";
import {teamHistory} from "../api";
import {useI18n} from "../i18n/I18nProvider";
import type {HistoryEntry} from "./types";
function operationCode(operation:string) {
 if(operation.startsWith("undo:")||operation.endsWith("/undo"))return "team.history.undo" as const;
 if(operation.startsWith("redo:")||operation.endsWith("/redo"))return "team.history.redo" as const;
 if(operation.startsWith("DELETE /api/"))return "team.history.remove" as const;
 if(operation.startsWith("POST /api/projects")&&!operation.includes("/documents/"))return "team.history.create" as const;
 if(/^(POST|PATCH|PUT) \/api\//.test(operation))return "team.history.change" as const;
 return "team.history.unknown" as const;
}
export function TeamHistory({resourceKey}:{resourceKey:string}){
 const {t,locale}=useI18n();const [entries,setEntries]=useState<HistoryEntry[]>([]);const [offset,setOffset]=useState(0);const [more,setMore]=useState(false);const [failed,setFailed]=useState(false);
 useEffect(()=>{setOffset(0);setEntries([]);},[resourceKey]);
 useEffect(()=>{let current=true;setFailed(false);teamHistory(resourceKey,offset).then(result=>{
   if(!current)return;setEntries(old=>offset===0?result.history:[...old,...result.history]);setMore(result.history.length===50);
 }).catch(()=>{if(current)setFailed(true);});return()=>{current=false;};},[resourceKey,offset]);
 return <section aria-label={t("team.history")}><h3>{t("team.history")}</h3>
 {failed?<p role="alert">{t("team.history.error")}</p>:!entries.length?<p>{t("team.history.empty")}</p>:<ol>{entries.map((entry,index)=><li key={index}>
  {entry.timestamp&&<time dateTime={entry.timestamp}>{Number.isNaN(Date.parse(entry.timestamp))?entry.timestamp:new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(new Date(entry.timestamp))} UTC</time>}{" "}{t("team.history.entry",{actor:entry.actor==="migration"?t("team.history.beforeMigration"):entry.actor,operation:t(operationCode(entry.operation))})}
  {typeof entry.after_version==="number"&&<> — {t("team.history.version",{version:entry.after_version})}</>}
  <details><summary>{t("common.details")}</summary><pre>{entry.operation}{entry.diff?"\n"+JSON.stringify(entry.diff,null,2):""}</pre></details>
 </li>)}</ol>}
 {more&&<button type="button" onClick={()=>setOffset(value=>value+50)}>{t("team.history.more")}</button>}
 </section>;
}
