/*
================================================================================
FILE: frontend/src/government/CountryForm.tsx
SUMMARY
    Creates and edits a country's complete multilingual entry.
BASIC IDEA
    An owner-keyed body keeps drafts across language changes and ignores late
    reads/writes after navigation. Unsupported managed RDF stays read-only.
INPUTS / INPUT SOURCES
    Project/target identity, exact country detail and the existing command runner.
EXPECTED OUTPUT
    One reversible country command or a retained draft with a current-language error.
================================================================================
*/
import { useEffect, useId, useState } from "react";
import { getCountryChoices } from "../api";
import { useRunner, RunnerErrorDetails } from "../components/EditParts";
import OperationError from "../components/OperationError";
import { useI18n } from "../i18n/I18nProvider";
import { makeUiMessage } from "../i18n/uiMessage";
import { projectStore } from "../state/projectStore";
import { useTeam } from "../team/TeamProvider";
import { NamesEditor, SourcesEditor, usePendingEntry } from "./EntryParts";
import { validNames, validSources, type NameDraft } from "./form";
import type { ReferenceBasis, Source } from "./types";

export interface CountryFormProps { projectId: string; targetIri?: string; onSaved: (iri: string) => void; onCancel: () => void }
export default function CountryForm(props: CountryFormProps) { return <CountryFormBody key={`${props.projectId}|${props.targetIri ?? "new"}`} {...props} />; }

function CountryFormBody({ projectId, targetIri, onSaved, onCancel }: CountryFormProps) {
  const { t } = useI18n();
  const team = useTeam();
  const runner = useRunner("model");
  const id = useId();
  const primary = projectStore.getSnapshot().project?.primaryLanguage ?? "en";
  const [names, setNames] = useState<NameDraft[]>([{ value: "", language: primary }]);
  const [aliases, setAliases] = useState<NameDraft[]>([]);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [sources, setSources] = useState<Source[]>([{ kind: "text", value: "" }]);
  const [basis, setBasis] = useState<ReferenceBasis | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(Boolean(targetIri));
  const [unsupported, setUnsupported] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [readRun, setReadRun] = useState(0);
  usePendingEntry(projectId, dirty);
  useEffect(() => {
    if (!targetIri) return;
    let live = true;
    const controller = new AbortController();
    getCountryChoices(projectId, { iri: targetIri, signal: controller.signal }).then(page => {
      if (!live) return;
      const entry = page.items.find(item => item.iri === targetIri);
      if (!entry?.names || !entry.aliases || !entry.sources) throw new Error("Country details are unavailable.");
      setNames(entry.names); setAliases(entry.aliases); setCode(entry.code ?? ""); setDescription(entry.description ?? "");
      setSources(entry.sources.length ? entry.sources : [{ kind: "text", value: "" }]);
      setBasis(page.basis); setUnsupported(Boolean(entry.unsupported?.length)); setLoading(false);
    }).catch(error => { if (live) { setFailure(error); setLoading(false); } });
    return () => { live = false; controller.abort(); };
  }, [projectId, targetIri, readRun]);
  const reload = () => {
    if (runner.busy || team.suspended || (dirty && !window.confirm(t("government.leave.confirm")))) return;
    setDirty(false); setFailure(null); setLoading(true); runner.clear("country"); setReadRun(run => run + 1);
  };
  const busy = runner.busy || loading || !team.canEdit || team.suspended || unsupported || Boolean(failure);
  const nonemptySources = sources.filter(source => source.value.trim());
  const problem = !validNames(names) || (aliases.length > 0 && !validNames(aliases, false)) ? t("government.name_required")
    : !validSources(nonemptySources, false) ? t("government.source_required") : null;
  const mark = <T,>(setter: (value: T) => void) => (value: T) => { if (!busy) { setter(value); setDirty(true); } };
  const save = async () => {
    if (busy || problem || projectStore.getSnapshot().project?.id !== projectId) return;
    const result = await runner.run("country", "CreateCountry", { ...(targetIri ? { iri: targetIri, referenceBasis: basis } : {}), names, aliases, code, sources: nonemptySources, description });
    if (result && runner.alive()) { setDirty(false); onSaved(result.created ?? targetIri!); }
  };
  return <form className="government-form" aria-labelledby={`${id}-title`} data-team-draft-complete={!dirty}
    onSubmit={event => { event.preventDefault(); void save(); }} onKeyDown={event => { if (event.key === "Escape" && !runner.busy && !team.suspended) { event.preventDefault(); event.stopPropagation(); onCancel(); } }}>
    <h2 id={`${id}-title`}>{t("government.country_saved")}</h2>
    {targetIri && <p className="detail-note">{targetIri}</p>}
    {loading && <p role="status">{t("common.loading")}</p>}
    {unsupported && <p role="status">{t("government.unsupportedEntry")}</p>}
    {failure !== null && <div role="alert"><OperationError failure={{ cause: failure, message: makeUiMessage("government.detailsUnavailable") }} /><button type="button" onClick={reload}>{t("common.retry")}</button></div>}
    <NamesEditor names={names} onChange={mark(setNames)} busy={busy} language={primary} />
    <NamesEditor names={aliases} onChange={mark(setAliases)} busy={busy} language={primary} aliases />
    <label htmlFor={`${id}-code`}>{t("government.countryCode")}</label><input id={`${id}-code`} value={code} maxLength={4096} aria-disabled={busy} onChange={event => mark(setCode)(event.target.value)} />
    <label htmlFor={`${id}-description`}>{t("government.description")}</label><textarea id={`${id}-description`} value={description} maxLength={4096} aria-disabled={busy} onChange={event => mark(setDescription)(event.target.value)} />
    <SourcesEditor sources={sources} onChange={mark(setSources)} busy={busy} />
    {problem && <p id={`${id}-problem`}>{problem}</p>}
    {runner.errors.country && <p role="alert">{runner.errors.country}</p>}<RunnerErrorDetails runner={runner} />
    <button type="submit" className="primary" aria-disabled={busy || Boolean(problem)} aria-describedby={problem ? `${id}-problem` : undefined}>{t("government.country_saved")}</button>
    <button type="button" aria-disabled={runner.busy} onClick={() => { if (!runner.busy && !team.suspended) onCancel(); }}>{t("common.cancel")}</button>
    {targetIri && !failure && <button type="button" aria-disabled={runner.busy || team.suspended} onClick={reload}>{t("government.reloadEntry")}</button>}
  </form>;
}
