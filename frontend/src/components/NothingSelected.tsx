/*
================================================================================
FILE: frontend/src/components/NothingSelected.tsx
================================================================================

SUMMARY
    The side panel's Details tab with nothing selected (edit-page-rework
    5.4): *Nothing selected*, how to select, a *This model* summary in
    counts, and **New class** (**New concept** in a taxonomy) -- the third
    place a newcomer looks for how to make something (Section 7).

BASIC IDEA
    Counts, not a list: the outline beside it is the list. They come from
    the outline's own fetch (HierarchyView's onCounts), so this costs no
    request. The button starts the one draft (5.5) and is handed to the
    store as where the creation began, so Cancel gives focus back to it.

INPUTS / INPUT SOURCES (props)
    - counts: the model's classes or concepts, relationships, attributes
      and examples; null while the outline is loading.
    - taxonomy: a taxonomy's words, and New concept.

EXPECTED OUTPUT
    - The panel's content; projectStore.startCreating on the button.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { projectStore } from "../state/projectStore";

export interface ModelCounts {
  classes: number;
  concepts: number;
  relationships: number;
  attributes: number;
  examples: number;
}

interface Props {
  counts: ModelCounts | null;
  taxonomy: boolean;
}

export default function NothingSelected({ counts, taxonomy }: Props) {
  const { t } = useI18n();
  const counted = (kind: "class" | "concept" | "relationship" | "attribute" | "example", count: number) =>
    t(`modelCount.${kind}.${count === 1 ? "one" : "many"}`, { count });
  const lines = counts
    ? taxonomy
      ? [counted("concept", counts.concepts)]
      : [
          counted("class", counts.classes),
          counted("relationship", counts.relationships),
          counted("attribute", counts.attributes),
          counted("example", counts.examples),
        ]
    : [];
  return (
    <div className="nothing-selected">
      <h2 className="side-heading">{t("emptyModel.title")}</h2>
      <p className="detail-note">
        {t(taxonomy ? "emptyModel.helpConcept" : "emptyModel.helpClass")}
      </p>
      <h3 className="side-subheading">{t("emptyModel.model")}</h3>
      {counts ? (
        <ul className="model-counts">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="detail-note">{t("emptyModel.counting")}</p>
      )}
      <button
        type="button"
        className="primary"
        // Its name for focus coming back: the form replaces this button
        // while the draft is open (projectStore's creationStart).
        data-create-from="side-panel-new"
        onClick={(e) => projectStore.startCreating(taxonomy ? "concept" : "class", { from: e.currentTarget })}
      >
        <span aria-hidden="true">+ </span>
        {t(taxonomy ? "emptyModel.newConcept" : "emptyModel.newClass")}
      </button>
    </div>
  );
}
