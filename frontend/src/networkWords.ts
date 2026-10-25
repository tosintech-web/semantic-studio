/*
================================================================================
FILE: frontend/src/networkWords.ts
================================================================================

SUMMARY
    The plain-language words for the network broker's capabilities and log
    outcomes, shared by the approval dialog and the Network panel; and why
    a call to the app's own server failed, in the app's words (X-12).

BASIC IDEA
    Capability names such as `jsonld:context` are the server's vocabulary and
    are never shown to the user (external-access Section 7). Each has a phrase
    that completes "Always, for ... from this site" and a short purpose for the
    panel's list. Kept out of the components, like removalPrompt.ts, so the
    rule "every capability has words" is testable without rendering, and so
    the dialog and the panel cannot describe one capability two ways.

    An unknown capability or outcome falls back to a generic phrase rather than
    being printed, because the value came from the server's JSON and the rule
    is that capability names are not shown. The lookup is an own-property check
    rather than `in` or a bare index, so a key such as `constructor` falls through to the fallback
    instead of returning an inherited function (backlog X-6).

INPUTS / INPUT SOURCES
    - Capability and outcome strings from the API; a failed call's error.

EXPECTED OUTPUT
    - Strings for the interface.
================================================================================
*/

import type { Translator } from "./i18n/types";
import { englishTranslator } from "./i18n/format";
import { renderServerError } from "./i18n/serverMessage";
import { ApiError } from "./api";

/**
 * Why a call failed, to follow a colon: the server's own sentence when it
 * sent one, else that it did not answer. A fetch that never reached the
 * server rejects with the browser's own text (*Failed to fetch*,
 * *NetworkError when attempting to fetch resource.*), which is never shown.
 */
export function failureReason(e: unknown, t: Translator = englishTranslator): string {
  return e instanceof ApiError ? e.uiMessage ? renderServerError(e, t) : e.message : t("network.unreachable");
}

const PHRASES = {
  "ontology:fetch": "fetch", "ontology:import": "import",
  "jsonld:context": "context", "sparql:service": "service",
} as const;
const OUTCOMES = {
  ok: "ok", "http-error": "http-error", redirect: "redirect", failed: "failed",
  refused: "refused", blocked: "blocked", asked: "asked", offline: "offline", "too-large": "too-large",
} as const;

function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

/** Completes "Always, for ___ from this site". */
export function alwaysPhrase(capability: string, t: Translator = englishTranslator): string {
  return t(`network.always.${lookup(PHRASES, capability) ?? "other"}`);
}

/** A short name for what a remembered decision covers. */
export function purposeLabel(capability: string, t: Translator = englishTranslator): string {
  return t(`network.purpose.${lookup(PHRASES, capability) ?? "other"}`);
}

/** What happened to one logged request, in words. */
export function outcomeLabel(outcome: string, t: Translator = englishTranslator): string {
  return t(`network.outcome.${lookup(OUTCOMES, outcome) ?? "other"}`);
}

/** True only for a request that reached the site and came back. */
export function reachedTheSite(outcome: string): boolean {
  return outcome === "ok" || outcome === "http-error" || outcome === "redirect" || outcome === "too-large";
}
