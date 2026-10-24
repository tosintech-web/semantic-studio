/*
================================================================================
FILE: frontend/src/modeling/projectNotices.ts
================================================================================
SUMMARY
    Project announcements rendered in the current UI language from operation facts.
BASIC IDEA
    Keep finite message descriptors or a small validation/reasoning summary.
    Reuse the panels' formatters and retain English text for legacy callers.
    Command history labels use additive server descriptors; each notice also
    keeps the action and save-state facts needed by its whole sentence.
    A notice may outlive a closed project, so never keep its full result graph,
    witness labels, validation problems or other document content here.
INPUTS / INPUT SOURCES
    - Completed operation results, current result basis, locale and translator.
EXPECTED OUTPUT
    - Minimal summary descriptors and escaped plain-text announcement content.
================================================================================
*/

import type { MessageId, Translator, UiLocale } from "../i18n/types";
import { renderUiMessage, type UiMessageFor } from "../i18n/uiMessage";
import { renderServerMessage, validWireMessage } from "../i18n/serverMessage";
import type { ChangeResult, ReasoningResult, ValidationResult } from "../types";
import { validationSummary, type ValidationSummaryInput } from "./shapeSentences";
import { finishedLine, isStale, staleLine, type ReasoningLineInput, type ReasoningNow } from "../reasoning/reasonSentences";

/** A finite producer domain avoids distributing unrelated catalog variants
 *  through every project-state consumer while preserving code/argument types. */
export type ProjectNotice = UiMessageFor<
  | "dataSnapshot.switchedOn" | "dataSnapshot.switchedOff"
  | "dataSnapshot.refreshed" | "dataSnapshot.removed"
  | "dataSnapshot.mappingApplied" | "dataSnapshot.mappingKept"
  | "dataSnapshot.readFailed"
  | Extract<MessageId, `projectNotice.${string}`>
>;

export type ProjectNoticeDetail =
  | { kind: "change"; label: string; uiMessage: ChangeResult["uiMessage"]; operation: "applied" | "undo" | "redo"; status: "saved" | "unsaved" | "saving" }
  | { kind: "validation"; result: ValidationSummaryInput }
  | { kind: "reasoning"; result: ReasoningLineInput; stale: boolean };

export interface ProjectAnnouncement {
  text: string;
  id: number;
  uiMessage?: ProjectNotice;
  detail?: ProjectNoticeDetail;
}

export function validationNotice(result: ValidationResult): ProjectNoticeDetail {
  return { kind: "validation", result: {
    stopped: result.stopped, shapeCount: result.shapeCount, statements: result.statements,
    shapes: result.shapes.map(({ state }) => ({ state })),
  } };
}

export function reasoningNotice(result: ReasoningResult, now: ReasoningNow): ProjectNoticeDetail {
  return { kind: "reasoning", stale: isStale(result, now), result: {
    status: result.status, durationMs: result.durationMs,
    sentence: result.sentence, uiMessage: result.uiMessage,
    problems: { length: result.problems.length },
    groups: result.groups.map(({ total }) => ({ total })),
    importedFacts: { total: result.importedFacts.total },
  } };
}

/** Unsupported metadata can mean a different server version. Keep the
 *  successful operation's original label; an error fallback would falsely
 *  describe that operation as failed. Never infer metadata from the label. */
export function historyLabel(label: string | null | undefined, message: unknown, t: Translator): string {
  return validWireMessage(message) ? renderServerMessage(message, label ?? "", t) : label ?? "";
}

export function renderProjectAnnouncement(notice: ProjectAnnouncement, locale: UiLocale, t: Translator): string {
  if (notice.detail?.kind === "change") {
    const { label, uiMessage, operation, status } = notice.detail;
    return t(`projectNotice.changed.${operation}.${status}`, { label: historyLabel(label, uiMessage, t) });
  }
  if (notice.detail?.kind === "validation") return validationSummary(notice.detail.result, locale);
  if (notice.detail?.kind === "reasoning") {
    const { result, stale } = notice.detail;
    const line = stale ? staleLine(result, locale) : finishedLine(result, locale);
    // Preserve the original English announcement punctuation; Japanese
    // templates already own their punctuation and must not acquire a dot.
    return locale === "en" && !line.endsWith(".") ? `${line}.` : line;
  }
  return notice.uiMessage ? renderUiMessage(notice.uiMessage, t) : notice.text;
}
