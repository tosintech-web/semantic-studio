/*
================================================================================
FILE: frontend/src/government/CountryPicker.tsx
SUMMARY
    Searchable, paged country selector bound to its exact source snapshot.
BASIC IDEA
    Results belong to project, query, page and language. A selected IRI never
    silently adopts a newer basis; even the same country can be reselected.
    Native search/select/buttons keep keyboard behavior and global focus style.
INPUTS / INPUT SOURCES
    Project owner, retained IRI, busy flag and typed country candidate API.
EXPECTED OUTPUT
    Explicit {iri,basis} selections and recoverable owner-scoped read failures.
================================================================================
*/
import { useEffect, useId, useState } from "react";
import { getCountryChoices } from "../api";
import { useI18n } from "../i18n/I18nProvider";
import { renderServerError } from "../i18n/serverMessage";
import type { CountryPage, ReferenceBasis } from "./types";

interface Props {
  projectId: string;
  value: string;
  onChange: (selection: { iri: string; basis: ReferenceBasis }) => void;
  busy: boolean;
  language?: string;
}

export default function CountryPicker({ projectId, value, onChange, busy, language }: Props) {
  const { locale, t } = useI18n();
  const id = useId();
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const owner = JSON.stringify([projectId, query, offset, language ?? locale, retry]);
  const [result, setResult] = useState<{ owner: string; page: CountryPage } | null>(null);
  const [failure, setFailure] = useState<{ owner: string; cause: unknown } | null>(null);
  const page = result?.owner === owner ? result.page : null;
  const error = failure?.owner === owner ? failure.cause : null;
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    getCountryChoices(projectId, { query, offset, limit: 50, displayLanguage: language ?? locale, signal: controller.signal })
      .then(found => { if (live) setResult({ owner, page: found }); })
      .catch(cause => { if (live) setFailure({ owner, cause }); });
    return () => { live = false; controller.abort(); };
  }, [projectId, query, offset, language, locale, retry, owner]);
  return <fieldset className="government-country-picker">
    <legend>{t("government.country")}</legend>
    {value && <p>{t("government.selectedCountry", { iri: value })}</p>}
    <label htmlFor={`${id}-search`}>{t("government.searchCountries")}</label>
    <input id={`${id}-search`} type="search" value={query} maxLength={200} aria-disabled={busy}
      onChange={event => { if (!busy) { setQuery(event.target.value); setOffset(0); } }} />
    <label htmlFor={`${id}-choice`}>{t("government.chooseCountry")}</label>
    <select id={`${id}-choice`} value="" aria-disabled={busy || !page} onChange={event => {
      if (!busy && page && page.items.some(item => item.iri === event.target.value)) onChange({ iri: event.target.value, basis: page.basis });
    }}>
      <option value="">{t("government.chooseCountry")}</option>
      {page?.items.map(item => <option key={item.iri} value={item.iri}>{item.label}{item.code ? ` · ${item.code}` : ""} · {item.iri}</option>)}
    </select>
    <div role="status" aria-live="polite">
      {page ? t("government.countryCounts", { shown: page.items.length, total: page.total }) : error ? "" : t("common.loading")}
      {page?.total === 0 && <p>{t("government.countryEmpty")}</p>}
    </div>
    {error !== null && <p role="alert">{renderServerError(error, t)} <button type="button" aria-disabled={busy} onClick={() => { if (!busy) setRetry(run => run + 1); }}>{t("common.retry")}</button></p>}
    <button type="button" aria-disabled={busy || offset === 0 || !page} onClick={() => { if (!busy && page && offset > 0) setOffset(Math.max(0, offset - 50)); }}>{t("government.previousPage")}</button>
    <button type="button" aria-disabled={busy || !page || offset + 50 >= page.total} onClick={() => { if (!busy && page && offset + 50 < page.total) setOffset(offset + 50); }}>{t("government.nextPage")}</button>
    <button type="button" aria-disabled={busy} onClick={() => { if (!busy) setRetry(run => run + 1); }}>{t("government.refreshCountries")}</button>
  </fieldset>;
}
