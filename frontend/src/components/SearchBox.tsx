/*
================================================================================
FILE: frontend/src/components/SearchBox.tsx
================================================================================

SUMMARY
    The header search box. Debounced type-ahead over the loaded ontology's
    nodes; picking a result calls onPick (which centres the graph on it, and in
    Query mode also adds it to the path).

BASIC IDEA
    On each keystroke (debounced, min 1 character; 300ms; paused during composition) it queries /search and shows a
    dropdown. A document mousedown listener closes the dropdown on outside
    click. The placeholder changes in Query mode to signal that picking adds a
    step.

    A text input with a list beneath it is a combobox, and since 2026-07-31 it
    says so: the input carries role="combobox" with aria-expanded and
    aria-activedescendant, and the list is a listbox of options with stable ids.
    Up and Down move the ACTIVE option without moving focus, which is the one
    place in this application where a roving aria-activedescendant is used
    rather than real focus — focus has to stay in the field or typing stops
    working. Enter picks the active option; Escape closes the list and leaves
    the typed text alone.

    Search covers the whole ontology while the graph draws only the highest-
    degree nodes the server's budget allows, so a result is regularly an entity
    that is not on the canvas. Those rows say so: picking one draws it and opens
    its detail panel, and silence there would read as the application ignoring
    the click.

INPUTS / INPUT SOURCES (props)
    - ontologyId: which ontology to search (disabled when null).
    - theme: for the result swatches.
    - onPick: called with the chosen node's IRI.
    - drawnIds: the entities currently on the canvas, or null when unknown.
    - placeholder: prompt text (differs per mode).
    - imports: search the merged view (external-access Stage 2); an imported
      result names the import it comes from.

EXPECTED OUTPUT
    - The rendered search box and dropdown; onPick on selection.
    - A polite announcement of how many results a completed search found.
    - The limits in words (U-4, explore-and-query-layout 5.7): a line after the 25th
      result when more match. One more than is shown is asked for, so the box
      knows.
    - Only the latest search's answer is applied; an older request still on
      its way is aborted (CF-4).
================================================================================
*/

import { useDictionaryDisplayLanguage } from "../dictionary/useDictionaryLanguage";
import { useDictionaryView } from "../dictionary/DictionaryViewContext";
import { useEntitySearch, SHOWN_RESULTS } from "../entities/useEntitySearch";
import { renderServerError } from "../i18n/serverMessage";
import { useI18n } from "../i18n/I18nProvider";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Theme } from "../types";
import { kindColor, kindLabel } from "../types";
export { SHOWN_RESULTS } from "../entities/useEntitySearch";
interface Props {
  ontologyId: string | null;
  theme: Theme;
  onPick: (iri: string) => void;
  drawnIds?: Set<string> | null;
  placeholder?: string;
  imports?: boolean;
  onShowAll?: (query: string) => void;
}
const LIST_ID = "search-results-list";
const optionId = (index: number) => `search-result-${index}`;
export default function SearchBox({ ontologyId, theme, onPick, drawnIds = null, placeholder, imports = false, onShowAll }: Props) {
  const { t } = useI18n();
  const language = useDictionaryDisplayLanguage();
  const view = useDictionaryView();
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const { results, loading, error, more } = useEntitySearch({ ontologyId, language, imports, ...view, query, composing });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setActive(-1); }, [results]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const expanded = open && results.length > 0;
  useEffect(() => {
    if (active >= 0) document.getElementById(optionId(active))?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  const pick = (iri: string) => { onPick(iri); setOpen(false); setActive(-1); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composing || e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Escape") { if (open) { e.preventDefault(); setOpen(false); setActive(-1); } return; }
    if (!expanded) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => i <= 0 ? results.length - 1 : i - 1); }
    else if (e.key === "Enter" && active >= 0 && active < results.length) { e.preventDefault(); pick(results[active].id); }
  };
  const status = !query.trim() || composing ? "" : loading ? t("search.loading") : error ? renderServerError(error, t) : more ? t("search.more", { count: SHOWN_RESULTS }) : results.length ? (results.length === 1 ? t("search.one") : t("search.count", { count: results.length })) : t("search.none");
  return (
    <div className="search-box" ref={wrapRef}>
      <input type="search" role="combobox" aria-label={placeholder ?? t("search.prompt")}
        aria-expanded={expanded} aria-controls={LIST_ID} aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 && active < results.length ? optionId(active) : undefined}
        placeholder={placeholder ?? t("search.prompt")} value={query} disabled={!ontologyId}
        onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }} onKeyDown={onKeyDown} onFocus={() => setOpen(true)} />
      <div className="visually-hidden" role="status" aria-live="polite">{status}</div>
      {open && query.trim() && !composing && !results.length && <p className="search-results search-hint">{status}</p>}
      {expanded && <div className="search-results">
        <ul className="search-options" id={LIST_ID} role="listbox" aria-label={t("search.results")}>
          {results.map((r, index) => <li key={r.id} id={optionId(index)} role="option" aria-selected={index === active}
            className={index === active ? "active" : undefined} onClick={() => pick(r.id)}>
            <span className="dot" style={{ background: kindColor(r.kind, theme, r.classType) }} />
            <span className="result-label">{r.label}</span>
            {r.match && <span className="result-match">{t(`match.${r.match.reason}`, { value: r.match.value })}</span>}
            {drawnIds !== null && !drawnIds.has(r.id) && <span className="result-undrawn" title={t("search.undrawnTitle")}>{t("search.undrawn")}</span>}
            {r.importedFrom && <span className="result-imported">{t("search.from", { name: r.importedFrom })}</span>}
            <span className="result-kind">{kindLabel(r.kind, t)}</span>
          </li>)}
        </ul>
        {more && <p className="search-more">{t("search.narrow", { count: SHOWN_RESULTS })}
          {onShowAll && <button type="button" onClick={() => { onShowAll(query.trim()); setOpen(false); }}>{t("search.showAll")}</button>}
        </p>}
      </div>}
    </div>
  );
}
