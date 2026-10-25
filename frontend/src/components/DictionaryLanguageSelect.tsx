/*
================================================================================
FILE: frontend/src/components/DictionaryLanguageSelect.tsx
SUMMARY
    Explicit dictionary display-language selection, separate from UI language.
BASIC IDEA
    A named text field with native suggestions accepts any valid language tag.
    Applying it changes only display preference, never RDF or project metadata.
INPUTS / INPUT SOURCES
    Current preference and setter.
EXPECTED OUTPUT
    Keyboard-operable language selection using the shared focus-visible rule.
================================================================================
*/
import { useEffect, useId, useState } from "react";
import { validLanguageTag } from "../projects/form";
import { useI18n } from "../i18n/I18nProvider";

export default function DictionaryLanguageSelect({ language, onChange }: { language: string; onChange(value: string): void }) {
  const { t } = useI18n();
  const id = useId();
  const [draft, setDraft] = useState(language);
  useEffect(() => setDraft(language), [language]);
  const valid = draft.length <= 35 && validLanguageTag(draft);
  return <form className="dictionary-language-select" onSubmit={event => { event.preventDefault(); if (valid) onChange(draft); }}>
    <label>{t("dictionary.language")} <input list={id} value={draft} onChange={event => setDraft(event.target.value)} aria-invalid={!valid} aria-describedby={!valid ? `${id}-error` : undefined} size={5} /></label>
    <datalist id={id}><option value="ja" /><option value="en" /></datalist>
    {!valid && <span id={`${id}-error`}>{t("dictionary.invalidLanguage")}</span>}
    <button type="submit" aria-disabled={!valid}>{t("dictionary.apply")}</button>
  </form>;
}
