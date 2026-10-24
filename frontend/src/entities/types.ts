/*
================================================================================
FILE: frontend/src/entities/types.ts
SUMMARY
    Wire contracts for complete dictionary list and search match explanations.
BASIC IDEA
    Preserve server snake_case and its opaque revision, separate from the
    numeric project revision. Display truncation never shortens an identifier.
INPUTS / INPUT SOURCES
    The /entities endpoint and optional /search match metadata.
EXPECTED OUTPUT
    Typed pages, filters and safe display limits for list consumers.
================================================================================
*/
export type EntityKindGroup = "all" | "concept" | "individual" | "class" | "properties" | "other";
export type EntityMatchReason = "name" | "alias" | "reading" | "search" | "identifier";
export interface EntityMatchWire { reason: EntityMatchReason; value: string; truncated: boolean }
export interface EntityItem {
  iri: string;
  label: string;
  kind: string;
  description: string | null;
  match: EntityMatchWire | null;
  label_language: string | null;
  label_fallback: boolean;
  label_truncated: boolean;
  reference_only: boolean;
}
export interface EntityPage {
  items: EntityItem[];
  total: number;
  offset: number;
  limit: number;
  revision: string;
}
export interface EntityParams {
  q?: string;
  kind?: EntityKindGroup;
  lang?: string;
  imports?: boolean;
  offset?: number;
  limit?: number;
  sort?: "label" | "iri";
}
