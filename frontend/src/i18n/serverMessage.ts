/*
================================================================================
FILE: frontend/src/i18n/serverMessage.ts
SUMMARY
    Validate untrusted server metadata and translate it at render time.
BASIC IDEA
    Codes and argument names/types must exactly match the generated contract.
    Flat noun parts contain literal names or registered zero-argument words;
    resolve them at render time, without recursive templates or HTML.
    Unknown metadata gets a translated operation explanation; callers keep the
    untouched legacy text in their technical detail disclosure.
INPUTS / INPUT SOURCES
    Unknown wire metadata, legacy text and the current typed translator.
EXPECTED OUTPUT
    Whole localized text without guessing facts from an English sentence.
================================================================================
*/
import { SERVER_CONTRACTS } from "./server-contracts";
import type { UiPart, WireMessage } from "./server-contracts";
import type { MessageId, Primitive, Translator } from "./types";
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function validPart(value: unknown): boolean {
  if (!record(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 1 && own(value, "text")) return typeof value.text === "string";
  if (keys.length !== 2 || !own(value, "code") || !own(value, "args")
    || typeof value.code !== "string" || !value.code.startsWith("words.")
    || !own(SERVER_CONTRACTS, value.code) || !record(value.args) || Object.keys(value.args).length !== 0) return false;
  return Object.keys(SERVER_CONTRACTS[value.code as keyof typeof SERVER_CONTRACTS]).length === 0;
}

export function validWireMessage(value: unknown): value is WireMessage {
  if (!record(value) || typeof value.code !== "string" || !record(value.args) || !own(SERVER_CONTRACTS, value.code)) return false;
  const contract = SERVER_CONTRACTS[value.code as keyof typeof SERVER_CONTRACTS] as Record<string, string | readonly string[]>;
  if (Object.keys(value.args).length !== Object.keys(contract).length) return false;
  return Object.entries(contract).every(([name, declared]) => {
    if (!own(value.args as object, name)) return false;
    const arg = (value.args as Record<string, unknown>)[name];
    const variants = typeof declared === "string" ? [declared] : declared;
    if (Array.isArray(arg)) {
      if (!variants.includes("parts")) return false;
      // Array.every skips holes; require each actual index before narrowing
      // this unknown value to a dense list of literal/word parts.
      for (let index = 0; index < arg.length; index++) {
        if (!own(arg, String(index)) || !validPart(arg[index])) return false;
      }
      return true;
    }
    const type = arg === null ? "null" : typeof arg;
    return variants.includes(type)
      && (typeof arg !== "number" || Number.isFinite(arg));
  });
}
function literalPart(part: UiPart): part is { text: string } {
  return own(part, "text");
}

export function renderServerMessage(wire: unknown, _legacyText: string, t: Translator): string {
  if (!validWireMessage(wire)) return t("common.error");
  // The runtime validator establishes the exact same relation as the generic
  // translator contract. Keep the cast here, at that one validated boundary.
  const render = t as unknown as (code: MessageId, args?: Record<string, Primitive>) => string;
  const args = Object.fromEntries(Object.entries(wire.args).map(([name, value]) => [name,
    Array.isArray(value)
      ? value.map(part => literalPart(part) ? part.text : render(part.code as MessageId)).join("")
      : value,
  ]));
  return render(wire.code as MessageId, args);
}

/** API errors stay as objects in state; locale-dependent text is derived only
 *  while rendering. Structural access also works across browser realms. */
export function renderServerError(error: unknown, t: Translator): string {
  const wire = record(error) ? error.uiMessage : undefined;
  return renderServerMessage(wire, error instanceof Error ? error.message : String(error), t);
}
