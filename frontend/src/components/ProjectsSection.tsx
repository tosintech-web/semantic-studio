/*
================================================================================
FILE: frontend/src/components/ProjectsSection.tsx
================================================================================

SUMMARY
    A project's card in Home's one library (home-and-examples 5.5; it was
    the "My projects" section of authoring-foundations 5.1 until the
    person's projects and files joined one grid). Each project card shows
    its name, its kind (*Ontology* or *Taxonomy*, relationships 5.1), when
    it last changed, its documents and its counts, a line for each of its
    data snapshots with its label (csv-data-import 5.7: *from people.csv,
    imported 2 October 2026*, a sample's words included, and *off* when
    switched off), an Open button, and a menu with Rename, Change to
    taxonomy… (or ontology…), Duplicate, Export as zip and Delete.

BASIC IDEA
    Everything on a card comes from the project list App fetched on mount,
    which the server builds from manifests alone, so a project card, like
    the rest of the Home screen, costs no request of its own and parses
    nothing. HomeScreen places the cards among the library's; the heading,
    New project and the empty sentence are its.

    The menu is a disclosure of plain buttons, OntologyCard's pattern and for
    its reason: role="menu" would promise arrow keys and typeahead. Rename
    happens in place, in a labelled field that Enter saves and Escape
    abandons, rather than in a browser prompt. Delete is App's, because the
    confirmation and the sentence saying where the folder went belong with the
    live region App owns. So is Change to…, which asks first with one
    sentence of what changes: the tools, never the model (D-089).

INPUTS / INPUT SOURCES (props)
    - project: the project's summary.
    - busy: an action is running on this project, which then says so;
      disabled: one is running on some project.
    - layout: "card" or "row", as the library around it is laid out.
    - openRef: set on the library's first entry, for Home's start focus.
    - onOpen, onRename, onChangeKind, onDuplicate, onExport, onDelete.

EXPECTED OUTPUT
    - The card, and one callback per action.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import type { Translator, UiLocale } from "../i18n/types";
import { countKindMessage } from "../i18n/kindLabel";
import { renderServerError } from "../i18n/serverMessage";
import { useEffect, useId, useRef, useState } from "react";
import { dataLabel } from "../modeling/dataSentences";
import type { ProjectSummary } from "../types";

/** What a project card's controls do; App owns every one of them. */
export interface ProjectActions {
  onOpen: (pid: string) => void;
  onRename: (pid: string, name: string) => Promise<void>;
  onChangeKind: (pid: string) => void;
  onDuplicate: (pid: string) => void;
  onExport: (pid: string) => void;
  onDelete: (pid: string) => void;
}

interface Props extends ProjectActions {
  project: ProjectSummary;
  busy: boolean;
  disabled: boolean;
  layout?: "card" | "row";
  openRef?: React.RefObject<HTMLButtonElement>;
}

/** "Changed 28 Sep 2026", in the reader's locale. */
function changedOn(iso: string, locale: UiLocale, t: Translator): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return t("home.changed", { date: date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) });
}

export default function ProjectCard({
  project,
  busy,
  disabled,
  layout = "card",
  openRef,
  onOpen,
  onRename,
  onChangeKind,
  onDuplicate,
  onExport,
  onDelete,
}: Props) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const menuId = useId();
  const renameId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const [renameError, setRenameError] = useState<unknown>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (renaming) renameInput.current?.select();
  }, [renaming]);

  const closeMenu = () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  };

  const finishRename = async (save: boolean) => {
    if (save && draft.trim() && draft.trim() !== project.name) {
      try {
        await onRename(project.id, draft.trim());
      } catch (e: unknown) {
        setRenameError(e);
        return;
      }
    }
    setRenameError(null);
    setRenaming(false);
    setDraft(project.name);
    // The field is going; the menu button is the stable thing to return to.
    requestAnimationFrame(() => menuButton.current?.focus());
  };

  const act = (action: (pid: string) => void) => () => {
    closeMenu();
    action(project.id);
  };

  return (
    <article
      className={layout === "row" ? "onto-card onto-row project-card" : "onto-card project-card"}
      aria-labelledby={headingId}
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          event.stopPropagation();
          closeMenu();
        }
      }}
    >
      <div className="onto-body">
        <div className="onto-head">
          {renaming ? (
            <div className="project-rename">
              <label htmlFor={renameId} className="visually-hidden">
                {t("home.newName", { name: project.name })}
              </label>
              <input
                id={renameId}
                ref={renameInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-invalid={renameError ? true : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void finishRename(true);
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    void finishRename(false);
                  }
                }}
              />
              <button className="ghost" onClick={() => void finishRename(true)}>{t("home.saveName")}</button>
              <button className="ghost" onClick={() => void finishRename(false)}>
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <h3 id={headingId} className="onto-name" title={project.name}>
              {project.name}
            </h3>
          )}
          <div className="onto-menu-wrap">
            <button
              ref={menuButton}
              className="ghost icon-btn onto-menu-btn"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-haspopup="true"
              aria-label={t("home.more", { name: project.name })}
              // aria-disabled, not disabled: the action this card starts puts
              // focus here, and a disabled button would drop it.
              aria-disabled={disabled}
              onClick={() => !disabled && setMenuOpen((was) => !was)}
            >
              <span aria-hidden="true">⋮</span>
            </button>
            <div className="onto-menu" id={menuId} ref={menuRef} hidden={!menuOpen}>
              {menuOpen && (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setRenaming(true);
                    }}
                  >{t("home.rename")}</button>
                  {/* A project from before kinds gets its kind when it is
                      first opened; until then there is nothing to change. */}
                  {project.kind && (
                    <button onClick={act(onChangeKind)}>
                      {project.kind === "ontology" ? t("home.toTaxonomy") : t("home.toOntology")}
                    </button>
                  )}
                  <button onClick={act(onDuplicate)}>{t("home.duplicate")}</button>
                  <button onClick={act(onExport)}>{t("home.export")}</button>
                  <button className="danger" onClick={act(onDelete)}>{t("home.delete")}</button>
                </>
              )}
            </div>
          </div>
        </div>
        {!!renameError && <><p className="form-error">{renderServerError(renameError, t)}</p><details><summary>{t("common.details")}</summary><pre>{renameError instanceof Error ? renameError.message : String(renameError)}</pre></details></>}
        {project.kind && <p className="project-kind">{project.kind === "ontology" ? t("project.ontology") : t("project.taxonomy")}</p>}
        <p className="onto-summary">
          {t("home.projectSummary", { classes: countKindMessage("class", project.counts.classes ?? 0, t), properties: countKindMessage("property", project.counts.properties ?? 0, t), concepts: t(`home.concepts.${project.counts.concepts === 1 ? "one" : "many"}`, { count: project.counts.concepts ?? 0 }) })}
        </p>
        {(project.data ?? []).map((source) => (
          <p key={source.id} className="project-data data-label">
            {t("home.projectData", { label: dataLabel(source) })}
            {source.enabled ? "" : t("home.dataOff")}
          </p>
        ))}
        <p className="project-meta">
          <span>{changedOn(project.updatedAt, locale, t)}</span>
          <span>{project.documents.map((d) => d.file).join(", ")}</span>
        </p>
        <div className="onto-verbs">
          <button
            ref={openRef}
            className="primary"
            aria-disabled={disabled}
            aria-label={t("home.openName", { name: project.name })}
            onClick={() => !disabled && onOpen(project.id)}
          >
            {busy ? t("home.working") : t("home.open")}
          </button>
        </div>
      </div>
    </article>
  );
}
