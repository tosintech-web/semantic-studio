/*
================================================================================
FILE: frontend/src/i18n/uiMessage.ts
SUMMARY
    Internal UI notices as typed facts, independent of the current locale.
BASIC IDEA
    Store code and arguments; render with the active translator, never freeze
    a translated sentence into long-lived React state.
INPUTS / INPUT SOURCES
    Known UI message codes and their compile-time checked primitive arguments.
EXPECTED OUTPUT
    Stable message objects and current-language plain text for live regions.
================================================================================
*/
import type { MessageArgs, MessageId, Primitive, Translator } from "./types";
export type UiMessage = { [K in MessageId]: { code: K; args: MessageArgs[K] extends undefined ? Record<string, never> : MessageArgs[K] } }[MessageId];
export function makeUiMessage<K extends MessageId>(code: K, ...args: MessageArgs[K] extends undefined ? [] : [MessageArgs[K]]): UiMessage {
  return { code, args: args[0] ?? {} } as UiMessage;
}
export function renderUiMessage(message: UiMessage, t: Translator): string {
  const render = t as unknown as (code: MessageId, args: Record<string, Primitive>) => string;
  return render(message.code, message.args);
}
