/*
================================================================================
FILE: frontend/src/i18n/kindLabel.test.ts
SUMMARY
    Localized RDF kinds, including untrusted unknown keys.
BASIC IDEA
    Use catalog translation without changing the stored RDF kind.
INPUTS / INPUT SOURCES
    Known kinds and prototype/unknown names.
EXPECTED OUTPUT
    Japanese or English kind text with safe Other fallback.
================================================================================
*/
import { expect, it } from "vitest";
import { kindLabelMessage } from "./kindLabel";
import { translate } from "./format";
import type { Translator } from "./types";
it("translates kinds and maps unknown inherited keys to Other", () => {
  const ja = ((key, args) => translate("ja", key, args)) as Translator;
  expect(kindLabelMessage("individual", ja)).toBe("個体");
  expect(kindLabelMessage("conceptScheme", ja)).toBe("概念体系");
  expect(kindLabelMessage("constructor", ja)).toBe("その他");
});
