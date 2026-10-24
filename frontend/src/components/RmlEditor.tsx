/*
================================================================================
FILE: frontend/src/components/RmlEditor.tsx
================================================================================

SUMMARY
    Edit as RML (csv-data-import 5.7): a snapshot's mapping.rml.ttl as text,
    applied with Apply (or Ctrl+Enter), run at once when it is within the
    subset the app runs, and kept as written -- with the last good data --
    when it uses something the app does not run.

BASIC IDEA
    The Turtle editor's keyboard rules (a plain textarea, Tab
    left alone so it leaves the field, Ctrl+Enter applies), but not the
    Turtle editor itself: that one edits a project document, with undo and
    a save, and a mapping is neither (5.7). Applying is a snapshot action,
    so it is never in the undo history.

    The server says what happened: run (the data was produced again), kept
    outside the engine (the feature is named, and the last good data
    stays), or refused -- a source other than the snapshot's own copy, or
    text that is not Turtle -- with nothing kept (Section 9). Each is said
    in text under the box. Controls and error frames use the current UI
    locale; the draft and original diagnostics remain unchanged.

INPUTS / INPUT SOURCES (props)
    - projectId, snapshot: whose mapping, and its text.
    - onApplied(snapshot): the server's answer; onCancel.

EXPECTED OUTPUT
    - The editor; updateData calls.
================================================================================
*/

import { useId, useState, type KeyboardEvent } from "react";
import { updateData } from "../api";
import { useI18n } from "../i18n/I18nProvider";
import { renderServerError } from "../i18n/serverMessage";
import type { SnapshotSummary } from "../types";

interface Props {
  projectId: string;
  snapshot: SnapshotSummary;
  onApplied: (snapshot: SnapshotSummary) => void;
  onCancel: () => void;
}

export default function RmlEditor({ projectId, snapshot, onApplied, onCancel }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState(snapshot.mappingText ?? "");
  const [applying, setApplying] = useState(false);
  const [problem, setProblem] = useState<{ error: unknown } | null>(null);
  const labelId = useId();
  const stateId = useId();

  const apply = async () => {
    if (applying) return;
    setApplying(true);
    setProblem(null);
    try {
      const result = await updateData(projectId, snapshot.id, { mapping: text });
      onApplied(result.snapshot);
    } catch (e: unknown) {
      setProblem({ error: e });
    } finally {
      setApplying(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void apply();
    }
  };

  return (
    <div className="rml-editor">
      <label id={labelId} className="rml-title">
        {t("rmlEditor.title", { source: snapshot.source })}
      </label>
      <textarea
        aria-labelledby={labelId}
        aria-describedby={stateId}
        className="rml-textarea"
        spellCheck={false}
        value={text}
        rows={16}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <p id={stateId} className={problem ? "detail-error" : "detail-note"} role={problem ? "alert" : undefined}>
        {applying
          ? t("rmlEditor.applying")
          : problem ? renderServerError(problem.error, t) : t("rmlEditor.help")}
      </p>
      {problem && <details><summary>{t("common.details")}</summary><pre>{problem.error instanceof Error ? problem.error.message : String(problem.error)}</pre></details>}
      <p className="rml-actions">
        <button type="button" className="primary" aria-disabled={applying} onClick={() => void apply()}>
          {t("rmlEditor.apply")}
        </button>{" "}
        <button type="button" onClick={onCancel}>
          {t("common.cancel")}
        </button>
      </p>
    </div>
  );
}
