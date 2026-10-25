/*
================================================================================
FILE: frontend/src/components/WarningMessage.tsx
SUMMARY
    A warning's current-language explanation with its unchanged original details.
BASIC IDEA
    Validate optional wire metadata at render time. Unknown warnings use warning
    context rather than a failed-operation message. Native disclosure identity,
    open state and keyboard focus survive a UI language change.
INPUTS / INPUT SOURCES
    A warning record's legacy text and optional untrusted display descriptor.
EXPECTED OUTPUT
    Escaped text, localized warning context and an accessible original disclosure.
================================================================================
*/
import { useI18n } from "../i18n/I18nProvider";
import { renderServerMessage, validWireMessage } from "../i18n/serverMessage";
import type { NoticeWarning } from "../modeling/projectNotices";

export default function WarningMessage({ warning }: { warning: NoticeWarning }) {
  const { t } = useI18n();
  const message = validWireMessage(warning.uiMessage)
    ? renderServerMessage(warning.uiMessage, warning.text, t) : t("warning.unknown");
  return <><span>{message}</span>
    <details><summary>{t("common.details")}</summary><pre>{warning.text}</pre></details>
  </>;
}
