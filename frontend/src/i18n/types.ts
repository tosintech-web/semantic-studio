/*
================================================================================
FILE: frontend/src/i18n/types.ts
SUMMARY
    Types for UI locale and complete message arguments.
BASIC IDEA
    Keep interface language independent from RDF language and project values.
INPUTS / INPUT SOURCES
    Stable message identifiers and primitive interpolation arguments.
EXPECTED OUTPUT
    Compile-time checking of message calls, including required arguments.
================================================================================
*/

export type UiLocale = "ja" | "en";
export type Primitive = string | number | boolean | null;
export interface MessageArgs {
  "nav.home": undefined;
  "nav.view": undefined;
  "nav.explore": undefined;
  "nav.edit": undefined;
  "nav.query": undefined;
  "nav.shapes": undefined;
  "nav.entities": undefined;
  "ui.language": undefined;
  "dictionary.language": undefined;
  "dictionary.apply": undefined;
  "dictionary.invalidLanguage": undefined;
  "common.error": undefined;
  "common.notSet": undefined;
  "crash.title": undefined;
  "crash.description": undefined;
  "crash.reload": undefined;
  "load.success": { name: string };
}
export type MessageId = keyof MessageArgs;
export type Catalog = { [K in MessageId]: string };
export type Translator = <K extends MessageId>(code: K, ...args: MessageArgs[K] extends undefined ? [] : [args: MessageArgs[K]]) => string;
