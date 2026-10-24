/*
================================================================================
FILE: frontend/src/components/RelationshipForm.tsx
================================================================================

SUMMARY
    The relationship form of relationships-and-project-kinds 5.6, for an
    object property of the open project's model: its ends (*From* and *To*,
    swapped, changed or cleared), its other way round, the seven
    characteristics each with an example in the relationship's own names,
    its more general relationship, and pointers to what it cannot say. Also
    PropertyHead, the sentence at the top of both property forms, and
    Warnings, the 5.9 warnings shown under the block each concerns. The
    Pointers block links to the start class's rules (axioms 5.9): it opens
    the class's sentence builder with this relationship and its end.

BASIC IDEA
    Whole catalog templates supply UI prose and the rule-pointer action.
    Dictionary names, IRIs, inverse drafts and primaryLanguage stay original.
    Stored warning/command announcements are handled at their producers.

    Every control is one command, so one labelled undo step, sent through
    EditSection's runner so busy and refusals are shared with the rest of the
    form. Nothing is kept here but what is being chosen or typed: the blocks
    are read from the statements the panel refetches on each revision, and
    the Sentence reads back exactly what they say.

    The characteristics are native checkboxes, each described by its example,
    four shown and three behind a *More* disclosure that is a button with
    aria-expanded, open from the start when one of the three is on so nothing
    set is hidden. A checkbox shows the model, not the click: while the
    command runs it stays as it was, and a refused contradiction (5.9) leaves
    it unticked with the server's sentence under the block.

    *Name the other way round…* makes a new relationship with the ends
    swapped (SetInverse with a label), with the sentence it will read as
    under the field; *or choose an existing one* picks any relationship.
    A warning stands under the block it concerns (the server says which):
    a characteristic's under *What else is true*, an inverse's under *The
    other way round*. It has a Fix when one command resolves it (an inverse
    with the wrong ends), which sends the command the server named. A warning
    that a change brings is also said in the project's live region, once; the
    ones already there when the form opens are read with the form.

    While a change is saving the checkboxes are aria-disabled: a click then
    would be dropped, and a screen reader says why instead of nothing.

INPUTS / INPUT SOURCES (props)
    - ontologyId, iri, name, model: the relationship and its blocks.
    - primaryLanguage: the name field's language.
    - runner: EditSection's; onSelect: select an entity named here.
    PropertyHead: model, name, iri, warnings (announced when new).
    Warnings: the warnings, the block to show, runner.

EXPECTED OUTPUT
    - Commands through the runner; the blocks' markup.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { translateParts } from "../i18n/parts";
import { useEffect, useId, useRef, useState } from "react";
import { domainLabel, sharedDomain, type EntityModel, type Ref } from "../modeling/entity";
import {
  attributeSentence,
  characteristicChoices,
  characteristicExample,
  formSentence,
  inverseSentence,
  oneStartOneEnd,
  parentSentence,
  type Characteristic,
} from "../modeling/sentences";
import { projectStore } from "../state/projectStore";
import type { ModelWarning } from "../types";
import { Block, type Runner } from "./EditParts";
import EntityPicker from "./EntityPicker";
import SharedDomain from "./SharedDomain";

const XSD = "http://www.w3.org/2001/XMLSchema#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

/** An attribute's range as xsd:local, the form typeWord reads. */
export function datatypeOf(range: Ref | null): string | null {
  if (!range) return null;
  if (range.iri.startsWith(XSD)) return `xsd:${range.iri.slice(XSD.length)}`;
  if (range.iri.startsWith(RDF)) return `rdf:${range.iri.slice(RDF.length)}`;
  return range.label;
}

/** Say each warning a change brings, once, in the project's live region.
 *  Those there when the entity is opened are not: they are read with the
 *  form. Keyed by entity, so moving to another does not announce its own. */
export function useWarningAnnouncer(iri: string, warnings: { text: string }[]) {
  const seen = useRef<{ iri: string; texts: Set<string> } | null>(null);
  const texts = warnings.map((w) => w.text).join("\n");
  useEffect(() => {
    const now = new Set(texts ? texts.split("\n") : []);
    const before = seen.current;
    if (before && before.iri === iri) {
      const fresh = [...now].filter((t) => !before.texts.has(t));
      if (fresh.length) projectStore.say(`Warning: ${fresh.join(" ")}`);
    }
    seen.current = { iri, texts: now };
  }, [iri, texts]);
}

/** The sentence at the top of a property's form; its warnings are said as
 *  they appear, and shown under their own blocks by Warnings. */
export function PropertyHead({
  model,
  name,
  iri,
  warnings,
}: {
  model: EntityModel;
  name: string;
  iri: string;
  warnings: ModelWarning[];
}) {
  const { locale, t } = useI18n();
  useWarningAnnouncer(iri, warnings);
  const attribute = model.kind === "datatypeProperty";
  const sentence = attribute
    ? attributeSentence(domainLabel(model, locale), name, datatypeOf(model.range), locale)
    : formSentence(domainLabel(model, locale), name, model.range?.label ?? null, locale);
  return (
    <Block title={t("relationshipForm.sentence")}>
      <p className="form-sentence">{sentence}</p>
    </Block>
  );
}

/** The warnings of one block, each with its Fix when it has one. */
export function Warnings({
  warnings,
  block,
  runner,
}: {
  warnings: ModelWarning[];
  block: NonNullable<ModelWarning["block"]>;
  runner: Runner;
}) {
  const { t } = useI18n();
  const { busy, errors, run } = runner;
  // One without a block (an older server) goes with the characteristics.
  const mine = warnings.filter((w) => (w.block ?? "characteristics") === block);
  if (mine.length === 0) return null;
  return (
    <>
      <ul className="form-warnings" aria-label={t("relationshipForm.warnings")}>
        {mine.map((w) => (
          <li key={w.text} className="form-warning">
            <span>{w.text}</span>
            {w.fix && (
              <button
                type="button"
                className="ghost edit-btn"
                aria-disabled={busy}
                aria-label={t("relationshipForm.fix", { label: w.fix.label })}
                onClick={() => !busy && void run("fix", w.fix!.command, w.fix!.args)}
              >
                {t("relationshipForm.fixButton")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {errors.fix && <p className="edit-error">{errors.fix}</p>}
    </>
  );
}

interface Props {
  ontologyId: string;
  iri: string;
  name: string;
  model: EntityModel;
  primaryLanguage: string;
  runner: Runner;
  onSelect: (iri: string) => void;
  warnings?: ModelWarning[];
}

/** Which small form is open: at most one at a time. */
type Open = null | "domain" | "range" | "inverseName" | "inversePick" | "parent";

export default function RelationshipForm({
  ontologyId,
  iri,
  name,
  model,
  primaryLanguage,
  runner,
  onSelect,
  warnings = [],
}: Props) {
  const { locale, t } = useI18n();
  const characteristics = characteristicChoices(t);
  const { busy, errors, run, clear } = runner;
  const [open, setOpen] = useState<Open>(null);
  const [more, setMore] = useState(() => characteristics.some((c) => c.more && model.characteristics.has(c.id)));
  const [inverseName, setInverseName] = useState("");
  const id = useId();
  // The button each small form was opened from, to give focus back to.
  const openers = useRef<Record<string, HTMLButtonElement | null>>({});
  const from = domainLabel(model, locale);
  const to = model.range?.label ?? null;

  const close = () => {
    const was = open;
    if (was) clear(was);
    setOpen(null);
    setInverseName("");
    if (was) window.setTimeout(() => openers.current[was === "inversePick" ? "inverseName" : was]?.focus(), 0);
  };
  const opener = (which: Exclude<Open, null>, label: string, aria?: string) => (
    <button
      ref={(el) => {
        openers.current[which] = el;
      }}
      type="button"
      className="ghost"
      aria-label={aria}
      onClick={() => setOpen(which)}
    >
      {label}
    </button>
  );
  const pick = (which: Exclude<Open, null>, kind: "class" | "objectProperty", label: string, exclude: string[], send: (target: string) => Promise<unknown>) => (
    <EntityPicker
      ontologyId={ontologyId}
      kind={kind}
      label={label}
      exclude={[iri, ...exclude]}
      busy={busy}
      error={errors[which] || null}
      onCancel={close}
      onPick={async (target) => {
        if (await send(target)) close();
      }}
    />
  );
  const end = (which: "domain" | "range", value: Ref | null) => {
    const command = which === "domain" ? "SetDomain" : "SetRange";
    const clearCommand = which === "domain" ? "ClearDomain" : "ClearRange";
    const role = which === "domain" ? "start" : "end";
    return (
      <div className="relationship-end">
        <h5>{t(which === "domain" ? "relationshipForm.from" : "relationshipForm.to")}</h5>
        {value ? (
          <p className="edit-value">
            <button type="button" className="term-link" title={value.iri} onClick={() => onSelect(value.iri)}>
              {value.label}
            </button>
            <button
              type="button"
              className="ghost edit-btn"
              aria-label={t(`relationshipForm.clear.${role}`, { name })}
              aria-disabled={busy}
              onClick={() => !busy && void run("ends", clearCommand, { property: iri })}
            >
              {t("attributeForm.clear")}
            </button>
          </p>
        ) : (
          <p className="detail-note">{t(`relationshipForm.no.${role}`)}</p>
        )}
        {open === which
          ? pick(which, "class", t(`relationshipForm.pick.${role}`), value ? [value.iri] : [], (target) =>
              run(which, command, { property: iri, target }),
            )
          : opener(which, t(value ? `relationshipForm.change.${role}` : `relationshipForm.set.${role}`), t(value ? `relationshipForm.changeLabel.${role}` : `relationshipForm.setLabel.${role}`, { name }))}
      </div>
    );
  };

  const toggle = (characteristic: Characteristic, on: boolean) => {
    if (busy) return;
    void run("characteristic", "SetCharacteristic", { property: iri, characteristic, on });
  };
  const box = (c: (typeof characteristics)[number]) => {
    const exampleId = `${id}-${c.id}`;
    return (
      <li key={c.id} className="characteristic">
        <label>
          <input
            type="checkbox"
            checked={model.characteristics.has(c.id)}
            aria-describedby={exampleId}
            aria-disabled={busy}
            onChange={(e) => toggle(c.id, e.target.checked)}
          />{" "}
          {c.name} <span className="owl-term">{c.owl}</span>
        </label>
        <p id={exampleId} className="characteristic-example">
          {characteristicExample(c.id, name, from, to, locale)}
        </p>
      </li>
    );
  };
  // A shared start cannot be swapped: its end would become several classes.
  const swappable =
    !sharedDomain(model) && (model.domain || model.range) && model.domain?.iri !== model.range?.iri;

  return (
    <>
      <Block title={t("relationshipForm.ends")}>
        {sharedDomain(model) ? (
          <div className="relationship-end">
            <h5>{t("relationshipForm.from")}</h5>
            <SharedDomain
              ontologyId={ontologyId}
              iri={iri}
              name={name}
              model={model}
              runner={runner}
              onSelect={onSelect}
              warnings={warnings}
              members
            />
          </div>
        ) : (
          <>
            {end("domain", model.domain)}
            {model.domain && (
              <SharedDomain
                ontologyId={ontologyId}
                iri={iri}
                name={name}
                model={model}
                runner={runner}
                onSelect={onSelect}
                members={false}
              />
            )}
          </>
        )}
        {end("range", model.range)}
        <div className="edit-actions">
          <button
            type="button"
            className="ghost"
            aria-disabled={busy || !swappable}
            title={t(swappable ? "relationshipForm.swapTitle" : "relationshipForm.noSwap")}
            onClick={() => !busy && swappable && void run("ends", "SwapEnds", { property: iri })}
          >
            <span aria-hidden="true">⇄</span> {t("relationshipForm.swap")}
          </button>
        </div>
        {errors.ends && <p className="edit-error">{errors.ends}</p>}
        <p className="detail-note">{oneStartOneEnd(name, from, locale)}</p>
      </Block>

      <Block title={t("relationshipForm.inverse")}>
        {model.inverses.length === 0 ? (
          <p className="detail-note">{t("relationshipForm.none")}</p>
        ) : (
          <ul className="edit-list">
            {model.inverses.map((inverse) => (
              <li key={inverse.iri}>
                <button type="button" className="term-link" title={inverse.iri} onClick={() => onSelect(inverse.iri)}>
                  {inverseSentence(inverse.label, from, to, locale)}
                </button>
                <button
                  type="button"
                  className="ghost edit-btn"
                  aria-label={t("relationshipForm.removeInverse", { inverse: inverse.label, name })}
                  aria-disabled={busy}
                  onClick={() => !busy && void run("inverse", "ClearInverse", { property: iri, inverse: inverse.iri })}
                >
                  {t("sharedDomain.removeButton")}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Warnings warnings={warnings} block="inverse" runner={runner} />
        {errors.inverse && <p className="edit-error">{errors.inverse}</p>}
        {open === "inverseName" ? (
          <form
            className="new-entity-form"
            aria-label={t("relationshipForm.nameInverse", { name })}
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !inverseName.trim()) return;
              if (await run("inverseName", "SetInverse", { property: iri, label: inverseName.trim() })) close();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          >
            <label className="edit-field-label" htmlFor={`${id}-inverse`}>
              {t("relationshipForm.inverseField", { language: primaryLanguage })}
            </label>
            <input
              id={`${id}-inverse`}
              autoFocus
              value={inverseName}
              readOnly={busy}
              aria-describedby={`${id}-inverse-sentence`}
              aria-invalid={errors.inverseName ? true : undefined}
              onChange={(e) => setInverseName(e.target.value)}
            />
            <p id={`${id}-inverse-sentence`} className="relate-sentence">
              {inverseSentence(inverseName, from, to, locale)}
            </p>
            {errors.inverseName && <p className="edit-error">{errors.inverseName}</p>}
            <div className="edit-actions">
              <button type="submit" className="primary" aria-disabled={busy || !inverseName.trim()}>
                {t("relationshipForm.create")}
              </button>
              <button type="button" className="link-btn" onClick={() => setOpen("inversePick")}>
                {t("relationshipForm.existingInverse")}
              </button>
              <button type="button" className="ghost" onClick={close}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        ) : open === "inversePick" ? (
          pick("inversePick", "objectProperty", t("relationshipForm.pickInverse", { name }), model.inverses.map((r) => r.iri), (inverse) =>
            run("inversePick", "SetInverse", { property: iri, inverse }),
          )
        ) : (
          opener("inverseName", t(model.inverses.length ? "relationshipForm.changeInverse" : "relationshipForm.newInverse"))
        )}
      </Block>

      <Block title={t("relationshipForm.characteristics")}>
        <fieldset className="characteristics">
          <legend className="visually-hidden">{t("relationshipForm.characteristicsLabel", { name })}</legend>
          <ul className="edit-list">{characteristics.filter((c) => !c.more).map(box)}</ul>
          <button
            type="button"
            className="link-btn"
            aria-expanded={more}
            aria-controls={`${id}-more`}
            onClick={() => setMore((m) => !m)}
          >
            {t("relationshipForm.more")}
          </button>
          <ul id={`${id}-more`} className="edit-list" hidden={!more}>
            {characteristics.filter((c) => c.more).map(box)}
          </ul>
        </fieldset>
        <Warnings warnings={warnings} block="characteristics" runner={runner} />
        {errors.characteristic && (
          <p className="edit-error" role="alert">
            {errors.characteristic}
          </p>
        )}
      </Block>

      <Block title={t("relationshipForm.parent")}>
        {model.superProperties.length === 0 ? (
          <p className="detail-note">{t("relationshipForm.noParent", { name })}</p>
        ) : (
          <ul className="edit-list">
            {model.superProperties.map((parent) => (
              <li key={parent.iri}>
                <button type="button" className="term-link" title={parent.iri} onClick={() => onSelect(parent.iri)}>
                  {parentSentence(name, parent.label, t)}
                </button>
                <button
                  type="button"
                  className="ghost edit-btn"
                  aria-label={t("relationshipForm.removeParent", { parent: parent.label, name })}
                  aria-disabled={busy}
                  onClick={() => !busy && void run("parents", "RemoveSubPropertyOf", { child: iri, parent: parent.iri })}
                >
                  {t("sharedDomain.removeButton")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {errors.parents && <p className="edit-error">{errors.parents}</p>}
        {open === "parent"
          ? pick("parent", "objectProperty", t("relationshipForm.pickParent", { name }), model.superProperties.map((r) => r.iri), (parent) =>
              run("parent", "AddSubPropertyOf", { child: iri, parent }),
            )
          : opener("parent", t("relationshipForm.addParent"))}
      </Block>

      <Block title={t("relationshipForm.pointers")}>
        {model.domain ? (
          // axioms 5.9: the pointer is now the way there. It opens the start
          // class's Rules block with this relationship and its end chosen.
          <p className="detail-note">
            {translateParts(locale, "relationshipForm.pointer", {
              domain: model.domain.label,
              to: to ?? "…",
              action: { iri: model.domain.iri, label: t("relationshipForm.pointerAction", { domain: model.domain.label }) },
            }).map((part, index) => typeof part === "string" ? part : (
              <button key={index} type="button" className="link-btn" onClick={() => {
                projectStore.startRule(part.iri, model.range?.iri ?? "", iri);
                onSelect(part.iri);
              }}>{part.label}</button>
            ))}
          </p>
        ) : (
          <p className="detail-note">
            {t("relationshipForm.pointerExample")}
          </p>
        )}
        <p className="detail-note">{t("relationshipForm.shapes")}</p>
      </Block>
    </>
  );
}
