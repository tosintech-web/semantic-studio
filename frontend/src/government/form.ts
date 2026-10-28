/*
================================================================================
FILE: frontend/src/government/form.ts
SUMMARY
    Pure government input checks, supported profiles and date defaults.
BASIC IDEA
    Keep unknown boundaries and immutable identities independent of translated
    labels. Calendar checks match the server's day precision without guessing.
INPUTS / INPUT SOURCES
    Name/source/period drafts and stored project profiles.
EXPECTED OUTPUT
    Validation decisions and fresh, explicitly unknown period values.
================================================================================
*/
import { validLanguageTag } from "../projects/form";
import type { DomainProfile, Period, Source, StoredDomainProfile } from "./types";

export interface NameDraft { value: string; language: string }

export function unknownPeriod(): Period {
  return { start: { date: null, open: false }, end: { date: null, open: false } };
}

export function validPeriod(period: Period): boolean {
  for (const bound of [period.start, period.end]) {
    if (typeof bound.open !== "boolean") return false;
    if (bound.date !== null) {
      if (bound.open || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(bound.date) || bound.date.startsWith("0000")) return false;
      const day = new Date(`${bound.date}T00:00:00Z`);
      if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== bound.date) return false;
    }
  }
  return !(period.start.date && period.end.date && period.start.date >= period.end.date);
}

export function validNames(names: NameDraft[], unique = true): boolean {
  if (!names.length || names.length > 100) return false;
  const languages = new Set<string>();
  for (const name of names) {
    const language = name.language.toLowerCase();
    if (!name.value.trim() || name.value.length > 4096 || !validLanguageTag(name.language) || (unique && languages.has(language))) return false;
    languages.add(language);
  }
  return true;
}

export function validSources(sources: Source[], required = true): boolean {
  if ((required && !sources.length) || sources.length > 100) return false;
  return sources.every(source => source.value.trim() && source.value.length <= 4096 && (source.kind === "text" ||
    (source.kind === "iri" && /^[A-Za-z][A-Za-z0-9+.-]*:/.test(source.value) && !/[<>"{}|^`\\\x00-\x20]/.test(source.value))));
}

export function supportedProfile(raw: StoredDomainProfile | undefined): DomainProfile | null {
  if (!raw || raw.version !== 1 || !["countries-v1", "government-organizations-v1"].includes(raw.id)
    || Object.keys(raw).some(key => !["id", "version", "countryProjectId"].includes(key))) return null;
  if (raw.countryProjectId !== undefined && (raw.id !== "government-organizations-v1" || !/^prj-[0-9a-f]{12}$/.test(raw.countryProjectId))) return null;
  return raw as DomainProfile;
}

export function localToday(now = new Date()): string {
  return `${now.getFullYear().toString().padStart(4, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
}
