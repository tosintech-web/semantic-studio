/*
================================================================================
FILE: frontend/src/entities/useEntityPage.ts
SUMMARY
    Current dictionary page with bounded revision-token recovery.
BASIC IDEA
    Reset position on any view/filter change and scope all async state to its
    request. A changed token on a later page restarts once at zero; repeated
    movement asks the user to retry instead of polling indefinitely.
INPUTS / INPUT SOURCES
    Dictionary view identity, filter and sort; getEntities responses.
EXPECTED OUTPUT
    One consistent page, current loading/error state and paging/retry controls.
================================================================================
*/
import { useCallback, useEffect, useRef, useState } from "react";
import { getEntities } from "../api";
import type { EntityKindGroup, EntityPage } from "./types";
export interface EntityPageOptions {
  ontologyId: string; language: string; imports: boolean; revision: number; viewGeneration: string;
  q: string; kind: EntityKindGroup; sort: "label" | "iri";
}
interface PageState { key: string; page: EntityPage | null; loading: boolean; error: unknown; updating: boolean }
export function useEntityPage(options: EntityPageOptions) {
  const { ontologyId, language, imports, revision, viewGeneration, q, kind, sort } = options;
  const scope = JSON.stringify([ontologyId, language, imports, revision, viewGeneration, q, kind, sort]);
  const [position, setPosition] = useState({ scope, offset: 0 });
  const offset = position.scope === scope ? position.offset : 0;
  if (position.scope !== scope) setPosition({ scope, offset: 0 });
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([scope, offset, nonce]);
  const [state, setState] = useState<PageState>({ key: "", page: null, loading: true, error: null, updating: false });
  const token = useRef<{ scope: string; value: string; expected?: string } | null>(null);
  const setOffset = useCallback((value: number) => {
    if (token.current?.scope === scope) delete token.current.expected;
    setPosition({ scope, offset: Math.max(0, Math.floor(value / 50) * 50) });
  }, [scope]);
  const reload = useCallback(() => { token.current = null; setPosition({ scope, offset: 0 }); setNonce(n => n + 1); }, [scope]);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ key, page: null, loading: true, error: null, updating: false });
    getEntities(ontologyId, { q, kind, sort, imports, lang: language, offset, limit: 50 }, controller.signal).then(page => {
      if (cancelled) return;
      const previous = token.current?.scope === scope ? token.current : null;
      if (previous?.expected !== undefined && previous.expected !== page.revision) {
        setState({ key, page: null, loading: false, error: null, updating: true }); return;
      }
      if (previous && previous.expected === undefined && previous.value !== page.revision && offset > 0) {
        previous.expected = page.revision;
        setPosition({ scope, offset: 0 }); return;
      }
      token.current = { scope, value: page.revision };
      setState({ key, page, loading: false, error: null, updating: false });
    }).catch((error: unknown) => { if (!cancelled) setState({ key, page: null, loading: false, error, updating: false }); });
    return () => { cancelled = true; controller.abort(); };
  }, [key, scope, ontologyId, q, kind, sort, imports, language, offset]);
  return { ...(state.key === key ? state : { page: null, loading: true, error: null, updating: false }), offset, setOffset, reload };
}
