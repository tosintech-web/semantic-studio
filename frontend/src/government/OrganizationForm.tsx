/*
================================================================================
FILE: frontend/src/government/OrganizationForm.tsx
SUMMARY
    Registers government organizations with explicit country and period drafts.
BASIC IDEA
    Shared ORG choices come from the read API. User-selected country basis never
    advances on background reads, and failures preserve all input for correction.
INPUTS / INPUT SOURCES
    Project/target identities, faithful entry details and the standard runner.
EXPECTED OUTPUT
    Atomic organization/existence/country registration with retained drafts.
================================================================================
*/
import { useEffect, useId, useRef, useState } from "react";
import { getGovernmentView } from "../api";
import { useRunner, RunnerErrorDetails } from "../components/EditParts";
import OperationError from "../components/OperationError";
import { useI18n } from "../i18n/I18nProvider";
import { makeUiMessage } from "../i18n/uiMessage";
import { projectStore, useProjectSelector } from "../state/projectStore";
import {teamAuthEpoch} from '../team/client';
import { useTeam } from "../team/TeamProvider";
import CountryPicker from "./CountryPicker";
import { NamesEditor, PeriodEditor, SourcesEditor, usePendingEntry } from "./EntryParts";
import { localToday, unknownPeriod, validNames, validPeriod, validSources, type NameDraft } from "./form";
import type { GovernmentViewResult, OrganizationView, Period, ReferenceBasis, Source } from "./types";

interface Props { projectId: string; targetIri?: string; onSaved: (iri: string) => void; onCancel: () => void }
export default function OrganizationForm(props: Props) { return <OrganizationFormBody key={`${props.projectId}|${props.targetIri ?? "new"}`} {...props} />; }

function OrganizationFormBody({ projectId, targetIri, onSaved, onCancel }: Props) {
  const { t } = useI18n();
  const team = useTeam();
  const runner = useRunner("model");
  const id = useId();
  const primary = projectStore.getSnapshot().project?.primaryLanguage ?? "en";
  const revision=useProjectSelector(state=>state.documents.find(doc=>doc.doc==='model')?.revision??0);
  const epoch=teamAuthEpoch();
  const [names, setNames] = useState<NameDraft[]>([{ value: "", language: primary }]);
  const [kind, setKind] = useState<OrganizationView["kind"]>("Organization");
  const [options, setOptions] = useState<GovernmentViewResult["kindOptions"]>([]);
  const [identifier, setIdentifier] = useState("");
  const [country, setCountry] = useState("");
  const [basis, setBasis] = useState<ReferenceBasis | null>(null);
  const [existence, setExistence] = useState<Period>(unknownPeriod);
  const [affiliation, setAffiliation] = useState<Period>(unknownPeriod);
  const [sources, setSources] = useState<Source[]>([{ kind: "text", value: "" }]);
  const [dirty, setDirty] = useState(false);
  const dirtyInput=useRef(false);dirtyInput.current=dirty;
  const [loadedRevision,setLoadedRevision]=useState<number|null>(null);
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [readRun, setReadRun] = useState(0);
  usePendingEntry(projectId, dirty);
  useEffect(() => {
    if(dirty)return;
    let live = true;
    const controller = new AbortController();
    setLoading(true);setFailure(null);
    getGovernmentView(projectId, localToday(), { iri: targetIri, signal: controller.signal, displayLanguage: primary }).then(view => {
      if (!live||dirtyInput.current||teamAuthEpoch()!==epoch||projectStore.getSnapshot().project?.id!==projectId||
          (projectStore.getSnapshot().documents.find(doc=>doc.doc==='model')?.revision??0)!==revision) return;
      setOptions(view.kindOptions);
      if (targetIri) {
        const entry = view.organizations.items.find(item => item.iri === targetIri);
        if (!entry) throw new Error("Organization details are unavailable.");
        setNames(entry.names); setKind(entry.kind); setIdentifier(entry.identifier); setCountry(entry.formCountryIri ?? "");
        setBasis(view.referenceBasis); setExistence(entry.existencePeriod ?? unknownPeriod()); setAffiliation(entry.countryPeriod ?? unknownPeriod());
        setSources(entry.sources.length ? entry.sources : [{ kind: "text", value: "" }]); setUnsupported(Boolean(entry.unsupported.length));
      }
      setLoadedRevision(revision);
      setLoading(false);
    }).catch(error => { if (live) { setFailure(error); setLoading(false); } });
    return () => { live = false; controller.abort(); };
  }, [projectId, targetIri, primary, readRun,revision,epoch,dirty]);
  const stale=Boolean(targetIri&&loadedRevision!==null&&loadedRevision!==revision);
  const busy = runner.busy || loading || stale || !team.canEdit || team.suspended || unsupported || Boolean(failure);
  const nonemptySources = sources.filter(source => source.value.trim());
  const problem = !validNames(names) ? t("government.name_required") : !validSources(nonemptySources) ? t("government.source_required")
    : !validPeriod(existence) || !validPeriod(affiliation) ? t("government.period_invalid") : !country || !basis ? t("government.country_missing") : null;
  const mark = <T,>(setter: (value: T) => void) => (value: T) => { if (!busy) { dirtyInput.current=true;setter(value); setDirty(true); } };
  const reload=()=>{
    if(runner.busy||team.suspended||(dirty&&!window.confirm(t('government.leave.confirm'))))return;
    dirtyInput.current=false;setDirty(false);setFailure(null);setLoading(true);runner.clear('organization');setReadRun(run=>run+1);
  };
  const save = async () => {
    if (busy || problem || projectStore.getSnapshot().project?.id !== projectId) return;
    const result = await runner.run("organization", "CreateGovernmentOrganization", { ...(targetIri ? { iri: targetIri } : {}), names, kind, identifier, countryIri: country, referenceBasis: basis, existencePeriod: existence, countryPeriod: affiliation, sources: nonemptySources });
    if (result && runner.alive()) { dirtyInput.current=false;setDirty(false); onSaved(result.created ?? targetIri!); }
  };
  return <form className="government-form" aria-labelledby={`${id}-title`} data-team-draft-complete={!dirty}
    onSubmit={event => { event.preventDefault(); void save(); }} onKeyDown={event => { if (event.key === "Escape" && !runner.busy && !team.suspended) { event.preventDefault(); event.stopPropagation(); onCancel(); } }}>
    <h2 id={`${id}-title`}>{t("government.organization_saved")}</h2>
    {targetIri && <p className="detail-note">{targetIri}</p>}{loading && <p role="status">{t("common.loading")}</p>}
    {stale&&dirty&&<p role="alert">{t('government.organizationChanged')}</p>}
    {unsupported && <p role="status">{t("government.unsupportedEntry")}</p>}{failure !== null && <div role="alert"><OperationError failure={{ cause: failure, message: makeUiMessage("government.detailsUnavailable") }} /><button type="button" onClick={reload}>{t("common.retry")}</button></div>}
    <NamesEditor names={names} onChange={mark(setNames)} busy={busy} language={primary} />
    <label htmlFor={`${id}-kind`}>{t("government.organizationType")}</label>
    <select id={`${id}-kind`} value={kind} aria-disabled={busy} onChange={event => mark(setKind)(event.target.value as OrganizationView["kind"])}>{options.map(option => <option key={option.iri} value={option.value}>{option.label}</option>)}</select>
    <label htmlFor={`${id}-identifier`}>{t("government.identifier")}</label><input id={`${id}-identifier`} value={identifier} maxLength={4096} aria-disabled={busy} onChange={event => mark(setIdentifier)(event.target.value)} />
    <CountryPicker projectId={projectId} value={country} busy={busy} onChange={selection => { if (!busy) { dirtyInput.current=true;setCountry(selection.iri); setBasis(selection.basis); setDirty(true); } }} />
    <PeriodEditor label={t("government.existencePeriod")} period={existence} onChange={mark(setExistence)} busy={busy} />
    <PeriodEditor label={t("government.countryPeriod")} period={affiliation} onChange={mark(setAffiliation)} busy={busy} />
    <SourcesEditor sources={sources} onChange={mark(setSources)} busy={busy} />
    {problem && <p id={`${id}-problem`}>{problem}</p>}{runner.errors.organization && <p role="alert">{runner.errors.organization}</p>}<RunnerErrorDetails runner={runner} />
    <button type="submit" className="primary" aria-disabled={busy || Boolean(problem)} aria-describedby={problem ? `${id}-problem` : undefined}>{t("government.organization_saved")}</button>
    <button type="button" aria-disabled={runner.busy} onClick={() => { if (!runner.busy && !team.suspended) onCancel(); }}>{t("common.cancel")}</button>
    {targetIri&&!failure&&<button type="button" aria-disabled={runner.busy||team.suspended} onClick={reload}>{t('government.reloadEntry')}</button>}
  </form>;
}
