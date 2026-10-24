/*
================================================================================
FILE: frontend/src/i18n/I18nProvider.tsx
SUMMARY
    Persistent UI locale for the application, outside its render-error boundary.
BASIC IDEA
    A typed React context owns only UI language; storage errors stay recoverable.
INPUTS / INPUT SOURCES
    Optional saved ja/en locale from localStorage.
EXPECTED OUTPUT
    Locale, setter, translator and document.lang matching the rendered UI.
================================================================================
*/

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { translate } from "./format";
import type { Translator, UiLocale } from "./types";

const KEY = "semantic-studio.uiLocale.v1";
export interface I18nValue { locale: UiLocale; setLocale(locale: UiLocale): void; t: Translator }
const translator = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;
// Components embedded without the application provider retain their legacy
// English presentation. The actual entry point always mounts the ja provider.
export const I18nContext = createContext<I18nValue>({ locale: "en", setLocale: () => {}, t: translator("en") });

function savedLocale(): UiLocale {
  try { return localStorage.getItem(KEY) === "en" ? "en" : "ja"; }
  catch { return "ja"; }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, update] = useState<UiLocale>(savedLocale);
  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale(next) {
      if (next !== "ja" && next !== "en") return;
      update(next);
      try { localStorage.setItem(KEY, next); } catch { /* Private-mode storage may be unavailable. */ }
    },
    t: translator(locale),
  }), [locale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue { return useContext(I18nContext); }
