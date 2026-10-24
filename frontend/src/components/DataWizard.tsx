/*
================================================================================
FILE: frontend/src/components/DataWizard.tsx
================================================================================

SUMMARY
    The data import wizard (csv-data-import 5.2 to 5.5), four steps and the
    report: the file and what was detected in it, what a row is and which
    column identifies it, what each column becomes, and the preview as
    sentences before Import. Also how "Change the mapping" (steps 2 to 4 on
    the copy kept) and a refresh whose headers changed (step 3 with the
    missing columns marked) are finished (5.7). A refresh whose sheet is
    gone, or whose file is of the other kind than the snapshot's, starts at
    step 1 with the reason said, so a sheet is chosen, never taken.

BASIC IDEA
    One decision per step, each a component of its own below, and nothing
    applied silently (Section 7): the server suggests the identifier, the
    name and each column's attribute, and the wizard shows each suggestion
    as a preselected choice marked *suggested*. The rules for choices are
    modeling/dataChoices.ts's and the words modeling/dataSentences.ts's.

    The browser holds the file and sends it again for each step; the server
    keeps nothing until Import. Step 1 shows what it detected -- separator,
    encoding, header -- and any change reads the file again. An Excel
    workbook (5.8) shows a sheet picker, each sheet with its rows, and a
    header row picker naming each of the sheet's first rows by its first
    cells; those stay on screen when a choice reads nothing (an empty
    sheet or header row: the refusal brings the sheets and rows with it),
    so the choice can be put right. The detections and the pickers stay
    mounted while the file is read again, so the control just changed
    keeps keyboard focus. Reads are numbered and only the latest reply is
    applied, and Next waits while one is on its way. The class reading of
    step 2 is kept with the class, identifier, sheet and header row it was
    read for, and used for nothing else. A file past
    the tool's 2,000-row limit (D-098) gets the limit sentence and two
    choices, Use the first 2,000 rows or Choose another file, and Next waits
    for one.

    A new class (step 2) and a new attribute (step 3) are model changes, so
    each is one command through the project store: one undo step, announced
    like any other. Everything else here is a snapshot action, which is not
    a model change and never touches the undo history (5.7).

    The wizard is one region with a heading per step, and the heading takes
    focus when a step opens (Section 6). Next is aria-disabled, never
    disabled, with its reason in text beside it, and so is Import: a press
    while either says it cannot is ignored. Cancel asks first only once the
    columns have been mapped, where there is work to lose, and the wizard
    tells its dialog when that is, so the dialog's ✕ and its tabs ask too.

    The server's reading of the chosen class -- the identifier check, the
    class's fields and the suggestions -- is held with the class and
    identifier it was read for, and used only while they are still the
    chosen ones: a class changed on step 2 waits for its own reading rather
    than offering the old class's columns. A reading that fails says so
    with Try again, and Next waits (PR #53 review). UI locale changes only
    whole display templates and offered labels; File, mapping identities,
    drafts and in-flight reads remain. Errors retain their original objects,
    and a structural refresh mismatch keeps the actual missing-column list.

INPUTS / INPUT SOURCES (props)
    - projectId, modelOntologyId, taxonomy: the open project.
    - start: a new import, a snapshot's mapping to change, or a refresh to
      finish after a header mismatch.
    - onClose, onValidate, onShowData: leaving, and the report's next steps.
    - onDirtyChange: told whether leaving would lose a mapping (step 3 or 4).
    Plus api.ts and the project store.

EXPECTED OUTPUT
    - The wizard; a new or updated snapshot, announced in the live region.
================================================================================
*/

import { useDictionaryDisplayLanguage } from "../dictionary/useDictionaryLanguage";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ApiError, fetchHierarchy, importData, inspectData, previewData, refreshData, updateData } from "../api";
import type { DataSourceRef } from "../api";
import {
  NEW_ATTRIBUTE,
  NEW_TYPES,
  newTypes,
  choiceValue,
  initialColumns,
  parseChoice,
  stepBlocked,
  suggestedType,
  withChoice,
} from "../modeling/dataChoices";
import {
  dataLabel,
  headerRowOption,
  idProblems,
  previewSentences,
  rowLimitSentence,
  sampleWords,
  sheetOption,
  unmatchedLines,
} from "../modeling/dataSentences";
import { projectStore } from "../state/projectStore";
import type {
  ColumnChoice,
  DataChoices,
  DataField,
  DataInspection,
  DataOptions,
  DataPreview,
  Separator,
  SnapshotSummary,
  DataEncoding,
  WorkbookInspection,
} from "../types";
import ImportReport from "./ImportReport";

import { useI18n } from "../i18n/I18nProvider";
import { makeUiMessage, renderUiMessage, type UiMessageFor } from "../i18n/uiMessage";

import { renderServerError } from "../i18n/serverMessage";
import type { Translator } from "../i18n/types";

const CONCEPT = "http://www.w3.org/2004/02/skos/core#Concept";

export type RefreshReason = UiMessageFor<"dataSnapshot.missingSheet" | "dataSnapshot.fromCsv" | "dataSnapshot.fromWorkbook">;

export type WizardStart =
  | { kind: "new" }
  | { kind: "remap"; snapshot: SnapshotSummary }
  | {
      kind: "refresh";
      snapshot: SnapshotSummary;
      file: File;
      options: DataOptions;
      // null when the file could not be read as the snapshot was: a
      // workbook whose sheet is gone (5.8, PR #54 review).
      inspection: DataInspection | null;
      missing: string[];
      choices: DataChoices | null;
      // Set when the refresh goes through step 1 first, saying why: the
      // snapshot's sheet is gone, or the file is of another kind than the
      // snapshot's, so the sheet and header row are chosen, never taken.
      atFile?: string;
      atFileMessage?: RefreshReason;
      // The sheets to choose from when there is no inspection.
      workbook?: WorkbookInspection | null;
    };

interface Props {
  projectId: string;
  modelOntologyId: string;
  taxonomy: boolean;
  start: WizardStart;
  onClose: () => void;
  onValidate?: () => void;
  onShowData?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type Step = 1 | 2 | 3 | 4 | "report";

const STEP_TITLES = {
  1: "dataWizard.step.file", 2: "dataWizard.step.row",
  3: "dataWizard.step.columns", 4: "dataWizard.step.preview",
} as const;

type WizardProblem = { kind: "external"; error: unknown } | { kind: "missingColumns"; columns: string[] };
const external = (error: unknown): WizardProblem => ({ kind: "external", error });
function problemText(problem: WizardProblem, t: Translator): string {
  return problem.kind === "external" ? renderServerError(problem.error, t)
    : t("dataWizard.missingColumns", { columns: problem.columns.join(t("dataWords.separator")) });
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function DataWizard({
  projectId,
  modelOntologyId,
  taxonomy,
  start,
  onClose,
  onValidate,
  onShowData,
  onDirtyChange,
}: Props) {
  const { locale, t } = useI18n();
  // Where Back stops: a refresh through step 1 can go back to it.
  const firstStep = start.kind === "new" || (start.kind === "refresh" && (start.atFile || start.atFileMessage)) ? 1 : 2;
  const [step, setStep] = useState<Step>(
    firstStep === 1 ? 1 : start.kind === "remap" ? 2 : 3,
  );
  const [file, setFile] = useState<File | null>(start.kind === "refresh" ? start.file : null);
  const [options, setOptions] = useState<DataOptions>(start.kind === "refresh" ? start.options : {});
  const [inspection, setInspection] = useState<DataInspection | null>(
    start.kind === "refresh" ? start.inspection : null,
  );
  const [fileProblem, setFileProblem] = useState<{ error: unknown; tooLarge: boolean } | null>(null);
  // A workbook's sheets and first rows, kept when a re-read fails.
  const [workbook, setWorkbook] = useState<WorkbookInspection | null>(
    start.kind === "refresh" ? (start.inspection?.workbook ?? start.workbook ?? null) : null,
  );
  const [reading, setReading] = useState(false);
  const earlier = start.kind === "refresh" ? start.choices : null;
  const [classIri, setClassIri] = useState<string | null>(
    taxonomy ? CONCEPT : (earlier?.classIri ?? (start.kind === "new" ? null : start.snapshot.classIri)),
  );
  const [idColumn, setIdColumn] = useState<string | null>(earlier ? earlier.idColumn : null);
  const [rowNumber, setRowNumber] = useState(earlier ? earlier.idColumn === null : false);
  const [previous, setPrevious] = useState<Record<string, ColumnChoice> | null>(earlier?.columns ?? null);
  // The class reading, with the class and identifier it was read for.
  const [classReading, setClassReading] = useState<{ key: string; preview: DataPreview } | null>(null);
  const [basisFailed, setBasisFailed] = useState<{ error: unknown } | null>(null);
  const [retry, setRetry] = useState(0);
  const [columns, setColumns] = useState<Record<string, ColumnChoice> | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [preview, setPreview] = useState<DataPreview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [error, setError] = useState<WizardProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<SnapshotSummary | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reasonId = useId();
  const headingId = useId();

  const source: DataSourceRef | null =
    start.kind === "remap" ? { snapshot: start.snapshot.id } : file ? { file } : null;

  // The copy a snapshot keeps, for Change the mapping: its columns, rows and
  // stored choices.
  useEffect(() => {
    if (start.kind !== "remap") return;
    let live = true;
    inspectData(projectId, { snapshot: start.snapshot.id })
      .then((found) => {
        if (!live) return;
        setInspection(found);
        if (found.choices) {
          setClassIri(found.choices.classIri);
          setIdColumn(found.choices.idColumn);
          setRowNumber(found.choices.idColumn === null);
          setPrevious(found.choices.columns);
        }
      })
      .catch((e: unknown) => live && setError(external(e)));
    return () => {
      live = false;
    };
  }, [projectId, start]);

  // A new step's heading takes focus (Section 6).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // The identifier is passed in rather than read from this render: a new
  // file resets it in the same event, and the closure would still hold the
  // last file's, which lost the new file's suggestion (PR #53 review).
  // Only the latest read's reply is applied: quick sheet changes raced, and
  // a slower reply for the earlier sheet replaced the newer one, so the
  // table showed another sheet than the picker (PR #54 review).
  const readCount = useRef(0);
  const read = async (
    chosen: File,
    nextOptions: DataOptions,
    id: { idColumn: string | null; rowNumber: boolean },
  ) => {
    const ticket = ++readCount.current;
    const latest = () => ticket === readCount.current;
    setReading(true);
    setFileProblem(null);
    setError(null);
    try {
      const found = await inspectData(projectId, { file: chosen }, nextOptions);
      if (!latest()) return;
      setInspection(found);
      setWorkbook(found.workbook ?? null);
      // Keep the identifier only while the file still has that column.
      let kept = id.idColumn;
      if (kept !== null && !found.columns.some((c) => c.name === kept)) kept = null;
      if (kept === null && !id.rowNumber) kept = found.idSuggestion;
      setIdColumn(kept);
      setColumns(null);
    } catch (e: unknown) {
      if (!latest()) return;
      setInspection(null);
      // A sheet read without a table (an empty sheet or header row) comes
      // back with the sheets and its rows, so both pickers stay. Otherwise
      // another sheet that could not be read: its rows are not known, so
      // the header row picker offers them by number only (code review).
      const listed = refusedWorkbook(e);
      setWorkbook((current) =>
        listed ??
        (current && nextOptions.sheet !== undefined && nextOptions.sheet !== current.sheet
          ? { ...current, sheet: nextOptions.sheet, headerRow: nextOptions.headerRow ?? 1, top: unreadRows() }
          : current),
      );
      setFileProblem({ error: e, tooLarge: e instanceof ApiError && e.status === 413 });
    } finally {
      // An earlier read finishing leaves the wizard reading the latest.
      if (latest()) setReading(false);
    }
  };

  const chooseFile = (chosen: File) => {
    setFile(chosen);
    setWorkbook(null);
    const fresh: DataOptions = {};
    setOptions(fresh);
    setIdColumn(null);
    setRowNumber(false);
    void read(chosen, fresh, { idColumn: null, rowNumber: false });
  };

  const changeOptions = (changes: DataOptions) => {
    // A changed separator, encoding or header reads a different table, so
    // the sample question is asked again of what it holds.
    const next = { ...options, ...changes, sample: changes.sample ?? false };
    setOptions(next);
    if (file) void read(file, next, { idColumn, rowNumber });
  };

  const effectiveId = rowNumber ? null : idColumn;
  // The sheet and header row are part of the key: a reading of one sheet was
  // reused for another with a column of the same name (PR #54 review).
  const basisKey = [classIri ?? "", effectiveId ?? "", options.sheet ?? "", options.headerRow ?? ""].join("|");
  const basis = classReading && classReading.key === basisKey ? classReading.preview : null;

  // Step 2 onwards: the identifier check, the fields of the row's class and
  // the suggestions, again whenever the class or the identifier changes.
  useEffect(() => {
    if (step === 1 || step === "report" || !source || !classIri || !inspection) return;
    let live = true;
    const key = basisKey;
    setBasisFailed(null);
    previewData(projectId, source, options, { classIri, idColumn: effectiveId, columns: {} })
      .then((found) => live && setClassReading({ key, preview: found }))
      .catch((e: unknown) => live && setBasisFailed({ error: e }));
    return () => {
      live = false;
    };
    // `source` is derived from file and start; listing them keeps the key stable.
  }, [step === 1, projectId, file, start, classIri, effectiveId, inspection, options, retry]);

  // Step 3 starts from the suggestions, or the choices made before.
  useEffect(() => {
    if (step !== 3 || !basis || !inspection || columns !== null) return;
    const made = initialColumns(
      inspection.columns.map((c) => c.name),
      basis.suggestions,
      previous,
    );
    setColumns(made.columns);
    setSuggested(made.suggested);
  }, [step, basis, inspection, columns, previous]);

  const choices: DataChoices | null =
    classIri && columns ? { classIri, idColumn: effectiveId, columns } : null;

  // Step 4: the preview as sentences, and the report to expect.
  useEffect(() => {
    if (step !== 4 || !source || !choices) return;
    let live = true;
    setPreview(null);
    setPreviewFailed(false);
    previewData(projectId, source, options, choices)
      .then((found) => live && setPreview(found))
      .catch((e: unknown) => {
        if (!live) return;
        setPreviewFailed(true);
        setError(external(e));
      });
    return () => {
      live = false;
    };
  }, [step, retry]);

  // Leaving now would lose a mapping: the dialog asks before its ✕ or a tab.
  useEffect(() => {
    onDirtyChange?.(step === 3 || step === 4);
  }, [step, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const blocked =
    typeof step === "number"
      ? stepBlocked(step, {
          inspection,
          options,
          classIri,
          basis: basis ? "ready" : basisFailed ? "failed" : "reading",
          columnsReady: choices !== null,
          reading,
          sheetChosen: !(workbook && (options.sheet ?? workbook.sheet) === ""),
        }, locale)
      : null;
  const retryShown = (step === 2 || step === 3) && basisFailed !== null && !basis;

  const goNext = () => {
    if (blocked || typeof step !== "number" || step >= 4) return;
    setError(null);
    setStep((step + 1) as Step);
  };

  const goBack = () => {
    if (typeof step !== "number") return;
    if (step > firstStep) setStep((step - 1) as Step);
  };

  const doImport = async () => {
    // aria-disabled, not disabled: a press while it says so does nothing.
    if (!choices || busy || !preview) return;
    setBusy(true);
    setError(null);
    try {
      let made: SnapshotSummary;
      if (start.kind === "new") {
        made = (await importData(projectId, file!, options, choices)).snapshot;
      } else if (start.kind === "refresh") {
        // A workbook read by its default sheet still names it: the server
        // never takes a sheet nobody chose for a snapshot (PR #54 review).
        const sent =
          inspection?.format === "xlsx" && workbook
            ? { ...options, sheet: options.sheet ?? workbook.sheet, headerRow: options.headerRow ?? workbook.headerRow }
            : options;
        const result = await refreshData(projectId, start.snapshot.id, file!, sent, choices);
        if (result.status !== "imported") {
          setError({ kind: "missingColumns", columns: result.missing });
          return;
        }
        made = result.snapshot;
      } else {
        made = (await updateData(projectId, start.snapshot.id, { choices })).snapshot;
      }
      setDone(made);
      setStep("report");
      const count = made.report.individuals;
      const code = start.kind === "remap"
        ? count === 1 ? "projectNotice.dataRemapped.one" : "projectNotice.dataRemapped.many"
        : count === 1 ? "projectNotice.dataImported.one" : "projectNotice.dataImported.many";
      await projectStore.dataChanged(makeUiMessage(code, { source: made.source, count }), projectId);
    } catch (e: unknown) {
      setError(external(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (typeof step === "number" && step >= 3 && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    onClose();
  };

  const title =
    step === "report"
      ? start.kind === "remap"
        ? t("dataWizard.remapped")
        : t("dataWizard.imported")
      : t("dataWizard.step", { step, title: t(STEP_TITLES[step]) });

  return (
    <section className="data-wizard" aria-labelledby={headingId}>
      <h3 id={headingId} ref={headingRef} tabIndex={-1}>
        {title}
      </h3>
      {start.kind !== "new" && step !== "report" && (
        <p className="detail-note">
          {t(start.kind === "remap" ? "dataWizard.changing" : "dataWizard.refreshing", { label: dataLabel(start.snapshot, locale) })}
        </p>
      )}

      {step === 1 && start.kind === "refresh" && (start.atFile || start.atFileMessage) && (
        <p className="detail-note">{start.atFileMessage ? renderUiMessage(start.atFileMessage, t) : start.atFile}</p>
      )}
      {step === 1 && (
        <FileStep
          file={file}
          inspection={inspection}
          workbook={workbook}
          options={options}
          reading={reading}
          problem={fileProblem}
          onFile={chooseFile}
          onOptions={changeOptions}
        />
      )}
      {step === 2 && (
        <RowStep
          inspection={inspection}
          modelOntologyId={modelOntologyId}
          taxonomy={taxonomy}
          classIri={classIri}
          idColumn={idColumn}
          rowNumber={rowNumber}
          basis={basis}
          onClass={(iri) => {
            setClassIri(iri);
            setColumns(null);
            setSuggested([]);
          }}
          onIdColumn={(column) => {
            setIdColumn(column);
            setRowNumber(false);
            setColumns(null);
          }}
          onRowNumber={(on) => {
            setRowNumber(on);
            setColumns(null);
          }}
          onError={(error) => setError(external(error))}
        />
      )}
      {step === 3 && (
        <ColumnsStep
          inspection={inspection}
          basis={basis}
          columns={columns}
          suggested={suggested}
          missing={start.kind === "refresh" ? start.missing : []}
          classIri={classIri}
          taxonomy={taxonomy}
          onChange={(column, choice) => {
            setColumns((current) => (current ? withChoice(current, column, choice) : current));
            setSuggested((current) => current.filter((c) => c !== column));
          }}
          onCreated={(column, property) => {
            // The new attribute is one of the class's fields once the
            // preview is read again; until then it is chosen by IRI.
            setColumns((current) =>
              current ? withChoice(current, column, { as: "attribute", property }) : current,
            );
            setSuggested((current) => current.filter((c) => c !== column));
            if (source && classIri) {
              const key = basisKey;
              void previewData(projectId, source, options, { classIri, idColumn: effectiveId, columns: {} })
                .then((found) => setClassReading({ key, preview: found }))
                .catch((e: unknown) => setError(external(e)));
            }
          }}
          onError={(error) => setError(external(error))}
        />
      )}
      {step === 4 && <PreviewStep preview={preview} inspection={inspection} busy={busy} />}
      {step === "report" && done && (
        <ImportReport snapshot={done} announce onValidate={onValidate} onShowData={onShowData} />
      )}

      {retryShown && (
        <p className="detail-error" role="alert">
          {renderServerError(basisFailed!.error, t)}{" "}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            {t("dataSnapshot.retry")}
          </button>
        </p>
      )}
      {step === 4 && previewFailed && (
        <p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setRetry((n) => n + 1);
            }}
          >
            {t("dataSnapshot.retry")}
          </button>
        </p>
      )}
      {error && <>
        <p className="detail-error" role="alert">{problemText(error, t)}</p>
        {error.kind === "external" && <details><summary>{t("common.details")}</summary><pre>{message(error.error)}</pre></details>}
      </>}
      {retryShown && <details><summary>{t("common.details")}</summary><pre>{message(basisFailed!.error)}</pre></details>}

      {confirmCancel ? (
        <div className="wizard-actions" role="group" aria-label={t("dataWizard.leaveQuestion")}>
          <span>{t("dataWizard.leaveBody")}</span>
          <button type="button" onClick={onClose}>
            {t("dataWizard.leave")}
          </button>
          <button type="button" className="primary" onClick={() => setConfirmCancel(false)}>
            {t("dataWizard.keepGoing")}
          </button>
        </div>
      ) : step === "report" ? (
        <div className="wizard-actions">
          <button type="button" onClick={onClose}>
            {t("dataWizard.done")}
          </button>
        </div>
      ) : (
        <div className="wizard-actions">
          {step !== firstStep && (
            <button type="button" onClick={goBack}>
              {t("dataWizard.back")}
            </button>
          )}
          {step === 4 ? (
            <button
              type="button"
              className="primary"
              aria-disabled={busy || !preview}
              onClick={() => void doImport()}
            >
              {t(busy ? "dataWizard.importing" : start.kind === "new" ? "dataWizard.import" : "dataWizard.importAgain")}
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              aria-disabled={blocked !== null}
              aria-describedby={blocked ? reasonId : undefined}
              onClick={goNext}
            >
              {t("dataWizard.next")}
            </button>
          )}
          <button type="button" onClick={cancel}>
            {t("common.cancel")}
          </button>
          {blocked && step !== 4 && (
            <span id={reasonId} className="detail-note">
              {blocked}
            </span>
          )}
        </div>
      )}
      {busy && (
        <p className="detail-note" role="status">
          {t("dataWizard.importingRows", { count: inspection?.kept ?? 0 })}
        </p>
      )}
    </section>
  );
}

/* --- Step 1: the file ------------------------------------------------------------ */

const SEPARATOR_NAMES = [
  [",", "dataWizard.separator.comma"], [";", "dataWizard.separator.semicolon"], ["\t", "dataWizard.separator.tab"],
] as const;
const ENCODING_NAMES = [
  ["utf-8", "dataWizard.encoding.utf8"], ["utf-8-sig", "dataWizard.encoding.bom"], ["windows-1252", "dataWizard.encoding.windows"],
] as const;

// What the file chooser offers: CSV text, and Excel workbooks (5.8).
export const DATA_FILE_ACCEPT =
  ".csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function FileStep({
  file,
  inspection,
  workbook,
  options,
  reading,
  problem,
  onFile,
  onOptions,
}: {
  file: File | null;
  inspection: DataInspection | null;
  workbook: WorkbookInspection | null;
  options: DataOptions;
  reading: boolean;
  problem: { error: unknown; tooLarge: boolean } | null;
  onFile: (file: File) => void;
  onOptions: (changes: DataOptions) => void;
}) {
  const { locale, t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const sheetId = useId();
  const headerRowId = useId();
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    if (chosen) onFile(chosen);
    event.target.value = "";
  };
  return (
    <div className="wizard-step">
      <div
        className={over ? "dropzone over" : "dropzone"}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
      >
        <input ref={input} type="file" accept={DATA_FILE_ACCEPT} hidden onChange={pick} />
        <button type="button" onClick={() => input.current?.click()}>
          {t(file ? "dataSnapshot.chooseFile" : "dataWizard.chooseFile")}
        </button>
        <p className="hint">
          {file ? t("dataWizard.fileHint", { file: file.name }) : t("dataWizard.dropHint")}
        </p>
      </div>
      {reading && (
        <p className="detail-note" role="status">
          {t("dataWizard.reading")}
        </p>
      )}
      {problem && (
        <><p className="detail-error" role="alert">{t("dataWizard.fileProblem", {
          kind: t(problem.tooLarge ? "dataWizard.tooLarge" : "dataWizard.unreadable"), reason: renderServerError(problem.error, t),
        })}</p><details><summary>{t("common.details")}</summary><pre>{message(problem.error)}</pre></details></>
      )}
      {/* The pickers stay mounted while the file is read again: one that
          unmounted on its own change dropped keyboard focus to the page
          (found by X4 in Chrome). */}
      {workbook && (
        <div className="wizard-detections" aria-busy={reading}>
          <p className="wizard-field">
            <label htmlFor={sheetId}>{t("dataWizard.sheet")}</label>
            <select
              id={sheetId}
              value={options.sheet ?? workbook.sheet}
              // Another sheet starts again from its first row.
              onChange={(e) => onOptions({ sheet: e.target.value, headerRow: undefined })}
            >
              {(options.sheet ?? workbook.sheet) === "" && (
                <option value="" disabled>
                  {t("dataWizard.chooseSheet")}
                </option>
              )}
              {workbook.sheets.map((sheet) => (
                <option key={sheet.name} value={sheet.name}>
                  {sheetOption(sheet, locale)}
                </option>
              ))}
            </select>
          </p>
          <p className="wizard-field">
            <label htmlFor={headerRowId}>{t("dataWizard.headerRow")}</label>
            <select
              id={headerRowId}
              value={options.headerRow ?? workbook.headerRow}
              onChange={(e) => onOptions({ headerRow: Number(e.target.value) })}
            >
              {headerRows(workbook, options.headerRow ?? workbook.headerRow).map((row) => (
                <option key={row.row} value={row.row}>
                  {headerRowOption(row, locale)}
                </option>
              ))}
            </select>
          </p>
        </div>
      )}
      {inspection && (
        <>
          {/* Not `hidden`: .wizard-detections sets display, which beats the
              attribute, so a workbook showed a CSV file's separator (X4). */}
          {inspection.format !== "xlsx" && (
            <div className="wizard-detections" aria-busy={reading}>
              <label>
                {t("dataWizard.separator")}{" "}
                <select
                  value={options.separator ?? inspection.separator}
                  onChange={(e) => onOptions({ separator: e.target.value as Separator })}
                >
                  {SEPARATOR_NAMES.map(([value, name]) => (
                    <option key={name} value={value}>
                      {t(name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("dataWizard.encoding")}{" "}
                <select
                  value={options.encoding ?? inspection.encoding}
                  onChange={(e) => onOptions({ encoding: e.target.value as DataEncoding })}
                >
                  {ENCODING_NAMES.map(([value, name]) => (
                    <option key={value} value={value}>
                      {t(name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.header ?? inspection.header}
                  onChange={(e) => onOptions({ header: e.target.checked })}
                />{" "}
                {t("dataWizard.firstHeader")}
              </label>
            </div>
          )}
          {inspection.renamed.length > 0 && (
            <ul className="wizard-notes">
              {inspection.renamed.map((r) => (
                <li key={r.index}>
                  {r.from
                    ? t("dataWizard.renamedDuplicate", { index: r.index + 1, from: r.from, to: r.to })
                    : t("dataWizard.renamedEmpty", { index: r.index + 1, to: r.to })}
                </li>
              ))}
            </ul>
          )}
          {inspection.sample && (
            <div className="wizard-limit" role="group" aria-label={t("dataSnapshot.limit")}>
              <p>{rowLimitSentence(inspection, locale)}</p>
              {options.sample ? (
                <p className="detail-note">
                  {t("dataWizard.sampleChosen", { limit: inspection.limit, sample: sampleWords({ rows: inspection.kept, total: inspection.total, sample: true }, locale)! })}
                </p>
              ) : (
                <p>
                  <button type="button" className="primary" onClick={() => onOptions({ sample: true })}>
                    {t("dataSnapshot.useFirst", { count: inspection.limit })}
                  </button>{" "}
                  <button type="button" onClick={() => input.current?.click()}>
                    {t("dataSnapshot.chooseFile")}
                  </button>
                </p>
              )}
            </div>
          )}
          <p className="detail-note">
            {t(`dataWizard.table.${inspection.total === 1 ? "one" : "many"}.${inspection.columns.length === 1 ? "one" : "many"}`, {
              rows: inspection.total, columns: inspection.columns.length, shown: Math.min(inspection.rows.length, 20),
            })}
          </p>
          <div className="wizard-table-wrap">
            <table className="wizard-table">
              <thead>
                <tr>
                  {inspection.columns.map((c) => (
                    <th key={c.name} scope="col">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspection.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** The sheets and rows a refused workbook read came back with, if any. */
function refusedWorkbook(e: unknown): WorkbookInspection | null {
  if (!(e instanceof ApiError) || typeof e.detail !== "object" || e.detail === null) return null;
  const listed = (e.detail as { workbook?: WorkbookInspection }).workbook;
  return listed && Array.isArray(listed.sheets) && Array.isArray(listed.top) ? listed : null;
}

/** A sheet's first rows when they could not be read: numbers, no cells. */
function unreadRows(): { row: number; cells: string[]; unread: boolean }[] {
  return Array.from({ length: 20 }, (_, i) => ({ row: i + 1, cells: [], unread: true }));
}

/** The rows the header row picker offers: the sheet's first rows, and the
 *  chosen one when it is further down (a refresh's earlier choice). */
function headerRows(workbook: WorkbookInspection, chosen: number): WorkbookInspection["top"] {
  const rows = workbook.top.length > 0 ? workbook.top : [{ row: 1, cells: [] }];
  return rows.some((r) => r.row === chosen) ? rows : [...rows, { row: chosen, cells: [] }];
}

/* --- Step 2: what a row is ----------------------------------------------------------- */

function RowStep({
  inspection,
  modelOntologyId,
  taxonomy,
  classIri,
  idColumn,
  rowNumber,
  basis,
  onClass,
  onIdColumn,
  onRowNumber,
  onError,
}: {
  inspection: DataInspection | null;
  modelOntologyId: string;
  taxonomy: boolean;
  classIri: string | null;
  idColumn: string | null;
  rowNumber: boolean;
  basis: DataPreview | null;
  onClass: (iri: string) => void;
  onIdColumn: (column: string) => void;
  onRowNumber: (on: boolean) => void;
  onError: (error: unknown) => void;
}) {
  const { locale, t } = useI18n();
  const dictionaryLanguage = useDictionaryDisplayLanguage();
  const [classes, setClasses] = useState<{ iri: string; label: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loadToken, setLoadToken] = useState(0);
  const classId = useId();
  const idId = useId();
  const newId = useId();

  useEffect(() => {
    if (taxonomy) return;
    let live = true;
    fetchHierarchy(modelOntologyId, false, false, dictionaryLanguage)
      .then((tree) => {
        if (!live) return;
        const found = Object.entries(tree.classes.nodes)
          .filter(([, n]) => n.kind === "class")
          .map(([iri, n]) => ({ iri, label: n.label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setClasses(found);
      })
      .catch((e: unknown) => live && onError(e));
    return () => {
      live = false;
    };
  }, [modelOntologyId, taxonomy, loadToken, dictionaryLanguage]);

  const createClass = async () => {
    const label = newName.trim();
    if (!label) return;
    try {
      const result = await projectStore.command("CreateClass", { label }, undefined, "model");
      setCreating(false);
      setNewName("");
      setLoadToken((t) => t + 1);
      if (result.created) onClass(result.created);
    } catch (e: unknown) {
      onError(e);
    }
  };

  const check = basis?.idCheck;
  const problems = check && !rowNumber && check.column ? idProblems(check, locale) : [];
  const example = basis?.rows?.find((r) => r.subject)?.subject;

  return (
    <div className="wizard-step">
      <p className="wizard-field">
        {taxonomy ? (
          // Nothing to choose: the sentence describes the identifier's
          // picker below rather than labelling a text (PR #53 review).
          <span id={classId}>{t("dataWizard.taxonomy")}</span>
        ) : (
          <label htmlFor={classId}>{t("dataWizard.rowClass")}</label>
        )}
        {taxonomy ? null : (
          <select
            id={classId}
            value={creating ? "new" : (classIri ?? "")}
            onChange={(e) => {
              if (e.target.value === "new") setCreating(true);
              else {
                setCreating(false);
                onClass(e.target.value);
              }
            }}
          >
            <option value="" disabled>
              {t("dataWizard.chooseClass")}
            </option>
            {classes.map((c) => (
              <option key={c.iri} value={c.iri}>
                {t("dataWizard.classOption", { label: c.label })}
              </option>
            ))}
            <option value="new">{t("dataWizard.newClass")}</option>
          </select>
        )}
      </p>
      {creating && (
        <p className="wizard-inline">
          <label htmlFor={newId}>{t("dataWizard.newClassName")}</label>{" "}
          <input id={newId} value={newName} onChange={(e) => setNewName(e.target.value)} />{" "}
          <button type="button" aria-disabled={!newName.trim()} onClick={() => void createClass()}>
            {t("dataWizard.createClass")}
          </button>
        </p>
      )}
      {inspection && (
        <p className="wizard-field">
          <label htmlFor={idId}>{t("dataWizard.idColumn")}</label>
          <select
            id={idId}
            aria-describedby={taxonomy ? classId : undefined}
            value={rowNumber ? "" : (idColumn ?? "")}
            onChange={(e) => (e.target.value ? onIdColumn(e.target.value) : onRowNumber(true))}
          >
            <option value="">{t("dataWizard.rowNumber")}</option>
            {inspection.columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name === inspection.idSuggestion ? t("dataWizard.idSuggested", { name: c.name }) : c.name}
              </option>
            ))}
          </select>
        </p>
      )}
      {problems.length > 0 && (
        <div className="wizard-problems" role="status">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p>
            <button type="button" onClick={() => onRowNumber(true)}>
              {t("dataWizard.useRowNumber")}
            </button>
          </p>
        </div>
      )}
      {check && check.ok && check.column && !rowNumber && (
        <p className="detail-note" role="status">
          {t("dataWizard.uniqueId", { column: check.column })}
        </p>
      )}
      {example && (
        <p className="detail-note">
          {t("dataWizard.example")}<code>{example}</code>
        </p>
      )}
    </div>
  );
}

/* --- Step 3: the columns -------------------------------------------------------------- */

function fieldOptions(fields: DataField[], t: Translator) {
  return fields.map((f) => (
    <option key={`${f.kind} ${f.property}`} value={choiceValue({ as: f.kind, property: f.property })}>
      {t(f.kind === "attribute" ? "dataWizard.field.attribute" : "dataWizard.field.relationship", { label: f.label })}
    </option>
  ));
}

function ColumnsStep({
  inspection,
  basis,
  columns,
  suggested,
  missing,
  classIri,
  taxonomy,
  onChange,
  onCreated,
  onError,
}: {
  inspection: DataInspection | null;
  basis: DataPreview | null;
  columns: Record<string, ColumnChoice> | null;
  suggested: string[];
  missing: string[];
  classIri: string | null;
  taxonomy: boolean;
  onChange: (column: string, choice: ColumnChoice) => void;
  onCreated: (column: string, property: string) => void;
  onError: (error: unknown) => void;
}) {
  const { locale, t } = useI18n();
  const [adding, setAdding] = useState<string | null>(null);
  const baseId = useId();
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const firstValues = useMemo(() => {
    const out: Record<string, string> = Object.create(null);
    inspection?.columns.forEach((c, i) => {
      out[c.name] = inspection.rows.find((r) => r[i])?.[i] ?? "";
    });
    return out;
  }, [inspection]);

  if (!inspection || !basis || !columns) {
    return (
      <p className="detail-note" role="status">
        {t("dataChoices.blocked.fieldsReading")}
      </p>
    );
  }
  const fields = basis.fields;
  const create = async (column: string) => {
    const label = name.trim();
    if (!label || !classIri) return;
    const datatype = NEW_TYPES.find((t) => t.key === type)?.datatype;
    try {
      const result = await projectStore.command(
        "CreateDatatypeProperty",
        { label, domain: classIri, datatype },
        undefined,
        "model",
      );
      setAdding(null);
      if (result.created) onCreated(column, result.created);
    } catch (e: unknown) {
      onError(e);
    }
  };
  return (
    <div className="wizard-step">
      {missing.length > 0 && (
        <ul className="wizard-problems" role="status">
          {missing.map((m) => (
            <li key={m}>{t("dataWizard.columnMissing", { column: m })}</li>
          ))}
        </ul>
      )}
      <div className="wizard-table-wrap">
        <table className="wizard-table wizard-columns">
          <thead>
            <tr>
              <th scope="col">{t("dataWizard.column")}</th>
              <th scope="col">{t("dataWizard.firstValue")}</th>
              <th scope="col">{t("dataWizard.becomes")}</th>
            </tr>
          </thead>
          <tbody>
            {inspection.columns.map((profile, index) => {
              const column = profile.name;
              // By position: a header is the file's text and may hold spaces.
              const selectId = `${baseId}-column-${index}`;
              return (
                <tr key={column}>
                  <th scope="row">
                    <label htmlFor={selectId}>{column}</label>
                  </th>
                  <td>{firstValues[column]}</td>
                  <td>
                    <select
                      id={selectId}
                      value={adding === column ? NEW_ATTRIBUTE : choiceValue(columns[column])}
                      onChange={(e) => {
                        const parsed = parseChoice(e.target.value);
                        if (parsed === NEW_ATTRIBUTE) {
                          setAdding(column);
                          setName(column);
                          setType(suggestedType(profile));
                        } else {
                          setAdding(null);
                          onChange(column, parsed);
                        }
                      }}
                    >
                      <option value="ignore">{t("dataWizard.ignore")}</option>
                      <option value="name">{t("dataWizard.theName")}</option>
                      {fieldOptions(fields, t)}
                      {/* One the wizard made a moment ago, not yet in the fields. */}
                      {columns[column]?.property &&
                        !fields.some((f) => f.property === columns[column].property) && (
                          <option value={choiceValue(columns[column])}>{t("dataWizard.field.attribute", { label: column })}</option>
                        )}
                      {!taxonomy && <option value={NEW_ATTRIBUTE}>{t("dataWizard.newAttribute")}</option>}
                    </select>
                    {suggested.includes(column) && <span className="wizard-suggested">{t("dataWizard.suggested")}</span>}
                    {adding === column && (
                      <span className="wizard-inline">
                        <label>
                          {t("dataWizard.name")}<input value={name} onChange={(e) => setName(e.target.value)} />
                        </label>{" "}
                        <label>
                          {t("dataWizard.type")}{" "}
                          <select value={type} onChange={(e) => setType(e.target.value)}>
                            {newTypes(locale).map((entry) => (
                              <option key={entry.key} value={entry.key}>
                                {entry.label}
                              </option>
                            ))}
                          </select>
                        </label>{" "}
                        <button type="button" aria-disabled={!name.trim()} onClick={() => void create(column)}>
                          {t("dataWizard.createAttribute")}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- Step 4: preview and import ------------------------------------------------------- */

function PreviewStep({
  preview,
  inspection,
  busy,
}: {
  preview: DataPreview | null;
  inspection: DataInspection | null;
  busy: boolean;
}) {
  const { locale, t } = useI18n();
  if (!preview?.rows || !preview.report) {
    return (
      <p className="detail-note" role="status">
        {t("dataWizard.preparingPreview")}
      </p>
    );
  }
  const report = preview.report;
  const className = preview.className ?? t("dataWords.defaultClass");
  const sample = inspection?.sample
    ? sampleWords({ rows: inspection.kept, total: inspection.total, sample: true }, locale)
    : null;
  return (
    <div className="wizard-step" aria-busy={busy}>
      <p className="wizard-summary">
        {t(report.rowsRead === 1 ? "dataWizard.previewSummary.one" : "dataWizard.previewSummary.many", { rows: report.rowsRead, statements: report.statements, sample: sample ? t("dataWords.sampleParen", { sample }) : "" })}
      </p>
      <ol className="wizard-preview">
        {preview.rows.map((row) => (
          <li key={row.row}>{previewSentences(row, className, locale).join(" ")}</li>
        ))}
      </ol>
      {report.keptAsText.length > 0 && (
        <p className="detail-note">
          {t("dataWizard.previewKept")}
        </p>
      )}
      {(report.unmatched ?? []).length > 0 && (
        <div className="detail-note">
          <ul className="wizard-notes">
            {unmatchedLines(report, locale).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p>
            {t("dataWizard.previewLinks")}
          </p>
        </div>
      )}
    </div>
  );
}
