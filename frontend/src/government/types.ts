/*
================================================================================
FILE: frontend/src/government/types.ts
SUMMARY
    Government authoring profiles and temporal record wire types.
BASIC IDEA
    Keep stable RDF identities and explicit unknown dates separate from labels.
INPUTS / INPUT SOURCES
    Accepted project metadata and government API payloads.
EXPECTED OUTPUT
    Shared types for domain forms, reference selection and dated views.
================================================================================
*/
export interface DomainProfile {
  id: "countries-v1" | "government-organizations-v1";
  version: 1;
  countryProjectId?: string;
}

/** Unknown future profiles survive reads without enabling v1 tools. */
export interface StoredDomainProfile {
  id: string;
  version: number;
  countryProjectId?: string;
  [key: string]: unknown;
}

export interface Bound { date: string | null; open: boolean }
export interface Period { start: Bound; end: Bound }
export interface Source { kind: "iri" | "text"; value: string }
export interface ReferenceBasis { sourceProjectId: string; sourceToken: string }
export interface CountryChoice { iri: string; label: string; code: string | null }
export interface Page<T> { items: T[]; total: number; offset: number; limit: number }
export interface RelationInput {
  iri?: string;
  subject: string;
  predicate: string;
  object: string;
  period: Period;
  sources: Source[];
  description: string;
}
export interface NameInput {
  iri?: string;
  entity: string;
  value: string;
  language: string;
  period: Period;
  sources: Source[];
}

