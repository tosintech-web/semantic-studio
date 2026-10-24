/*
================================================================================
FILE: frontend/src/removalPrompt.ts
================================================================================

SUMMARY
    Builds the sentence shown in the confirmation dialog before an ontology is
    removed. It is a pure function of the ontology's name, the number of queries
    saved against it, and their names.

BASIC IDEA
    Removing an ontology also deletes every query saved against it, and the
    sentence the user used to agree to described only a file. This module is the
    whole of that fix: the three-way wording choice, in one testable place.

    The count is `number | null`, and the distinction is the point. `null` means
    "we could not find out", and must produce the cautious wording — a `null`
    quietly treated as `0` turns a failed request into a reassurance, which is
    the most damaging thing this file could do. So the branch is written as an
    explicit `=== null` test rather than as a falsy check, which would collapse
    the two.

    Up to three queries are named. Beyond that the sentence outgrows an
    unformatted native dialog, so it falls back to a bare count. The names are
    what answers the question the user actually has, which is whether the ones
    going are the ones they cared about.

    It lives in its own module rather than inside App.tsx so that it can be
    tested without rendering the whole application.

INPUTS / INPUT SOURCES
    - The active ontology's name, from the ontology list.
    - The length of GET /api/queries?ontology=... , or null if that call failed.
    - The names of those saved queries, in the order the server listed them.

EXPECTED OUTPUT
    - One plain-text sentence for window.confirm. Plain text is deliberate: the
      ontology name comes from an uploaded filename and is therefore
      attacker-influenced, and a native dialog cannot execute markup.
================================================================================
*/

import { makeUiMessage, renderUiMessage, type UiMessage } from "./i18n/uiMessage";
import type { Translator } from "./i18n/types";
import { englishTranslator } from "./i18n/format";

/** Above this many, the dialog states a count instead of listing names. */
const MAX_NAMED = 3;

/**
 * The confirmation sentence for removing an ontology.
 *
 * @param name         the ontology's name, interpolated verbatim
 * @param savedQueries how many queries will go with it, or null if unknown
 * @param names        their names, used only when all of them fit
 */
export function removalPrompt(name: string, savedQueries: number | null, names: string[] = [], t: Translator = englishTranslator): string {
  if (savedQueries === null) return t("remove.unknown", { name });
  if (savedQueries === 0) return t("remove.zero", { name });
  const suffix = savedQueries === 1 ? "one" : "many";
  if (savedQueries <= MAX_NAMED && names.length === savedQueries) return t(`remove.named.${suffix}`, {
    name, count: savedQueries,
    names: names.map(value => t("common.quote", { value })).join(t("common.listSeparator")),
  });
  return t(`remove.count.${suffix}`, { name, count: savedQueries });
}

export function removalConfirmationNotice(name: string, deletedQueries: number): UiMessage | null {
  if (deletedQueries <= 0) return null;
  return makeUiMessage(`remove.done.${deletedQueries === 1 ? "one" : "many"}`, { name, count: deletedQueries });
}

export function removalConfirmation(name: string, deletedQueries: number, t: Translator = englishTranslator): string | null {
  const notice = removalConfirmationNotice(name, deletedQueries);
  return notice ? renderUiMessage(notice, t) : null;
}
