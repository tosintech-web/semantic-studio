/*
================================================================================
FILE: frontend/src/i18n/parts.ts
SUMMARY
    Catalog templates rendered as plain text and linked entity references.
BASIC IDEA
    Split the catalog's placeholders before inserting values. Names, IRIs and
    text containing braces or control markers never participate in parsing.
    Reference identity survives reordering and repetition by a translated template.
INPUTS / INPUT SOURCES
    UI locale, a typed message code and primitive or linked placeholder values.
EXPECTED OUTPUT
    Part[] compatible with explanation buttons; no HTML or completed-text parsing.
================================================================================
*/
import { formatNumber, messageTemplate, translate } from "./format";
import type { MessageArgs, MessageId, Primitive, UiLocale } from "./types";

export interface LinkedPart { iri: string; label: string }
export type MessagePart = string | LinkedPart;
export type PartArgs<K extends MessageId> = {
  [P in keyof MessageArgs[K]]: MessageArgs[K][P] extends string
    ? string | LinkedPart | readonly MessagePart[] : MessageArgs[K][P];
};
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
function reference(value: unknown): value is LinkedPart {
  return typeof value === "object" && value !== null
    && own(value, "iri") && own(value, "label")
    && typeof (value as LinkedPart).iri === "string" && typeof (value as LinkedPart).label === "string";
}

export function translateParts<K extends MessageId>(locale: UiLocale, code: K,
  ...args: MessageArgs[K] extends undefined ? [] : [PartArgs<K>]
): MessagePart[] {
  const values = (args[0] ?? {}) as Record<string, Primitive | LinkedPart | readonly MessagePart[]>;
  const out: MessagePart[] = [];
  const append = (part: MessagePart) => {
    if (typeof part === "string" && typeof out[out.length - 1] === "string") {
      out[out.length - 1] = String(out[out.length - 1]) + part;
    } else if (part !== "") out.push(part);
  };
  const template = messageTemplate(locale, code);
  let position = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    append(template.slice(position, match.index));
    const key = match[1];
    if (!own(values, key)) return [translate(locale, "common.error")];
    const value = values[key];
    if (Array.isArray(value)) {
      if (!value.every(part => typeof part === "string" || reference(part))) return [translate(locale, "common.error")];
      // A supplied Part[] already carries text boundaries beside its links.
      // Preserve those nodes as well as reference identity for existing renderers.
      out.push(...value);
    } else if (reference(value)) append(value);
    else if (value === null) append(translate(locale, "common.notSet"));
    else if (typeof value === "number") append(formatNumber(locale, value));
    else if (typeof value === "string" || typeof value === "boolean") append(String(value));
    else return [translate(locale, "common.error")];
    position = match.index! + match[0].length;
  }
  append(template.slice(position));
  return out;
}
