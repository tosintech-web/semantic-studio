/*
================================================================================
FILE: frontend/src/modeling/projectNotices.ts
================================================================================
SUMMARY
    Project announcements rendered in the current UI language from operation facts.
BASIC IDEA
    Keep finite descriptors, selected rule labels, relationship ends or summaries.
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

import { createdAnnouncement, givenAnnouncement, removedAnnouncement, sharedAnnouncement, planAlready } from "./sentences";
import { narrativeSentence, type RuleNarrative } from "./ruleSentences";
import type { WireMessage } from "../i18n/server-contracts";
import type { MessageId, Translator, UiLocale } from "../i18n/types";
import { translate } from "../i18n/format";
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

export type ReuseFacts =
  | { mode: "removed"; name: string; cls: string }
  | { mode: "given"; name: string; cls: string }
  | { mode: "shared"; name: string; classes: string[] }
  | { mode: "subclass"; name: string; cls: string; parent: string }
  | { mode: "already"; name: string; cls: string; via: string };
export interface NoticeWarning { text: string; uiMessage?: unknown }
type Operation = Pick<ChangeResult, "label" | "uiMessage">;
export type ProjectNoticeInput = string | ProjectNotice | ProjectNoticeDetail;
export type ProjectNoticeDetail =
  | { kind: "relationship"; action: "created" | "completed"; name: string; from: string; to: string }
  | { kind: "undoAvailable"; operation: Operation }
  | { kind: "refusal"; message: string; uiMessage: WireMessage | undefined }
  | { kind: "rule"; action: "added" | "changed" | "removed"; narrative: RuleNarrative | null; operation: Operation; fallback?: { from: string; to: string } }
  | { kind: "ruleCheck"; operation: Operation }
  | { kind: "reuse"; facts: ReuseFacts }
  | { kind: "warnings"; warnings: NoticeWarning[] }
  | { kind: "change"; label: string; uiMessage: ChangeResult["uiMessage"]; operation: "applied" | "undo" | "redo"; status: "saved" | "unsaved" | "saving" }
  | { kind: "validation"; result: ValidationSummaryInput }
  | { kind: "reasoning"; result: ReasoningLineInput; stale: boolean };

export interface ProjectAnnouncement {
  text: string;
  id: number;
  uiMessage?: ProjectNotice;
  detail?: ProjectNoticeDetail;
}

/** Copy metadata at the boundary so later result mutation cannot alter a notice. */
function captureMessage(value: unknown): WireMessage | undefined {
  if (!validWireMessage(value)) return undefined;
  return { code: value.code, args: Object.fromEntries(Object.entries(value.args).map(([key, arg]) => [key,
    Array.isArray(arg) ? arg.map(part => Object.prototype.hasOwnProperty.call(part, "text")
      ? { text: (part as { text: string }).text } : { code: (part as { code: string }).code, args: {} }) : arg,
  ])) } as WireMessage;
}
function operationFacts(result: Operation): Operation {
  return { label: result.label, uiMessage: captureMessage(result.uiMessage) };
}
export function refusalNotice(message: string, error: unknown): ProjectNoticeDetail {
  const metadata = error && typeof error === "object" && "uiMessage" in error ? error.uiMessage : undefined;
  return { kind: "refusal", message, uiMessage: captureMessage(metadata) };
}
export function ruleNotice(action: "added" | "changed" | "removed", narrative: RuleNarrative | null, result: Operation, fallback?: { from: string; to: string }): ProjectNoticeDetail {
  const facts = narrative?.type === "restriction" ? { ...narrative, parts: { ...narrative.parts } } : narrative && { ...narrative };
  return { kind: "rule", action, narrative: facts, operation: operationFacts(result), ...(fallback ? { fallback: { from: fallback.from, to: fallback.to } } : {}) };
}
export function relationshipNotice(action: "created" | "completed", name: string, from: string, to: string): ProjectNoticeDetail {
  return { kind: "relationship", action, name, from, to };
}
export function undoAvailableNotice(result: Operation): ProjectNoticeDetail {
  return { kind: "undoAvailable", operation: operationFacts(result) };
}
export function ruleCheckNotice(result: Operation): ProjectNoticeDetail {
  return { kind: "ruleCheck", operation: operationFacts(result) };
}
export function reuseNotice(facts: ReuseFacts): ProjectNoticeDetail {
  return { kind: "reuse", facts: facts.mode === "shared" ? { ...facts, classes: [...facts.classes] } : { ...facts } };
}
export function warningNotice(warnings: NoticeWarning[]): ProjectNoticeDetail {
  return { kind: "warnings", warnings: warnings.map(w => ({ text: w.text, uiMessage: captureMessage(w.uiMessage) })) };
}

/** Keep legacy text independent of the localized metadata's wording. */
export function legacyNoticeText(detail: ProjectNoticeDetail): string | undefined {
  if (detail.kind === "undoAvailable") return `${detail.operation.label}. Undo is available.`;
  if (detail.kind === "refusal") return detail.message;
  if (detail.kind === "warnings") return `Warning: ${detail.warnings.map(w => w.text).join(" ")}`;
  if (detail.kind === "ruleCheck") return `${detail.operation.label}. Validate checks it in your data.`;
  if (detail.kind === "rule") {
    const verb = { added: "Added", changed: "Changed", removed: "Removed" }[detail.action];
    return `${verb}: ${detail.narrative ? narrativeSentence(detail.narrative) : detail.fallback ? translate("en", "canvasUI.ruleFallback", detail.fallback) : "the rule"}. ${detail.operation.label}.`;
  }
  return undefined;
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

export function renderProjectNoticeDetail(detail: ProjectNoticeDetail, locale: UiLocale, t: Translator): string {
  if (detail.kind === "relationship") return detail.action === "created"
    ? createdAnnouncement(detail.name, detail.from, detail.to, locale)
    : t("projectNotice.relationshipCompleted", { name: detail.name, from: detail.from, to: detail.to });
  if (detail.kind === "undoAvailable") return t("projectNotice.undoAvailable", { operation: historyLabel(detail.operation.label, detail.operation.uiMessage, t) });
  if (detail.kind === "refusal") return renderServerMessage(detail.uiMessage, detail.message, t);
  if (detail.kind === "rule") return t(`projectNotice.rule.${detail.action}`, {
    sentence: detail.narrative ? narrativeSentence(detail.narrative, locale) : detail.fallback ? t("canvasUI.ruleFallback", detail.fallback) : t("projectNotice.ruleFallback"),
    operation: historyLabel(detail.operation.label, detail.operation.uiMessage, t),
  });
  if (detail.kind === "ruleCheck") return t("projectNotice.ruleCheck", { operation: historyLabel(detail.operation.label, detail.operation.uiMessage, t) });
  if (detail.kind === "reuse") {
    const f = detail.facts;
    if (f.mode === "removed") return removedAnnouncement(f.name, f.cls, locale);
    if (f.mode === "given") return givenAnnouncement(f.name, f.cls, locale);
    if (f.mode === "shared") return sharedAnnouncement(f.name, f.classes, locale);
    if (f.mode === "already") return planAlready(f.name, f.cls, f.via, locale);
    return t("projectNotice.reuseSubclass", { name: f.name, cls: f.cls, parent: f.parent });
  }
  if (detail.kind === "warnings") {
    let unknown = 0;
    const messages: string[] = [];
    for (const warning of detail.warnings) {
      if (validWireMessage(warning.uiMessage)) messages.push(renderServerMessage(warning.uiMessage, warning.text, t));
      else if (locale === "en") messages.push(warning.text);
      else unknown++;
    }
    if (unknown) messages.push(t("projectNotice.warningUnknown", { count: unknown }));
    return t("projectNotice.warnings", { messages: messages.join(" ") });
  }
  if (detail.kind === "change") {
    const { label, uiMessage, operation, status } = detail;
    return t(`projectNotice.changed.${operation}.${status}`, { label: historyLabel(label, uiMessage, t) });
  }
  if (detail.kind === "validation") return validationSummary(detail.result, locale);
  if (detail.kind === "reasoning") {
    const { result, stale } = detail;
    const line = stale ? staleLine(result, locale) : finishedLine(result, locale);
    // Preserve the original English announcement punctuation; Japanese
    // templates already own their punctuation and must not acquire a dot.
    return locale === "en" && !line.endsWith(".") ? `${line}.` : line;
  }
  return "";
}

export function renderProjectAnnouncement(notice: ProjectAnnouncement, locale: UiLocale, t: Translator): string {
  if (notice.detail) return renderProjectNoticeDetail(notice.detail, locale, t);
  return notice.uiMessage ? renderUiMessage(notice.uiMessage, t) : notice.text;
}
