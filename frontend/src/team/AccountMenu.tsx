/*
================================================================================
FILE: frontend/src/team/AccountMenu.tsx
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
import {teamUsers,updateTeamUser} from "../api";
import {renderServerError} from "../i18n/serverMessage";
import {useI18n} from "../i18n/I18nProvider";
import {TeamHistory} from "./TeamHistory";
import type {Role,TeamUser} from "./types";
function Members(){
 const {t}=useI18n();const [users,setUsers]=useState<TeamUser[]>([]);const [failed,setFailed]=useState(false);const [reason,setReason]=useState<unknown>(null);const [busy,setBusy]=useState(false);
 useEffect(()=>{let current=true;teamUsers().then(r=>{if(current)setUsers(r.users);}).catch(()=>{if(current)setFailed(true);});return()=>{current=false;};},[]);
 const update=async(user:TeamUser,role:Role,disabled:boolean)=>{setBusy(true);setFailed(false);try{await updateTeamUser(user,role,disabled);setUsers((await teamUsers()).users);}catch(error){setReason(error);setFailed(true);}finally{setBusy(false);}};
 return <section aria-label={t("team.members")}><h3>{t("team.members")}</h3>{failed&&<p role="alert">{reason?renderServerError(reason,t):t("team.users.error")}</p>}
 <ul>{users.map(user=><li key={user.sub}><span>{user.email}</span>{" "}
  <label>{t("team.members.setRole")} <select aria-label={`${t("team.members.setRole")}: ${user.email}`} disabled={busy} value={user.role} onChange={e=>void update(user,e.target.value as Role,user.disabled)}>
   {(["viewer","editor","admin"] as const).map(role=><option key={role} value={role}>{t(`team.role.${role}`)}</option>)}
  </select></label>{" "}<button type="button" disabled={busy} onClick={()=>void update(user,user.role,!user.disabled)}>{t(user.disabled?"team.members.enable":"team.members.disable")}: {user.email}</button>
 </li>)}</ul></section>;
}
export function AccountMenu({user,logout,resourceKey}:{user:TeamUser;logout:()=>Promise<void>;resourceKey:string}){
 const {t}=useI18n();const [open,setOpen]=useState(false);const [history,setHistory]=useState(false);const [members,setMembers]=useState(false);
 return <aside className="team-account" aria-label={t("team.account")}>
  <button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t("team.account.name",{name:user.email})}</button>{" "}
  <span>{t(`team.role.${user.role}`)}</span>
  {open&&<div><button type="button" onClick={()=>void logout()}>{t("team.logout")}</button>{" "}
   <button type="button" aria-expanded={history} onClick={()=>setHistory(value=>!value)}>{t("team.history")}</button>{" "}
   {user.role==="admin"&&<button type="button" aria-expanded={members} onClick={()=>setMembers(value=>!value)}>{t("team.members")}</button>}
   {history&&<TeamHistory resourceKey={resourceKey}/>}{members&&user.role==="admin"&&<Members/>}
  </div>}
 </aside>;
}
