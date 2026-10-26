/*
================================================================================
FILE: frontend/src/team/LoginPanel.tsx
SUMMARY
    Team sign-in, fixed callback failure feedback and retained-input recovery.
BASIC IDEA
    Native controls expose visible names and use the shared focus-visible rule.
    Team identity and input owners remain independent of interface language.
INPUTS / INPUT SOURCES
    Typed server responses, the finite auth=failed callback flag and user actions.
EXPECTED OUTPUT
    Accessible team controls without automatic replay or lost mounted inputs.
================================================================================
*/
import {useState} from "react";
import {loginTeam} from "../api";
import {useI18n} from "../i18n/I18nProvider";
import UiLanguageSelect from "../components/UiLanguageSelect";
export function LoginPanel({expired=false,refresh}:{expired?:boolean;refresh:()=>Promise<void>}) {
 const {t}=useI18n(); const [busy,setBusy]=useState(false); const [failed,setFailed]=useState(()=>{
  const flags=new URLSearchParams(window.location.search).getAll("auth");
  return flags.length===1&&flags[0]==="failed";
 });
 const login=async()=>{
   // Open synchronously from the user gesture so popup blockers cannot turn
   // recovery into a top-level navigation that loses unsent component state.
   const popup=window.open("about:blank","semantic-studio-login","popup,width=600,height=720");
   if (!popup) {setFailed(true);return;}
   setBusy(true);setFailed(false);
   try { const {url}=await loginTeam();
     const target=new URL(url);
     if(target.protocol!=="https:") throw new Error();
     popup.location.href=target.href;
   } catch {popup.close();setFailed(true);} finally {setBusy(false);}
 };
 return <section aria-label={t("team.workspace")} className="team-panel">
   <UiLanguageSelect />
   <p role="status">{t(expired?"team.auth_expired":"team.auth_required")}</p>
   <button type="button" onClick={()=>void login()} disabled={busy}>{t(busy?"team.login.progress":"team.login")}</button>{" "}
   <button type="button" onClick={()=>void refresh()}>{t("team.refresh")}</button>
   {failed&&<p role="alert">{t("team.login.failure")}</p>}
 </section>;
}
