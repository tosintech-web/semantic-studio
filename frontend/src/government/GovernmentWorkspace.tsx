/*
================================================================================
FILE: frontend/src/government/GovernmentWorkspace.tsx
SUMMARY
    Profile-specific group lists, entry forms and reviewed country connections.
BASIC IDEA
    Reuse the existing project owner and metadata/command APIs. Drafts stay in
    mounted forms; navigation asks before discarding, and late reads belong to
    project, query, date, language and revision rather than a visible label.
INPUTS / INPUT SOURCES
    Current project, manifest-only project list and domain read endpoints.
EXPECTED OUTPUT
    Accessible country/government entry workflows with explicit source setup.
================================================================================
*/
import { useEffect, useRef, useState } from "react";
import { getCountryChoices, getGovernmentView, previewDomainProfileChange, updateProject, type DomainProfilePreview } from "../api";
import OperationError from "../components/OperationError";
import { useI18n } from "../i18n/I18nProvider";
import { makeUiMessage } from "../i18n/uiMessage";
import { projectStore, useProjectSelector } from "../state/projectStore";
import { useTeam } from "../team/TeamProvider";
import type { ProjectSummary } from "../types";
import CountryForm from "./CountryForm";
import OrganizationForm from "./OrganizationForm";
import { usePendingEntry } from "./EntryParts";
import { localToday, supportedProfile } from "./form";
import type { CountryPage, DomainProfile, GovernmentViewResult } from "./types";

interface Props { project: ProjectSummary; projects: ProjectSummary[]; language: string; onProjectsChanged: () => void; onOpenProject?: (pid: string) => void }
export default function GovernmentWorkspace(props: Props) {
  const profile = supportedProfile(props.project.domainProfile);
  return profile ? <WorkspaceBody key={`${props.project.id}|${profile.id}`} {...props} profile={profile} /> : null;
}

function WorkspaceBody({ project, projects, language, onProjectsChanged, onOpenProject, profile }: Props & { profile: DomainProfile }) {
  const { t } = useI18n();
  const team = useTeam();
  const countryMode = profile.id === "countries-v1";
  const revision = useProjectSelector(state => state.documents.find(doc => doc.doc === "model")?.revision ?? 0);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [at] = useState(localToday);
  const [editor, setEditor] = useState<{ iri?: string } | null>(null);
  const [sourceId, setSourceId] = useState(profile.countryProjectId ?? "");
  const [preview, setPreview] = useState<DomainProfilePreview | null>(null);
  const [configBusy, setConfigBusy] = useState(false);
  const [configFailure, setConfigFailure] = useState<unknown>(null);
  const [result, setResult] = useState<{ owner: string; data: CountryPage | GovernmentViewResult } | null>(null);
  const [failure, setFailure] = useState<{ owner: string; cause: unknown } | null>(null);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const sourceDirty = !countryMode && sourceId !== (profile.countryProjectId ?? "");
  usePendingEntry(project.id, sourceDirty);
  const owner = JSON.stringify([project.id, revision, profile.countryProjectId, query, offset, at, language, retry]);
  useEffect(() => {
    const refresh = () => setRetry(value => value + 1);
    window.addEventListener("semantic-studio-team-refresh", refresh);
    return () => window.removeEventListener("semantic-studio-team-refresh", refresh);
  }, []);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const read = countryMode ? getCountryChoices(project.id, { query, offset, displayLanguage: language, signal: controller.signal })
      : getGovernmentView(project.id, at, { query, offset, displayLanguage: language, signal: controller.signal });
    read.then(data => { if (current) setResult({ owner, data }); }).catch(cause => { if (current) setFailure({ owner, cause }); });
    return () => { current = false; controller.abort(); };
  }, [countryMode, project.id, owner, query, offset, at, language]);
  const data = result?.owner === owner ? result.data : null;
  const error = failure?.owner === owner ? failure.cause : null;
  const page = data && ("organizations" in data ? data.organizations : data);
  const canEdit = team.canEdit && !team.suspended && !configBusy;
  const sources = projects.filter(item => supportedProfile(item.domainProfile)?.id === "countries-v1");
  const sourceMissing = Boolean(profile.countryProjectId) && !sources.some(item => item.id === profile.countryProjectId);
  const leaveForm = (then: () => void) => {
    if (projectStore.hasPendingForms() && !window.confirm(t("government.leave.confirm"))) return;
    then();
  };
  const openEntry = (iri?: string) => leaveForm(() => {
    setSourceId(profile.countryProjectId ?? ""); setPreview(null); setEditor({ iri });
  });
  const returnToList = () => {
    setEditor(null); setRetry(value => value + 1);
    window.setTimeout(() => document.getElementById(`government-new-${project.id}`)?.focus(), 0);
  };
  const proposed = (): DomainProfile => ({ id: "government-organizations-v1", version: 1, ...(sourceId ? { countryProjectId: sourceId } : {}) });
  const reviewSource = async () => {
    if (!canEdit || !sourceDirty) return;
    setConfigBusy(true); setConfigFailure(null);
    try { const found = await previewDomainProfileChange(project.id, proposed()); if (live.current) setPreview(found); }
    catch (cause) { if (live.current) setConfigFailure(cause); }
    finally { if (live.current) setConfigBusy(false); }
  };
  const applySource = async () => {
    if (!canEdit || !preview) return;
    setConfigBusy(true); setConfigFailure(null);
    try {
      await updateProject(project.id, { domainProfile: proposed(), profileBasis: preview.basis });
      if (!live.current || projectStore.getSnapshot().project?.id !== project.id) return;
      await projectStore.reload();
      if (live.current) { setPreview(null); onProjectsChanged(); setRetry(value => value + 1); }
    } catch (cause) { if (live.current) setConfigFailure(cause); }
    finally { if (live.current) setConfigBusy(false); }
  };
  return <section className="government-workspace" aria-label={t(countryMode ? "government.countriesTitle" : "government.organizationsTitle")}>
    {editor ? (countryMode ? <CountryForm projectId={project.id} targetIri={editor.iri} onSaved={returnToList} onCancel={() => leaveForm(returnToList)} />
      : <OrganizationForm projectId={project.id} targetIri={editor.iri} onSaved={returnToList} onCancel={() => leaveForm(returnToList)} />) : <>
      <h1>{t(countryMode ? "government.countriesTitle" : "government.organizationsTitle")}</h1>
      {!countryMode && <form className="government-form government-source-form" data-team-draft-complete={!sourceDirty} onSubmit={event => { event.preventDefault(); void reviewSource(); }}>
        <label htmlFor={`government-source-${project.id}`}>{t("government.countryGroup")}</label>
        <select id={`government-source-${project.id}`} value={sourceId} aria-disabled={!canEdit} onChange={event => { if (canEdit) { setSourceId(event.target.value); setPreview(null); } }}>
          <option value="">{t("government.chooseCountryGroup")}</option>
          {sourceId && !sources.some(item => item.id === sourceId) && <option value={sourceId}>{sourceId}</option>}
          {sources.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
        </select>
        <button type="submit" aria-disabled={!canEdit || !sourceDirty}>{t("government.reviewCountryGroup")}</button>
        {(!profile.countryProjectId || sourceMissing) && <p role="status">{t("government.connectCountryGroup")}</p>}
        {profile.countryProjectId && onOpenProject && <button type="button" aria-disabled={sourceMissing} onClick={() => { if (!sourceMissing) onOpenProject(profile.countryProjectId!); }}>{t("government.openCountryGroup")}</button>}
        {preview && <section aria-label={t("government.reviewCountryGroup")}>
          <p>{t("government.unresolvedCountries", { count: preview.impact.unresolvedCountryIris.length })}</p>
          <ul>{preview.impact.unresolvedCountryIris.map(iri => <li key={iri}>{iri}</li>)}</ul>
          <button type="button" aria-disabled={!canEdit} onClick={() => void applySource()}>{t("government.applyConnection")}</button>
        </section>}
        {configFailure !== null && <OperationError failure={{ cause: configFailure, message: makeUiMessage("government.connectionFailed") }} />}
      </form>}
      <div className="government-list-controls">
        <button id={`government-new-${project.id}`} type="button" className="primary" aria-disabled={!canEdit || (!countryMode && (!profile.countryProjectId || sourceMissing))}
          onClick={() => { if (canEdit && (countryMode || (profile.countryProjectId && !sourceMissing))) openEntry(); }}>{t(countryMode ? "government.newCountry" : "government.newOrganization")}</button>
        <label htmlFor={`government-search-${project.id}`}>{t("government.searchEntries")}</label>
        <input id={`government-search-${project.id}`} type="search" value={query} maxLength={200} onChange={event => { setQuery(event.target.value); setOffset(0); }} />
        <button type="button" onClick={() => setRetry(value => value + 1)}>{t("common.retry")}</button>
      </div>
      {!countryMode && <p>{t("government.asOf", { date: at })}</p>}
      {!data && !error && <p role="status">{t("common.loading")}</p>}
      {error !== null && <OperationError failure={{ cause: error, message: makeUiMessage("government.detailsUnavailable") }} />}
      {page && <>
        <p role="status">{t("government.entryCounts", { shown: page.items.length, total: page.total })}</p>
        <ul className="government-entry-list">{page.items.map(item => <li key={item.iri}>
          <button type="button" aria-label={t("government.editEntry", { name: item.label })} onClick={() => openEntry(item.iri)}>{item.label}</button>
          <span className="detail-note">{item.iri}</span>
          {"existenceState" in item && <span>{t(`government.existence.${item.existenceState}`)}</span>}
        </li>)}</ul>
        <button type="button" aria-disabled={offset === 0} onClick={() => { if (offset > 0) setOffset(Math.max(0, offset - 50)); }}>{t("government.previousPage")}</button>
        <button type="button" aria-disabled={offset + 50 >= page.total} onClick={() => { if (offset + 50 < page.total) setOffset(offset + 50); }}>{t("government.nextPage")}</button>
      </>}
    </>}
  </section>;
}
