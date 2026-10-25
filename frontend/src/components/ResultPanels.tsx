/*
================================================================================
FILE: frontend/src/components/ResultPanels.tsx
================================================================================

SUMMARY
    Validation's results (shacl-authoring 5.6, 5.7): the Validate button,
    the line that says a result is stale, and one collapsible panel per
    shape -- red when it fails, green when it passes, amber for warnings
    only, grey when there was nothing to check, a red outline when the shape
    could not run -- each opening onto its problems as sentences, grouped by
    rule, with the individual's name as a link that selects it.

BASIC IDEA
    Shape-engine refusals render validated display facts in the current UI
    language and retain escaped engine text in original-details disclosures.

    Owned controls, headers and count guidance follow the current UI locale;
    result identity, open panels and navigation facts remain unchanged. Generated
    violations, group and focus labels use producer facts; authored RDF text and
    legacy-only results stay literal, and original diagnostics remain available.

    Shown in the Shapes view and under the Turtle editor of shapes.ttl,
    reading one result from the project store, so both places show the same
    check. Nothing validates on its own: only the button runs a check
    (D-094). While one runs the button reads *Validating…* and the previous
    panels stay, dimmed, until the new ones replace them. When the model or
    the shapes have moved past the revisions the result checked, a line
    above the panels says so.

    A panel's header carries a sign and a word as well as a colour, so
    colour is never the only signal (5.7), and it is a button with
    aria-expanded whose name includes the state word and the counts
    (Section 6). Panels start collapsed and only headers render until one
    opens, which is what keeps 50 shapes and 10,000 problems fast to paint
    (Section 10). The server sends at most 200 problems a panel and the true
    total, and the panel says *and 870 more*.

    Why Validate cannot run is text beside it, tied with aria-describedby
    (Stage B follow-up 7). A class with nothing to check points to *Add an
    example* on its form, which Stage B made true (follow-up 8).

    A problem's name is a button: following it selects the individual and
    moves focus to its form (Section 6), which App arranges.

    A panel that checked individuals from a data snapshot says so under its
    header, with the snapshot's label -- a sample's words included -- in
    view whether the panel is open or not (csv-data-import 5.6). A change to
    the snapshots since the check makes the result stale, as an edit does.

INPUTS / INPUT SOURCES (props)
    - onSelect(iri): follow a problem's link.
    Plus the project store: the result, whether a check is running, and the
    documents' revisions and the data generation for the stale line.

EXPECTED OUTPUT
    - ValidateButton and ResultPanels.
================================================================================
*/

import { renderServerMessage, validWireMessage } from "../i18n/serverMessage";
import { useI18n } from "../i18n/I18nProvider";
import { useEffect, useId, useMemo, useState } from "react";
import {
  STATE_SIGNS,
  panelStateWord,
  panelHeader,
  panelName,
} from "../modeling/shapeSentences";
import { dataLabel } from "../modeling/dataSentences";
import { dataGenerationOf, projectStore, useProjectSelector } from "../state/projectStore";
import type { DataSource, ProjectDocumentState, ValidationPanel, ValidationResult } from "../types";

// A shape on every class or every concept checks the model itself, where an
// example is not what is missing.
const MODEL_TARGETS = new Set([
  "http://www.w3.org/2002/07/owl#Class",
  "http://www.w3.org/2000/01/rdf-schema#Class",
  "http://www.w3.org/2004/02/skos/core#Concept",
]);

/** A result is stale when either document has moved past what it checked,
 *  or the data snapshots have (`generation`, when it is known). */
export function isStale(
  result: ValidationResult | null,
  documents: ProjectDocumentState[],
  generation: number | null = null,
): boolean {
  if (!result) return false;
  const rev = (doc: string) => documents.find((d) => d.doc === doc)?.revision ?? null;
  const data = generation !== null && result.revisions.data !== undefined && generation !== result.revisions.data;
  return rev("model") !== result.revisions.model || rev("shapes") !== result.revisions.shapes || data;
}

interface ButtonProps {
  onError: (message: string) => void;
  /** Why it cannot run now (the editor's text is not applied), or null. */
  blocked?: string | null;
  /** A run is starting from this button: Shapes shows its Results tab. */
  onStart?: () => void;
}

/** The one way to validate (5.6). aria-disabled while a check runs, so the
 *  focus it holds is never dropped. Why it cannot run is said in text beside
 *  it and tied to it with aria-describedby: a tooltip alone reaches neither
 *  a keyboard nor a screen reader (Stage A follow-up 7). */
export function ValidateButton({ onError, blocked = null, onStart }: ButtonProps) {
  const { t } = useI18n();
  const validating = useProjectSelector((s) => s.validating);
  const reasonId = useId();
  return (
    <>
      <button
        type="button"
        className="primary validate-btn"
        aria-disabled={validating || blocked !== null}
        aria-describedby={blocked !== null ? reasonId : undefined}
        title={blocked ?? t("results.validateHint")}
        onClick={() => {
          if (validating || blocked !== null) return;
          onStart?.();
          projectStore.validate().catch((e: unknown) => onError(e instanceof Error ? e.message : String(e)));
        }}
      >
        {t(validating ? "results.validating" : "results.validate")}
      </button>
      {blocked !== null && (
        <span id={reasonId} className="detail-note validate-reason">
          {blocked}
        </span>
      )}
    </>
  );
}

interface Props {
  onSelect: (iri: string) => void;
}

export default function ResultPanels({ onSelect }: Props) {
  const { t } = useI18n();
  const result = useProjectSelector((s) => s.validation);
  const validating = useProjectSelector((s) => s.validating);
  const documents = useProjectSelector((s) => s.documents);
  const generation = useProjectSelector((s) => (s.data ? dataGenerationOf(s) : null));
  const [open, setOpen] = useState<Set<string>>(new Set());
  // A new result starts collapsed again: the old one's open panels may be
  // other shapes now.
  useEffect(() => setOpen(new Set()), [result]);
  const stale = isStale(result, documents, generation);
  const sources = new Map((result?.dataSources ?? []).map((d) => [d.id, d]));

  if (!result) {
    return (
      <p className="detail-note results-empty">
        {t("results.empty")}
      </p>
    );
  }
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className={validating ? "result-panels busy" : "result-panels"} aria-busy={validating}>
      {stale && (
        <p className="results-stale">{t("results.stale")}</p>
      )}
      {result.stopped ? (
        <p className="results-stopped" role="alert">
          {t(result.shapeCount === 1 ? "results.stopped.one" : "results.stopped.many", { shapes: result.shapeCount, statements: result.statements })}
        </p>
      ) : result.shapes.length === 0 ? (
        <p className="detail-note">{t("results.noShapes")}</p>
      ) : (
        <>
          <div className="results-toolbar">
            <button type="button" className="ghost" onClick={() => setOpen(new Set(result.shapes.map((p) => p.id)))}>
              {t("hierarchy.expand")}
            </button>
            <button type="button" className="ghost" onClick={() => setOpen(new Set())}>
              {t("hierarchy.collapse")}
            </button>
          </div>
          <ul className="result-panel-list">
            {result.shapes.map((panel) => (
              <Panel
                key={panel.id}
                panel={panel}
                expanded={open.has(panel.id)}
                onToggle={() => toggle(panel.id)}
                onSelect={onSelect}
                data={(panel.data ?? []).map((id) => sources.get(id)).filter((d): d is DataSource => !!d)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

interface PanelProps {
  panel: ValidationPanel;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (iri: string) => void;
  /** The data snapshots whose individuals this shape checked. */
  data?: DataSource[];
}

function Panel({ panel, expanded, onToggle, onSelect, data = [] }: PanelProps) {
  const { locale, t } = useI18n();
  const id = useId();
  return (
    <li className={`result-panel result-${panel.state}`}>
      <h4 className="result-panel-heading">
        <button
          type="button"
          className="result-panel-header"
          aria-expanded={expanded}
          aria-controls={`${id}-body`}
          aria-label={panelName(panel, locale)}
          onClick={onToggle}
        >
          <span className="result-sign" aria-hidden="true">
            {STATE_SIGNS[panel.state]}
          </span>
          <span className="result-word">{panelStateWord(panel.state, t)}</span>
          <span className="result-text">{panelHeader(panel, locale)}</span>
        </button>
      </h4>
      {data.map((source) => (
        <p key={source.id} className="result-data">
          {t("results.checkedData", { source: dataLabel(source, locale) })}
        </p>
      ))}
      <div id={`${id}-body`} className="result-panel-body" hidden={!expanded}>
        {expanded && <PanelBody panel={panel} onSelect={onSelect} />}
      </div>
    </li>
  );
}

function PanelBody({ panel, onSelect }: { panel: ValidationPanel; onSelect: (iri: string) => void }) {
  const { t } = useI18n();
  const groups = useMemo(() => {
    const out = new Map<string, ValidationPanel["problems"]>();
    for (const problem of panel.problems) {
      const list = out.get(problem.group) ?? [];
      list.push(problem);
      out.set(problem.group, list);
    }
    return [...out.entries()];
  }, [panel.problems]);
  if (panel.state === "error") {
    return (
      <>
        <p className="result-error-text">
          {t("results.shapeError", { error: renderServerMessage(panel.errorUiMessage, panel.error ?? "", t) })}
        </p>
        <details className="technical-details"><summary>{t("common.details")}</summary><pre>{panel.error}</pre></details>
      </>
    );
  }
  if (panel.state === "nothing") {
    // Stage B made "add one" true: a class's form has *Add an example*
    // (5.8, follow-up 8). Concepts and every class are the model itself.
    const label = panel.target?.label ?? t("shapePanel.match.one");
    const ofClass = panel.target !== null && !MODEL_TARGETS.has(panel.target.iri);
    return (
      <p className="detail-note">
        {t(ofClass ? "results.nothingClass" : "results.nothingOther", { label })}
      </p>
    );
  }
  if (panel.state === "passes") {
    return <p className="detail-note">{t("results.passes")}</p>;
  }
  const more = panel.problemsTotal - panel.problems.length;
  return (
    <>
      {groups.map(([group, problems]) => (
        <section key={group} className="result-group">
          <h5>{validWireMessage(problems[0]?.groupUiMessage) ? renderServerMessage(problems[0].groupUiMessage, group, t) : group}</h5>
          <ul>
            {problems.map((p, i) => {
              const focusLabel = validWireMessage(p.focusLabelUiMessage) ? renderServerMessage(p.focusLabelUiMessage, p.focusLabel, t) : p.focusLabel;
              // Missing metadata can be authored RDF or an older server. Keep it
              // literal; a new unknown violation gets context plus original details.
              const described = p.uiMessage != null;
              const sentence = !described ? p.sentence : validWireMessage(p.uiMessage)
                ? renderServerMessage(p.uiMessage, p.sentence, t) : t("validation.unknown");
              return <li key={`${p.focus}-${i}`} className={`result-problem severity-${p.severity}`}>
                {p.focus ? (
                  <button type="button" className="link-btn result-who" onClick={() => onSelect(p.focus!)}>
                    {focusLabel}
                  </button>
                ) : (
                  <span className="result-who">{focusLabel}</span>
                )}
                <span className="result-sentence">{sentence}</span>
                {p.value !== null && <span className="result-value">{t("results.value", { value: validWireMessage(p.valueUiMessage) ? renderServerMessage(p.valueUiMessage, p.value, t) : p.value })}</span>}
                {described && <details className="technical-details"><summary>{t("common.details")}</summary><pre>{p.sentence}</pre></details>}
              </li>;
            })}
          </ul>
        </section>
      ))}
      {more > 0 && <p className="detail-note result-more">{t("results.more", { count: more })}</p>}
    </>
  );
}
