/*
================================================================================
FILE: frontend/src/entities/useEntitySearch.ts
SUMMARY
    Shared, composition-aware candidate search for dictionary comboboxes.
BASIC IDEA
    Debounce eligible input and scope answers to the complete view identity.
    Aborting saves work; cleanup and keyed projection prevent stale selection.
INPUTS / INPUT SOURCES
    Dictionary, language, view generations, query and composition state.
EXPECTED OUTPUT
    At most 25 current candidates, overflow and explicit pending/error state.
================================================================================
*/
import { useEffect, useState } from "react";
import { searchNodes } from "../api";
import type { SearchKind, VizNode } from "../types";
export interface EntitySearchParams {
  ontologyId: string | null;
  language?: string;
  imports: boolean;
  revision?: number;
  viewGeneration?: string;
  query: string;
  composing: boolean;
  kind?: SearchKind;
}
interface SearchState { key: string; results: VizNode[]; loading: boolean; error: unknown; more: boolean }
export const SHOWN_RESULTS = 25;
export function useEntitySearch({ ontologyId, language, imports, revision = 0, viewGeneration = "", query, composing, kind }: EntitySearchParams) {
  const q = query.trim();
  const eligible = !!ontologyId && !!q && !composing;
  const key = JSON.stringify([ontologyId, language, imports, revision, viewGeneration, q, composing, kind]);
  const [state, setState] = useState<SearchState>({ key: "", results: [], loading: false, error: null, more: false });
  useEffect(() => {
    if (!eligible || !ontologyId) return;
    let cancelled = false;
    const controller = new AbortController();
    setState({ key, results: [], loading: true, error: null, more: false });
    const timer = window.setTimeout(() => {
      searchNodes(ontologyId, q, imports, kind, controller.signal, SHOWN_RESULTS + 1, language).then(found => {
        if (!cancelled) setState({ key, results: found.slice(0, SHOWN_RESULTS), loading: false, error: null, more: found.length > SHOWN_RESULTS });
      }).catch((error: unknown) => {
        if (!cancelled) setState({ key, results: [], loading: false, error, more: false });
      });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); controller.abort(); };
  }, [key, eligible, ontologyId, q, imports, kind, language]);
  // The effect runs after render; without this projection an old option could
  // still be picked during that render even though its request was cancelled.
  return eligible && state.key === key ? state : { results: [], loading: eligible, error: null, more: false };
}
