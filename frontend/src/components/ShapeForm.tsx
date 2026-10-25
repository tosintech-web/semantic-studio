/*
================================================================================
FILE: frontend/src/components/ShapeForm.tsx
================================================================================

SUMMARY
    Read-only titles use displayName; the editable name and its draft remain original.
    Read names follow the selected dictionary language independently of UI locale.
    The form of the one selected shape (shacl-authoring 5.3, 5.4, 5.5): its
    sentence, what it applies to, its name, its rules -- each a sentence with
    Edit and Remove, and one rule editor at a time -- the rules the model
    suggests, how serious a failure is and its message, and Delete. A shape
    written in Turtle with parts the form cannot edit is shown read-only:
    its sentence where the parts are known, what it uses that the form does
    not, and Edit in Turtle.

BASIC IDEA
    Read-only reasons use aligned producer facts in the current UI locale, with
    original details and identities preserved. Translated placeholder names are
    display-only; the name input still edits only an authored RDF label.

    Fetch failures retain their original cause. Display metadata follows the UI
    locale at render time, with escaped original details kept separately.

    Shared runner errors retain their original text in a keyboard-accessible disclosure.
    Every control is one command on shapes.ttl through the shared runner
    (EditParts.useRunner, pointed at the shapes document), so every change
    is one undo step and a refusal shows under the field that caused it.
    The shape itself is the server's reading, fetched again by ShapesView on
    every revision of either document; the form keeps nothing of its own
    but which editor is open.

    Suggestions come from the server, worked out from the same graph the
    form shows (5.4): fetched when the shape or either document changes,
    each with Add, none added by itself, and none offered once a rule says
    it. Add merges into the rule already on that path, as one step.

    Delete counts the rules first, in a confirmation, before DeleteShape.

    Focus is never left on the page (Stage B follow-up 6, row S19): Cancel in
    the rule editor returns it to the rule's Edit, a saved rule's Edit takes
    it, and Remove gives it to the next rule, else + Add a rule. The
    sentence has no live region of its own: the project's announces each
    change once (follow-up 7).

INPUTS / INPUT SOURCES (props)
    - projectId, shape, modelOntologyId (the class picker searches the
      model), languages, revisions (to refetch suggestions).
    - onDeleted, onEditInTurtle.

EXPECTED OUTPUT
    - The form; shape commands through the project store.
================================================================================
*/

import { renderServerError, renderServerMessage, validWireMessage } from "../i18n/serverMessage";
import { useDictionaryDisplayLanguage } from "../dictionary/useDictionaryLanguage";
import { useI18n } from "../i18n/I18nProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { getShapeSuggestions } from "../api";
import { everyWord, pathWords, ruleSentence, shapeSentence } from "../modeling/shapeSentences";
import type { ShapeForm as Shape, ShapePath, ShapeRule, ShapeSuggestions } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import { RunnerErrorDetails, Block, InlineText, useRunner, useReturnFocus } from "./EditParts";
import EntityPicker from "./EntityPicker";
import RuleEditor from "./RuleEditor";

interface Props {
  projectId: string;
  shape: Shape;
  modelOntologyId: string;
  languages: string[];
  revisions: string;
  onDeleted: () => void;
  onEditInTurtle: (shape: Shape) => void;
}

const key = (path: string[]) => path.join(" ");

export default function ShapeForm({
  projectId,
  shape,
  modelOntologyId,
  languages,
  revisions,
  onDeleted,
  onEditInTurtle,
}: Props) {
  const { t, locale } = useI18n();
  const readingLanguage = useDictionaryDisplayLanguage();
  const displayName = validWireMessage(shape.nameUiMessage) ? renderServerMessage(shape.nameUiMessage, shape.name, t) : (shape.displayName ?? shape.name);
  const runner = useRunner("shapes");
  const { busy, errors, run } = runner;
  const [suggestions, setSuggestions] = useState<ShapeSuggestions | null>(null);
  const [suggestError, setSuggestError] = useState<{ error: unknown } | null>(null);
  // One editor at a time: "new", a rule's path key, or nothing.
  const [editing, setEditing] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addRef, restoreAdd] = useReturnFocus();
  const [targetRef, restoreTarget] = useReturnFocus();
  const deleteRef = useRef<HTMLButtonElement>(null);
  // Each rule's Edit button, by path: where focus goes back to after Cancel,
  // and the next rule's after a Remove took the button that had it
  // (Stage A follow-up 6, row S19).
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusLater = (target: () => HTMLElement | null | undefined) =>
    window.setTimeout(() => target()?.focus(), 0);

  // A different shape opens with nothing open.
  useEffect(() => {
    setEditing(null);
    setPicking(false);
    setConfirmDelete(false);
  }, [shape.id]);

  const target = shape.target?.iri ?? null;
  useEffect(() => {
    if (!target || !shape.editable) {
      setSuggestions(null);
      return;
    }
    let live = true;
    (readingLanguage === undefined ? getShapeSuggestions(projectId, target, shape.id) : getShapeSuggestions(projectId, target, shape.id, readingLanguage))
      .then((s) => {
        if (!live) return;
        setSuggestions(s);
        setSuggestError(null);
      })
      .catch((e: unknown) => live && setSuggestError({ error: e }));
    return () => {
      live = false;
    };
  }, [projectId, target, shape.id, shape.editable, revisions, readingLanguage]);

  // The paths the rule editor offers, with any a rule already uses (a rule
  // written in Turtle may be on a path the model does not suggest).
  const paths: ShapePath[] = useMemo(() => {
    const out = [...(suggestions?.paths ?? [])];
    for (const rule of shape.rules) {
      if (!out.some((p) => key(p.path) === key(rule.path))) {
        out.push({ path: rule.path, label: pathWords(rule, locale), kind: rule.pathKind ?? "other" });
      }
    }
    return out;
  }, [suggestions, shape.rules, locale]);

  const sentence = shapeSentence(shape, locale);

  if (!shape.editable) {
    return (
      <section className="shape-form read-only" aria-labelledby="shape-form-heading">
        <h3 id="shape-form-heading" tabIndex={-1}>
          {displayName}
        </h3>
        <p className="shape-sentence">{sentence}</p>
        <p className="detail-note">
          {t("shapeForm.readonly")}
        </p>
        <ul className="shape-unsupported">
          {shape.unsupported.map((part, index) => {
            const described = shape.unsupportedUiMessages != null;
            const message = shape.unsupportedUiMessages?.[index];
            return <li key={part}>
              <p>{!described ? part : validWireMessage(message) ? renderServerMessage(message, part, t) : t("shape.readonly.unknown")}</p>
              {described && <details className="technical-details"><summary>{t("common.details")}</summary><pre>{part}</pre></details>}
            </li>;
          })}
        </ul>
        <button type="button" className="primary" onClick={() => onEditInTurtle(shape)}>
          {t("shapeForm.turtle")}
        </button>
      </section>
    );
  }

  const submitRule = async (rule: ShapeRule, replacing: ShapeRule | null) => {
    const result = replacing
      ? await run("rule", "ReplaceRule", { shape: shape.id, path: replacing.path, rule })
      : await run("rule", "AddRule", { shape: shape.id, rule });
    if (result) {
      setEditing(null);
      // A changed rule keeps its place: focus its Edit, once the list holds
      // it under its (possibly new) path.
      if (replacing) focusLater(() => editButtons.current.get(key(rule.path)) ?? addRef.current);
      else restoreAdd();
    }
  };

  const removeRule = async (rule: ShapeRule) => {
    if (busy) return;
    const keys = shape.rules.map((r) => key(r.path));
    const at = keys.indexOf(key(rule.path));
    // The rule after it, else the one before, else + Add a rule.
    const next = keys[at + 1] ?? keys[at - 1] ?? null;
    if (await run("rule", "RemoveRule", { shape: shape.id, path: rule.path })) {
      focusLater(() => (next ? editButtons.current.get(next) : null) ?? addRef.current);
    }
  };

  const ruleCount = shape.rules.length;
  return (
    <section className="shape-form" aria-labelledby="shape-form-heading">
      <h3 id="shape-form-heading" tabIndex={-1}>
        {displayName}
      </h3>
      <p className="shape-sentence">{sentence}</p>

      <Block title={t("shapeForm.applies")}>
        {picking ? (
          <EntityPicker
            ontologyId={modelOntologyId}
            kind="class"
            label={t("shapeForm.targetPicker")}
            busy={busy}
            error={errors.target}
            onPick={async (iri) => {
              if (await run("target", "SetShapeTarget", { shape: shape.id, target: iri })) {
                setPicking(false);
                restoreTarget();
              }
            }}
            onCancel={() => {
              setPicking(false);
              restoreTarget();
            }}
          />
        ) : (
          <div className="edit-value">
            <span>{shape.target ? shape.target.every ? locale === "en" ? shape.target.every : everyWord(shape, locale) : shape.target.label : t("shapeForm.noTarget")}</span>
            <button ref={targetRef} type="button" className="ghost edit-btn" onClick={() => setPicking(true)}>
              {t("shapeForm.change")}
            </button>
          </div>
        )}
      </Block>

      <Block title={t("shapeForm.name")}>
        <InlineText
          label={t("shapeForm.nameInput")}
          value={shape.named ? shape.name : null}
          busy={busy}
          error={errors.name}
          onSave={async (value) => (await run("name", "SetShapeName", { shape: shape.id, value })) !== null}
        />
      </Block>

      <Block title={t("shapeForm.rules")}>
        {ruleCount === 0 && <p className="detail-note">{t("shapeForm.empty")}</p>}
        <ul className="shape-rules">
          {shape.rules.map((rule) =>
            editing === key(rule.path) ? (
              <li key={key(rule.path)}>
                <RuleEditor
                  modelOntologyId={modelOntologyId}
                  paths={paths}
                  initial={rule}
                  languages={languages}
                  busy={busy}
                  error={errors.rule}
                  onSubmit={(next) => void submitRule(next, rule)}
                  onCancel={() => {
                    setEditing(null);
                    focusLater(() => editButtons.current.get(key(rule.path)));
                  }}
                />
              </li>
            ) : (
              <li key={key(rule.path)} className="shape-rule">
                <span>{ruleSentence(rule, locale)}</span>
                <span className="shape-rule-actions">
                  <button
                    ref={(el) => {
                      if (el) editButtons.current.set(key(rule.path), el);
                      else editButtons.current.delete(key(rule.path));
                    }}
                    type="button"
                    className="ghost edit-btn"
                    aria-label={t("shapeForm.editLabel", { path: pathWords(rule, locale) })}
                    onClick={() => setEditing(key(rule.path))}
                  >
                    {t("shapeForm.edit")}
                  </button>
                  <button
                    type="button"
                    className="ghost edit-btn"
                    aria-label={t("shapeForm.removeLabel", { path: pathWords(rule, locale) })}
                    aria-disabled={busy}
                    onClick={() => void removeRule(rule)}
                  >
                    {t("shapeForm.remove")}
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
        {editing === "new" ? (
          <RuleEditor
            modelOntologyId={modelOntologyId}
            paths={paths}
            initial={null}
            languages={languages}
            busy={busy}
            error={errors.rule}
            onSubmit={(next) => void submitRule(next, null)}
            onCancel={() => {
              setEditing(null);
              restoreAdd();
            }}
          />
        ) : (
          <button ref={addRef} type="button" className="ghost" onClick={() => setEditing("new")}>
            {t("shapeForm.add")}
          </button>
        )}
        {editing !== "new" && editing === null && errors.rule && <p className="edit-error">{errors.rule}</p>}
      </Block>

      <Block title={t("shapeForm.suggested")}>
        {suggestError && <><p className="edit-error">{renderServerError(suggestError.error, t)}</p>
          <details><summary>{t("common.details")}</summary><pre>{suggestError.error instanceof Error ? suggestError.error.message : String(suggestError.error)}</pre></details></>}
        {!target ? (
          // A shape written in Turtle with no target class (found in review):
          // there is nothing to suggest from until it has one.
          <p className="detail-note">{t("shapeForm.chooseTarget")}</p>
        ) : !suggestions ? (
          !suggestError && <p className="detail-note">{t("shapeForm.reading")}</p>
        ) : suggestions.suggestions.length === 0 ? (
          <p className="detail-note">{t("shapeForm.allSuggested")}</p>
        ) : (
          <ul className="shape-suggestions">
            {suggestions.suggestions.map((s) => (
              <li key={s.id} className="shape-rule">
                <span>{ruleSentence(s.rule, locale)}</span>
                <button
                  type="button"
                  className="ghost edit-btn"
                  aria-label={t("shapeForm.suggestionLabel", { sentence: ruleSentence(s.rule, locale) })}
                  aria-disabled={busy}
                  onClick={() => !busy && void run("suggestion", "AddRule", { shape: shape.id, rule: s.rule, merge: true })}
                >
                  {t("shapeForm.addSuggestion")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {errors.suggestion && <p className="edit-error">{errors.suggestion}</p>}
      </Block>

      <Block title={t("shapeForm.more")}>
        <fieldset className="shape-severity">
          <legend>{t("shapeForm.severity")}</legend>
          {(["violation", "warning"] as const).map((severity) => (
            <label key={severity} className="rule-check">
              <input
                type="radio"
                name={`severity-${shape.id}`}
                checked={shape.severity === severity}
                aria-disabled={busy}
                onChange={() => !busy && void run("severity", "SetShapeSeverity", { shape: shape.id, severity })}
              />
              {t(severity === "violation" ? "shapeForm.violation" : "shapeForm.warning")}
            </label>
          ))}
        </fieldset>
        {errors.severity && <p className="edit-error">{errors.severity}</p>}
        <h5>{t("shapeForm.failureMessage")}</h5>
        <InlineText
          label={t("shapeForm.message")}
          value={shape.message}
          multiline
          busy={busy}
          error={errors.message}
          onSave={async (value) => (await run("message", "SetShapeMessage", { shape: shape.id, value })) !== null}
        />
      </Block>

      <Block title={t("shapeForm.delete")}>
        <button ref={deleteRef} type="button" className="ghost danger" onClick={() => setConfirmDelete(true)}>
          {t("shapeForm.deleteThis")}
        </button>
        {errors.delete && <p className="edit-error">{errors.delete}</p>}
      </Block>

      {confirmDelete && (
        <ConfirmDialog
          title={t("shapeForm.deleteQuestion", { name: displayName })}
          escape="cancel"
          busy={busy}
          actions={[
            { id: "delete", label: t("shapeForm.delete"), danger: true, primary: true },
            { id: "cancel", label: t("shapeForm.cancel") },
          ]}
          onAnswer={async (answer) => {
            if (answer !== "delete") {
              setConfirmDelete(false);
              window.setTimeout(() => deleteRef.current?.focus(), 0);
              return;
            }
            if (await run("delete", "DeleteShape", { shape: shape.id })) {
              setConfirmDelete(false);
              onDeleted();
            } else {
              setConfirmDelete(false);
            }
          }}
        >
          <p>
            {ruleCount === 0 ? t("shapeForm.deleteEmpty") : ruleCount === 1 ? t("shapeForm.deleteOne") : t("shapeForm.deleteMany", { count: ruleCount })}
          </p>
        </ConfirmDialog>
      )}
      <RunnerErrorDetails runner={runner} />
    </section>
  );
}
