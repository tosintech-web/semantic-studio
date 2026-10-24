/*
================================================================================
FILE: frontend/src/components/EditStructure.tsx
================================================================================

SUMMARY
    The Structure block of the editing form (visual-modeling 5.1), one shape
    per kind of entity: a class's parents, subclasses, attributes and
    relationships; a concept's broader and narrower concepts, its scheme,
    and (ConceptRelations) its related concepts and mappings. A relationship
    or an attribute has a form of its own, RelationshipForm or AttributeForm
    (relationships 5.6, 5.7), which this hands over to. It is the form half
    of every canvas action's keyboard route (5.2, D-078). A class's rules
    (axioms-and-reasoning 5.9) are RulesBlock, between its kinds and its
    attributes and relationships. A class's attributes and relationships
    stand in three groups (attribute-reuse 5.3): its own, those shared with
    other classes, and those it has through a parent.

BASIC IDEA
    The current translator supplies headings, relationship-target guidance
    and shared/inherited group descriptions, without changing draft state,
    reference identities, sharing semantics or command arguments.

    Each list names what is there, as links that select it, with Remove where
    a command takes it away; each "Add …" opens either a picker (to link to
    something that exists) or the names-first form (to make something new).
    A new entity is selected once made, so the form moves to it.

    *Add attribute* and *Add relationship* offer what the project already
    has while the name is typed (attribute-reuse 5.1), and a Create refused
    because the name exists offers the same; either opens the reuse plan
    (ReusePlan, 5.2) under the name, and a finished choice closes the form
    and gives focus to the list the property now stands in. A reuse begun
    on the canvas arrives as the project store's reuseDraft and opens the
    plan here, so every canvas action has its form (D-078).

    A relationship made here gets this class as its domain and, if one is
    chosen, a range, in one CreateObjectProperty: one undo step, as the canvas
    will make it.

INPUTS / INPUT SOURCES (props)
    - ontologyId, iri, name, model: the entity and its blocks.
    - primaryLanguage: for the names-first forms.
    - runner: EditSection's command runner, so busy and refusals are shared.
    - onSelect: select an entity; follow: select what a command made, unless
      the user went elsewhere while it ran (5.8 item 4).

    A closed form gives focus back to the button that opened it (5.8 item
    2). *Add relationship* waits for a range, as 5.1 says (item 10).

EXPECTED OUTPUT
    - Commands through the runner; the block's markup, a property's form, or
      nothing for a kind with no structure to edit.
================================================================================
*/

import { renderProjectNoticeDetail, type ProjectNoticeDetail } from "../modeling/projectNotices";
import { useI18n } from "../i18n/I18nProvider";
import { useEffect, useRef, useState } from "react";
import { alreadyDefined } from "../api";
import { structureOf, type EntityModel, type Ref } from "../modeling/entity";
import { projectStore, useProjectSelector } from "../state/projectStore";
import type { AlreadyDefined, ClassProperty, ClassRules, ModelWarning, SearchKind } from "../types";
import AttributeForm from "./AttributeForm";
import ConceptRelations from "./ConceptRelations";
import { Block, type Runner } from "./EditParts";
import EntityPicker from "./EntityPicker";
import NewEntityForm from "./NewEntityForm";
import RelationshipForm from "./RelationshipForm";
import ReusePlan from "./ReusePlan";
import RulesBlock from "./RulesBlock";

interface Props {
  ontologyId: string;
  iri: string;
  name: string;
  model: EntityModel;
  primaryLanguage: string;
  runner: Runner;
  onSelect: (iri: string) => void;
  follow: (created: string | undefined) => void;
  /** A property's 5.9 warnings, shown under the block each concerns. */
  warnings?: ModelWarning[];
  /** A class's rules (axioms 5.9), shown between its kinds and its
   *  relationships. */
  rules?: ClassRules;
}

/** Which small form is open: at most one at a time. */
type Open =
  | null
  | "parent"
  | "subclass"
  | "attribute"
  | "relationship"
  | "broader"
  | "narrower";

function Links({
  refs,
  empty,
  onSelect,
  remove,
}: {
  refs: Ref[];
  empty: string;
  onSelect: (iri: string) => void;
  remove?: { label: (r: Ref) => string; run: (r: Ref) => void; busy: boolean };
}) {
  const { t } = useI18n();
  if (refs.length === 0) return <p className="detail-note">{empty}</p>;
  return (
    <ul className="edit-list">
      {refs.map((r) => (
        <li key={r.iri}>
          <button type="button" className="term-link" title={r.iri} onClick={() => onSelect(r.iri)}>
            {r.label}
          </button>
          {remove && (
            <button
              type="button"
              className="ghost edit-btn"
              aria-label={remove.label(r)}
              aria-disabled={remove.busy}
              onClick={() => !remove.busy && remove.run(r)}
            >
              {t("editSection.remove")}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A class's attributes or relationships in the three groups of
 *  attribute-reuse 5.3: its own, *Shared with others*, and *Through* each
 *  parent (read-only links). A shared one says so in text, never only by a
 *  colour (5.5); one listed by two domain lines says *(both, see warning)*. */
function PropertyGroups({
  properties,
  kind,
  empty,
  onSelect,
}: {
  properties: ClassProperty[];
  kind: ClassProperty["kind"];
  empty: string;
  onSelect: (iri: string) => void;
}) {
  const { t } = useI18n();
  const mine = properties.filter((p) => p.kind === kind);
  const own = mine.filter((p) => p.how === "own");
  const shared = mine.filter((p) => p.how === "shared" || p.how === "both");
  const through = new Map<string, { via: string; items: ClassProperty[] }>();
  for (const p of mine.filter((p) => p.how === "through" && p.via)) {
    const group = through.get(p.via!.iri) ?? { via: p.via!.label, items: [] };
    group.items.push(p);
    through.set(p.via!.iri, group);
  }
  if (mine.length === 0) return <p className="detail-note">{empty}</p>;
  const link = (p: ClassProperty) => (
    <button type="button" className="term-link" title={p.iri} onClick={() => onSelect(p.iri)}>
      {p.label}
    </button>
  );
  const note = (p: ClassProperty) =>
    p.how === "both"
      ? t("editStructure.both")
      : p.with && p.with.length > 0
        ? t("editStructure.sharedWith", { classes: p.with.map(w => w.label).join(t("editStructure.separator")) })
        : t("editStructure.shared");
  return (
    <>
      {own.length > 0 && (
        <ul className="edit-list">
          {own.map((p) => (
            <li key={p.iri}>{link(p)}</li>
          ))}
        </ul>
      )}
      {shared.length > 0 && (
        <>
          <h6 className="edit-subhead">{t("editStructure.sharedHeading")}</h6>
          <ul className="edit-list">
            {shared.map((p) => (
              <li key={p.iri}>
                {link(p)}
                <span className="detail-note">{note(p)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {[...through.entries()].map(([via, group]) => (
        <div key={via}>
          <h6 className="edit-subhead">{t("editStructure.through", { parent: group.via })}</h6>
          <ul className="edit-list">
            {group.items.map((p) => (
              <li key={p.iri}>{link(p)}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function EditStructure({
  ontologyId,
  iri,
  name,
  model,
  primaryLanguage,
  runner,
  onSelect,
  follow,
  warnings = [],
  rules,
}: Props) {
  const { t, locale } = useI18n();
  const { busy, errors, run, clear } = runner;
  const [open, setOpen] = useState<Open>(null);
  // The button each form was opened from, to give focus back to.
  const openers = useRef<Record<string, HTMLButtonElement | null>>({});
  const [range, setRange] = useState<Ref | null>(null);
  const [pickingRange, setPickingRange] = useState(false);
  // Reuse (attribute-reuse 5.1, 5.2): the property whose plan is open, a
  // create refused because its name exists, and case B's sentence, kept
  // under the list once the form has closed.
  const [reuse, setReuse] = useState<{ iri: string; label: string } | null>(null);
  const [existing, setExisting] = useState<AlreadyDefined | null>(null);
  const [note, setNote] = useState<ProjectNoticeDetail | null>(null);
  const formBox = useRef<HTMLDivElement>(null);
  const lists = useRef<Record<string, HTMLHeadingElement | null>>({});
  const pid = useProjectSelector((s) => s.project?.id ?? null);
  const shape = structureOf(model.kind);

  // Another entity: nothing of this one's reuse stays open. Before the
  // draft's effect, which runs after it on the same mount and must win.
  useEffect(() => {
    setReuse(null);
    setExisting(null);
    setNote(null);
  }, [iri]);
  // A reuse begun on the canvas for this class: open its plan once.
  const draft = useProjectSelector((s) => s.reuseDraft);
  useEffect(() => {
    if (!draft || draft.cls !== iri || shape !== "class") return;
    projectStore.reuseDraftTaken();
    setOpen(draft.kind);
    setExisting(null);
    setReuse({ iri: draft.property, label: draft.label });
  }, [draft, iri, shape]);

  if (!shape) return null;

  const close = () => {
    const was = open;
    if (was) clear(was);
    setOpen(null);
    setRange(null);
    setPickingRange(false);
    setReuse(null);
    setExisting(null);
    if (was) window.setTimeout(() => openers.current[was]?.focus(), 0);
  };
  /** A finished choice: the form closes, and focus goes to the class's
   *  list the property now stands in (5.5). */
  const reused = (which: "attribute" | "relationship") => {
    clear(which);
    setOpen(null);
    setReuse(null);
    setExisting(null);
    window.setTimeout(() => lists.current[which]?.focus(), 0);
  };
  /** The reuse plan in place of the name form's choices, or nothing. */
  const plan = (which: "attribute" | "relationship") =>
    reuse && pid ? (
      <ReusePlan
        pid={pid}
        ontologyId={ontologyId}
        property={reuse}
        cls={{ iri, label: name }}
        runner={runner}
        onDone={() => reused(which)}
        onAlready={(_sentence, facts) => {
          setNote(facts);
          projectStore.say(facts);
          reused(which);
        }}
        onCancel={() => {
          setReuse(null);
          window.setTimeout(() => formBox.current?.querySelector<HTMLInputElement>("input")?.focus(), 0);
        }}
      />
    ) : null;
  /** A create through the runner; a 409 for a property of the same kind
   *  turns into the offer to use it (5.1) rather than a sentence. */
  const createProperty = async (which: "attribute" | "relationship", command: string, args: Record<string, unknown>) => {
    setExisting(null);
    setNote(null);
    const result = await run(which, command, args, undefined, (_message, e) => {
      const found = alreadyDefined(e);
      if (found && found.property.kind === which) setExisting(found);
    });
    if (result) {
      close();
      follow(result.created);
    }
  };
  const suggest = (which: "attribute" | "relationship") => ({
    ontologyId,
    kind: which === "attribute" ? ("datatypeProperty" as const) : ("objectProperty" as const),
    className: name,
    onUse: (property: { iri: string; label: string }) => {
      setExisting(null);
      setReuse(property);
    },
  });
  const existingChoice = existing
    ? {
        sentence: existing.message,
        className: name,
        onUse: () => setReuse({ iri: existing.property.iri, label: existing.property.label }),
        onAnother: () => setExisting(null),
      }
    : null;
  const listHeading = (which: "attribute" | "relationship", text: string) => (
    <h5
      tabIndex={-1}
      ref={(el) => {
        lists.current[which] = el;
      }}
    >
      {text}
    </h5>
  );
  const button = (which: Open, label: string) => (
    <button
      ref={(el) => {
        if (which) openers.current[which] = el;
      }}
      type="button"
      className="ghost"
      onClick={() => setOpen(which)}
    >
      {label}
    </button>
  );
  const picker = (which: Open, kind: SearchKind, label: string, exclude: string[], onPick: (target: string) => Promise<unknown>) => (
    <EntityPicker
      ontologyId={ontologyId}
      kind={kind}
      label={label}
      exclude={[iri, ...exclude]}
      busy={busy}
      error={errors[which ?? ""] || null}
      onCancel={close}
      onPick={async (target) => {
        if (await onPick(target)) close();
      }}
    />
  );
  const create = async (which: string, command: string, args: Record<string, unknown>) => {
    const result = await run(which, command, args);
    if (result) {
      close();
      follow(result.created);
    }
  };

  if (shape === "class") {
    return (
      <Block title={t("editStructure.structure")}>
        <h5>{t("editStructure.parent")}</h5>
        <Links
          refs={model.parents}
          empty={t("editStructure.noParent")}
          onSelect={onSelect}
          remove={{
            busy,
            label: (r) => t("editStructure.removeParent", { parent: r.label, name }),
            run: (r) => void run("parents", "RemoveSubClassOf", { child: iri, parent: r.iri }),
          }}
        />
        {errors.parents && <p className="edit-error">{errors.parents}</p>}
        {open === "parent"
          ? picker("parent", "class", t("editStructure.newParent", { name }), model.parents.map((p) => p.iri), (parent) =>
              run("parent", "AddSubClassOf", { child: iri, parent }),
            )
          : button("parent", t("editStructure.addParent"))}

        <h5>{t("editStructure.subclasses")}</h5>
        <Links refs={model.children} empty={t("editStructure.noSubclasses")} onSelect={onSelect} />
        {open === "subclass" ? (
          <NewEntityForm
            title={t("editSection.subclass", { name })}
            primaryLanguage={primaryLanguage}
            busy={busy}
            error={errors.subclass}
            onCancel={close}
            onSubmit={({ name: label, iri: chosen }) =>
              void create("subclass", "CreateClass", { label, parent: iri, iri: chosen })
            }
          />
        ) : (
          button("subclass", t("editStructure.addSubclass"))
        )}

        {rules && <RulesBlock iri={iri} name={name} rules={rules} runner={runner} onSelect={onSelect} />}

        {listHeading("attribute", t("editStructure.attributes"))}
        {model.properties.length > 0 ? (
          <PropertyGroups properties={model.properties} kind="attribute" empty={t("editStructure.noAttributes")} onSelect={onSelect} />
        ) : (
          <Links refs={model.attributes} empty={t("editStructure.noAttributes")} onSelect={onSelect} />
        )}
        {note && <p className="detail-note">{renderProjectNoticeDetail(note, locale, t)}</p>}
        {open === "attribute" ? (
          <div ref={formBox}>
            <NewEntityForm
              title={t("editStructure.newAttribute", { name })}
              primaryLanguage={primaryLanguage}
              datatypes
              busy={busy}
              error={existing ? null : errors.attribute}
              existing={reuse ? null : existingChoice}
              suggest={reuse ? undefined : suggest("attribute")}
              onCancel={close}
              onSubmit={({ name: label, iri: chosen, datatype }) =>
                void createProperty("attribute", "CreateDatatypeProperty", { label, domain: iri, datatype, iri: chosen })
              }
            />
            {plan("attribute")}
          </div>
        ) : (
          button("attribute", t("editStructure.addAttribute"))
        )}

        {listHeading("relationship", t("editStructure.relationships"))}
        {model.properties.length > 0 ? (
          <PropertyGroups properties={model.properties} kind="relationship" empty={t("editStructure.noRelationships")} onSelect={onSelect} />
        ) : (
          <Links refs={model.relationships} empty={t("editStructure.noRelationships")} onSelect={onSelect} />
        )}
        {open === "relationship" ? (
          <div ref={formBox}>
          <NewEntityForm
            title={t("editStructure.newRelationship", { name })}
            primaryLanguage={primaryLanguage}
            busy={busy}
            error={existing ? null : errors.relationship}
            existing={reuse ? null : existingChoice}
            suggest={reuse ? undefined : suggest("relationship")}
            missing={range ? null : t("editStructure.chooseTarget")}
            onCancel={close}
            onSubmit={({ name: label, iri: chosen }) =>
              range && void createProperty("relationship", "CreateObjectProperty", {
                label,
                domain: iri,
                range: range.iri,
                iri: chosen,
              })
            }
          >
            <div className="edit-range">
              {pickingRange ? (
                <EntityPicker
                  ontologyId={ontologyId}
                  kind="class"
                  label={t("editStructure.targetClass")}
                  onCancel={() => setPickingRange(false)}
                  onPick={(target, label) => {
                    setRange({ iri: target, label });
                    setPickingRange(false);
                  }}
                />
              ) : (
                <p className="detail-note">
                  {t("editStructure.pointsTo", { target: range ? range.label : t("editStructure.noTarget") })}{" "}
                  <button type="button" className="link-btn" onClick={() => setPickingRange(true)}>
                    {t(range ? "editStructure.change" : "editStructure.chooseClass")}
                  </button>
                </p>
              )}
            </div>
          </NewEntityForm>
          {plan("relationship")}
          </div>
        ) : (
          button("relationship", t("editStructure.addRelationship"))
        )}
      </Block>
    );
  }

  if (shape === "property") {
    // Relationships Stage B: each kind of property has its own form (5.6, 5.7).
    return model.kind === "datatypeProperty" ? (
      <AttributeForm
        ontologyId={ontologyId}
        iri={iri}
        name={name}
        model={model}
        runner={runner}
        onSelect={onSelect}
        warnings={warnings}
      />
    ) : (
      <RelationshipForm
        ontologyId={ontologyId}
        iri={iri}
        name={name}
        model={model}
        primaryLanguage={primaryLanguage}
        runner={runner}
        onSelect={onSelect}
        warnings={warnings}
      />
    );
  }

  return (
    <Block title={t("editStructure.structure")}>
      <h5>{t("editStructure.broader")}</h5>
      <Links
        refs={model.broader}
        empty={t("editStructure.noBroader")}
        onSelect={onSelect}
        remove={{
          busy,
          label: (r) => t("editStructure.removeBroader", { broader: r.label, name }),
          run: (r) => void run("broaderList", "RemoveBroader", { concept: iri, broader: r.iri }),
        }}
      />
      {errors.broaderList && <p className="edit-error">{errors.broaderList}</p>}
      {open === "broader"
        ? picker("broader", "concept", t("editStructure.newBroader", { name }), model.broader.map((b) => b.iri), (broader) =>
            run("broader", "AddBroader", { concept: iri, broader }),
          )
        : button("broader", t("editStructure.addBroader"))}

      <h5>{t("editStructure.narrower")}</h5>
      <Links refs={model.narrower} empty={t("editStructure.noNarrower")} onSelect={onSelect} />
      {open === "narrower" ? (
        <NewEntityForm
          title={t("editStructure.newNarrower", { name })}
          primaryLanguage={primaryLanguage}
          busy={busy}
          error={errors.narrower}
          onCancel={close}
          onSubmit={({ name: label, iri: chosen }) =>
            void create("narrower", "CreateConcept", { prefLabel: label, broader: iri, iri: chosen })
          }
        />
      ) : (
        button("narrower", t("editStructure.addNarrower"))
      )}

      {model.schemes.length > 0 && (
        <>
          <h5>{t("editStructure.scheme")}</h5>
          <Links refs={model.schemes} empty="" onSelect={onSelect} />
        </>
      )}

      <ConceptRelations ontologyId={ontologyId} iri={iri} name={name} model={model} runner={runner} onSelect={onSelect} />
    </Block>
  );
}
