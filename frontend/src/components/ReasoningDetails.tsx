/*
================================================================================
FILE: frontend/src/components/ReasoningDetails.tsx
SUMMARY
    Escaped legacy reasoning text beside a localized description.
BASIC IDEA
    A native disclosure keeps its open state and focus through locale changes.
    Legacy-only servers keep inline wording without a duplicate disclosure.
INPUTS / INPUT SOURCES
    A retained reasoning description with optional additive display metadata.
EXPECTED OUTPUT
    Original text in a keyboard-accessible native details element, or nothing.
================================================================================
*/
import { useI18n } from "../i18n/I18nProvider";
import type { ReasoningDescription } from "../reasoning/resultText";

export default function ReasoningDetails({ description }: { description: ReasoningDescription }) {
  const { t } = useI18n();
  return description.uiMessage == null ? null : <details className="technical-details">
    <summary>{t("common.details")}</summary><pre>{description.sentence}</pre>
  </details>;
}
