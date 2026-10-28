/*
================================================================================
FILE: frontend/src/components/NewProjectDialog.tsx
================================================================================

SUMMARY
    System navigation may preselect a template; ordinary creation still asks
    the user to choose a kind and uses exactly the same submission logic.
    Country and government groups share the existing ontology creation flow.
    The New project form (authoring-foundations 5.1, relationships 5.1):
    first the kind, Ontology or Taxonomy, each with its sentence; then a
    name, a starting point (the chosen kind's two templates, or an ontology
    from the library), a base IRI and a prefix defaulted from the name, and
    the primary language.

BASIC IDEA
    The base IRI and prefix follow the name until the user edits them, and
    then stop following: a default that overwrote a typed value would be a
    trap. Create is not disabled but aria-disabled, with the first reason it
    is unavailable written beside it and joined to its accessible name, so a
    keyboard user who reaches it hears why rather than meeting a dead control
    (and the focus-loss rule never arises). Each invalid field says so inline
    once it has been touched.

    The kind is two native radio buttons in a fieldset, each labelled by its
    name and sentence, so a screen reader reads the sentence as it lands on
    the choice. Nothing is chosen at first -- the choice is the learner's to
    make, not a default to overlook -- and Create says *Choose Ontology or
    Taxonomy.* until one is. A library copy needs no choice: the server
    judges its kind from what it holds (D-089).

    The dialog does not create anything itself; it hands the fields to
    onCreate and shows the server's sentence if that fails.

INPUTS / INPUT SOURCES (props)
    - library: the ontologies a project can start from.
    - initialSource: a library ontology id to preselect ("Start a project from
      this" on a library card), or undefined to start by choosing a kind.
    - onCreate: carries out the creation; resolves when the project is open.
    - onClose: the dialog's three exits (Cancel, Escape, backdrop).

EXPECTED OUTPUT
    - The form; one onCreate call per valid submission.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { renderServerError } from "../i18n/serverMessage";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  defaultBaseIri,
  defaultPrefix,
  firstReason,
  kindChoices,
  validate,
  type NewProjectFields,
} from "../projects/form";
import type { ProjectKind, ProjectTemplate } from "../types";
import { useDialogTrap } from "./useDialogTrap";

export interface NewProjectRequest {
  domainProfile?: import("../government/types").DomainProfile;
  name: string;
  template?: ProjectTemplate;
  fromOntologyId?: string;
  baseIri: string;
  prefix: string;
  primaryLanguage: string;
}

interface Props {
  library: { id: string; name: string }[];
  initialSource?: string;
  initialTemplate?: ProjectTemplate;
  onCreate: (request: NewProjectRequest) => Promise<void>;
  onClose: () => void;
}

export default function NewProjectDialog({ library, initialSource, initialTemplate, onCreate, onClose }: Props) {
  const { locale, t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reasonId = useId();
  const [name, setName] = useState(() =>
    initialSource ? library.find((o) => o.id === initialSource)?.name.replace(/\.[a-z]+$/i, "") ?? "" : "",
  );
  const [kind, setKind] = useState<ProjectKind | null>(initialTemplate&&!initialSource?(initialTemplate.startsWith("taxonomy")?"taxonomy":"ontology"):null);
  // "template:<name>" or "library:<id>", one select for both kinds of start;
  // "" until a kind is chosen or a library ontology picked.
  const [source, setSource] = useState(initialSource ? `library:${initialSource}` : initialTemplate?`template:${initialTemplate}`:"");
  const choices = useMemo(() => kindChoices(t), [t]);
  const templates = choices.find((c) => c.kind === kind)?.templates ?? [];
  // A library copy's kind is judged by the server from what it holds, so
  // picking one clears the kind rather than leave a choice the server will
  // not use on screen (found in review); a note says how it is judged.
  const chooseSource = (next: string) => {
    setSource(next);
    if (next.startsWith("library:")) setKind(null);
  };
  const fromLibrary = source.startsWith("library:");
  const chooseKind = (next: ProjectKind) => {
    setKind(next);
    // The kind's small template: a first project with something in it to
    // look at, as the E-6 form started from Small ontology.
    setSource(`template:${next === "ontology" ? "small" : "taxonomy-small"}`);
  };
  const [baseIri, setBaseIri] = useState<string | null>(null);
  const [prefix, setPrefix] = useState<string | null>(null);

  const [primaryLanguage, setPrimaryLanguage] = useState<string>(locale);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const escape = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);
  useDialogTrap(panelRef, headingRef, escape);

  const fields: NewProjectFields = {
    name,
    baseIri: baseIri ?? defaultBaseIri(name),
    prefix: prefix ?? defaultPrefix(name),
    primaryLanguage,
  };
  const errors = useMemo(() => validate(fields, t), [name, baseIri, prefix, primaryLanguage, t]);
  // The kind first: it is the first question the form asks (Section 6).
  const reason = source === "" ? t("project.chooseKind") : firstReason(errors);
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));
  const shown = (field: keyof NewProjectFields) => (touched.has(field) ? errors[field] : undefined);

  const submit = async () => {
    setTouched(new Set(["name", "baseIri", "prefix", "primaryLanguage"]));
    if (reason || busy) return;
    const [from, value] = source.split(/:(.*)/s);
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        name: fields.name.trim(),
        ...(from === "library" ? { fromOntologyId: value } : { template: value as ProjectTemplate }),
        baseIri: fields.baseIri.trim(),
        prefix: fields.prefix.trim(),
        primaryLanguage: fields.primaryLanguage.trim(),
      });
    } catch (e: unknown) {
      setError(e);
      setBusy(false);
    }
  };

  const field = (
    id: keyof NewProjectFields,
    label: string,
    value: string,
    onChange: (v: string) => void,
    hint?: string,
  ) => {
    const message = shown(id);
    return (
      <div className="form-field">
        <label htmlFor={`new-project-${id}`}>{label}</label>
        <input
          id={`new-project-${id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => touch(id)}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `new-project-${id}-error` : hint ? `new-project-${id}-hint` : undefined}
          spellCheck={false}
        />
        {message ? (
          <p id={`new-project-${id}-error`} className="form-error">
            {message}
          </p>
        ) : (
          hint && (
            <p id={`new-project-${id}-hint`} className="form-hint">
              {hint}
            </p>
          )
        )}
      </div>
    );
  };

  return (
    <>
      <div className="modal-backdrop confirm-backdrop" aria-hidden="true" onClick={escape} />
      <div
        ref={panelRef}
        className="confirm-dialog new-project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
      >
        <h2 id="new-project-title" ref={headingRef} tabIndex={-1} className="confirm-title">{t("project.title")}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset className="form-field new-project-kinds">
            <legend>{t("project.kindQuestion")}</legend>
            {choices.map((choice) => (
              <label key={choice.kind} className={`new-project-kind${kind === choice.kind ? " chosen" : ""}`}>
                <input
                  type="radio"
                  name="new-project-kind"
                  value={choice.kind}
                  checked={kind === choice.kind}
                  onChange={() => chooseKind(choice.kind)}
                />
                <span className="new-project-kind-text">
                  <strong>{choice.label}</strong>
                  <span>{choice.sentence}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {field("name", t("project.name"), name, setName)}
          <div className="form-field">
            <label htmlFor="new-project-source">{t("project.source")}</label>
            <select
              id="new-project-source"
              value={source}
              onChange={(e) => chooseSource(e.target.value)}
              aria-describedby={fromLibrary ? "new-project-source-hint" : undefined}
            >
              {source === "" && (
                <option value="" disabled>{t("project.chooseFirst")}</option>
              )}
              {templates.length > 0 && (
                <optgroup label={t("project.templates")}>
                  {templates.map((t) => (
                    <option key={t.value} value={`template:${t.value}`}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {library.length > 0 && (
                <optgroup label={t("project.libraryCopy")}>
                  {library.map((o) => (
                    <option key={o.id} value={`library:${o.id}`}>
                      {o.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {fromLibrary && (
              <p id="new-project-source-hint" className="form-hint">{t("project.copyHelp")}</p>
            )}
          </div>
          {field(
            "baseIri",
            t("project.baseIri"),
            fields.baseIri,
            setBaseIri,
            t("project.baseHelp"),
          )}
          {field("prefix", t("project.prefix"), fields.prefix, setPrefix)}
          {field(
            "primaryLanguage",
            t("project.primaryLanguage"),
            primaryLanguage,
            setPrimaryLanguage,
            t("project.languageHelp"),
          )}
          {!!error && <><p className="form-error" role="alert">{renderServerError(error, t)}</p><details><summary>{t("common.details")}</summary><pre>{error instanceof Error ? error.message : String(error)}</pre></details></>}
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={escape} aria-disabled={busy}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="primary"
              aria-disabled={reason !== null || busy}
              aria-describedby={reason ? reasonId : undefined}
            >
              {busy ? t("project.creating") : t("project.create")}
            </button>
          </div>
          {reason && (
            <p id={reasonId} className="form-hint new-project-reason">
              {reason}
            </p>
          )}
        </form>
      </div>
    </>
  );
}
