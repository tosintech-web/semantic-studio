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
export type UiMessageFor<C extends MessageId> = { [K in C]: { code: K; args: MessageArgs[K] extends undefined ? Record<string, never> : MessageArgs[K] } }[C];
export type UiMessage = UiMessageFor<MessageId>;
export function makeUiMessage<K extends MessageId>(code: K, ...args: MessageArgs[K] extends undefined ? [] : [MessageArgs[K]]): UiMessageFor<K> {
  // Keep each producer narrow; only state/render boundaries need the whole union.
  return { code, args: args[0] ?? {} } as UiMessageFor<K>;
}
export function renderUiMessage(message: UiMessage, t: Translator): string {
  const render = t as unknown as (code: MessageId, args: Record<string, Primitive>) => string;
  return render(message.code, message.args);
}
