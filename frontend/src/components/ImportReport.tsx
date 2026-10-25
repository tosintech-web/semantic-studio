/*
================================================================================
FILE: frontend/src/components/ImportReport.tsx
================================================================================

SUMMARY
    The import report (csv-data-import 5.5): rows read and individuals made,
    rows skipped, values kept as text per column, empty cells, and the next
    step -- Validate, or Show the data. Shown after an import or a refresh,
    and again from a snapshot's row.

BASIC IDEA
    Bad data is shown, not hidden (Section 7): every line is a sentence from
    modeling/dataSentences.ts naming the column and the rows, and the label
    above it says where the data came from, a sample's words included. The
    summary is a status region, so it is announced when the report appears
    after an import (Section 6); shown again from a row it is not. Descriptions
    and next-step actions follow the current UI locale without changing the
    supplied report, source names or status-region identity.

INPUTS / INPUT SOURCES (props)
    - snapshot: the snapshot and its report.
    - announce: whether the summary is a live status (after an import).
    - onValidate, onShowData: the next steps; absent hides the button.

EXPECTED OUTPUT
    - The report.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { dataClassName, dataLabel, reportLines } from "../modeling/dataSentences";
import type { SnapshotSummary } from "../types";

interface Props {
  snapshot: SnapshotSummary;
  announce?: boolean;
  onValidate?: () => void;
  onShowData?: () => void;
}

export default function ImportReport({ snapshot, announce = false, onValidate, onShowData }: Props) {
  const { locale, t } = useI18n();
  const [first, ...rest] = reportLines(snapshot.report, dataClassName(snapshot, t), snapshot, locale);
  return (
    <div className="import-report">
      <p className="data-label">{dataLabel(snapshot, locale)}</p>
      <p className="import-report-summary" role={announce ? "status" : undefined}>
        {first}
      </p>
      {rest.length > 0 && (
        <ul className="import-report-lines">
          {rest.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {(onValidate || onShowData) && (
        <p className="import-report-next">
          {onValidate && (
            <button type="button" className="primary" onClick={onValidate}>
              {t("dataReport.validate")}
            </button>
          )}
          {onShowData && (
            <button type="button" onClick={onShowData}>
              {t("dataReport.showData")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
