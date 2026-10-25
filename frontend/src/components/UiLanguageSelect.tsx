/*
================================================================================
FILE: frontend/src/components/UiLanguageSelect.tsx
SUMMARY
    A named native select for interface language, including crash recovery.
BASIC IDEA
    Use native keyboard/focus behavior and the shared global focus-visible rule.
INPUTS / INPUT SOURCES
    The interface locale context; no ontology or project state.
EXPECTED OUTPUT
    Japanese/English selection independent of dictionary content.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";

export default function UiLanguageSelect() {
  const { locale, setLocale, t } = useI18n();
  return <label className="ui-language-select">
    <span>{t("ui.language")}</span>{" "}
    <select value={locale} onChange={event => setLocale(event.target.value === "en" ? "en" : "ja")}>
      <option value="ja" lang="ja">日本語</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>;
}
