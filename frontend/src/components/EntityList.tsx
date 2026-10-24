/*
================================================================================
FILE: frontend/src/components/EntityList.tsx
SUMMARY
    Complete dictionary browser independent of the graph drawing budget.
BASIC IDEA
    Fetch one 50-row page, retain local filter/sort controls and select by IRI.
    The ordinary table preserves keyboard navigation and explicit true totals.
INPUTS / INPUT SOURCES
    Dictionary/view identity and a callback into App's existing detail selection.
EXPECTED OUTPUT
    Bounded rows, paging, match explanations and translated loading/retry state.
================================================================================
*/
import { useEffect, useRef, useState } from "react";
import { useEntityPage } from "../entities/useEntityPage";
import type { EntityKindGroup } from "../entities/types";
import { kindLabelMessage } from "../i18n/kindLabel";
import { renderServerError } from "../i18n/serverMessage";
import { useI18n } from "../i18n/I18nProvider";
const groups: EntityKindGroup[] = ["all", "concept", "individual", "class", "properties", "other"];
export interface EntityListProps {
  ontologyId: string; language: string; imports: boolean; revision: number; viewGeneration: string;
  initialQuery: string; onSelect(iri: string): void; onReferenceOnly?(iri: string | null): void; selectedIri?: string | null;
}
export default function EntityList({ initialQuery, onSelect, onReferenceOnly, selectedIri, ...identity }: EntityListProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [composing, setComposing] = useState(false);
  const [q, setQ] = useState(initialQuery);
  const [kind, setKind] = useState<EntityKindGroup>("all");
  const [sort, setSort] = useState<"label" | "iri">("label");
  const { page, loading, error, updating, offset, setOffset, reload } = useEntityPage({ ...identity, q, kind, sort });
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterPage = useRef(false);
  useEffect(() => { setQuery(initialQuery); setQ(initialQuery); }, [initialQuery, identity.ontologyId]);
  useEffect(() => {
    if (composing) return;
    const timer = window.setTimeout(() => setQ(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query, composing]);
  useEffect(() => { if (!loading && focusAfterPage.current) { heading.current?.focus(); focusAfterPage.current = false; } }, [loading]);
  const move = (position: number) => { focusAfterPage.current = true; setOffset(position); };
  const range = page ? t("entities.range", { start: page.total ? page.offset + 1 : 0, end: Math.min(page.offset + page.items.length, page.total), total: page.total }) : "";
  return <section className="entity-list" aria-labelledby="entities-heading">
    <h2 id="entities-heading" ref={heading} tabIndex={-1}>{t("nav.entities")}</h2>
    <div className="entity-list-controls">
      <label>{t("entities.filter")}<input type="search" value={query} maxLength={512}
        onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onChange={e => setQuery(e.target.value)} /></label>
      <label>{t("entities.kind")}<select value={kind} onChange={e => setKind(e.target.value as EntityKindGroup)}>
        {groups.map(group => <option key={group} value={group}>{t(`entities.${group}`)}</option>)}
      </select></label>
      <label>{t("entities.sort")}<select value={sort} onChange={e => setSort(e.target.value as "label" | "iri")}>
        <option value="label">{t("entities.sortLabel")}</option><option value="iri">{t("entities.sortIri")}</option>
      </select></label>
    </div>
    <p role="status" aria-live="polite">{loading ? t("search.loading") : updating ? t("entities.updating") : error ? renderServerError(error, t) : range}</p>
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
  </section>;
}
