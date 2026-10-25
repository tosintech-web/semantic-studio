/*
================================================================================
FILE: frontend/src/reasoning/resultText.ts
SUMMARY
    Current-language rendering of additive reasoning descriptions.
BASIC IDEA
    Validate source facts without parsing legacy prose. Older servers keep their
    original presentation; unknown new metadata has a reasoning-specific frame.
INPUTS / INPUT SOURCES
    A retained sentence, optional metadata and current UI translator.
EXPECTED OUTPUT
    Localized text without changing RDF names, result identities or state.
================================================================================
*/
import { renderServerMessage, validWireMessage } from "../i18n/serverMessage";
import type { WireMessage } from "../i18n/server-contracts";
import type { Translator } from "../i18n/types";

export interface ReasoningDescription {
  sentence: string;
  uiMessage?: WireMessage | null;
}

export function reasoningText(description: ReasoningDescription, t: Translator): string {
  if (description.uiMessage == null) return description.sentence;
  return validWireMessage(description.uiMessage)
    ? renderServerMessage(description.uiMessage, description.sentence, t)
    : t("reasoning.result.unknown");
}
