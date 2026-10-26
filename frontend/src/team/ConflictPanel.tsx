/*
================================================================================
FILE: frontend/src/team/ConflictPanel.tsx
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
import UiLanguageSelect from "../components/UiLanguageSelect";
import {useI18n} from "../i18n/I18nProvider";
export function ConflictPanel({dirty,busy,review,onReview,onAccept,onKeep}:{dirty:boolean;busy:boolean;review:string|null;onReview:()=>void;onAccept:()=>void;onKeep:()=>void}){
 const {t}=useI18n();
 return <section className="team-panel" aria-label={t("team.conflict.title")}>
  <UiLanguageSelect/>
  <h2>{t("team.conflict.title")}</h2><p role="status">{t("team.revision_conflict")}</p>
  {dirty&&<p>{t("team.input.retained")}</p>}
  <button type="button" disabled={busy} onClick={onReview}>{t("team.conflict.reload")}</button>{" "}
  <button type="button" onClick={onKeep}>{t("team.conflict.keepInput")}</button>
  {busy&&<p role="status">{t("common.loading")}</p>}
  {review!==null&&<section aria-label={t("team.conflict.review")}><h3>{t("team.conflict.review")}</h3><pre>{review}</pre>
   <button type="button" disabled={busy} onClick={onAccept}>{t("team.conflict.accept")}</button>
  </section>}
 </section>;
}
