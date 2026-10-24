/*
================================================================================
FILE: frontend/src/components/ConceptRelations.tsx
================================================================================

SUMMARY
    A concept's taxonomy relations beyond broader and narrower
    (relationships-and-project-kinds 5.8): *Top concept of Fruits*, kept by
    the server, its **Related** concepts, added and removed, and its
    **Mappings** to other vocabularies, each kind explained in one sentence,
    to a link or to a concept from an import.

BASIC IDEA
    The active UI translator supplies relation and mapping guidance. Lookup
    by mapping ID is explicit, preserving unknown IDs and their original text;
    UI switches keep mapping-kind and target drafts in the same component.

    Part of the concept's Structure block in EditStructure, sharing its
    runner. *Related to* is one command that writes both directions, since
    SKOS defines it as symmetric, so the list reads the same from either
    concept. Whether a concept is a top concept is never edited here: the
    commands keep it (D-091), and the form only says so.

    A mapping points outside the project. Its target is typed as a link or
    picked from the concepts the document's imports define; the server
    checks it like any link, and it is shown as a link only when linkTarget
    lets it be one (D-088), otherwise as text. Either way it reads by its
    name, an imported concept's label included, with the IRI in its title;
    the IRI is the text only for a target with no name.

INPUTS / INPUT SOURCES (props)
    - ontologyId, iri, name, model: the concept and its blocks.
    - runner: EditStructure's; onSelect: select a related concept.

EXPECTED OUTPUT
    - AddRelated, RemoveRelated, AddMapping and RemoveMapping through the
      runner; the markup.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { useId, useRef, useState } from "react";
import { linkTarget } from "../links";
import type { EntityModel } from "../modeling/entity";
import { mappingChoices, topConceptSentence } from "../modeling/sentences";
import type { Runner } from "./EditParts";
import EntityPicker from "./EntityPicker";

interface Props {
  ontologyId: string;
  iri: string;
  name: string;
  model: EntityModel;
  runner: Runner;
  onSelect: (iri: string) => void;
}

export default function ConceptRelations({ ontologyId, iri, name, model, runner, onSelect }: Props) {
  const { locale, t } = useI18n();
  const mappings = mappingChoices(t);
  const mappingName = (id: string) => mappings.find(m => m.id === id)?.name ?? id;
  const { busy, errors, run, clear } = runner;
  const id = useId();
  const [open, setOpen] = useState<null | "related" | "mapping">(null);
  const [kind, setKind] = useState(mappings[0].id);
  const [target, setTarget] = useState("");
  const [picking, setPicking] = useState(false);
  const openers = useRef<Record<string, HTMLButtonElement | null>>({});

  const close = () => {
    const was = open;
    if (was) clear(was);
    setOpen(null);
    setTarget("");
    setPicking(false);
    if (was) window.setTimeout(() => openers.current[was]?.focus(), 0);
  };
  const opener = (which: "related" | "mapping", label: string) => (
    <button
      ref={(el) => {
        openers.current[which] = el;
      }}
      type="button"
      className="ghost"
      onClick={() => setOpen(which)}
    >
      {label}
    </button>
  );
  const addMapping = async (to: string) => {
    if (busy || !to.trim()) return;
    if (await run("mapping", "AddMapping", { concept: iri, kind, target: to.trim() })) close();
  };
  const means = mappings.find((m) => m.id === kind)?.means ?? "";

  return (
    <>
      {model.topOf.map((scheme) => (
        <p key={scheme.iri} className="detail-note concept-top">
          {topConceptSentence(scheme.label, locale)}
        </p>
      ))}

      <h5>{t("conceptRelations.related")}</h5>
      {model.related.length === 0 ? (
        <p className="detail-note">{t("conceptRelations.noRelated")}</p>
      ) : (
        <ul className="edit-list">
          {model.related.map((r) => (
            <li key={r.iri}>
              <button type="button" className="term-link" title={r.iri} onClick={() => onSelect(r.iri)}>
                {r.label}
              </button>
              <button
                type="button"
                className="ghost edit-btn"
                aria-label={t("conceptRelations.removeRelated", { related: r.label, name })}
                aria-disabled={busy}
                onClick={() => !busy && void run("relatedList", "RemoveRelated", { concept: iri, related: r.iri })}
              >
                {t("sharedDomain.removeButton")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {errors.relatedList && <p className="edit-error">{errors.relatedList}</p>}
      {open === "related" ? (
        <EntityPicker
          ontologyId={ontologyId}
          kind="concept"
          label={t("conceptRelations.pickRelated", { name })}
          exclude={[iri, ...model.related.map((r) => r.iri)]}
          busy={busy}
          error={errors.related || null}
          onCancel={close}
          onPick={async (other) => {
            if (await run("related", "AddRelated", { concept: iri, related: other })) close();
          }}
        />
      ) : (
        opener("related", t("conceptRelations.addRelated"))
      )}

      <h5>{t("conceptRelations.mappings")}</h5>
      {model.mappings.length === 0 ? (
        <p className="detail-note">{t("conceptRelations.noMappings")}</p>
      ) : (
        <ul className="edit-list">
          {model.mappings.map((m) => {
            const href = linkTarget(m.target.iri);
            return (
              <li key={`${m.kind}|${m.target.iri}`}>
                <span className="edit-annotation-property">{mappingName(m.kind)}:</span>{" "}
                {/* The target's name, as the related rows show theirs; its IRI
                    only when it has none, and always in the title (PR #49
                    review: an imported concept showed its raw IRI). */}
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" title={m.target.iri}>
                    {m.target.label}
                  </a>
                ) : (
                  <span title={m.target.iri}>{m.target.label}</span>
                )}
                <button
                  type="button"
                  className="ghost edit-btn"
                  aria-label={t("conceptRelations.removeMapping", { kind: locale === "en" && mappings.some(entry => entry.id === m.kind) ? mappingName(m.kind).toLowerCase() : mappingName(m.kind), target: m.target.label })}
                  aria-disabled={busy}
                  onClick={() =>
                    !busy && void run("mappingList", "RemoveMapping", { concept: iri, kind: m.kind, target: m.target.iri })
                  }
                >
                  {t("sharedDomain.removeButton")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {errors.mappingList && <p className="edit-error">{errors.mappingList}</p>}
      {open === "mapping" ? (
        <form
          className="new-entity-form"
          aria-label={t("conceptRelations.newMapping", { name })}
          onSubmit={(e) => {
            e.preventDefault();
            void addMapping(target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !picking) {
              e.preventDefault();
              e.stopPropagation();
              close();
            }
          }}
        >
          <label className="edit-field-label" htmlFor={`${id}-kind`}>
            {t("conceptRelations.kind")}
          </label>
          <select
            id={`${id}-kind`}
            value={kind}
            autoFocus
            aria-describedby={`${id}-means`}
            onChange={(e) => setKind(e.target.value)}
          >
            {mappings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (skos:{m.id})
              </option>
            ))}
          </select>
          <p id={`${id}-means`} className="detail-note">
            {means}
          </p>
          {picking ? (
            <EntityPicker
              ontologyId={ontologyId}
              kind="concept"
              label={t("conceptRelations.pickImported")}
              // Only other vocabularies: a mapping never points at this
              // project's own concepts (5.8).
              importedOnly
              exclude={[iri]}
              busy={busy}
              error={errors.mapping || null}
              onCancel={() => setPicking(false)}
              onPick={(picked) => void addMapping(picked)}
            />
          ) : (
            <>
              <label className="edit-field-label" htmlFor={`${id}-target`}>
                {t("conceptRelations.link")}
              </label>
              <input
                id={`${id}-target`}
                value={target}
                readOnly={busy}
                placeholder="http://dbpedia.org/resource/Apple"
                aria-invalid={errors.mapping ? true : undefined}
                onChange={(e) => setTarget(e.target.value)}
              />
              {errors.mapping && <p className="edit-error">{errors.mapping}</p>}
              <div className="edit-actions">
                <button type="submit" className="primary" aria-disabled={busy || !target.trim()}>
                  {t("conceptRelations.addMapping")}
                </button>
                <button type="button" className="link-btn" onClick={() => setPicking(true)}>
                  {t("conceptRelations.imported")}
                </button>
                <button type="button" className="ghost" onClick={close}>
                  {t("common.cancel")}
                </button>
              </div>
            </>
          )}
        </form>
      ) : (
        opener("mapping", t("conceptRelations.addMapping"))
      )}
    </>
  );
}
