/*
================================================================================
FILE: frontend/src/components/SnapshotList.tsx
================================================================================

SUMMARY
    The project's Data section (csv-data-import 5.7): one row per snapshot
    with its name, where it came from (a sample's words included), its
    rows, a word for its report and the switch that takes its data in and
    out of every view; and its actions -- the report, Refresh…, Change the
    mapping, Edit as RML, Remove… -- with Import data from CSV or Excel at
    the top.

BASIC IDEA
    Every action here is a snapshot action, not a model change: none is in
    the undo history or makes the model unsaved (5.7). Each says what it
    did in the project's live region (projectStore.dataChanged), which also
    refetches the list, whose generation every view's fetch key carries.

    Refresh asks for the new file and runs step 1's checks on it first: a
    file past the 2,000-row limit gets the limit sentence and the same two
    choices as the wizard (5.2). If the headers still match the mapping it
    imports at once and the report opens; if not, the wizard opens on step
    3 with the missing columns marked, which App arranges through onWizard.
    A workbook's snapshot reads the new workbook the same way, the sheet
    of the same name from the same header row (5.8), in step 1's checks
    as on the server. A workbook whose sheet is gone, or a file of the
    other kind than the snapshot's, opens the wizard at step 1 instead, so
    the sheet and header row are chosen rather than taken.

    Remove says how many statements will leave before it asks, and moves
    the folder to the project's own trash. A mapping edited outside what
    the app runs shows its reason in the row, with the last good data kept.
    A list that could not be read says why, with Try again; the store has
    already said it in the live region. UI text and structured notices follow
    the current locale; raw mapping/errors remain in technical disclosures.

INPUTS / INPUT SOURCES (props)
    - projectId: the open project. onWizard: open the wizard on a start.
    - onValidate, onShowData: the report's next steps.
    Plus the project store's `data`, and api.ts.

EXPECTED OUTPUT
    - The list; snapshot actions through api.ts.
================================================================================
*/

import { useEffect, useId, useRef, useState } from "react";
import { ApiError, inspectData, refreshData, removeData, updateData } from "../api";
import { useI18n } from "../i18n/I18nProvider";
import { englishTranslator } from "../i18n/format";
import { renderServerError } from "../i18n/serverMessage";
import { makeUiMessage, renderUiMessage } from "../i18n/uiMessage";
import { dataLabel, reportWord, rowLimitSentence } from "../modeling/dataSentences";
import { plural } from "../modeling/shapeSentences";
import { projectStore, useProjectSelector } from "../state/projectStore";
import type { DataInspection, SnapshotSummary, WorkbookInspection } from "../types";
import { DATA_FILE_ACCEPT, type RefreshReason, type WizardStart } from "./DataWizard";
import ImportReport from "./ImportReport";
import RmlEditor from "./RmlEditor";

interface Props {
  projectId: string;
  onWizard: (start: WizardStart) => void;
  // Back from the wizard: the section's heading takes focus, which the
  // wizard's Done or Cancel would otherwise drop to the page (X4).
  focusOnMount?: boolean;
  onValidate?: () => void;
  onShowData?: () => void;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** The sheets of a workbook refused with no sheet read: the one named is
 *  not in it. Told by the shape of the refusal, never by its words. */
function goneSheet(e: unknown): WorkbookInspection | null {
  if (!(e instanceof ApiError) || typeof e.detail !== "object" || e.detail === null) return null;
  const listed = (e.detail as { workbook?: WorkbookInspection }).workbook;
  return listed && listed.sheet === "" && Array.isArray(listed.sheets) && Array.isArray(listed.top) ? listed : null;
}

export default function SnapshotList({ projectId, onWizard, onValidate, onShowData, focusOnMount = false }: Props) {
  const { t } = useI18n();
  const data = useProjectSelector((s) => s.data);
  const dataError = useProjectSelector((s) => s.dataError);
  const dataErrorCause = useProjectSelector((s) => s.dataErrorCause);
  const [retrying, setRetrying] = useState(false);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const loaded = data !== null;
  // Try again leaves with its button when the list arrives: the heading
  // takes focus, rather than the page.
  const retried = useRef(false);
  useEffect(() => {
    if ((focusOnMount || retried.current) && loaded) headingRef.current?.focus();
    if (loaded) retried.current = false;
  }, [focusOnMount, loaded]);
  if (data === null && dataError !== null) {
    // Said once in the live region by the store; shown here so the tab
    // offers a way on instead of reading for ever (PR #53 review).
    const retry = () => {
      if (retrying) return;
      setRetrying(true);
      retried.current = true;
      projectStore
        .loadData()
        .catch(() => undefined)
        .finally(() => setRetrying(false));
    };
    return (
      <div className="snapshot-section">
        <p className="detail-error">{t("dataSnapshot.readFailed")}</p>
        {dataErrorCause?.error instanceof ApiError && dataErrorCause.error.uiMessage &&
          <p className="detail-error">{renderServerError(dataErrorCause.error, t)}</p>}
        <details><summary>{t("common.details")}</summary><pre>{dataErrorCause ? message(dataErrorCause.error) : dataError}</pre></details>
        <p>
          <button type="button" aria-disabled={retrying} onClick={retry}>
            {retrying ? t("dataSnapshot.retrying") : t("dataSnapshot.retry")}
          </button>
        </p>
      </div>
    );
  }
  if (data === null) {
    return (
      <p className="detail-note" role="status">
        {t("dataSnapshot.reading")}
      </p>
    );
  }
  return (
    <section className="snapshot-section" aria-labelledby={headingId}>
      <h3 id={headingId} ref={headingRef} tabIndex={-1}>
        {t("dataSnapshot.title")}
      </h3>
      <p>
        <button type="button" className="primary" onClick={() => onWizard({ kind: "new" })}>
          {t("dataSnapshot.import")}
        </button>
      </p>
      {data.snapshots.length === 0 ? (
        <p className="detail-note">
          {t("dataSnapshot.empty")}
        </p>
      ) : (
        <ul className="snapshot-list">
          {data.snapshots.map((snapshot) => (
            <SnapshotRow
              key={snapshot.id}
              projectId={projectId}
              snapshot={snapshot}
              onWizard={onWizard}
              onValidate={onValidate}
              onShowData={onShowData}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

type Panel = "report" | "rml" | "remove" | null;

function SnapshotRow({
  projectId,
  snapshot,
  onWizard,
  onValidate,
  onShowData,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
  onWizard: (start: WizardStart) => void;
  onValidate?: () => void;
  onShowData?: () => void;
}) {
  const { locale, t } = useI18n();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ error: unknown } | null>(null);
  const [pending, setPending] = useState<{ file: File; inspection: DataInspection } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const outside = snapshot.mapping.status === "outside";
  const kind = snapshot.className ?? t("dataWords.defaultClass");
  const made = t("dataSnapshot.made", { count: snapshot.individuals, kind: locale === "en" && snapshot.individuals !== 1 ? plural(kind) : kind });

  const run = async (what: string, work: () => Promise<void>) => {
    setBusy(what);
    setError(null);
    try {
      await work();
    } catch (e: unknown) {
      setError({ error: e });
    } finally {
      setBusy(null);
    }
  };

  const toggle = (enabled: boolean) =>
    run("switch", async () => {
      await updateData(projectId, snapshot.id, { enabled });
      await projectStore.dataChanged(
        makeUiMessage(enabled ? "dataSnapshot.switchedOn" : "dataSnapshot.switchedOff", { source: snapshot.source }), projectId,
      );
    });

  // A workbook is read again by the same sheet and header row.
  const readAs = snapshot.workbook ? { sheet: snapshot.workbook.sheet, headerRow: snapshot.workbook.headerRow } : {};

  const refresh = (file: File, sample: boolean) =>
    run("refresh", async () => {
      const result = await refreshData(projectId, snapshot.id, file, { ...readAs, sample });
      setPending(null);
      if (result.status === "mismatch") {
        onWizard({
          kind: "refresh",
          snapshot,
          file,
          options: { ...readAs, sample },
          inspection: result.inspection,
          missing: result.missing,
          choices: result.choices,
        });
        return;
      }
      setPanel("report");
      await projectStore.dataChanged(makeUiMessage("dataSnapshot.refreshed", { source: snapshot.source, replacement: result.snapshot.source }), projectId);
    });

  // Refresh through the wizard's step 1, saying why: the sheet and header
  // row are chosen there, never taken (PR #54 review).
  const throughStep1 = (file: File, atFileMessage: RefreshReason, inspection: DataInspection | null, workbook: WorkbookInspection | null) =>
    onWizard({ kind: "refresh", snapshot, file, options: {}, inspection, workbook, missing: [], choices: null, atFile: renderUiMessage(atFileMessage, englishTranslator), atFileMessage });

  const chooseRefresh = (file: File) =>
    run("refresh", async () => {
      // Step 1's checks first, the 2,000-row limit and its two choices included.
      let inspection: DataInspection;
      try {
        inspection = await inspectData(projectId, { file }, readAs);
      } catch (e: unknown) {
        const gone = snapshot.workbook ? goneSheet(e) : null;
        if (gone === null || !snapshot.workbook) throw e;
        const sentence = makeUiMessage("dataSnapshot.missingSheet", { sheet: snapshot.workbook.sheet });
        throughStep1(file, sentence, null, gone);
        return;
      }
      // A file of the other kind: a CSV file's snapshot has no sheet to read
      // a workbook by, and a workbook's dialect says nothing of a CSV file.
      if ((inspection.format === "xlsx") !== Boolean(snapshot.workbook)) {
        throughStep1(
          file,
          makeUiMessage(inspection.format === "xlsx" ? "dataSnapshot.fromCsv" : "dataSnapshot.fromWorkbook"),
          inspection,
          inspection.workbook ?? null,
        );
        return;
      }
      if (inspection.sample) setPending({ file, inspection });
      else await refresh(file, false);
    });

  const remove = () =>
    run("remove", async () => {
      const result = await removeData(projectId, snapshot.id);
      await projectStore.dataChanged(
        makeUiMessage("dataSnapshot.removed", { source: snapshot.source, count: result.statements }), projectId,
      );
    });

  return (
    <li className={snapshot.enabled ? "snapshot-row" : "snapshot-row off"}>
      <div className="snapshot-head">
        <span className="snapshot-name">
          {snapshot.source}
        </span>
        <span className="data-label">{dataLabel(snapshot, locale)}</span>
        <span className="snapshot-facts">
          {t("dataSnapshot.facts", { made, sheet: snapshot.workbook ? t("dataSnapshot.sheet", { sheet: snapshot.workbook.sheet }) : "", report: reportWord(snapshot.report, locale), busy: busy === "refresh" ? t("dataSnapshot.refreshing") : "" })}
        </span>
        <label className="snapshot-switch">
          <input
            type="checkbox"
            checked={snapshot.enabled}
            aria-disabled={busy !== null}
            onChange={(e) => busy === null && void toggle(e.target.checked)}
          />{" "}
          {snapshot.enabled ? t("dataSnapshot.on") : t("dataSnapshot.off")}
        </label>
      </div>
      {outside && (
        <><p className="detail-error">{t("dataSnapshot.mappingOutside")}</p>
          {snapshot.mapping.message && <details><summary>{t("common.details")}</summary><pre>{snapshot.mapping.message}</pre></details>}</>
      )}
      <div className="snapshot-actions">
        <button type="button" aria-expanded={panel === "report"} onClick={() => setPanel(panel === "report" ? null : "report")}>
          {t("dataSnapshot.report")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={DATA_FILE_ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void chooseRefresh(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-disabled={busy !== null || outside}
          title={outside ? t("dataSnapshot.refreshBlocked") : undefined}
          onClick={() => busy === null && !outside && fileInput.current?.click()}
        >
          {t("dataSnapshot.refresh")}
        </button>
        <button type="button" onClick={() => onWizard({ kind: "remap", snapshot })}>
          {t("dataSnapshot.remap")}
        </button>
        <button type="button" aria-expanded={panel === "rml"} onClick={() => setPanel(panel === "rml" ? null : "rml")}>
          {t("dataSnapshot.rml")}
        </button>
        <button type="button" aria-expanded={panel === "remove"} onClick={() => setPanel(panel === "remove" ? null : "remove")}>
          {t("dataSnapshot.removeMore")}
        </button>
      </div>
      {pending && (
        <div className="wizard-limit" role="group" aria-label={t("dataSnapshot.limit")}>
          <p>{rowLimitSentence(pending.inspection, locale)}</p>
          <p>
            <button type="button" className="primary" onClick={() => void refresh(pending.file, true)}>
              {t("dataSnapshot.useFirst", { count: pending.inspection.limit })}
            </button>{" "}
            <button type="button" onClick={() => fileInput.current?.click()}>
              {t("dataSnapshot.chooseFile")}
            </button>{" "}
            <button type="button" onClick={() => setPending(null)}>
              {t("common.cancel")}
            </button>
          </p>
        </div>
      )}
      {panel === "report" && <ImportReport snapshot={snapshot} onValidate={onValidate} onShowData={onShowData} />}
      {panel === "rml" && (
        <RmlEditor
          projectId={projectId}
          snapshot={snapshot}
          onCancel={() => setPanel(null)}
          onApplied={(applied) => {
            setPanel(applied.mapping.status === "ok" ? "report" : null);
            void projectStore.dataChanged(
              makeUiMessage(applied.mapping.status === "ok" ? "dataSnapshot.mappingApplied" : "dataSnapshot.mappingKept", { source: snapshot.source }), projectId,
            );
          }}
        />
      )}
      {panel === "remove" && (
        <div className="snapshot-remove" role="group" aria-label={t("dataSnapshot.removeQuestion", { source: snapshot.source })}>
          <p>
            {t("dataSnapshot.removeBody", { source: snapshot.source, count: snapshot.statements })}
          </p>
          <button type="button" className="danger" aria-disabled={busy !== null} onClick={() => busy === null && void remove()}>
            {t("dataSnapshot.remove")}
          </button>{" "}
          <button type="button" onClick={() => setPanel(null)}>
            {t("dataSnapshot.keep")}
          </button>
        </div>
      )}
      {error && (
        <><p className="detail-error" role="alert">{renderServerError(error.error, t)}</p>
          <details><summary>{t("common.details")}</summary><pre>{message(error.error)}</pre></details></>
      )}
    </li>
  );
}
