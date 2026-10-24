/*
================================================================================
FILE: frontend/src/i18n/serverMessage.ts
SUMMARY
    Validate untrusted server metadata and translate it at render time.
BASIC IDEA
    Codes and argument names/types must exactly match the generated contract.
    Unknown metadata gets a translated operation explanation; callers keep the
    untouched legacy text in their technical detail disclosure.
INPUTS / INPUT SOURCES
    Unknown wire metadata, legacy text and the current typed translator.
EXPECTED OUTPUT
    Whole localized text without guessing facts from an English sentence.
================================================================================
*/
import { SERVER_CONTRACTS } from "./server-contracts";
import type { WireMessage } from "./server-contracts";
import type { MessageId, Primitive, Translator } from "./types";
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function validWireMessage(value: unknown): value is WireMessage {
  if (!record(value) || typeof value.code !== "string" || !record(value.args) || !own(SERVER_CONTRACTS, value.code)) return false;
  const contract = SERVER_CONTRACTS[value.code as keyof typeof SERVER_CONTRACTS] as Record<string, string | readonly string[]>;
  if (Object.keys(value.args).length !== Object.keys(contract).length) return false;
  return Object.entries(contract).every(([name, declared]) => {
    if (!own(value.args as object, name)) return false;
    const arg = (value.args as Record<string, unknown>)[name];
    const type = arg === null ? "null" : typeof arg;
    return (typeof declared === "string" ? [declared] : declared).includes(type)
      && (typeof arg !== "number" || Number.isFinite(arg));
  });
}
export function renderServerMessage(wire: unknown, _legacyText: string, t: Translator): string {
  if (!validWireMessage(wire)) return t("common.error");
  // The runtime validator establishes the exact same relation as the generic
  // translator contract. Keep the cast here, at that one validated boundary.
  const render = t as unknown as (code: MessageId, args?: Record<string, Primitive>) => string;
  return render(wire.code as MessageId, wire.args);
}

/** API errors stay as objects in state; locale-dependent text is derived only
 *  while rendering. Structural access also works across browser realms. */
export function renderServerError(error: unknown, t: Translator): string {
  const wire = record(error) ? error.uiMessage : undefined;
  return renderServerMessage(wire, error instanceof Error ? error.message : String(error), t);
}
