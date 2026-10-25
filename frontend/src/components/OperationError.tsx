/*
================================================================================
FILE: frontend/src/components/OperationError.tsx
SUMMARY
    Localized operation explanation with escaped original failure details.
BASIC IDEA
    The cause stays intact. Native details preserves its open state and keyboard
    focus through a UI language change; no fetch or operation runs here.
INPUTS / INPUT SOURCES
    A retained failure, optional typed client guard facts, CSS class and the
    accessible description id for the primary explanation alone.
EXPECTED OUTPUT
    Current-language text and an initially closed, keyboard-accessible disclosure.
================================================================================
*/
import { useI18n } from "../i18n/I18nProvider";
import { operationExplanation, originalError, type OperationFailure } from "../i18n/operationFailure";

export default function OperationError({ failure, className = "detail-error", descriptionId }: { failure: OperationFailure; className?: string; descriptionId?: string }) {
  const { t } = useI18n();
  return <div className={className}>
    <p id={descriptionId} className="operation-explanation">{operationExplanation(failure, t)}</p>
    <details className="technical-details"><summary>{t("common.original")}</summary><pre>{originalError(failure.cause)}</pre></details>
  </div>;
}
