/*
================================================================================
FILE: frontend/src/government/form.test.ts
SUMMARY
    Checks name, source and period input without changing RDF identity.
BASIC IDEA
    Exact examples cover leap days, unknown/open bounds and language identity.
INPUTS / INPUT SOURCES
    Synthetic entry drafts and explicit dates.
EXPECTED OUTPUT
    Invalid drafts are rejected before any command can be sent.
================================================================================
*/
import { describe, expect, it } from "vitest";
import { validNames, validPeriod, validSources, unknownPeriod, supportedProfile } from "./form";

describe("government form rules", () => {
  it("keeps unknown bounds distinct from unbounded dates", () => {
    expect(unknownPeriod()).toEqual({ start: { date: null, open: false }, end: { date: null, open: false } });
    expect(validPeriod(unknownPeriod())).toBe(true);
    expect(validPeriod({ start: { date: "2020-02-29", open: false }, end: { date: null, open: true } })).toBe(true);
    expect(validPeriod({ start: { date: "2021-02-29", open: false }, end: { date: null, open: true } })).toBe(false);
    expect(validPeriod({ start: { date: "0000-01-01", open: false }, end: { date: null, open: true } })).toBe(false);
    expect(validPeriod({ start: { date: "2020-04-01", open: false }, end: { date: "2020-04-01", open: false } })).toBe(false);
    expect(validPeriod({ start: { date: "2020-01-01", open: true }, end: { date: null, open: true } })).toBe(false);
  });

  it("requires distinct preferred-name languages and real nonempty values", () => {
    expect(validNames([{ value: "日本語", language: "ja" }, { value: "English", language: "en" }])).toBe(true);
    expect(validNames([{ value: "a", language: "en" }, { value: "b", language: "EN" }])).toBe(false);
    expect(validNames([{ value: "  ", language: "en" }])).toBe(false);
    expect(validNames([{ value: "a", language: "en_US" }])).toBe(false);
  });

  it("validates source links without fetching them", () => {
    expect(validSources([{ kind: "text", value: "Synthetic Act, p. 1" }])).toBe(true);
    expect(validSources([{ kind: "iri", value: "https://example.org/source" }])).toBe(true);
    expect(validSources([{ kind: "iri", value: "relative source" }])).toBe(false);
    expect(validSources([])).toBe(false);
    expect(validSources([], false)).toBe(true);
  });

  it("does not enable specialized edits for future profiles or malformed source IDs", () => {
    expect(supportedProfile({ id: "countries-v1", version: 1 })).toEqual({ id: "countries-v1", version: 1 });
    expect(supportedProfile({ id: "countries-v1", version: 2 })).toBeNull();
    expect(supportedProfile({ id: "government-organizations-v1", version: 1, countryProjectId: "../source" })).toBeNull();
    expect(supportedProfile({ id: "countries-v1", version: 1, futureField: true })).toBeNull();
  });
});
