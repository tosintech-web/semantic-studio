/*
================================================================================
FILE: frontend/src/i18n/en.ts
SUMMARY
    en UI message catalog.
BASIC IDEA
    Use whole sentences and stable placeholders; user data stays unchanged.
INPUTS / INPUT SOURCES
    Message contracts from types.ts.
EXPECTED OUTPUT
    A complete catalog matching the other supported UI locale.
================================================================================
*/

import type { Catalog } from "./types";

export const en: Catalog = {
  "nav.home": "Home",
  "nav.view": "View",
  "nav.explore": "Explore",
  "nav.edit": "Edit",
  "nav.query": "Query",
  "nav.shapes": "Shapes",
  "nav.entities": "Entities",
  "ui.language": "UI language",
  "dictionary.invalidLanguage": "Enter a language tag such as ja, en or ja-JP.",
  "dictionary.apply": "Apply display language",
  "dictionary.language": "Dictionary display language",
  "common.error": "The operation could not be completed. Check the details.",
  "common.notSet": "Not set",
  "crash.title": "Something went wrong.",
  "crash.description": "The interface stopped rather than showing you something wrong. Reloading starts again from the ontology library; nothing stored on your machine has been changed.",
  "crash.reload": "Reload the application",
  "load.success": "Loaded “{name}”."
};
