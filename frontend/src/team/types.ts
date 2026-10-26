/*
================================================================================
FILE: frontend/src/team/types.ts
SUMMARY
    Wire contracts for team authentication, versioning and history.
BASIC IDEA
    Keep team identity and retained input ownership independent of UI language.
INPUTS / INPUT SOURCES
    Typed server responses and explicit user actions.
EXPECTED OUTPUT
    Accessible team controls and version-aware requests without automatic replay.
================================================================================
*/
export type Role = "viewer" | "editor" | "admin";
export interface TeamUser { sub: string; email: string; role: Role; disabled: boolean; version: number }
export interface AuthStatus { mode: "local" | "team"; authenticated: boolean; user: TeamUser | null; csrf: string | null }
export type ResourceVersions = Record<string, number | null>;
export interface HistoryEntry { actor: string; operation: string; timestamp?: string; created_at?: string; diff?: {before:unknown;after:unknown}; before_version?: number; after_version?: number }
export type TeamEvent = {kind: "expired"} | {kind: "conflict"; versions: ResourceVersions};
