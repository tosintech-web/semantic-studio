/*
================================================================================
FILE: frontend/src/government/EntryParts.tsx
SUMMARY
    Native, accessible name/source/period controls shared by domain forms.
BASIC IDEA
    User changes are controlled drafts; unknown/open/date boundaries remain
    separate. Add/remove controls restore focus without custom keyboard widgets.
INPUTS / INPUT SOURCES
    Typed drafts, translated guidance and explicit parent change callbacks.
EXPECTED OUTPUT
    Reusable fieldsets and owner-bound pending-input registration.
================================================================================
*/
import { useEffect, useId, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { projectStore } from "../state/projectStore";
import type { NameDraft } from "./form";
import type { Bound, Period, Source } from "./types";

export function usePendingEntry(projectId: string, dirty: boolean): void {
  const pending = useRef(dirty);
  pending.current = dirty;
  useEffect(() => projectStore.registerPendingForm(projectId, () => pending.current), [projectId]);
}

export function NamesEditor({ names, onChange, busy, language, aliases = false }: { names: NameDraft[]; onChange: (names: NameDraft[]) => void; busy: boolean; language: string; aliases?: boolean }) {
  const { t } = useI18n();
  const id = useId();
  const heading = useRef<HTMLLegendElement>(null);
  const root = useRef<HTMLFieldSetElement>(null);
  const change = (index: number, patch: Partial<NameDraft>) => { if (!busy) onChange(names.map((name, i) => i === index ? { ...name, ...patch } : name)); };
  return <fieldset ref={root}>
    <legend ref={heading} tabIndex={-1}>{t(aliases ? "government.aliases" : "government.preferredNames")}</legend>
    {names.map((name, index) => <div key={index} className="government-name-row">
      <label htmlFor={`${id}-${index}-value`}>{t(aliases ? "government.aliasNumber" : "government.nameNumber", { number: index + 1 })}</label>
      <input id={`${id}-${index}-value`} data-name-value="true" value={name.value} maxLength={4096} aria-disabled={busy} onChange={event => change(index, { value: event.target.value })} />
      <label htmlFor={`${id}-${index}-language`}>{t("government.nameLanguage", { number: index + 1 })}</label>
      <input id={`${id}-${index}-language`} value={name.language} aria-disabled={busy} onChange={event => change(index, { language: event.target.value })} />
      <button type="button" aria-disabled={busy} onClick={() => {
        if (busy) return;
        onChange(names.filter((_, i) => i !== index));
        window.setTimeout(() => heading.current?.focus(), 0);
      }}>{t("government.removeName", { number: index + 1 })}</button>
    </div>)}
    <button type="button" aria-disabled={busy || names.length >= 100} onClick={() => {
      if (busy || names.length >= 100) return;
      onChange([...names, { value: "", language }]);
      window.setTimeout(() => { const fields = root.current?.querySelectorAll<HTMLInputElement>("input[data-name-value]"); fields?.[fields.length - 1]?.focus(); }, 0);
    }}>{t(aliases ? "government.addAlias" : "government.addName")}</button>
  </fieldset>;
}

export function SourcesEditor({ sources, onChange, busy }: { sources: Source[]; onChange: (sources: Source[]) => void; busy: boolean }) {
  const { t } = useI18n();
  const id = useId();
  const heading = useRef<HTMLLegendElement>(null);
  const change = (index: number, patch: Partial<Source>) => { if (!busy) onChange(sources.map((source, i) => i === index ? { ...source, ...patch } : source)); };
  return <fieldset>
    <legend ref={heading} tabIndex={-1}>{t("government.sources")}</legend>
    {sources.map((source, index) => <div key={index}>
      <label htmlFor={`${id}-${index}-type`}>{t("government.sourceType", { number: index + 1 })}</label>
      <select id={`${id}-${index}-type`} value={source.kind} aria-disabled={busy} onChange={event => change(index, { kind: event.target.value as Source["kind"] })}>
        <option value="text">{t("government.sourceText")}</option><option value="iri">{t("government.sourceLink")}</option>
      </select>
      <label htmlFor={`${id}-${index}-value`}>{t("government.sourceNumber", { number: index + 1 })}</label>
      <input id={`${id}-${index}-value`} value={source.value} maxLength={4096} aria-disabled={busy} onChange={event => change(index, { value: event.target.value })} />
      <button type="button" aria-disabled={busy} onClick={() => { if (!busy) { onChange(sources.filter((_, i) => i !== index)); window.setTimeout(() => heading.current?.focus(), 0); } }}>{t("government.removeSource", { number: index + 1 })}</button>
    </div>)}
    <button type="button" aria-disabled={busy || sources.length >= 100} onClick={() => { if (!busy && sources.length < 100) onChange([...sources, { kind: "text", value: "" }]); }}>{t("government.addSource")}</button>
  </fieldset>;
}

export function PeriodEditor({ label, period, onChange, busy }: { label: string; period: Period; onChange: (period: Period) => void; busy: boolean }) {
  const { t } = useI18n();
  const id = useId();
  const update = (key: "start" | "end", bound: Bound) => { if (!busy) onChange({ ...period, [key]: bound }); };
  return <fieldset><legend>{label}</legend>{(["start", "end"] as const).map(key => {
    const bound = period[key];
    const title = t(key === "start" ? "government.periodStart" : "government.periodEnd", { period: label });
    return <div key={key}>
      <label htmlFor={`${id}-${key}`}>{title}</label>
      <select id={`${id}-${key}`} value={bound.date !== null ? "date" : bound.open ? "open" : "unknown"} aria-disabled={busy} onChange={event => update(key, { date: event.target.value === "date" ? "" : null, open: event.target.value === "open" })}>
        <option value="unknown">{t("government.boundUnknown")}</option><option value="open">{t("government.boundOpen")}</option><option value="date">{t("government.boundDate")}</option>
      </select>
      {bound.date !== null && <><label htmlFor={`${id}-${key}-date`}>{t("government.boundValue", { bound: title })}</label>
        <input id={`${id}-${key}-date`} type="date" min="0001-01-01" max="9999-12-31" value={bound.date} aria-disabled={busy} onChange={event => update(key, { date: event.target.value, open: false })} /></>}
    </div>;
  })}<p className="detail-note">{t("government.periodHelp")}</p></fieldset>;
}
