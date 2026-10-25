/*
================================================================================
FILE: frontend/src/components/ResultsTable.tsx
================================================================================

SUMMARY
    SERVICE failures render source metadata with untouched original details.
    Renders SPARQL query results as a sortable, paged table: a column per
    variable, a row count, duration and page position, a truncation notice,
    Export CSV / Export JSON controls, a control that empties the results area,
    URI cells as clickable chips with a secondary "view in source" control,
    literal cells as text (unbound cells shown as em dashes), and, for a query
    with SERVICE blocks, which sites the results came from.

BASIC IDEA
    Presentational over one SparqlResults. Column headers toggle client-side
    sort (numeric where possible, else case-insensitive text). Clicking a URI
    chip calls onPickIri, which selects the entity and draws it if the node
    budget left it out; the small control beside it calls onViewInSource, which
    switches to View mode positioned at that entity's first line.

    Only one page of rows is in the document at a time. The server caps a
    result set at 1,000 rows, and putting all of them in a 40vh scroller buried
    the panel — so the sort runs over every row and the slice happens after it,
    which is the only ordering that lets page one show the true top rows.

    The component is memoised. Growing the graph from a result chip changes
    App's state several times over — the neighbourhood, what the merge added,
    the live-region sentence — and every one of those renders QueryPanel again.
    Without the memo the table under the user's cursor would be rebuilt each
    time for no change at all. It only bites while all its props keep their
    identity, which is why QueryPanel and App hand over callbacks that do.

INPUTS / INPUT SOURCES (props)
    - results: the SparqlResults to display.
    - ontologyName: the active ontology's name, for the export filename.
    - onPickIri: select an entity when its result chip is clicked, drawing it
      first if it is not on the canvas.
    - onViewInSource: show that entity's first line in the raw source.
    - onClear: empty the results area, leaving the query untouched.
    - onFrame / graphNote: Frame on graph, shown while results are on the
      graph, and the sentence when more were hidden than drawn
      (query-page-rework 5.2).

EXPECTED OUTPUT
    - The rendered results table (or an empty-result note), with a line per
      SERVICE fact when there are any: the hosts that answered, a per-call row
      cap reached, a call SERVICE SILENT skipped (external-access AC-32).
    - onPickIri and
      onViewInSource on click; onClear when the clear control is pressed; and a
      CSV / JSON file download when an export control is pressed (Q-2).
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { renderServerMessage } from "../i18n/serverMessage";
import { englishTranslator, formatNumber } from "../i18n/format";
import type { Translator } from "../i18n/types";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { triggerDownload } from "../download";
import { resultsFilename, toCsv, toJson } from "../sparql/exportResults";
import type { ServiceCall, SparqlResults, SparqlTerm } from "../types";

interface Props {
  results: SparqlResults;
  ontologyName?: string;
  onPickIri: (iri: string) => void;
  onViewInSource: (iri: string, prefixed?: string) => void;
  onClear: () => void;
  /** Frame the results on the graph again (query-page-rework 5.2); absent
   *  while none of them is on the graph. */
  onFrame?: () => void;
  /** The sentence when more results were hidden than the graph drew. */
  graphNote?: string | null;
}

type ExportFormat = "csv" | "json";

/** What Tab may land on inside the truncation confirmation. Same selector as
 *  AboutPanel: the document-bound trap wraps focus across these while the modal
 *  is open, so a keyboard user cannot tab out into the table behind it. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Rows to a page. Fifteen fills the results scroller at the current row height
 * without producing a scrollbar on a typical window, so the common case needs
 * no scrolling at all.
 */
const PAGE_SIZE = 15;

/** Which pagination control was last pressed, so focus can survive the change. */
type Pressed = "first" | "prev" | "next" | "last";

/** What a URI cell shows: the label if there is one, else the shortened IRI. */
function chipLabel(term: SparqlTerm): string {
  return term.label || term.prefixed || term.value;
}

function sortValue(term: SparqlTerm | null): string | number {
  if (!term) return "";
  if (term.type === "literal") {
    const asNumber = Number(term.value);
    return Number.isNaN(asNumber) || term.value.trim() === "" ? term.value.toLowerCase() : asNumber;
  }
  return (term.label ?? term.value).toLowerCase();
}

/**
 * What the results owe to other sites, one sentence each (external-access
 * AC-32): which hosts answered, whose answer hit the per-call row cap, and
 * which failed and were skipped under SERVICE SILENT. Hosts rather than full
 * endpoint addresses, because the host is what the user approved.
 */
export function describeServices(services: ServiceCall[], translator?: Translator): string[] {
  // Direct legacy callers keep their strings; the UI always passes its locale.
  const t = translator ?? englishTranslator;
  const answered = [...new Set(services.filter((s) => !s.error).map((s) => s.host))];
  const lines: string[] = [];
  if (answered.length > 0) lines.push(t("results.services", { hosts: answered.join(", ") }));
  for (const s of services) {
    if (s.truncated) {
      lines.push(t("results.serviceCap", { host: s.host, count: s.rows }));
    }
    if (s.error) lines.push(t("results.serviceSkipped", { host: s.host, error: translator ? renderServerMessage(s.errorUiMessage, s.error, t) : s.error }));
  }
  return lines;
}

function ServiceNotes({ services }: { services: ServiceCall[] }) {
  const { t } = useI18n();
  return (
    <div className="results-services">
      {describeServices(services, t).map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      {services.filter(service => service.error).map((service, index) => (
        <details className="technical-details" key={`${service.endpoint}|${index}`}>
          <summary>{t("common.original")}</summary><pre>{service.error}</pre>
        </details>
      ))}
    </div>
  );
}

function ResultsTable({
  results,
  ontologyName,
  onPickIri,
  onViewInSource,
  onClear,
  onFrame,
  graphNote = null,
}: Props) {
  const { t, locale } = useI18n();
  const [sort, setSort] = useState<{ column: number; asc: boolean } | null>(null);
  const [page, setPage] = useState(0);
  // The format awaiting the truncation confirmation, or null when no dialog is
  // open. A truncated result holds only the first 1,000 rows, so exporting it is
  // confirmed first — a partial file that looks whole is worse than none.
  const [confirmFormat, setConfirmFormat] = useState<ExportFormat | null>(null);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pressed = useRef<Pressed | null>(null);
  // The export buttons, the confirmation dialog, its default control, and the
  // control to return focus to on either exit — the AboutPanel focus-trap
  // pattern the documentation export uses.
  const csvBtnRef = useRef<HTMLButtonElement>(null);
  const jsonBtnRef = useRef<HTMLButtonElement>(null);
  const confirmPanelRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);

  const rows = useMemo(() => {
    if (!sort) return results.rows;
    const copy = [...results.rows];
    copy.sort((a, b) => {
      const left = sortValue(a[sort.column]);
      const right = sortValue(b[sort.column]);
      if (left === right) return 0;
      const result = left < right ? -1 : 1;
      return sort.asc ? result : -result;
    });
    return copy;
  }, [results.rows, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Clamped rather than trusted: a new, shorter result set arrives one render
  // before the effect below can reset `page`, and slicing past the end would
  // show an empty table for that frame.
  const current = Math.min(page, pageCount - 1);

  // The row at position 170 of the old result set has no claim to be the same
  // row in the new one. `page` deliberately does not depend on the sort here —
  // sorting resets it in the header's own handler, so the sort memo is not
  // invalidated by paging. See the "changing page does not re-sort" test.
  useEffect(() => {
    setPage(0);
  }, [results]);

  // A control that has just become disabled cannot hold focus: the browser
  // blurs it to <body> and re-enabling never gives it back (measured in Chrome
  // 2026-07-30, see CLAUDE.md). When the press lands on an end of the range,
  // hand focus to the control that still moves the other way; otherwise the
  // pressed control is still enabled and keeps focus without help.
  useEffect(() => {
    const which = pressed.current;
    if (!which) return;
    pressed.current = null;
    if ((which === "first" || which === "prev") && current === 0) nextRef.current?.focus();
    else if ((which === "next" || which === "last") && current === pageCount - 1) {
      prevRef.current?.focus();
    }
  }, [current, pageCount]);

  const goTo = (target: number, which: Pressed) => {
    pressed.current = which;
    setPage(Math.min(Math.max(target, 0), pageCount - 1));
  };

  const visible = useMemo(
    () => rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE),
    [rows, current],
  );

  const noRows = results.rowCount === 0;

  // Build the file from ALL rows in the table's CURRENT sort order (`rows`, the
  // sorted whole set — not the visible page and not the server's original
  // order), so what you see is what you get (AC-9). CSV/JSON shaping and the
  // formula neutralization live in the pure exportResults module.
  const doExport = (format: ExportFormat) => {
    const ordered: SparqlResults = { ...results, rows };
    const text = format === "csv" ? toCsv(ordered) : toJson(ordered);
    const mime = format === "csv" ? "text/csv;charset=utf-8" : "application/json";
    const blob = new Blob([text], { type: mime });
    triggerDownload(blob, resultsFilename(ontologyName, format));
  };

  // A press either exports immediately or, on a truncated result, opens the
  // confirmation first (AC-13). The pressed button is remembered so focus can
  // return to it on either exit of the dialog.
  const requestExport = (format: ExportFormat) => {
    if (noRows) return;
    if (results.truncated) {
      returnFocusRef.current = format === "csv" ? csvBtnRef.current : jsonBtnRef.current;
      setConfirmFormat(format);
    } else {
      doExport(format);
    }
  };

  const confirmExport = () => {
    if (confirmFormat) doExport(confirmFormat);
    setConfirmFormat(null);
    returnFocusRef.current?.focus();
  };

  const cancelConfirm = () => {
    setConfirmFormat(null);
    returnFocusRef.current?.focus();
  };

  // Focus the dialog's default control when it opens.
  useEffect(() => {
    if (confirmFormat) confirmBtnRef.current?.focus();
  }, [confirmFormat]);

  // The focus trap (AC-13/AC-14), the AboutPanel document-bound pattern: Escape
  // cancels, Tab and Shift+Tab wrap inside the dialog, and Tab from outside is
  // pulled back to the first control. On `document`, not the panel, because
  // clicking the panel's prose blurs focus to <body> and a panel-scoped handler
  // would then see neither key.
  useEffect(() => {
    if (!confirmFormat) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelConfirm();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = confirmPanelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // cancelConfirm is stable enough for the dialog's lifetime; keying on
    // confirmFormat is what installs and removes the trap with the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmFormat]);

  if (results.vars.length === 0) return null;

  const paged = pageCount > 1;
  const firstRow = current * PAGE_SIZE + 1;
  const lastRow = Math.min(firstRow + PAGE_SIZE - 1, rows.length);

  return (
    <div className="results">
      <div className="results-header">
        <span>
          {t("results.title")} <span className="count">{formatNumber(locale, results.rowCount)}</span>
        </span>
        <span className="dim">{formatNumber(locale, results.durationMs)} ms</span>
        {paged && (
          <span className="results-page">
            {t("results.page", { page: current + 1, pages: pageCount })}
          </span>
        )}
        {results.truncated && (
          <span className="results-truncated" title={t("results.capHint")}>
            {t("results.cap", { count: results.rowCount })}
          </span>
        )}
        <div className="spacer" />
        {/* Two plain buttons rather than an Export ▾ menu: two labelled controls
            are reachable in the tab order with no focus-return question, for two
            choices. Disabled by aria (not the native attribute) so they stay
            focusable and announce their state; requestExport is a no-op with no
            rows. AC-10/11/14. */}
        <button
          ref={csvBtnRef}
          className="ghost results-export"
          aria-disabled={noRows}
          title={noRows ? t("results.noExport") : t("results.csvHint")}
          onClick={() => requestExport("csv")}
        >
          {t("results.csv")}
        </button>
        <button
          ref={jsonBtnRef}
          className="ghost results-export"
          aria-disabled={noRows}
          title={noRows ? t("results.noExport") : t("results.jsonHint")}
          onClick={() => requestExport("json")}
        >
          {t("results.json")}
        </button>
        {/* "Clear results", not "Clear": the path bar already has a control
            called Clear path, and two controls sharing a word while doing
            different things is a defect in itself. */}
        {/* The camera only: the rings stay as they are. The one way to bring
            the results back into view after moving the graph, since an
            automatic re-run never moves it. */}
        {onFrame && (
          <button
            className="ghost results-frame"
            onClick={onFrame}
            title={t("results.frameHint")}
          >
            {t("results.frame")}
          </button>
        )}
        <button
          className="ghost results-clear"
          onClick={onClear}
          title={t("results.clearHint")}
        >
          {t("results.clear")}
        </button>
      </div>
      {graphNote && <p className="results-graph-note">{graphNote}</p>}
      {results.services && results.services.length > 0 && (
        <ServiceNotes services={results.services} />
      )}
      {results.rowCount === 0 ? (
        <p className="detail-note">
          {t("results.noRows")}
        </p>
      ) : (
        <>
          <div className="results-scroll">
            <table className="results-table">
              <thead>
                <tr>
                  {results.vars.map((name, index) => (
                    <th
                      key={name}
                      onClick={() => {
                        setSort((prev) =>
                          prev && prev.column === index
                            ? { column: index, asc: !prev.asc }
                            : { column: index, asc: true },
                        );
                        // A sort whose top the user cannot see is not a sort.
                        setPage(0);
                      }}
                      title={t("results.sort")}
                    >
                      {name}
                      {sort?.column === index && <span className="sort-arrow">{sort.asc ? "▲" : "▼"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((term, cellIndex) => (
                      <td key={cellIndex}>
                        {term === null ? (
                          <span className="dim">—</span>
                        ) : term.type === "uri" ? (
                          // The chip keeps the meaning it has always had; the
                          // source control is deliberately second, smaller and
                          // not the thing a click lands on.
                          <span className="result-cell">
                            <button
                              className="result-chip"
                              title={term.value}
                              onClick={() => onPickIri(term.value)}
                            >
                              {chipLabel(term)}
                            </button>
                            {/* Named after its own entity, not "View in
                                source": forty identical names down a column
                                tell a screen reader user nothing about which
                                row they are on. The label is explicit rather
                                than name-from-contents because the contents are
                                a decorative glyph — see architecture.md v0.16. */}
                            <button
                              className="result-source"
                              aria-label={t("results.source", { name: chipLabel(term) })}
                              title={t("results.source", { name: chipLabel(term) })}
                              onClick={() => onViewInSource(term.value, term.prefixed)}
                            >
                              <span aria-hidden="true">◧</span>
                            </button>
                          </span>
                        ) : (
                          <span className="result-literal" title={term.datatype ?? undefined}>
                            {term.value}
                            {term.lang && <span className="term-tag">@{term.lang}</span>}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paged && (
            <nav className="results-pager" aria-label={t("results.pages")}>
              <button
                className="pager-btn"
                aria-label={t("results.first")}
                aria-disabled={current === 0}
                disabled={current === 0}
                title={current === 0 ? t("results.alreadyFirst") : t("results.first")}
                onClick={() => goTo(0, "first")}
              >
                <span aria-hidden="true">|◀</span>
              </button>
              <button
                ref={prevRef}
                className="pager-btn"
                aria-label={t("results.prev")}
                aria-disabled={current === 0}
                disabled={current === 0}
                title={current === 0 ? t("results.alreadyFirst") : t("results.prev")}
                onClick={() => goTo(current - 1, "prev")}
              >
                <span aria-hidden="true">◀</span>
              </button>
              {/* The region is in the document whenever there is more than one
                  page, not created on the first change — a live region added at
                  the moment its content appears is not reliably announced. */}
              <span className="results-page-status" role="status" aria-live="polite">
                {t("results.range", { page: current + 1, pages: pageCount, start: firstRow, end: lastRow, total: rows.length })}
              </span>
              <button
                ref={nextRef}
                className="pager-btn"
                aria-label={t("results.next")}
                aria-disabled={current === pageCount - 1}
                disabled={current === pageCount - 1}
                title={current === pageCount - 1 ? t("results.alreadyLast") : t("results.next")}
                onClick={() => goTo(current + 1, "next")}
              >
                <span aria-hidden="true">▶</span>
              </button>
              <button
                className="pager-btn"
                aria-label={t("results.last")}
                aria-disabled={current === pageCount - 1}
                disabled={current === pageCount - 1}
                title={current === pageCount - 1 ? t("results.alreadyLast") : t("results.last")}
                onClick={() => goTo(pageCount - 1, "last")}
              >
                <span aria-hidden="true">▶|</span>
              </button>
            </nav>
          )}
        </>
      )}

      {/* Truncation confirmation (AC-13): a real modal with a focus trap. A
          capped result holds only the first 1,000 rows, so the file can only be
          that — confirmed first so it is never a silent partial answer. Escape
          and the backdrop cancel; focus returns to the pressed export button. */}
      {confirmFormat && (
        <div className="modal-backdrop" onClick={cancelConfirm}>
          <div
            ref={confirmPanelRef}
            className="modal modal-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="export-confirm-title">{t("results.exportTitle")}</h2>
            </div>
            <p>
              {t("results.exportBody", { count: results.rowCount })}
            </p>
            <div className="modal-actions">
              <button className="ghost" onClick={cancelConfirm}>
                {t("common.cancel")}
              </button>
              <button ref={confirmBtnRef} className="primary" onClick={confirmExport}>
                {t("results.exportAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ResultsTable);
