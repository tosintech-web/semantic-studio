/*
================================================================================
FILE: frontend/src/components/DictionaryContext.tsx
SUMMARY
    Explicit dictionary identity, editing permission and textual save status.
BASIC IDEA
    Present existing store state without owning or changing document state.
INPUTS / INPUT SOURCES
    Dictionary name, document name, editing permission and save state.
EXPECTED OUTPUT
    A readable context bar with full-value titles and a polite save status.
================================================================================
*/
import {useTeam} from "../team/TeamProvider";
import { useI18n } from "../i18n/I18nProvider";
export type DictionarySaveState = "saved" | "dirty" | "saving" | "saveError";
export default function DictionaryContext({ name, editing, documentName, saveState }: {
  name: string; editing: boolean; documentName: string | null; saveState: DictionarySaveState;
}) {
  const team = useTeam();
  const { t } = useI18n();
  return <div className="dictionary-context" role="region" aria-label={name}>
    <strong title={name}>{name}</strong>
    <span>{t(editing ? "dictionary.editing" : "dictionary.readonly")}</span>
    {documentName && <span title={documentName}>{documentName}</span>}
    {editing && <span role="status" aria-live="polite">{t(team.mode === "team" && (saveState === "saved" || saveState === "dirty") ? "team.stored" : `dictionary.${saveState}`)}</span>}
  </div>;
}
