/*
================================================================================
FILE: frontend/src/components/DeleteDialog.tsx
================================================================================

SUMMARY
    Delete with its impact first (visual-modeling 5.3): the tree's "Delete…",
    the form's "Delete" and the canvas's Delete key all open this. It asks the
    server what the delete would take, says so in sentences, offers what to do
    with the children when there are any, and deletes only on confirmation.

BASIC IDEA
    Whole UI templates describe the impact and choices in the active locale.
    The impact and selected strategy survive language changes without another
    dry run. Preview errors retain original error objects and labelled details;
    command errors use the shared runner. Undo availability retains operation
    metadata and renders in the current language after the dialog closes.

    DeleteEntity has a dry run (authoring-foundations 5.5) that changes
    nothing and returns the impact: the statements removed, the children and
    the parents they would move up to, the properties whose domain or range
    is the entity, the individuals typed with it, and the mentions in
    read-only imports. This renders that inside the existing ConfirmDialog,
    so the keyboard behaviour is the one every other question already has.

    The strategy question appears only when there are children: with none,
    reparent and orphan do the same thing and asking would be noise. The
    words follow 5.3 exactly (5.8 item 7): an object property is a
    *relationship* and a datatype property an *attribute*, and one child is
    *it* where two are *them*.

    The command goes through the caller's runner, so the section that opened
    the dialog shows it busy (5.8 item 1). If the dry run cannot run at all,
    the dialog says so and offers only Cancel, rather than waiting for ever
    (item 8).

    The announcement after the delete is the spec's sentence, "Deleted class
    Invoice. Undo is available.", rather than the usual status, because the
    thing a learner most needs to hear after a delete is that it can be taken
    back.

INPUTS / INPUT SOURCES (props)
    - iri, label: what to delete.
    - runner: the section's command runner.
    - onDone(deleted): closes the dialog; `deleted` says whether it happened.
    Plus the project store (the open project and document) and api.ts.

EXPECTED OUTPUT
    - The dialog; one DeleteEntity command on confirmation.
================================================================================
*/

import { undoAvailableNotice } from "../modeling/projectNotices";
import { useI18n } from "../i18n/I18nProvider";
import type { Translator } from "../i18n/types";
import { useEffect, useState } from "react";
import { previewDelete } from "../api";
import { projectStore } from "../state/projectStore";
import type { DeleteImpact } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import type { Runner } from "./EditParts";

interface Props {
  iri: string;
  label: string;
  runner: Runner;
  onDone: (deleted: boolean) => void;
}

function list(refs: { label: string }[], t: Translator): string {
  return refs.map(r => r.label).join(t("delete.listSeparator"));
}

/** Keep count agreement in whole templates, using original reference labels. */
function propertySentence(properties: DeleteImpact["properties"], t: Translator): string {
  const kinds = new Set(properties.map(p => p.kind ?? ""));
  const sole = kinds.size === 1 ? properties[0].kind : null;
  const kind = sole === "object property" ? "relationship" : sole === "datatype property" ? "attribute" : "property";
  const count = properties.length;
  const propertiesText = properties.map(p => t("delete.propertyRef", { label: p.label, role: t(`delete.role.${p.role}`) })).join(t("delete.propertySeparator"));
  return count === 1
    ? t("delete.properties.one", { count, kind: t(`delete.propertyKind.${kind}.one`), properties: propertiesText, role: t(`delete.role.${properties[0].role}`) })
    : t("delete.properties.many", { count, kind: t(`delete.propertyKind.${kind}.many`), properties: propertiesText });
}

export default function DeleteDialog({ iri, label, runner, onDone }: Props) {
  const { t } = useI18n();
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [strategy, setStrategy] = useState<"reparent" | "orphan">("reparent");
  const [loadError, setLoadError] = useState<{ kind: "noProject" } | { kind: "preview"; error: unknown } | null>(null);
  const { busy, errors, run } = runner;

  useEffect(() => {
    const state = projectStore.getSnapshot();
    if (!state.project) {
      setLoadError({ kind: "noProject" });
      return;
    }
    let cancelled = false;
    previewDelete(state.project.id, state.activeDoc, iri, "reparent")
      .then((r) => !cancelled && setImpact(r.impact))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setLoadError({ kind: "preview", error: e }),
      );
    return () => {
      cancelled = true;
    };
  }, [iri, label]);

  const answer = async (id: string) => {
    if (id !== "delete" || !impact) {
      onDone(false);
      return;
    }
    const result = await run("delete", "DeleteEntity", { iri, strategy }, (r) => undoAvailableNotice(r));
    if (result) onDone(true);
  };

  const childKind = impact?.kind === "class" ? "class" : impact?.kind === "concept" ? "concept" : "property";
  const name = impact?.label ?? label;
  const parents = impact?.reparentedTo ?? [];
  const childNumber = impact?.children.length === 1 ? "one" : "many";
  const error = loadError
    ? loadError.kind === "noProject" ? t("delete.noProject") : t("delete.failed", { name: label, detail: loadError.error instanceof Error ? loadError.error.message : String(loadError.error) })
    : errors.delete || null;
  return (
    <ConfirmDialog
      title={t("delete.title", { name })}
      escape="cancel"
      busy={busy}
      actions={[
        ...(impact ? [{ id: "delete", label: t(busy ? "delete.busy" : "delete.action"), danger: true }] : []),
        { id: "cancel", label: t("common.cancel"), primary: true },
      ]}
      onAnswer={(id) => void answer(id)}
    >
      {!impact && !error && <p role="status">{t("delete.checking", { name: label })}</p>}
      {impact && (
        <>
          <p>
            {t(impact.statements === 1 ? "delete.statements.one" : "delete.statements.many", { name, count: impact.statements })}
          </p>
          {impact.children.length > 0 && (
            <fieldset className="delete-strategy">
              <legend>
                {t(`delete.children.${childKind}.${childNumber}`, { count: impact.children.length, names: list(impact.children, t) })}
              </legend>
              <label>
                <input
                  type="radio"
                  name="delete-strategy"
                  checked={strategy === "reparent"}
                  onChange={() => setStrategy("reparent")}
                />{" "}
                {parents.length ? t(`delete.reparent.${childNumber}`, { parents: list(parents, t) }) : t(`delete.top.${childNumber}`)}
              </label>
              <label>
                <input
                  type="radio"
                  name="delete-strategy"
                  checked={strategy === "orphan"}
                  onChange={() => setStrategy("orphan")}
                />{" "}
                {t(`delete.orphan.${childNumber}`)}
              </label>
            </fieldset>
          )}
          {impact.properties.length > 0 && <p>{propertySentence(impact.properties, t)}</p>}
          {impact.individuals.length > 0 && (
            <p>
              {t(impact.individuals.length === 1 ? "delete.individuals.one" : "delete.individuals.many", { count: impact.individuals.length, names: list(impact.individuals, t) })}
            </p>
          )}
          {impact.importMentions > 0 && (
            <p>
              {t(impact.importMentions === 1 ? "delete.mentions.one" : "delete.mentions.many", { count: impact.importMentions })}
            </p>
          )}
        </>
      )}
      {error && (
        <p className="edit-error" role="alert">
          {error}
        </p>
      )}
    </ConfirmDialog>
  );
}
