/*
================================================================================
FILE: frontend/src/components/QueryPanel.tsx
================================================================================

SUMMARY
    Query failures retain their causes and render in the current UI language.
    The right-hand panel shown in Query mode. It ties the whole visual query
    builder together: the guided start, the path bar, the per-chip menus, the
    live plain-English + SPARQL preview, the toolbar (Auto/Paths/Distinct/
    Count/LIMIT/Copy/Save/Execute), the results table, and the saved-query list.

BASIC IDEA
    Owned controls and confirmations use the current UI translator. Query
    text, save-name drafts, query options and original author labels remain
    unchanged; generated descriptions and stored notices migrate at their
    producers separately. Clipboard success waits for the actual write.

    QueryPanel is mostly orchestration. The real state lives in the shared
    useQueryBuilder hook (passed in as `builder`); this component renders it and
    wires the buttons. It adds a few local concerns: an auto-preview that runs a
    small LIMITed query as you build (only on small ontologies, so it stays
    instant), the Auto/refresh toggle for the preview, and the save flow,
    which says in a note under the name field when the name is already used
    (U-4).

    One piece of its markup is layout rather than orchestration: the toolbar,
    the save prompt and the SPARQL preview are wrapped in a single
    .query-pinned element so they can stick to the top of the panel while the
    results scroll under them. The order is the scope line, that block, the
    builder, the results and the saved queries (explore-and-query-layout 5.4):
    the query and Execute first, the results where they do not push the
    builder away.

    It also wires SPARQL as text (spec sparql-text-and-query-files). Edit as
    text and New text query open SparqlEditor in the preview's place; while
    the query is text the builder's controls sit in a disabled, labelled
    fieldset, the auto-preview stops, and Save stores `mode: "text"`. Saved
    text queries are marked with the word "text", and queries stored in the
    ontology itself are listed under the saved ones, fetched only when that
    list is opened. With the editor never opened, this panel renders and
    requests exactly what it did before, plus the two buttons (AC-1).

    Every change of the results is reported to App with whether a person
    asked for it (query-page-rework 5.2): Execute, Run, Ctrl+Enter and a
    starter are explicit and frame the graph; an Auto preview only moves the
    rings. A starter runs when clicked, and its own state is not previewed
    as well, as a five-row preview landing late would replace the answer.

INPUTS / INPUT SOURCES (props)
    - ontologyId: the active ontology.
    - theme: colour theme (passed to child chips).
    - builder: the useQueryBuilder return value (state + actions).
    - onPickIri: select a node in the graph when a result chip is clicked,
      drawing it first if the node budget left it out.
    - onViewInSource: follow a result into the raw source text.
    - ontologyTriples: size gate for the auto-preview.
    - includeImports / importsCount: whether queries run over the ontology
      and its resolved imports (external-access Stage 2), and over how many
      imported documents. The panel states which, in text (AC-20).
    - dataSources: a project's switched-on data snapshots, each named on a
      source line, a sample's words included (csv-data-import 5.6).
    - rdfsClasses: the classes the graph draws as RDFS-only, for the path
      bar's colours (portal-foundations 5.3).
    - questions: a bundled example's ready-made questions, first in Try one
      of these; a click opens one as a text query and runs it (5.4).
    - onResults / resultsOnGraph / onFrameResults / resultsNote: the results
      on the graph (query-page-rework 5.2): each change reported, Frame on
      graph while any are drawn, and the header's sentence for the undrawn.

EXPECTED OUTPUT
    - The rendered query panel and the side effects of its controls (executing
      queries, saving/loading/deleting saved queries, opening and downloading
      .rq files in the browser).
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { makeUiMessage } from "../i18n/uiMessage";
import { originalError, type OperationFailure } from "../i18n/operationFailure";
import OperationError from "./OperationError";
import { englishTranslator } from "../i18n/format";
import type { Translator } from "../i18n/types";
import { useDictionaryDisplayLanguage } from "../dictionary/useDictionaryLanguage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteSavedQuery,
  getEmbeddedQueries,
  listSavedQueries,
  runSparql,
  saveQuery,
} from "../api";
import { triggerDownload } from "../download";
import { describeQuery } from "../sparql/describe";
import { assignVarNames, generateSparql, localName } from "../sparql/generate";
import {
  MAX_QUERY_BYTES,
  startingText,
  TOO_LARGE_TO_RUN,
  byteLength,
  readQueryFile,
  rqFileName,
} from "../sparql/textQuery";
import { linkOptionsBetween } from "../sparql/useQueryBuilder";
import { dataLabel } from "../modeling/dataSentences";
import type { useQueryBuilder } from "../sparql/useQueryBuilder";
import type { QueryState } from "../sparql/types";
import type {
  DataSource,
  EmbeddedQueries,
  EmbeddedQuery,
  ExampleQuestion,
  SavedQuery,
  SparqlResults,
  Theme,
} from "../types";
import ClassPropsMenu from "./ClassPropsMenu";
import NextSteps from "./NextSteps";
import PathBar from "./PathBar";
import type { OpenMenu } from "./PathBar";
import PredicateMenu from "./PredicateMenu";
import QueryStart from "./QueryStart";
import ResultsTable from "./ResultsTable";
import SparqlEditor from "./SparqlEditor";
import SparqlPreview from "./SparqlPreview";

interface Props {
  ontologyId: string | null;
  /** The active ontology's display name, for the result-export filename (Q-2). */
  ontologyName?: string;
  theme: Theme;
  builder: ReturnType<typeof useQueryBuilder>;
  onPickIri: (iri: string) => void;
  onViewInSource: (iri: string, prefixed?: string) => void;
  /** Auto-preview is only worth running while it stays instant. */
  ontologyTriples: number;
  /** Run queries over the merged view. */
  includeImports?: boolean;
  /** Resolved imported documents, or null when the ontology has none known. */
  importsCount?: number | null;
  /** A project's switched-on data snapshots, named on the source line with
   *  their labels (csv-data-import 5.6). */
  dataSources?: DataSource[];
  /** Classes the graph draws in the RDFS class colour, for the path bar. */
  rdfsClasses?: ReadonlySet<string>;
  /** Every change of the results, and whether a person asked for this run
   *  (Execute, Run, Ctrl+Enter, a starter): only that frames the graph
   *  (query-page-rework 5.2). An Auto preview is never explicit. */
  onResults?: (results: SparqlResults | null, explicit: boolean) => void;
  /** How many of the results are on the graph, for Frame on graph. */
  resultsOnGraph?: number;
  /** Frame the results on the graph again; the camera only. */
  onFrameResults?: () => void;
  /** The header's sentence when more results were hidden than drawn. */
  resultsNote?: string | null;
  /** A bundled example's ready-made questions (query-page-rework 5.4);
   *  App hands them over only for an example, told by its record. */
  questions?: ExampleQuestion[];
}

/** One of the toolbar's four switches: a toggle button that says whether it
 *  is on in words for a screen reader (aria-pressed) and with a check mark
 *  for the eye, as well as the tint. */
function QuerySwitch({
  on,
  onToggle,
  title,
  children,
}: {
  on: boolean;
  onToggle: () => void;
  title: string;
  children: string;
}) {
  return (
    <button
      className={on ? "toggle-pill active" : "toggle-pill"}
      aria-pressed={on}
      onClick={onToggle}
      title={title}
    >
      {on && <span aria-hidden="true">✓</span>}
      {children}
    </button>
  );
}

/** What the panel says about what a query runs over. Null says nothing: an
 *  ontology with no resolved imports has only one thing to query. */
export function queryScopeText(includeImports: boolean, importsCount: number | null, t: Translator = englishTranslator): string | null {
  if (includeImports) {
    const n = importsCount ?? 0;
    return t(n === 1 ? "queryPanel.scope.one" : "queryPanel.scope.many", { count: n });
  }
  if (importsCount && importsCount > 0) return t("queryPanel.scope.alone");
  return null;
}

export const DISCARD_TEXT = englishTranslator("queryPanel.discard");
export const ONLY_SELECT = englishTranslator("queryPanel.onlySelect");
export const CUT_SHORT = englishTranslator("queryPanel.cutShort");
export const SHACL_VARIABLES_NOTE = englishTranslator("queryPanel.shaclVariables");

/** What opening a query stored in the ontology gives the editor. */
export function embeddedOptions(query: EmbeddedQuery) {
  return {
    name: query.label,
    runBlocked: query.form !== "SELECT" ? ONLY_SELECT : query.truncated ? CUT_SHORT : null,
    note: query.shaclVariables ? SHACL_VARIABLES_NOTE : null,
    runBlockedUi: query.form !== "SELECT" ? makeUiMessage("queryPanel.onlySelect") : query.truncated ? makeUiMessage("queryPanel.cutShort") : undefined,
    noteUi: query.shaclVariables ? makeUiMessage("queryPanel.shaclVariables") : undefined,
  };
}

const NO_QUESTIONS: ExampleQuestion[] = [];

/** Above this size a preview is no longer guaranteed to feel immediate. */
const AUTO_PREVIEW_MAX_TRIPLES = 50000;
const PREVIEW_ROWS = 5;

export default function QueryPanel({
  ontologyId,
  ontologyName,
  theme,
  builder,
  onPickIri,
  onViewInSource,
  ontologyTriples,
  includeImports = false,
  importsCount = null,
  dataSources = [],
  rdfsClasses,
  onResults,
  resultsOnGraph = 0,
  onFrameResults,
  resultsNote = null,
  questions = NO_QUESTIONS,
}: Props) {
  const {
    schema,
    schemaError,
    loadingSchema,
    state,
    setState,
    sparql,
    hint,
    removeStep,
    updateStep,
    updateLink,
    clear,
    openQuery,
    setOpenQuery,
    loadState,
    addClass,
    addNextStep,
    nextStepOptions,
    dataPropertiesFor,
    ancestorsOf,
    textQuery,
    textRef,
    forkToText,
    openTextQuery,
    setText,
    markTextSaved,
    leaveText,
    textIsDirty,
  } = builder;

  const { locale, t } = useI18n();
  const dictionaryLanguage = useDictionaryDisplayLanguage();
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
  const [auto, setAuto] = useState(true);
  const [frozen, setFrozen] = useState<string | null>(null);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<OperationFailure | null>(null);
  const [copyState, setCopyState] = useState<"copied" | "failed" | null>(null);
  const [saved, setSaved] = useState<SavedQuery[]>([]);
  const [saveName, setSaveName] = useState("");
  const [savePrompt, setSavePrompt] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  // The editor opened on the builder's own query. A text query opens it too,
  // and keeps it open across a visit to another mode, because the hook holds
  // it and this panel remounts.
  const [editorOpen, setEditorOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState(false);
  const [embeddedOpen, setEmbeddedOpen] = useState(false);
  const [embedded, setEmbedded] = useState<EmbeddedQueries | null>(null);
  const [embeddedError, setEmbeddedError] = useState<unknown | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  const inText = textQuery !== null;
  const editorShown = editorOpen || inText;
  const embeddedCount = schema?.embeddedQueryCount ?? 0;

  const preview = auto ? sparql : frozen ?? sparql;
  const { stepVars } = useMemo(() => assignVarNames(state), [state]);

  const classKinds = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cls of schema?.classes ?? []) map[cls.iri] = cls.kind;
    return map;
  }, [schema]);

  const labelFor = useCallback(
    (iri: string) => {
      for (const link of schema?.links ?? []) {
        if (link.predicate === iri) return link.label;
      }
      return localName(iri);
    },
    [schema],
  );

  // Every change of the results goes through here, so App's rings follow
  // the table exactly: what it shows is what the graph rings.
  //
  // Only the latest request may show its answer (query-page-rework 5.2):
  // each run and each preview takes the next number, and so does every
  // clearing, so a slow starter's answer never lands over a newer preview,
  // a preview never over Execute, and nothing lands after the ontology
  // changed or this panel went.
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;
  const latest = useRef(0);
  const show = useCallback((next: SparqlResults | null, explicit: boolean) => {
    if (next === null) latest.current += 1;
    setResults(next);
    onResultsRef.current?.(next, explicit);
  }, []);

  // Empties the results area only. The query, the path, the pins and the saved
  // queries are untouched — that is the whole distinction from the path bar's
  // Clear path.
  //
  // A useCallback rather than an inline arrow because ResultsTable is memoised:
  // a fresh identity here would re-render the table on every App render, which
  // is exactly what the memo is there to stop while a graph expansion is in
  // flight underneath it.
  const clearResults = useCallback(() => show(null, false), [show]);
  // Leaving Query takes the results with this panel, so the rings go too.
  useEffect(
    () => () => {
      latest.current += 1;
      onResultsRef.current?.(null, false);
    },
    [],
  );

  const refreshSaved = useCallback(() => {
    if (!ontologyId) return;
    listSavedQueries(ontologyId)
      .then(setSaved)
      .catch(() => setSaved([]));
  }, [ontologyId]);

  useEffect(() => {
    refreshSaved();
    show(null, false);
    setError(null);
    setOpenMenu(null);
  }, [refreshSaved, show]);

  // The stored queries belong to one ontology and one view of it. The key is
  // also what a response is checked against when it lands: one started for
  // the other view must not fill this one's list.
  const embeddedKey = `${ontologyId}|${includeImports}`;
  const embeddedKeyRef = useRef(embeddedKey);
  embeddedKeyRef.current = embeddedKey;
  useEffect(() => {
    setEmbedded(null);
    setEmbeddedError(null);
    setEmbeddedOpen(false);
  }, [ontologyId, includeImports]);

  // Focus goes back to Edit as text when the editor closes (AC-15). It is
  // disabled with no query to edit, and a disabled button cannot take focus,
  // so New text query beside it takes it then.
  useEffect(() => {
    if (!returnFocus || editorShown) return;
    setReturnFocus(false);
    const edit = editButtonRef.current;
    (edit && !edit.disabled ? edit : newButtonRef.current)?.focus();
  }, [returnFocus, editorShown]);

  // Menus close on Escape, like the rest of the app's popovers.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A step that disappears must not leave its menu open.
  useEffect(() => {
    if (openMenu && openMenu.index >= state.steps.length) setOpenMenu(null);
  }, [openMenu, state.steps.length]);

  const plainEnglish = useMemo(
    () => describeQuery(state, labelFor, locale),
    [state, labelFor, locale],
  );

  const scope = queryScopeText(includeImports, importsCount, t);

  // An explicit run: Execute, Run, Ctrl+Enter, a starter. Its results
  // frame the graph; an Auto preview's never do.
  const runExplicit = async (text: string) => {
    if (!ontologyId) return;
    const run = ++latest.current;
    setRunning(true);
    setError(null);
    try {
      const answer = await runSparql(ontologyId, text, includeImports, dictionaryLanguage);
      if (run !== latest.current) return;
      setIsPreview(false);
      show(answer, true);
    } catch (e: unknown) {
      if (run !== latest.current) return;
      show(null, false);
      // Clearing invalidates this run's token; finally cannot settle it now.
      setRunning(false);
      setError({ cause: e });
    } finally {
      if (run === latest.current) setRunning(false);
    }
  };

  const execute = async () => {
    if (!sparql) return;
    await runExplicit(preview);
  };

  // A starter is run at once, as a click on it asks for the answer
  // (query-page-rework 5.2). Its own state is not previewed as well: a five
  // row preview landing after the full answer would replace it.
  const skipPreviewFor = useRef<object | null>(null);
  const runStarter = (next: QueryState, title: string) => {
    setState(next);
    setOpenQuery(null);
    setSaveName(title);
    skipPreviewFor.current = next;
    const text = schema ? generateSparql(next, schema.namespaces) : "";
    if (text) void runExplicit(text);
  };

  // Small ontologies preview themselves as the query is built, so a
  // newcomer sees real rows immediately instead of guessing whether the
  // query works. Larger ones wait for an explicit Execute.
  const autoPreviewable =
    ontologyTriples > 0 && ontologyTriples <= AUTO_PREVIEW_MAX_TRIPLES;

  useEffect(() => {
    // A text query only runs when asked: its text is not what the builder
    // would preview, and a half-typed query is not worth a request.
    if (inText || !autoPreviewable || !ontologyId || state.steps.length === 0 || !schema) {
      return;
    }
    if (skipPreviewFor.current === state) return;
    const previewQuery = generateSparql(
      { ...state, limit: PREVIEW_ROWS },
      schema.namespaces,
    );
    if (!previewQuery) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const run = ++latest.current;
      runSparql(ontologyId, previewQuery, includeImports, dictionaryLanguage)
        .then((res) => {
          if (cancelled || run !== latest.current) return;
          setIsPreview(true);
          setError(null);
          show(res, false);
        })
        .catch(() => {
          /* a partially built query may not be valid yet; stay quiet */
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [inText, autoPreviewable, ontologyId, schema, state, includeImports, show, dictionaryLanguage]);

  const doSave = async (name: string) => {
    if (!ontologyId || !name.trim()) return;
    // Read now, not from the render: the text is in a ref precisely so that
    // typing does not render this panel.
    const text = textQuery ? textRef.current : null;
    try {
      const entry = await saveQuery(
        text === null
          ? { id: openQuery?.id, name, ontologyId, state, sparql, mode: "visual" }
          : {
              id: openQuery?.id,
              name,
              ontologyId,
              state: textQuery?.forkedFrom ?? null,
              sparql: text,
              mode: "text",
            },
      );
      setOpenQuery({ id: entry.id, name: entry.name });
      if (text !== null) markTextSaved(text);
      setSavePrompt(false);
      setSaveName("");
      refreshSaved();
    } catch (e: unknown) {
      setError({ cause: e });
    }
  };

  // A saved query of this ontology with the typed name, trimmed and in any
  // case (U-4). Saving still works and keeps both; the note only says so, so a
  // second "Bonds" is a choice rather than a surprise. The open query never
  // meets it: saving it is an update under its own name, with no prompt.
  const sameName = useMemo(() => {
    const typed = saveName.trim().toLowerCase();
    if (!savePrompt || !typed) return null;
    return saved.find((entry) => entry.name.trim().toLowerCase() === typed) ?? null;
  }, [saveName, savePrompt, saved]);

  const save = () => {
    if (openQuery) void doSave(openQuery.name);
    else {
      if (textQuery?.name) setSaveName(textQuery.name);
      setSavePrompt(true);
    }
  };

  // --- text queries (sparql-text-and-query-files) --------------------------

  /** Whether typed text may be dropped: asks only when some would be lost. */
  const mayDiscard = () => !textIsDirty() || window.confirm(t("queryPanel.discard"));

  const runText = async (text: string) => {
    if (!ontologyId) return;
    // Refused here with a sentence rather than sent for a 422, and counted in
    // bytes, which is the stricter of the two measures.
    if (byteLength(text) > MAX_QUERY_BYTES) {
      setError({ cause: TOO_LARGE_TO_RUN, message: makeUiMessage("queryPanel.tooLargeRun", { limit: MAX_QUERY_BYTES }) });
      return;
    }
    await runExplicit(text);
  };

  const startText = (text: string, options: Parameters<typeof openTextQuery>[1] = {}) => {
    openTextQuery(text, options);
    setEditorOpen(true);
    setSavePrompt(false);
    setOpenMenu(null);
    setError(null);
  };

  const newTextQuery = () => {
    if (!mayDiscard()) return;
    // The prefixes the ontology uses, and nothing else (5.3): the query is
    // ready to run the moment a term is written.
    const text = startingText(schema?.prefixes);
    // The help line says the prefixes are at the top only when they are.
    startText(text, { fresh: text !== "" });
  };

  const openFile = async (file: File) => {
    const read = await readQueryFile(file, true);
    if (!read.ok) {
      setError({ cause: read.error, message: read.uiMessage });
      return;
    }
    if (!mayDiscard()) return;
    startText(read.text, { name: read.name });
  };

  const download = (text: string) => {
    const name = textQuery?.name ?? openQuery?.name ?? null;
    triggerDownload(new Blob([text], { type: "application/sparql-query" }), rqFileName(name));
  };

  const closeEditor = () => {
    if (inText) {
      if (!mayDiscard()) return;
      leaveText();
    }
    setEditorOpen(false);
    setSavePrompt(false);
    setError(null);
    setReturnFocus(true);
  };

  // Asks every time, as the spec says: going back is the one way out of a
  // fork that always throws the text away.
  const backToVisual = () => {
    if (!window.confirm(t("queryPanel.discard"))) return;
    leaveText();
    setEditorOpen(false);
    setSavePrompt(false);
    setError(null);
    setReturnFocus(true);
  };

  const openSaved = (entry: SavedQuery) => {
    if (inText && !mayDiscard()) return;
    if (entry.mode === "text") {
      startText(entry.sparql, {
        forkedFrom: entry.state,
        name: entry.name,
        opened: { id: entry.id, name: entry.name },
      });
    } else if (entry.state) {
      loadState(entry.state, { id: entry.id, name: entry.name });
      setEditorOpen(false);
    }
    show(null, false);
    setError(null);
  };

  const toggleEmbedded = () => {
    const next = !embeddedOpen;
    setEmbeddedOpen(next);
    if (!next || embedded || !ontologyId) return;
    setEmbeddedError(null);
    const requestedFor = embeddedKey;
    const current = () => embeddedKeyRef.current === requestedFor;
    getEmbeddedQueries(ontologyId, includeImports)
      .then((listing) => current() && setEmbedded(listing))
      .catch((e: unknown) => current() && setEmbeddedError(e));
  };

  // A question opens as a text query, its title the query's name, and runs
  // (query-page-rework 5.4): the person asked, so the answer comes at once,
  // framed on the graph, with the SPARQL that found it above. Editing it and
  // saving makes the person's own; the shipped file never changes.
  const askQuestion = (question: ExampleQuestion) => {
    if (inText && !mayDiscard()) return;
    startText(question.text, { name: question.title });
    void runText(question.text);
  };

  const openEmbedded = (query: EmbeddedQuery) => {
    if (!mayDiscard()) return;
    startText(query.text, embeddedOptions(query));
    show(null, false);
  };

  const menu = (() => {
    if (!openMenu || !schema) return null;
    const step = state.steps[openMenu.index];
    if (!step) return null;
    if (openMenu.kind === "class") {
      return (
        <ClassPropsMenu
          step={step}
          available={dataPropertiesFor(step.classIri)}
          onChange={(patch) => updateStep(openMenu.index, patch)}
          onClose={() => setOpenMenu(null)}
        />
      );
    }
    const link = step.link;
    if (!link) return null;
    const anchor = state.steps[link.anchor];
    return (
      <PredicateMenu
        link={link}
        anchorLabel={anchor?.label ?? "?"}
        targetLabel={step.label}
        options={linkOptionsBetween(schema, anchor?.classIri ?? "", step.classIri, ancestorsOf)}
        onChange={(patch) => updateLink(openMenu.index, patch)}
        onClose={() => setOpenMenu(null)}
      />
    );
  })();

  // Everything that builds the query by clicking. While the query is text it
  // sits in a disabled fieldset, dimmed and labelled, so none of it can change
  // a query it no longer describes (AC-4). With the editor never opened it is
  // rendered exactly as before, not wrapped at all (AC-1).
  const builderParts = (
    <>
      <div className="path-bar-wrap">
        <PathBar
          state={state}
          stepVars={stepVars}
          theme={theme}
          classKinds={classKinds}
          rdfsClasses={rdfsClasses}
          labelFor={labelFor}
          openMenu={openMenu}
          onOpenMenu={setOpenMenu}
          onRemoveStep={removeStep}
          onClear={clear}
        />
        {menu}
      </div>

      {state.steps.length === 0 && !loadingSchema && (
        <QueryStart
          schema={schema}
          theme={theme}
          onUseStarter={runStarter}
          questions={questions}
          onAskQuestion={askQuestion}
          onPickClass={addClass}
        />
      )}

      {state.steps.length > 0 && (
        <>
          <p className="plain-english">{plainEnglish}</p>
          <NextSteps
            options={nextStepOptions}
            stepCount={state.steps.length}
            onAdd={addNextStep}
          />
        </>
      )}

      {hint && <p className="query-hint">{hint}</p>}
    </>
  );

  return (
    // Named and script-focusable, so the main area's skip link has somewhere to
    // land in Query mode: this is the only one of the four panels beside the
    // graph with no heading of its own. tabIndex -1 adds no stop to the tab
    // order. Backlog X-1.
    <aside className="query-panel" id="query-panel-region" aria-label={t("queryPanel.builder")} tabIndex={-1}>
      {scope && <p className="query-scope">{scope}</p>}
      {dataSources.map((source) => (
        <p key={source.id} className="query-scope data-source-line">
          {t("queryPanel.includesData", { source: dataLabel(source, locale) })}
        </p>
      ))}
      {loadingSchema && <div className="detail-note">{t("queryPanel.analysing")}</div>}
      {schemaError != null && <OperationError failure={{ cause: schemaError }} />}

      {/* The toolbar, the save prompt and the query text are one sticky
          block, and it comes first (explore-and-query-layout 5.4): the
          builder used to come before it, and at 1280×720 with nothing picked
          the starting list pushed Execute below the panel's bottom. Reading
          results used to mean scrolling the query out of sight, which is
          exactly when it is needed — so this stays at the top of the panel
          while everything below scrolls under it. The opaque background in
          .query-pinned is load-bearing: without one, the table shows
          through. */}
      <div className={editorShown ? "query-pinned editing" : "query-pinned"}>
        {/* The builder's own controls step aside while the editor is open,
            which has its own row: they describe the visual query, and a
            toggle that silently did nothing to a text query would mislead. */}
        {!editorShown && (
          <div className="query-toolbar">
            <span className="query-toolbar-label">SPARQL</span>
            {/* Four independent switches, not one choice: each is on or off
                on its own and they combine (Distinct with Count, Paths with
                either), so a segmented control would take combinations away
                (explore-and-query-layout 5.5). One joined group, each button
                announcing pressed or not, and a check mark beside the tint so
                the state never rests on colour. */}
            <div className="query-switches" role="group" aria-label={t("queryPanel.options")}>
              <QuerySwitch
                on={auto}
                onToggle={() => {
                  if (auto) setFrozen(sparql);
                  setAuto(!auto);
                }}
                title={t("queryPanel.autoHint")}
              >
                {t("queryPanel.auto")}
              </QuerySwitch>
              <QuerySwitch
                on={state.pathsMode}
                onToggle={() => setState({ ...state, pathsMode: !state.pathsMode })}
                title={t("queryPanel.pathsHint")}
              >
                {t("queryPanel.paths")}
              </QuerySwitch>
              <QuerySwitch
                on={state.distinct}
                onToggle={() => setState({ ...state, distinct: !state.distinct })}
                title={t("queryPanel.distinctHint")}
              >
                {t("queryPanel.distinct")}
              </QuerySwitch>
              <QuerySwitch
                on={state.aggregate === "count"}
                onToggle={() =>
                  setState({
                    ...state,
                    aggregate: state.aggregate === "count" ? "none" : "count",
                  })
                }
                title={
                  state.steps.length > 1
                    ? t("queryPanel.countGroupedHint")
                    : t("queryPanel.countHint")
                }
              >
                {t("queryPanel.count")}
              </QuerySwitch>
            </div>
            {!auto && (
              <button className="ghost" onClick={() => setFrozen(sparql)} title={t("queryPanel.refreshHint")}>
                {t("queryPanel.refresh")}
              </button>
            )}
            <label className="limit-field" title={t("queryPanel.limitHint")}>
              LIMIT
              <input
                type="number"
                min={1}
                max={10000}
                value={state.limit}
                onChange={(e) =>
                  setState({ ...state, limit: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </label>
            <div className="spacer" />
            <button
              className="ghost"
              disabled={!sparql}
              onClick={() => {
                void Promise.resolve().then(() => {
                  if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
                  return navigator.clipboard.writeText(preview);
                }).then(() => {
                  setCopyState("copied");
                  window.setTimeout(() => setCopyState(null), 1500);
                }).catch(() => setCopyState("failed"));
              }}
              title={t("queryPanel.copyHint")}
            >
              {t(copyState === "copied" ? "queryPanel.copied" : copyState === "failed" ? "queryPanel.copyFailed" : "queryPanel.copy")}
            </button>
            <button
              className="ghost"
              disabled={!sparql}
              onClick={save}
              title={openQuery ? t("queryPanel.updateHint", { name: openQuery.name }) : t("queryPanel.saveHint")}
            >
              ⌸ {t(openQuery ? "queryPanel.update" : "editParts.save")}
            </button>
            <button className="primary" disabled={!sparql || running} onClick={() => void execute()}>
              {t(running ? "queryPanel.running" : "queryPanel.execute")}
            </button>
          </div>
        )}

        {savePrompt && (
          <div className="save-row">
            <input
              autoFocus
              placeholder={t("queryPanel.name")} aria-label={t("queryPanel.name")}
              value={saveName}
              aria-describedby={sameName ? "save-same-name" : undefined}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void doSave(saveName);
                if (e.key === "Escape") setSavePrompt(false);
              }}
            />
            <button className="primary" onClick={() => void doSave(saveName)}>
              {t("editParts.save")}
            </button>
            <button className="ghost" onClick={() => setSavePrompt(false)}>
              {t("common.cancel")}
            </button>
          </div>
        )}
        {sameName && (
          <p className="save-note" id="save-same-name">
            {t("queryPanel.duplicate", { name: sameName.name })}
          </p>
        )}

        {editorShown ? (
          <SparqlEditor
            // A new text query is a new editor; a fork keeps this one, and
            // with it the caret the user is typing at.
            key={builder.editorSession}
            generated={sparql}
            textQuery={textQuery}
            initialText={textRef.current}
            namespaces={schema?.namespaces ?? {}}
            running={running}
            error={error ? originalError(error.cause) : null}
            errorFailure={error}
            saveLabel={t(openQuery ? "queryPanel.update" : "editParts.save")}
            saveTitle={openQuery ? t("queryPanel.updateHint", { name: openQuery.name }) : t("queryPanel.saveHint")}
            onFork={(text, baseline) => {
              // A chip menu open at the moment of the fork would edit a query
              // that is no longer the one on screen.
              setOpenMenu(null);
              forkToText(text, baseline);
            }}
            onChange={setText}
            onRun={(text) => void runText(text)}
            onSave={save}
            onDownload={download}
            onOpenFile={(file) => void openFile(file)}
            onBack={backToVisual}
            onClose={closeEditor}
          />
        ) : (
          <SparqlPreview
            sparql={preview}
            onEditAsText={() => setEditorOpen(true)}
            onNewTextQuery={newTextQuery}
            editButtonRef={editButtonRef}
            newButtonRef={newButtonRef}
          />
        )}
      </div>

      {/* The builder under the query, and the results under the builder:
          an Auto preview lands after each pick, and above the builder it
          would push the next steps below the fold mid-build (Section 15,
          question 2). */}
      {inText ? (
        <fieldset className="builder-dimmed" disabled>
          <legend className="builder-dimmed-label">{t("queryPanel.dimmed")}</legend>
          {builderParts}
        </fieldset>
      ) : (
        builderParts
      )}
      {schema?.truncated && (
        <p className="query-hint">
          {t("queryPanel.sampled")}
        </p>
      )}

      {/* With the editor open its errors are shown above it, where the text
          that caused them is. */}
      {!editorShown && error && <OperationError failure={error} />}
      {results && (
        <>
          {isPreview && (
            <p className="preview-badge">
              {t("queryPanel.preview", { count: PREVIEW_ROWS })}
            </p>
          )}
          <ResultsTable
            results={results}
            ontologyName={ontologyName}
            onPickIri={onPickIri}
            onViewInSource={onViewInSource}
            onClear={clearResults}
            onFrame={resultsOnGraph > 0 ? onFrameResults : undefined}
            graphNote={resultsNote}
          />
        </>
      )}

      {saved.length > 0 && (
        <section className="saved-queries">
          <h3>{t("queryPanel.saved")}</h3>
          {saved.map((entry) => (
            <div
              className={openQuery?.id === entry.id ? "saved-row open" : "saved-row"}
              key={entry.id}
            >
              <button
                className="saved-name"
                onClick={() => openSaved(entry)}
                title={t("queryPanel.open", { name: entry.name })}
              >
                {entry.name}
              </button>
              {/* A word, not a colour, so it reads the same to everyone. */}
              {entry.mode === "text" && <span className="saved-mode">{t("queryPanel.textBadge")}</span>}
              <span className="dim">{new Date(entry.updatedAt).toLocaleDateString(locale)}</span>
              <button
                className="icon-btn"
                title={t("queryPanel.deleteHint")} aria-label={t("queryPanel.deleteHint")}
                onClick={() => {
                  if (!window.confirm(t("queryPanel.deleteConfirm", { name: entry.name }))) return;
                  void deleteSavedQuery(entry.id).then(() => {
                    if (openQuery?.id === entry.id) setOpenQuery(null);
                    refreshSaved();
                  });
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Only for a file that stores queries: the count comes with the schema,
          so a file without any shows nothing and costs nothing. */}
      {embeddedCount > 0 && (
        <section className="saved-queries embedded-queries">
          <h3>
            <button
              className="embedded-toggle"
              aria-expanded={embeddedOpen}
              aria-controls="embedded-query-list"
              onClick={toggleEmbedded}
            >
              {embeddedOpen ? "▾" : "▸"} {t("queryPanel.embedded", { count: embeddedCount })}
            </button>
          </h3>
          {embeddedOpen && (
            <div id="embedded-query-list">
              {embeddedError !== null && <OperationError failure={{ cause: embeddedError }} />}
              {!embedded && !embeddedError && <p className="detail-note">{t("queryPanel.reading")}</p>}
              {embedded?.truncated && (
                <p className="detail-note">
                  {t("queryPanel.embeddedLimit", { shown: embedded.queries.length, total: embedded.total })}
                </p>
              )}
              {embedded?.queries.map((query, index) => (
                <div className="saved-row embedded-row" key={`${query.subject ?? ""}|${index}`}>
                  <button
                    className="saved-name"
                    onClick={() => openEmbedded(query)}
                    title={t("queryPanel.openEmbedded", { name: query.label })}
                  >
                    {query.label}
                  </button>
                  <span className="saved-mode">{query.form}</span>
                  {query.shaclVariables && (
                    <span className="dim" title={t("queryPanel.shaclVariables")}>
                      {t("queryPanel.shaclBadge")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </aside>
  );
}
