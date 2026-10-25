/*
================================================================================
FILE: frontend/src/dictionary/useDictionaryLanguage.ts
SUMMARY
    Independent, persistent per-dictionary display language.
BASIC IDEA
    Project choices stay in the project store; Library choices are keyed by ID.
INPUTS / INPUT SOURCES
    Dictionary ID, current project display language and UI locale.
EXPECTED OUTPUT
    Display language and setter; a context for explicit API arguments.
================================================================================
*/

import { createContext, useCallback, useContext, useState } from "react";
import { validLanguageTag } from "../projects/form";
import { projectStore } from "../state/projectStore";
import type { UiLocale } from "../i18n/types";

const KEY = "semantic-studio.dictionaryLanguages.v1";
export const DictionaryLanguageContext = createContext<string | undefined>(undefined);
export const useDictionaryDisplayLanguage = () => useContext(DictionaryLanguageContext);
const valid = (value: unknown): value is string => typeof value === "string" && value.length <= 35 && validLanguageTag(value);
function read(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => valid(value)));
  } catch { return {}; }
}

export function useDictionaryLanguage({ ontologyId, projectLanguage, uiLocale }: {
  ontologyId: string | null; projectLanguage: string | null; uiLocale: UiLocale;
}): { language: string; setLanguage(value: string): void } {
  const [preferences, update] = useState(read);
  const own = ontologyId !== null && Object.prototype.hasOwnProperty.call(preferences, ontologyId) ? preferences[ontologyId] : undefined;
  const language = projectLanguage ?? own ?? uiLocale;
  const setLanguage = useCallback((value: string) => {
    if (!valid(value)) return;
    if (projectLanguage !== null) { projectStore.setDisplayLanguage(value); return; }
    if (ontologyId === null) return;
    const next = { ...preferences, [ontologyId]: value };
    update(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Memory choice remains usable. */ }
  }, [ontologyId, projectLanguage, preferences]);
  return { language, setLanguage };
}
