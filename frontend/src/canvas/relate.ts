/*
================================================================================
FILE: frontend/src/canvas/relate.ts
================================================================================

SUMMARY
    What a line drawn between two boxes may mean (visual-modeling 5.4,
    Relating): the choices the relate menu offers, the notes it shows, or the
    sentence that refuses the line. Also the aria name a box is given, the
    tree's words read aloud (*Invoice, class, kind of Document, 2
    subclasses*).

BASIC IDEA
    A rule, so it lives outside the component and is tested without drawing
    anything (CLAUDE.md's split for anything with a rule in it).

    Class to class offers *is a kind of*, *new relationship…*, and any
    existing relationship the line would complete rather than change: one
    with no domain and no range, or with one end already this line's. One
    already linking other classes is never offered, because SetDomain would
    silently change what it means elsewhere; the menu says so instead.
    Concept to concept offers *narrower than* and *related to* (relationships
    5.8), each only where the server would accept it: not when the target is
    already narrower than the source, directly or through others, and not
    *narrower than* between two related concepts. A class and a concept cannot be
    linked here at all. Class to class also offers *a rule* (axioms 5.9),
    which opens the sentence builder in the form with both classes filled
    in. A line that would change an imported box is refused
    with a sentence. A link that already exists is not offered again.

    A relationship that already ends at the line's end, from another class,
    is offered to share (attribute-reuse 5.1): the reuse plan for it and
    the line's start, opened in the start's form. A relationship whose
    start is several classes is never offered to complete, since setting
    its start would replace them all.

    Each choice is labelled by the sentence it would make (relationships
    5.3): *Person is a kind of Organization*, so a wrong direction is seen
    before it is confirmed, and the menu can be asked again the other way
    round. A class may be linked to itself by a relationship (*Person knows
    Person*), never by *is a kind of*; a concept never to itself.

    The project's kind decides which boxes the canvas may link (D-089): an
    ontology's concepts, and a taxonomy's classes, are drawn but read-only
    here, and a line from one says where to change them instead.

INPUTS / INPUT SOURCES
    - The canvas view from the server: its kind, boxes, lines and undrawn
      relationships.

EXPECTED OUTPUT
    - relateChoices(view, from, to) -> { refusal } or { choices, notes }.
    - boxName(view, iri) -> the box's accessible name.
================================================================================
*/

import { translate } from "../i18n/format";
import type { Translator, UiLocale } from "../i18n/types";
import { moreRulesText } from "../modeling/ruleSentences";
import { article, existingSentence, linkSentence, shareEntry } from "../modeling/sentences";
import type { CanvasNode, CanvasView } from "../types";
import { kindWord } from "./kindColours";

export type RelateChoice =
  | { kind: "subClassOf"; label: string }
  | { kind: "broader"; label: string }
  | { kind: "related"; label: string }
  | { kind: "newRelationship"; label: string }
  // A rule (axioms 5.9): opens the from class's sentence builder with the
  // to class at the other end.
  | { kind: "rule"; label: string }
  | {
      kind: "existing";
      label: string;
      // The relationship's own name; `label` is the sentence it would make.
      name: string;
      property: string;
      // Which ends the command must set: the one it lacks, or both.
      setDomain: boolean;
      setRange: boolean;
    }
  // A relationship that already ends at this line's end, from another
  // class (attribute-reuse 5.1): the reuse plan for it and this line's
  // start, in the start's form.
  | { kind: "share"; label: string; name: string; property: string };

export type RelateResult =
  | { refusal: string }
  | { choices: RelateChoice[]; notes: string[] };

const tFor = (locale: UiLocale): Translator => ((code, args) => translate(locale, code, args)) as Translator;

function node(view: CanvasView, iri: string): CanvasNode | undefined {
  return view.nodes.find((n) => n.iri === iri);
}

/** Why a box of the other kind is not linked here, or null (D-089). */
export function otherKindRefusal(view: CanvasView, box: CanvasNode, locale: UiLocale = "en"): string | null {
  const t = tFor(locale);
  if (view.kind === "ontology" && box.kind === "concept") {
    return t("canvasRelate.otherConcept", { name: box.label });
  }
  if (view.kind === "taxonomy" && box.kind === "class") {
    return t("canvasRelate.otherClass", { name: box.label });
  }
  return null;
}

export function relateChoices(view: CanvasView, fromIri: string, toIri: string, locale: UiLocale = "en"): RelateResult {
  const t = tFor(locale);
  const from = node(view, fromIri);
  const to = node(view, toIri);
  if (!from || !to) return { refusal: t("canvasRelate.noEnds") };
  if (from.kind !== to.kind) return { refusal: t("canvasRelate.mixed") };
  const otherKind = otherKindRefusal(view, from, locale) ?? otherKindRefusal(view, to, locale);
  if (otherKind) return { refusal: otherKind };
  const self = from.iri === to.iri;
  if (self && from.kind === "concept") return { refusal: t("canvasRelate.self", { name: from.label }) };
  if (from.imported) {
    return {
      refusal: t("canvasRelate.imported", { name: from.label, source: from.imported === "outside" ? t("canvasKind.outside") : from.imported }),
    };
  }
  const has = (kind: string) =>
    view.edges.some((e) => e.kind === kind && e.source === from.iri && e.target === to.iri);

  if (from.kind === "concept") {
    // Narrower than, and related to (5.8), offered only where the server
    // would accept them (the analyst's review of PR #49): what the drawn
    // lines already say decides, through other concepts as well.
    const related = view.edges.some(
      (e) => e.kind === "related" && ((e.source === from.iri && e.target === to.iri) || (e.source === to.iri && e.target === from.iri)),
    );
    if (has("broader")) return { refusal: t("canvasRelate.alreadyNarrower", { from: from.label, to: to.label }) };
    // The target already under the source: *narrower than* would make a
    // loop, and SKOS keeps *related* apart from the hierarchy.
    if (narrowerThan(view, to.iri, from.iri)) return { refusal: t("canvasRelate.alreadyNarrower", { from: to.label, to: from.label }) };
    const choices: RelateChoice[] = [];
    // Two related concepts cannot be put one under the other (5.9).
    if (!related) choices.push({ kind: "broader", label: linkSentence("broader", from.label, to.label, t) });
    // The source already under the target, through others: related refused.
    if (!related && !narrowerThan(view, from.iri, to.iri)) {
      choices.push({ kind: "related", label: linkSentence("related", from.label, to.label, t) });
    }
    if (choices.length === 0) {
      return {
        refusal: t("canvasRelate.relatedRefusal", { from: from.label, to: to.label }),
      };
    }
    return { choices, notes: [] };
  }

  const choices: RelateChoice[] = [];
  // A class is never a kind of itself; a relationship to itself is fine.
  if (!self && !has("subClassOf")) {
    choices.push({ kind: "subClassOf", label: linkSentence("subClassOf", from.label, to.label, t) });
  }
  choices.push({ kind: "newRelationship", label: t("canvasRelate.new") });
  choices.push({ kind: "rule", label: t("canvasRelate.rule", { name: from.label }) });
  for (const u of view.undrawn) {
    // An end that is an expression is set, not missing: completing it would
    // replace what it says.
    if (u.kind !== "objectProperty" || u.missing === "expression") continue;
    // A start of several classes is set, not missing: SetEnds would replace
    // every one of them (attribute-reuse 5.3).
    if (u.domains && !u.domains.includes(from.iri)) continue;
    const domainFits = u.domains !== undefined || u.domain === null || u.domain === from.iri;
    const rangeFits = u.range === null || u.range === to.iri;
    if (!domainFits || !rangeFits) continue;
    choices.push({
      kind: "existing",
      label: existingSentence(from.label, u.label, to.label, locale),
      name: u.label,
      property: u.iri,
      setDomain: u.domain === null && u.domains === undefined,
      setRange: u.range === null,
    });
  }
  // Share a relationship that ends here already, from another class (5.1):
  // *Share reportsTo: a Contractor reportsTo a Manager too.* Not one that
  // already starts at this box, which the line would not change.
  const offered = new Set<string>();
  const startsHere = new Set(
    view.edges.filter((e) => e.kind === "relationship" && e.source === from.iri).map((e) => e.property),
  );
  for (const e of view.edges) {
    if (e.kind !== "relationship" || e.target !== to.iri || e.source === from.iri || !e.property) continue;
    if (offered.has(e.property) || startsHere.has(e.property)) continue;
    offered.add(e.property);
    choices.push({ kind: "share", label: shareEntry(e.label ?? e.property, from.label, to.label, locale), name: e.label ?? e.property, property: e.property });
  }
  // Drawn relationships sharing an end with this line are not offered, and
  // the menu says why, so the learner does not look for them in vain. A
  // loop shares both ends with every relationship on its box, and none of
  // them could be completed by it, so it lists none (5.10 item 4).
  const notes = self ? [] : view.edges
    .filter(
      (e) =>
        e.kind === "relationship" &&
        // One ending here is offered to share instead (5.1).
        e.source === from.iri &&
        e.target !== to.iri,
    )
    .slice(0, 3)
    .map((e) => {
      const a = node(view, e.source)?.label ?? e.source;
      const b = node(view, e.target)?.label ?? e.target;
      return t("canvasRelate.used", { property: String(e.label), from: a, to: b });
    });
  return { choices, notes };
}

/** `low` is under `high` by the drawn narrower-than lines, directly or
 *  through other concepts. Each concept is visited once, so a loop already
 *  in the data ends the walk. */
function narrowerThan(view: CanvasView, low: string, high: string): boolean {
  const seen = new Set<string>();
  const queue = [low];
  while (queue.length) {
    const at = queue.pop()!;
    for (const e of view.edges) {
      if (e.kind !== "broader" || e.source !== at || seen.has(e.target)) continue;
      if (e.target === high) return true;
      seen.add(e.target);
      queue.push(e.target);
    }
  }
  return false;
}

/** A box read aloud as the tree reads a row. */
export function boxName(view: CanvasView, iri: string, locale: UiLocale = "en"): string {
  const n = node(view, iri);
  if (!n) return iri;
  const t = tFor(locale);
  const parts = [n.label, n.imported ? t(`canvasBox.${n.kind}`) : kindWord(n, locale)];
  const up = n.kind === "class" ? "subClassOf" : "broader";
  const parents = view.edges.filter((e) => e.kind === up && e.source === iri).map((e) => node(view, e.target)?.label);
  if (parents.length) parts.push(t(`canvasBox.parents.${n.kind}`, { parents: parents.join(t("canvasBox.join")) }));
  const children = view.edges.filter((e) => e.kind === up && e.target === iri).length;
  if (children) parts.push(t(`canvasBox.children.${n.kind}.${children === 1 ? "one" : "many"}`, { count: children }));
  if (n.imported) parts.push(n.imported === "outside" ? t("canvasBox.outsideReadonly") : t("canvasBox.importedReadonly", { name: n.imported }));
  for (const d of n.disjoint ?? []) parts.push(t("canvasBox.never", { name: locale === "en" ? `${article(d.label)} ${d.label}` : d.label }));
  if (n.moreRules) parts.push(moreRulesText(n.moreRules, locale));
  return parts.join(t("canvasBox.separator"));
}
