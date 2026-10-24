/*
================================================================================
FILE: frontend/src/reasoning/reasonSentences.ts
================================================================================

SUMMARY
    The words of reasoning (axioms-and-reasoning 5.1 to 5.7, Section 6): the
    line under Reason, the running and finished status lines, each ending's
    sentence, the group headings with their true counts, a premise's mark,
    and the rule that says when a result no longer belongs to the model
    being shown. Pure: no React, no fetch.

BASIC IDEA
    The facts, the problems and the reasons arrive as sentences from the
    server, which builds them where the explainer runs, from the model's own
    names and E-8's words for each characteristic (D-103). What is left for
    the browser is the frame around them, and that is here so every state
    of Section 6 can be tested without rendering a panel.

    A result is stale once the open model's revision, the snapshots'
    generation or the imports switch is not what it was computed on (5.3),
    or when the server already said so -- a change made while it ran. The
    views stop showing its marks at once; nothing is re-run without a press.

INPUTS / INPUT SOURCES
    - A ReasoningResult from the server; the model's revision, the data
      generation and the imports switch from the project store and App.

EXPECTED OUTPUT
    - Sentences and headings as strings; isStale(result, now).
================================================================================
*/

import { englishTranslator, translate } from "../i18n/format";
import { renderServerMessage } from "../i18n/serverMessage";
import type { Translator, UiLocale } from "../i18n/types";
import type { ReasoningGroupKind, ReasoningResult } from "../types";

const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;

// Compatibility exports for callers outside an application locale provider.
export const INTRO = englishTranslator("reasonWords.intro");
export const EMPTY = englishTranslator("reasonWords.empty");
export const NOTHING = englishTranslator("reasonWords.nothing");
export const STALE = englishTranslator("reasonWords.stale");
export const TAXONOMY = englishTranslator("reasonWords.taxonomy");
export const DATA_SLOWER = englishTranslator("reasonWords.dataSlower");
export const VALUES_FOOTER = englishTranslator("reasonWords.valuesFooter");
export const NEVER_MEMBERS = englishTranslator("reasonWords.neverMembers");
export const NOT_SAVED = englishTranslator("reasonWords.notSaved");

export const GROUP_TITLES: Record<Exclude<ReasoningGroupKind, "imported">, string> = {
  kinds: englishTranslator("reasonWords.group.kinds"),
  same: englishTranslator("reasonWords.group.same"),
  memberships: englishTranslator("reasonWords.group.memberships"),
  links: englishTranslator("reasonWords.group.links"),
};

export function groupHeading(kind: Exclude<ReasoningGroupKind, "imported">, total: number, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  return t("reasonWords.heading", { name: t(`reasonWords.group.${kind}`), count: total });
}

export function importedLine(total: number, locale: UiLocale = "en"): string {
  return tFor(locale)(total === 1 ? "reasonWords.imported.one" : "reasonWords.imported.many", { count: total });
}

/** Keep the existing rounding: tenths under a second, whole seconds above. */
export function seconds(ms: number, locale: UiLocale = "en"): string {
  const value = ms < 950 ? (Math.max(ms, 100) / 1000).toFixed(1) : String(Math.round(ms / 1000));
  return tFor(locale)("reasonWords.seconds", { value });
}
export function runningLine(elapsedSeconds: number, locale: UiLocale = "en"): string {
  return tFor(locale)("reasonWords.running", { count: Math.floor(elapsedSeconds) });
}

/** Completion words use counts and ending metadata, never witness content. */
export type ReasoningLineInput = Pick<ReasoningResult, "status" | "durationMs" | "sentence" | "uiMessage"> & {
  problems: { readonly length: number };
  groups: readonly { total: number }[];
  importedFacts: { total: number };
};

/** Every new fact the run shows, imported ones included. */
export function factCount(result: Pick<ReasoningLineInput, "groups" | "importedFacts">): number {
  return result.groups.reduce((sum, g) => sum + g.total, 0) + result.importedFacts.total;
}

/** The status line and the announcement once a run ends (5.2). */
export function finishedLine(result: ReasoningLineInput, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  if (result.status !== "done") {
    if (result.uiMessage != null) return renderServerMessage(result.uiMessage, result.sentence ?? "", t);
    // Older servers retain their original English presentation. Other UI
    // locales explain the ending without interpreting third-party prose;
    // the caller keeps that prose in an original-details disclosure.
    return locale === "en" ? result.sentence ?? t("reasonWords.ended") : t("reasonWords.ended");
  }
  const problems = result.problems.length;
  const facts = factCount(result);
  const time = seconds(result.durationMs, locale);
  if (problems === 0 && facts === 0) return t("reasonWords.finishedEmpty", { time });
  return t("reasonWords.finished", { time,
    problems: t(problems === 1 ? "reasonWords.problems.one" : "reasonWords.problems.many", { count: problems }),
    facts: t(facts === 1 ? "reasonWords.facts.one" : "reasonWords.facts.many", { count: facts }),
  });
}

export function staleLine(result: ReasoningLineInput, locale: UiLocale = "en"): string {
  if (result.status !== "done") return finishedLine(result, locale);
  return tFor(locale)("reasonWords.staleFinished", { time: seconds(result.durationMs, locale) });
}
export function panelHeading(result: ReasoningResult | null, locale: UiLocale = "en"): string {
  const t = tFor(locale);
  return result?.status === "done" ? t("reasonWords.resultsDone", { time: seconds(result.durationMs, locale) }) : t("reasonWords.results");
}
export function premiseMark(inferred: boolean, locale: UiLocale = "en"): string {
  return tFor(locale)(inferred ? "reasonWords.inferred" : "reasonWords.stated");
}

/** What the model, the data and the switch are now. */
export interface ReasoningNow {
  revision: number;
  generation: number;
  imports: boolean;
}

/** Whether a result no longer belongs to what is shown (5.3). */
export function isStale(result: ReasoningResult, now: ReasoningNow): boolean {
  return (
    result.stale ||
    result.basis.revision !== now.revision ||
    result.basis.generation !== now.generation ||
    result.basis.imports !== now.imports
  );
}

/** Whether the marks show: a finished run, current, and Show inferred on. */
export function marksShown(result: ReasoningResult | null, now: ReasoningNow, showInferred: boolean): boolean {
  return Boolean(result && result.status === "done" && showInferred && !isStale(result, now));
}
