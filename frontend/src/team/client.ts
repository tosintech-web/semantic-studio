/*
================================================================================
FILE: frontend/src/team/client.ts
SUMMARY
    Central team request identity, expected versions and refusal notifications.
BASIC IDEA
    Keep team identity and retained input ownership independent of UI language.
INPUTS / INPUT SOURCES
    Typed server responses and explicit user actions.
EXPECTED OUTPUT
    Accessible team controls and version-aware requests without automatic replay.
================================================================================
*/
import type { AuthStatus, ResourceVersions, TeamEvent } from "./types";
let status: AuthStatus = {mode:"local", authenticated:false, user:null, csrf:null};
let versions: ResourceVersions = {};
let authEpoch = 0;
export function teamAuthEpoch():number { return authEpoch; }
const listeners = new Set<(event: TeamEvent) => void>();
export function isTeamMode(): boolean { return status.mode === "team"; }
export function configureTeam(next: AuthStatus) {
  if(next.mode!==status.mode||next.authenticated!==status.authenticated||next.csrf!==status.csrf||next.user?.sub!==status.user?.sub)authEpoch++;
  if (next.mode === "local") versions = {};
  status = next;
}
export function acceptTeamVersions(next: ResourceVersions) { versions = {...next}; }
export function expectedTeamVersions(): ResourceVersions { return {...versions}; }
export function subscribeTeam(listener: (event: TeamEvent) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function emit(event: TeamEvent) { for (const listener of listeners) listener(event); }
/** HTTP field values are ByteStrings; JSON escapes keep resource keys exact. */
export function encodeTeamVersions(value:ResourceVersions):string{
 return JSON.stringify(value).replace(/[\u007f-\uffff]/g,char=>"\\u"+char.charCodeAt(0).toString(16).padStart(4,"0"));
}
export function teamRequest(init?: RequestInit): RequestInit | undefined {
  if (status.mode !== "team") return init;
  const headers = new Headers(init?.headers);
  if (status.csrf) headers.set("X-Semantic-Studio-Csrf", status.csrf);
  if (!["GET", "HEAD", "OPTIONS"].includes((init?.method ?? "GET").toUpperCase())) {
    headers.set("X-Semantic-Studio-Request-Id", crypto.randomUUID());
    // Administration reads carry per-user expectations independent of the
    // graph baseline; these remain the exact versions the member form read.
    let explicit:ResourceVersions={};
    try{explicit=JSON.parse(headers.get("X-Semantic-Studio-Versions")??"{}");}catch{/* Retain the safe central baseline. */}
    headers.set("X-Semantic-Studio-Versions", encodeTeamVersions({workspace:null,...versions,...explicit}));
  }
  return {...init, headers};
}
export async function observeTeamResponse(response: Response, advance = true, epoch = authEpoch): Promise<void> {
  if (status.mode !== "team" || epoch !== authEpoch) return;
  if (response.status === 401) { emit({kind:"expired"}); return; }
  if (response.status === 409 || response.status === 428) {
    try {
      const body = await response.clone().json();
      if(epoch!==authEpoch)return;
      const detail = body.detail ?? body;
      const code = detail.code ?? body.code;
      if (["revision_conflict", "version_required", "missing_expectation", "request_mismatch", "undo_forbidden"].includes(code))
        emit({kind:"conflict",versions: detail.currentVersions ?? body.currentVersions ?? {}});
    } catch { /* Preserve the original response for the shared error boundary. */ }
    return;
  }
  // Mutation success owns a new baseline; polling is deliberately excluded.
  const raw = response.headers.get("X-Semantic-Studio-Versions");
  if (response.ok && raw && advance) {
    try {
      const next:ResourceVersions=JSON.parse(raw);
      const currentGeneration=versions.workspace??-1;
      const nextGeneration=next.workspace??-1;
      if(nextGeneration>=currentGeneration)versions=next;
    } catch { /* A malformed hint cannot authorize a write. */ }
  }
}

/** Computations carry CSRF but cannot advance another form's read baseline. */
export function isSharedTeamWrite(url: string, init?: RequestInit): boolean {
  const method=(init?.method??"GET").toUpperCase();
  if (["GET","HEAD","OPTIONS"].includes(method)) return false;
  const path=url.split("?")[0];
  if (/^\/api\/auth\//.test(path)) return false;
  if (/^\/api\/team\/users(?:\/[^/]+)?$/.test(path)) return false;
  if (/^\/api\/ontologies\/[^/]+\/(nodes|sparql)$/.test(path)) return false;
  if (/^\/api\/projects\/[^/]+\/(open|close|validate|reasoning|release-preview)$/.test(path)) return false;
  if (/^\/api\/projects\/[^/]+\/data\/(inspect|preview)$/.test(path)) return false;
  if (/^\/api\/ontologies\/loads\/[^/]+\/cancel$/.test(path)) return false;
  return true;
}
