/*
================================================================================
FILE: frontend/src/canvas/useCanvasData.ts
================================================================================

SUMMARY
    Canvas failures retain causes and typed facts, independent of UI language.
    The modeling canvas's data (visual-modeling 5.4 to 5.6): the view fetched
    for each revision and display language, every box's position, and the
    layout saved a second after the last move. Also the shown set past 300
    boxes, and Tidy up.

BASIC IDEA
    The server's layout file is where positions live (D-087); this holds the
    browser's copy. Every fetch brings the server's layout with it, and it
    is taken as the base, with only the positions not yet saved laid over it:
    a rename moves its box's entry on the server, and a copy read once and
    kept would have lost that move and then written the stale copy back over
    it (found in review). So every box keeps where it was across a command's
    refetch, and follows its IRI across a rename. A box with no position gets
    one from layered.ts -- below its parent, or below everything -- and that
    position is saved too, so the next open draws the same diagram.

    "Not yet saved" means until the server says the save succeeded, not until
    it is sent. A box created on the canvas is saved at its drop point at
    once, and the command's refetch can read the layout before that save
    lands; the drop point was then taken for missing and the box re-placed by
    the layered layout, and that was saved instead (PR #47 review: 4 of 8
    drops on a 280-class model in Chrome). So a save records exactly what it
    sent, and a position leaves the unsaved set only when that save has
    succeeded and the box has not moved again since. A failed save keeps
    everything pending and says so. Local mode retries on the next move or flush;
    team mode requires an explicit retry.

    That alone still depended on the order responses arrive in: a refetch
    could read the file just before the save wrote it, the save's answer
    arrive first and settle the box, and the older refetch then arrive
    without it (PR #47 re-review, 4 of 10 drops). So the file carries a
    generation the server increases on every write, and this remembers the
    generation of its last successful save: a response older than that
    brings its boxes and lines, but none of its positions or shown set,
    which the browser already knows better. A rename's move is a write
    after the save, so a newer generation, and is taken as before.

    Positions of IRIs that are no longer drawn stay in the copy and in the
    file: undoing a delete then finds the box's old place. The server prunes
    them when the project is next opened.

    With a current reasoning result shown (axioms-and-reasoning 5.7) the
    view comes with its inferred *kind of* lines, which are drawn but never
    laid out by: a conclusion must not move a box the learner placed.

    Saving is debounced by a second. flush() writes what is pending now and
    waits for it: the project store awaits it before a project closes,
    because a closed project refuses the write and a move made just before
    Close was lost (PR #47 review). It never touches the model: no revision,
    no dirty flag, no undo step.

INPUTS / INPUT SOURCES
    - projectId, doc, revision, language: which view to fetch and when.
    - inferred: ask for a current reasoning result's lines and marks, with
      the imports switch the result was computed on; null for none.
    - api.ts: getCanvas, putLayout.

EXPECTED OUTPUT
    - { view, positions, error, saveError, loading, retry, move, place, show,
        hide, tidy, setViewport, flush }.
================================================================================
*/

import { useCallback, useEffect, useRef, useState } from "react";
import type { OperationFailure } from "../i18n/operationFailure";
import { makeUiMessage } from "../i18n/uiMessage";
import {expectedTeamVersions,isTeamMode} from "../team/client";
import {setLayoutDraft,type LayoutDraftOwner} from "../team/layoutDrafts";
import type {ResourceVersions} from "../team/types";
import {projectStore} from "../state/projectStore";
import { getCanvas, getLayout, putLayout } from "../api";
import type { CanvasLayout, CanvasView, ProjectDocName } from "../types";
import { layered, placeMissing, type Box, type Link, type Positions } from "./layered";

/** How long the layout waits after the last move before it is written. */
export const SAVE_DELAY_MS = 1000;

function boxes(view: CanvasView): Box[] {
  return view.nodes.map((n) => ({ iri: n.iri, label: n.label, imported: Boolean(n.imported) }));
}

function links(view: CanvasView): Link[] {
  return view.edges
    .filter((e) => (e.kind === "subClassOf" || e.kind === "broader") && !e.inferred)
    .map((e) => ({ child: e.source, parent: e.target }));
}

type CanvasFailure = OperationFailure & { token: number };

export function useCanvasData(
  projectId: string,
  doc: ProjectDocName,
  revision: number,
  language: string | null,
  inferred: { imports: boolean; token?: number } | null = null,
  refreshGeneration = 0,
) {
  // The result's token too: a new run on the same basis brings new lines.
  const inferredKey = inferred ? `on|${inferred.imports}|${inferred.token ?? 0}` : "off";
  const [view, setView] = useState<CanvasView | null>(null);
  const [error, setError] = useState<CanvasFailure | null>(null);
  const [saveError, setSaveError] = useState<CanvasFailure | null>(null);
  const failureSerial = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [readGeneration,setReadGeneration]=useState(refreshGeneration);
  const [positions, setPositions] = useState<Positions>({});
  const [shown, setShownState] = useState<string[] | null>(null);
  // The browser's copy of the layout file, and what it knows better than the
  // server: positions not yet saved, and the viewport.
  const layout = useRef<CanvasLayout | null>(null);
  const unsaved = useRef(new Set<string>());
  const viewportUnsaved = useRef(false);
  const timer = useRef<number | null>(null);
  // The save in flight, so flush() can wait for it and a second save waits
  // its turn rather than racing the first.
  const inFlight = useRef<Promise<void> | null>(null);
  // The generation of this browser's last successful write of the layout.
  const savedGeneration = useRef(0);
  const moving = useRef(false);
  const shownWriting = useRef(false);
  const readingLayout = useRef(false);
  const basis = useRef<ResourceVersions|null>(null);
  const lastFailure = useRef<unknown>(null);
  const blockedAuto = useRef(false);
  const flushRef = useRef<()=>Promise<void>>(async()=>{});
  const draftOwner = useRef<LayoutDraftOwner>({projectId,doc,
    name:projectStore.getSnapshot().project?.id===projectId?projectStore.getSnapshot().project!.name:projectId,
    retry:()=>flushRef.current(),review:versions=>{
      basis.current={...versions};blockedAuto.current=true;
      if(timer.current!==null)window.clearTimeout(timer.current);timer.current=null;
      publishDraft();
    }});
  const publishDraft = useCallback(()=>{
    const pending=moving.current||readingLayout.current||shownWriting.current||timer.current!==null||unsaved.current.size>0||viewportUnsaved.current||inFlight.current!==null;
    if(pending&&basis.current===null&&isTeamMode())basis.current=expectedTeamVersions();
    if(!pending)basis.current=null;
    setLayoutDraft(draftOwner.current,pending,lastFailure.current!==null||blockedAuto.current,inFlight.current!==null||shownWriting.current||readingLayout.current);
  },[]);
  const settle = (generation: number | undefined) => {
    if (typeof generation === "number") savedGeneration.current = Math.max(savedGeneration.current, generation);
  };

  const save = useCallback((explicit=false): Promise<void> => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const run = async () => {
      // One at a time: the file is replaced whole, so the later write must
      // be the one that lands last.
      if (inFlight.current) await inFlight.current.catch(() => undefined);
      if (blockedAuto.current && !explicit) return;
      const current = layout.current;
      if (!current || (!unsaved.current.size&&!viewportUnsaved.current)) return;
      const sent = { ...current, positions: { ...current.positions } };
      const sentIris = [...unsaved.current];
      const sentViewport = viewportUnsaved.current;
      try {
        settle((await putLayout(projectId, doc, sent, basis.current??undefined))?.generation);
        lastFailure.current=null;blockedAuto.current=false;
        if(isTeamMode())basis.current=expectedTeamVersions();
      } catch (e) {
        lastFailure.current=e;
        if(isTeamMode()){
          blockedAuto.current=true;
          if(timer.current!==null)window.clearTimeout(timer.current);
          timer.current=null;
        }
        setSaveError({ cause: e, message: makeUiMessage("canvasUI.layoutFailed"), token: ++failureSerial.current });
        return;
      }
      setSaveError(null);
      // Settled only if nothing moved it again while the save was out.
      for (const iri of sentIris) {
        const now = layout.current?.positions[iri];
        const then = sent.positions[iri];
        if (now && then && now[0] === then[0] && now[1] === then[1]) unsaved.current.delete(iri);
      }
      if (sentViewport && layout.current?.viewport === sent.viewport) viewportUnsaved.current = false;
      if(isTeamMode()&&!moving.current&&timer.current===null&&(unsaved.current.size>0||viewportUnsaved.current))
        timer.current=window.setTimeout(()=>void save(),SAVE_DELAY_MS);
    };
    const promise = run();
    inFlight.current = promise;
    publishDraft();
    void promise.finally(() => {
      if (inFlight.current === promise) inFlight.current = null;
      publishDraft();
    });
    return promise;
  }, [projectId, doc, publishDraft]);

  const scheduleSave = useCallback(() => {
    if(blockedAuto.current||readingLayout.current){publishDraft();return;}
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
    publishDraft();
  }, [save,publishDraft]);

  /** Write what is pending now, and wait for it (and for any save already
   *  out). Team failures retain their owner and reject so Close stays put;
   *  local mode keeps its historical best-effort behavior. */
  const flush = useCallback(async (): Promise<void> => {
    moving.current=false;
    if(timer.current!==null)window.clearTimeout(timer.current);
    timer.current=null;publishDraft();
    if(inFlight.current){
      await inFlight.current.catch(()=>undefined);
      if(isTeamMode()&&lastFailure.current)throw lastFailure.current;
    }
    const pending=unsaved.current.size>0||viewportUnsaved.current;
    if(isTeamMode()&&layout.current&&(pending||shownWriting.current)){
      // Explicit retry reads the current file, retaining only this owner's
      // unsaved positions/viewport. Its separately retained CAS basis stays
      // unchanged, so a newer server read cannot silently approve a write.
      readingLayout.current=true;publishDraft();
      try{
        const fresh=await getLayout(projectId,doc);
        const local=layout.current;const positions={...fresh.positions};
        for(const iri of unsaved.current)if(local.positions[iri])positions[iri]=local.positions[iri];
        layout.current={version:fresh.version,generation:fresh.generation,positions,shown:fresh.shown,
          viewport:viewportUnsaved.current?local.viewport:fresh.viewport};
        setPositions({...positions});setShownState(fresh.shown);
      }catch(error){
        lastFailure.current=error;blockedAuto.current=true;
        setSaveError({cause:error,message:makeUiMessage("canvasUI.layoutFailed"),token:++failureSerial.current});
        throw error;
      }finally{readingLayout.current=false;publishDraft();}
    }
    if(pending)await save(true);
    if(isTeamMode()&&lastFailure.current)throw lastFailure.current;
  },[save,publishDraft,projectId,doc]);
  flushRef.current=flush;

  // Leaving the canvas writes what is pending rather than dropping it.
  useEffect(() => () => {
    moving.current=false;
    if (timer.current !== null) void save();
    else publishDraft();
  }, [save,publishDraft]);

  useEffect(() => {
    layout.current = null;
    unsaved.current = new Set();
    viewportUnsaved.current = false;
    savedGeneration.current = 0;
  }, [projectId, doc]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getCanvas(projectId, doc, inferred ? { imports: inferred.imports } : null, language ?? "")
      .then((fetched) => {
        if (cancelled) return;
        const local = layout.current;
        // Read before a save this browser has seen succeed: its boxes and
        // lines are current, its positions are not.
        const stale = local !== null && fetched.layout.generation < savedGeneration.current;
        const current: CanvasLayout = stale
          ? { ...local, positions: { ...local.positions } }
          : { ...fetched.layout, positions: { ...fetched.layout.positions } };
        if (local && !stale) {
          for (const iri of unsaved.current) {
            if (local.positions[iri]) current.positions[iri] = local.positions[iri];
          }
          if (viewportUnsaved.current) current.viewport = local.viewport;
        }
        layout.current = current;
        const placed = placeMissing(boxes(fetched), links(fetched), current.positions);
        const added = Object.keys(placed).filter((iri) => !current.positions[iri]);
        for (const iri of added) unsaved.current.add(iri);
        // Keep positions of boxes not drawn now: an undone delete returns.
        current.positions = { ...current.positions, ...placed };
        setPositions({ ...current.positions });
        setShownState(current.shown);
        setView(fetched);setReadGeneration(refreshGeneration);
        if (added.length) scheduleSave();
      })
      .catch((e: unknown) => !cancelled && setError({ cause: e, token: ++failureSerial.current }));
    return () => {
      cancelled = true;
    };
    // `inferred` is read through its key, so a new object for the same
    // switch does not refetch.
  }, [projectId, doc, revision, language, attempt, scheduleSave, inferredKey,refreshGeneration]);

  /** A box moved by drag or arrow key. */
  const move = useCallback(
    (iri: string, at: [number, number]) => {
      if (!layout.current) return;
      const before=layout.current.positions[iri];
      if(before&&before[0]===at[0]&&before[1]===at[1]){moving.current=false;publishDraft();return;}
      layout.current.positions = { ...layout.current.positions, [iri]: at };
      unsaved.current.add(iri);
      moving.current=false;
      setPositions({ ...layout.current.positions });
      scheduleSave();
    },
    [scheduleSave,publishDraft],
  );

  /** A box made on the canvas goes where it was dropped, and stays there
   *  through the command's refetch until the save has landed. */
  const place = useCallback(
    (iri: string, at: [number, number]) => {
      if (!layout.current) return;
      layout.current.positions = { ...layout.current.positions, [iri]: at };
      unsaved.current.add(iri);
      moving.current=false;
      setPositions({ ...layout.current.positions });
      void save();
    },
    [save],
  );

  /** Show on canvas / Hide from canvas (5.6): written at once, then refetched,
   *  because the server decides what the shown set brings with it. A failed
   *  write leaves the set as it was and says so; it never rejects. */
  const setShown = useCallback(
    async (next: string[]) => {
      let current = layout.current;
      if (!current) return;
      const before = current.shown;
      shownWriting.current=true;publishDraft();
      try {
        await flush();
        current=layout.current??current;
        settle((await putLayout(projectId, doc, { ...current, positions: { ...current.positions }, shown: next },basis.current??undefined))?.generation);
      } catch (e) {
        current.shown = before;
        setShownState(before);
        setSaveError({ cause: e, message: makeUiMessage("canvasUI.shownFailed"), token: ++failureSerial.current });
        shownWriting.current=false;publishDraft();
        return;
      }
      current.shown = next;
      setShownState(next);
      setSaveError(null);
      setAttempt((a) => a + 1);
      shownWriting.current=false;publishDraft();
    },
    [projectId, doc, flush,publishDraft],
  );
  const show = useCallback(
    (iri: string) => {
      const list = layout.current?.shown ?? [];
      return list.includes(iri) ? Promise.resolve() : setShown([...list, iri]);
    },
    [setShown],
  );
  const hide = useCallback(
    (iri: string) => setShown((layout.current?.shown ?? []).filter((i) => i !== iri)),
    [setShown],
  );

  /** Tidy up: every box through the layered layout again, and saved. */
  const tidy = useCallback(() => {
    if (!view || !layout.current) return;
    const fresh = layered(boxes(view), links(view));
    layout.current.positions = { ...layout.current.positions, ...fresh };
    for (const iri of Object.keys(fresh)) unsaved.current.add(iri);
    setPositions({ ...layout.current.positions });
    void save();
  }, [view, save]);

  const setViewport = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (!layout.current) return;
      moving.current=false;
      const previous=layout.current.viewport;
      if(previous&&previous.x===viewport.x&&previous.y===viewport.y&&previous.zoom===viewport.zoom){publishDraft();return;}
      layout.current.viewport = viewport;
      viewportUnsaved.current = true;
      scheduleSave();
    },
    [scheduleSave,publishDraft],
  );

  return {
    view,
    positions,
    readGeneration,
    beginMove:()=>{moving.current=true;publishDraft();},
    error,
    saveError,
    loading: view === null && error === null,
    savedViewport: layout.current?.viewport ?? null,
    shown,
    retry: () => setAttempt((a) => a + 1),
    move,
    place,
    show,
    hide,
    tidy,
    setViewport,
    flush,
  };
}
