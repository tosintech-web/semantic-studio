/*
================================================================================
FILE: frontend/src/components/EditParts.tsx
================================================================================

SUMMARY
    The pieces the editing form's blocks share (visual-modeling 5.1): the
    command runner, a titled block, and a value edited in place.

BASIC IDEA
    Shared controls use the active translator. Copy results retain typed facts,
    so delayed and existing notices follow UI language without changing text.

    useRunner is the form's one path to the server: it runs a command through
    projectStore.command and keeps raw refusals per field. Current-language
    explanations appear under their field and original sentences in a shared
    keyboard-accessible disclosure. One busy
    flag for the whole form, because the commands of one document are applied
    one at a time on the server anyway, and the status line says "Saving
    change…" while it is set. A second command while one is in flight is
    not sent at all.

    The runner is shared (visual-modeling 5.8 item 1): the annotation adder,
    the delete dialog and the tree's forms take the one their section made,
    so any command in flight shows as busy everywhere in it. `alive()` says
    whether the form that started a command is still on screen when it
    answers, so a create does not move the selection away from something the
    user picked meanwhile (item 4).

    A caller may also be told a refusal's sentence (`refused`), to say it
    in the live region as well as under the field (axioms 5.9).

    useReturnFocus gives focus back to the control that opened a small form
    once the form has gone (item 2). useCopy copies and says "Copied" in a
    polite live region it renders itself (item 11).

    InlineText shows a value with an Edit button. Editing shows a field with
    Save and Cancel; Enter saves (Ctrl+Enter in a text area), Escape cancels,
    and focus returns to Edit either way, so a keyboard user is never left on
    the body when the field goes away.

INPUTS / INPUT SOURCES
    - The project store, for commands.

EXPECTED OUTPUT
    - useRunner, Runner, RunnerErrorDetails, useReturnFocus, useCopy, Block, InlineText.
================================================================================
*/

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { renderServerError } from "../i18n/serverMessage";
import { makeUiMessage, renderUiMessage, type UiMessage } from "../i18n/uiMessage";
import { projectStore } from "../state/projectStore";
import type { ProjectNoticeInput } from "../modeling/projectNotices";
import type { ChangeResult, ProjectDocName } from "../types";

/** Run one command for one field: its busy flag and its refusal. */
export interface RunnerRefusal { message: string; cause: unknown }
export interface Runner {
  busy: boolean;
  errors: Record<string, string>;
  /** Raw errors stay separate from current-language field explanations. */
  refusals?: Record<string, RunnerRefusal>;
  run: (
    field: string,
    command: string,
    args: Record<string, unknown>,
    announcement?: (result: ChangeResult) => ProjectNoticeInput,
    /** Told the server's sentence when the command is refused, to say it in
     *  the live region as well (axioms 5.9), and the error itself, for a
     *  refusal that carries more than words (attribute-reuse 5.1's 409). */
    refused?: (message: string, error: unknown) => void,
  ) => Promise<ChangeResult | null>;
  clear: (field: string) => void;
  /** The form that made this runner is still mounted. */
  alive: () => boolean;
}

/** `doc` names the document the commands go to; the open one by default.
 *  The Shapes view passes "shapes" (shacl-authoring 5.3). */
export function useRunner(doc?: ProjectDocName): Runner {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [refusals, setRefusals] = useState<Record<string, RunnerRefusal>>({});
  const errors = useMemo(() => Object.fromEntries(Object.entries(refusals)
    .map(([field, refusal]) => [field, renderServerError(refusal.cause, t)])), [refusals, t]);
  const clear = useCallback((field: string) => setRefusals(previous => {
    if (!Object.prototype.hasOwnProperty.call(previous, field)) return previous;
    const next = { ...previous };
    delete next[field];
    return next;
  }), []);
  // A ref as well as the state: two submits in one tick both see busy as
  // false, and the second command would be sent (found in review).
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = useCallback(
    async (
      field: string,
      command: string,
      args: Record<string, unknown>,
      announcement?: (result: ChangeResult) => ProjectNoticeInput,
      refused?: (message: string, error: unknown) => void,
    ) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      clear(field);
      try {
        return await projectStore.command(command, args, announcement, doc);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (mounted.current) {
          setRefusals((prev) => ({ ...prev, [field]: { message, cause: e } }));
        }
        refused?.(message, e);
        return null;
      } finally {
        inFlight.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [doc, clear],
  );
  const alive = useCallback(() => mounted.current, []);
  return { busy, errors, refusals, run, clear, alive };
}

/** One stable disclosure per runner. Native summary focus and open state
 *  survive a UI language switch; raw server text is always escaped text. */
export function RunnerErrorDetails({ runner }: { runner: Runner }) {
  const { t } = useI18n();
  const entries = Object.entries(runner.refusals ?? {});
  if (!entries.length) return null;
  return <details><summary>{t("common.details")}</summary>
    {entries.map(([field, refusal]) => <pre key={field}>{refusal.message}</pre>)}
  </details>;
}

/** A ref for the control that opens a small form, and a function that gives
 *  it focus back once the form has closed and the control is drawn again. */
export function useReturnFocus<T extends HTMLElement = HTMLButtonElement>() {
  const ref = useRef<T>(null);
  const restore = useCallback(() => {
    window.setTimeout(() => ref.current?.focus(), 0);
  }, []);
  return [ref, restore] as const;
}

/** Copy to the clipboard, and say so in a polite live region: the button
 *  gave no sign it had done anything (5.8 item 11). The region is rendered
 *  while empty, because one added with its text is not reliably read. */
export function useCopy() {
  const { t } = useI18n();
  const [said, setSaid] = useState<UiMessage | null>(null);
  const copy = useCallback((text: string) => {
    void Promise.resolve().then(() => {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      return navigator.clipboard.writeText(text);
    })
      .then(() => setSaid(makeUiMessage("editParts.copied", { text })))
      .catch(() => setSaid(makeUiMessage("editParts.copyFailed")));
  }, []);
  const region = (
    <span className="visually-hidden" role="status">
      {said ? renderUiMessage(said, t) : ""}
    </span>
  );
  return [copy, region] as const;
}

// ---------------------------------------------------------------------------
// One value edited in place
// ---------------------------------------------------------------------------

interface InlineTextProps {
  label: string;
  value: string | null;
  missing?: string;
  multiline?: boolean;
  busy: boolean;
  error?: string;
  /** Resolves true when the change was made, so the field closes. */
  onSave: (value: string) => Promise<boolean>;
}

/** A value with an Edit button; editing shows a field, Save and Cancel.
 *  Enter saves (Ctrl+Enter in a text area), Escape cancels, and focus goes
 *  back to Edit either way. */
export function InlineText({ label, value, missing, multiline, busy, error, onSave }: InlineTextProps) {
  const { t } = useI18n();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setDraft(null);
    // After the field unmounts, so there is something to focus.
    window.setTimeout(() => editRef.current?.focus(), 0);
  };
  const save = async () => {
    if (draft === null || busy) return;
    if (draft === (value ?? "")) return close();
    if (await onSave(draft)) close();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void save();
    }
  };
  if (draft === null) {
    return (
      <div className="edit-value">
        <span className={value === null ? "detail-name-missing" : undefined}>{value ?? missing ?? t("editParts.none")}</span>
        <button
          ref={editRef}
          type="button"
          className="ghost edit-btn"
          aria-label={t(value === null ? "editParts.addLabel" : "editParts.editLabel", { label })}
          onClick={() => setDraft(value ?? "")}
        >
          {t(value === null ? "editParts.add" : "editParts.edit")}
        </button>
      </div>
    );
  }
  const common = {
    id,
    autoFocus: true,
    value: draft,
    readOnly: busy,
    "aria-label": label,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    onKeyDown,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
  };
  return (
    <div className="edit-value editing">
      {multiline ? <textarea rows={3} {...common} /> : <input {...common} />}
      <div className="edit-actions">
        <button type="button" className="primary" aria-disabled={busy} onClick={() => void save()}>
          {t(busy ? "annotation.saving" : "editParts.save")}
        </button>
        <button type="button" className="ghost" onClick={close}>
          {t("common.cancel")}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="edit-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="edit-block">
      <h4>{title}</h4>
      {children}
    </section>
  );
}
