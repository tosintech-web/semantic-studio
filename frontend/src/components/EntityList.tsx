/*
================================================================================
FILE: frontend/src/components/EntityList.tsx
SUMMARY
    Complete dictionary browser independent of the graph drawing budget.
BASIC IDEA
    Fetch one 50-row page, retain local filter/sort controls and select by IRI.
    Whole-dictionary metadata supplies only kinds present in the current view;
    accessible tabs preserve their place while requests are pending.
INPUTS / INPUT SOURCES
    Dictionary/view identity and a callback into App's existing detail selection.
EXPECTED OUTPUT
    Bounded rows, paging, match explanations and translated loading/retry state.
================================================================================
*/
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useEntityPage } from "../entities/useEntityPage";
import type { EntityKindGroup } from "../entities/types";
import { kindLabelMessage } from "../i18n/kindLabel";
import { renderServerError } from "../i18n/serverMessage";
import { useI18n } from "../i18n/I18nProvider";
const groups: EntityKindGroup[] = ["all", "concept", "individual", "class", "properties", "other"];
export interface EntityListProps {
  ontologyId: string; language: string; imports: boolean; revision: number; viewGeneration: string;
  initialQuery: string; onSelect(iri: string | null): void; onReferenceOnly?(iri: string | null): void; selectedIri?: string | null; selectionStale?: boolean;
}
export default function EntityList({ initialQuery, onSelect, onReferenceOnly, selectedIri, selectionStale, ...identity }: EntityListProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [composing, setComposing] = useState(false);
  const [q, setQ] = useState(initialQuery);
  const [kindSelection, setKindSelection] = useState<{ owner: string; kind: EntityKindGroup }>({ owner: identity.ontologyId, kind: "all" });
  const kind = kindSelection.owner === identity.ontologyId ? kindSelection.kind : "all";
  if (kindSelection.owner !== identity.ontologyId) setKindSelection({ owner: identity.ontologyId, kind: "all" });
  const [sort, setSort] = useState<"label" | "iri">("label");
  const { page: loadedPage, kindCounts, loading, error, updating, offset, setOffset, reload } = useEntityPage({ ...identity, q, kind, sort });
  const tabsId = useId();
  const tabRefs = useRef<Partial<Record<EntityKindGroup, HTMLButtonElement | null>>>({});
  const focusedKind = useRef<EntityKindGroup | null>(null);
  const restoreAllFocus = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterPage = useRef(false);
  const available = groups.filter(group => group === "all" || (kindCounts[group] ?? 0) > 0);
  const missingKind = loadedPage !== null && kind !== "all" && (kindCounts[kind] ?? 0) <= 0;
  const page = missingKind ? null : loadedPage;
  const selectKind = (next: EntityKindGroup) => {
    focusAfterPage.current = false;
    setKindSelection({ owner: identity.ontologyId, kind: next });
  };
  useLayoutEffect(() => {
    // An edit can remove the final member of the chosen kind. Reset before
    // paint; restore focus only if the disappearing tab actually held it.
    if (missingKind) {
      restoreAllFocus.current = focusedKind.current === kind;
      focusAfterPage.current = false;
      setKindSelection({ owner: identity.ontologyId, kind: "all" });
    } else if (restoreAllFocus.current) {
      restoreAllFocus.current = false;
      tabRefs.current.all?.focus();
    }
  }, [missingKind, kind, identity.ontologyId]);
  const moveTab = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = available.indexOf(kind);
    let next: EntityKindGroup | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = available[(at + 1) % available.length];
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = available[(at + available.length - 1) % available.length];
    else if (event.key === "Home") next = available[0];
    else if (event.key === "End") next = available[available.length - 1];
    if (next) { event.preventDefault(); selectKind(next); tabRefs.current[next]?.focus(); }
  };
  useEffect(() => { setQuery(initialQuery); setQ(initialQuery); }, [initialQuery, identity.ontologyId]);
  useEffect(() => {
    if (composing) return;
    const timer = window.setTimeout(() => setQ(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query, composing]);
  useEffect(() => { if (!loading && focusAfterPage.current) { heading.current?.focus(); focusAfterPage.current = false; } }, [loading]);
  useEffect(() => {
    // Only the current page is exposed by useEntityPage while a new source is
    // loading. A repeated IRI may now be defined (or only referenced). Preserve
    // it across Undo, but never retain an absent old-source classification.
    if (!page || !selectedIri) return;
    const row = page.items.find(item => item.iri === selectedIri);
    if (row) onReferenceOnly?.(row.reference_only ? row.iri : null);
    else if (selectionStale) { onSelect(null); onReferenceOnly?.(null); }
  }, [page, selectedIri, selectionStale, onSelect, onReferenceOnly]);
  const move = (position: number) => { focusAfterPage.current = true; setOffset(position); };
  const range = page ? t("entities.range", { start: page.total ? page.offset + 1 : 0, end: Math.min(page.offset + page.items.length, page.total), total: page.total }) : "";
  return <section className="entity-list" aria-labelledby="entities-heading">
    <h2 id="entities-heading" ref={heading} tabIndex={-1}>{t("nav.entities")}</h2>
    <div className="side-tabs entity-kind-tabs" role="tablist" aria-label={t("entities.kind")} onKeyDown={moveTab}>
      {available.map(group => <button key={group} type="button" role="tab"
        ref={element => { tabRefs.current[group] = element; }}
        id={`${tabsId}-${group}`} aria-controls={`${tabsId}-panel`} aria-selected={kind === group}
        tabIndex={kind === group ? 0 : -1} className={kind === group ? "side-tab active" : "side-tab"}
        onFocus={() => { focusedKind.current = group; }} onBlur={() => { focusedKind.current = null; }}
        onClick={() => selectKind(group)}>{t(`entities.${group}`)}</button>)}
    </div>
    <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${missingKind ? "all" : kind}`} aria-busy={loading || missingKind}>
    <div className="entity-list-controls">
      <label>{t("entities.filter")}<input type="search" value={query} maxLength={512}
        onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onChange={e => setQuery(e.target.value)} /></label>
      <label>{t("entities.sort")}<select value={sort} onChange={e => setSort(e.target.value as "label" | "iri")}>
        <option value="label">{t("entities.sortLabel")}</option><option value="iri">{t("entities.sortIri")}</option>
      </select></label>
    </div>
    <p role="status" aria-live="polite">{loading || missingKind ? t("search.loading") : updating ? t("entities.updating") : error ? renderServerError(error, t) : range}</p>
    {(error || updating) && <button type="button" onClick={reload}>{t("common.retry")}</button>}
    {!!error && <details><summary>{t("common.error")}</summary><pre>{error instanceof Error ? error.message : String(error)}</pre></details>}
    {page && <>
      {page.items.length === 0 ? <p>{t("entities.empty")}</p> : <div className="entity-table-scroll"><table>
        <caption className="visually-hidden">{t("nav.entities")}</caption>
        <thead><tr><th scope="col">{t("entities.label")}</th><th scope="col">{t("entities.kind")}</th><th scope="col">{t("entities.iri")}</th><th scope="col">{t("entities.description")}</th></tr></thead>
        <tbody>{page.items.map(item => <tr key={item.iri} aria-selected={selectedIri === item.iri || undefined}>
          <td><button type="button" className="entity-open" title={`${item.label}\n${item.iri}`} onClick={() => { onSelect(item.iri); onReferenceOnly?.(item.reference_only ? item.iri : null); }}>{item.label}</button>
            {item.reference_only && <p>{t("entities.reference")}</p>}
            {item.label_truncated && <p>{t("entities.truncated")}</p>}
            {item.label_fallback && <p>{t("entities.fallback", { language: item.label_language ?? "—" })}</p>}
            {item.match && <p>{t(`match.${item.match.reason}`, { value: item.match.value })}</p>}
          </td><td>{kindLabelMessage(item.kind, t)}</td><td><code title={item.iri}>{item.iri}</code></td><td>{item.description}</td>
        </tr>)}</tbody>
      </table></div>}
      <div className="entity-list-pages">
        <button type="button" disabled={offset === 0} onClick={() => move(Math.max(0, offset - 50))}>{t("entities.previous")}</button>
        <button type="button" disabled={page.offset + page.items.length >= page.total} onClick={() => move(offset + 50)}>{t("entities.next")}</button>
      </div>
    </>}
    </div>
  </section>;
}
