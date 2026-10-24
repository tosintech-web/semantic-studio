/*
================================================================================
FILE: frontend/src/components/ExampleForm.tsx
================================================================================

SUMMARY
    The blocks of an example's form (shacl-authoring 5.8): which classes it
    is an example of, and one field per attribute and relationship those
    classes have, their own and inherited -- an attribute entered as its
    type of value, a relationship chosen from the examples of its end
    class. EditSection shows them in place of a class's structure.

BASIC IDEA
    UI locale changes only guidance, value hints and actions. Each property
    keeps the same editor, value/language draft and original command facts.
    English articles are applied only for the English example-choice prompt.

    The fields come from the server with the entity's statements, so the
    form costs no request of its own and refreshes with the panel on each
    revision. Every change is one command (modeling/examples.ts says which),
    one undo step, through the section's runner.

    A wrong value is refused before it is sent (row S22): Add stays
    aria-disabled with the type's sentence under the field, the same check
    and the same words the server would answer with. aria-disabled rather
    than disabled, so a keyboard user standing on it keeps their place.

    After Remove, and after a link that used the last choice, the button
    that had focus is gone: focus goes to the field's next control, or to
    its heading when it has none left, never to the page (PR #51 review).
    A yes/no field starts at yes, as the annotation adder does.

INPUTS / INPUT SOURCES (props)
    - iri, name, example: the example and its classes and fields.
    - primaryLanguage, languages: for text in a language.
    - runner: the section's command runner; onSelect: follow a link.

EXPECTED OUTPUT
    - The Example of and Values blocks; commands through the runner.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { useEffect, useId, useRef, useState } from "react";
import { fieldCommand, fieldProblem, fieldStart, fieldType, fieldValue, typeWords } from "../modeling/examples";
import { a } from "../modeling/sentences";
import type { ExampleField, ExampleInfo } from "../types";
import { ValueInput } from "./AnnotationAdder";
import { Block, type Runner } from "./EditParts";

interface Props {
  iri: string;
  name: string;
  example: ExampleInfo;
  primaryLanguage: string;
  languages: string[];
  runner: Runner;
  onSelect: (iri: string) => void;
}

export default function ExampleForm({ iri, name, example, primaryLanguage, languages, runner, onSelect }: Props) {
  const { t } = useI18n();
  const langs = [primaryLanguage, ...languages.filter((l) => l !== primaryLanguage)];
  const classes = example.classes;
  return (
    <>
      <Block title={t("exampleForm.classes")}>
        {classes.length === 0 ? (
          <p className="detail-note">{t("exampleForm.noClass")}</p>
        ) : (
          <ul className="edit-list">
            {classes.map((c) => (
              <li key={c.iri}>
                <button type="button" className="link-btn" onClick={() => onSelect(c.iri)}>
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title={t("exampleForm.values")}>
        {example.fields.length === 0 ? (
          <p className="detail-note">
            {classes.length
              ? t("exampleForm.noFields", { classes: classes.map(c => c.label).join(t("exampleForm.classJoin")) })
              : t("exampleForm.nothing")}
          </p>
        ) : (
          example.fields.map((field) => (
            <FieldEditor
              key={field.property}
              iri={iri}
              name={name}
              field={field}
              primaryLanguage={primaryLanguage}
              languages={langs}
              runner={runner}
              onSelect={onSelect}
            />
          ))
        )}
      </Block>
    </>
  );
}

interface FieldProps {
  iri: string;
  name: string;
  field: ExampleField;
  primaryLanguage: string;
  languages: string[];
  runner: Runner;
  onSelect: (iri: string) => void;
}

function FieldEditor({ iri, name, field, primaryLanguage, languages, runner, onSelect }: FieldProps) {
  const { locale, t } = useI18n();
  const id = useId();
  const { busy, errors, run } = runner;
  const key = `example:${field.property}`;
  const [raw, setRaw] = useState(() => fieldStart(field));
  const [lang, setLang] = useState(primaryLanguage);
  // What the learner has typed is judged once they have typed something; an
  // empty field is not yet wrong, only not ready.
  const problem = fieldProblem(field, raw, lang, t);
  const shown = raw !== "" && field.kind === "attribute" ? problem : null;
  const inputArea = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const relationship = field.kind === "relationship";
  const command = fieldCommand(field);
  const action = command === "SetExampleValue" && field.values.length ? "change" : relationship ? "link" : "add";
  const options = (field.options ?? []).filter((o) => !field.values.some((v) => v.value === o.iri));

  /** The field's next control once the one that had focus has gone, or its
   *  heading when the field has none left. */
  const focusField = () =>
    window.setTimeout(() => {
      const next = inputArea.current?.querySelector<HTMLElement>("input, textarea, select, button");
      (next ?? headingRef.current)?.focus();
    }, 0);
  // The panel refetches after a change, and the new field may have lost the
  // control focus was just given (the last choice linked): once it arrives,
  // focus that has fallen to the page comes back to the field.
  const placing = useRef(false);
  const settle = () => {
    placing.current = true;
    focusField();
  };
  useEffect(() => {
    if (!placing.current) return;
    placing.current = false;
    const now = document.activeElement;
    if (!now || now === document.body) focusField();
  }, [field]);

  const submit = async () => {
    if (busy || problem) return;
    const result = await run(key, command, { iri, property: field.property, value: fieldValue(field, raw, lang) });
    if (result) {
      setRaw(fieldStart(field));
      // The last choice linked takes the select and its button with it.
      if (relationship) settle();
    }
  };

  return (
    <div className="example-field" role="group" aria-labelledby={`${id}-name`}>
      <h5 id={`${id}-name`} ref={headingRef} tabIndex={-1}>
        {field.label}
        <span className="detail-note">
          {t(field.functional ? "exampleForm.hint.single" : "exampleForm.hint.multi", {
            description: relationship ? field.rangeLabel ? t("exampleForm.to", { target: field.rangeLabel }) : t("exampleForm.anyEnd") : typeWords(field, t),
          })}
        </span>
      </h5>
      {field.values.length > 0 && (
        <ul className="edit-list">
          {field.values.map((v) => (
            <li key={`${v.kind}|${v.datatype ?? ""}|${v.lang ?? ""}|${v.value}`} className="edit-value">
              {v.kind === "link" ? (
                <button type="button" className="link-btn" onClick={() => onSelect(v.value)}>
                  {v.label ?? v.value}
                </button>
              ) : (
                <span>
                  {v.value}
                  {v.lang ? ` (${v.lang})` : ""}
                </span>
              )}
              <button
                type="button"
                className="ghost edit-btn"
                aria-label={t("exampleForm.remove", { value: v.label ?? v.value, label: field.label, name })}
                aria-disabled={busy}
                onClick={async () => {
                  if (busy) return;
                  const value = v.kind === "link" ? { kind: "link", value: v.value } : v;
                  if (await run(key, "RemoveExampleValue", { iri, property: field.property, value })) settle();
                }}
              >
                {t("editSection.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={inputArea} className="example-field-input">
        {relationship ? (
          options.length === 0 && !raw ? (
            <p className="detail-note">
              {field.values.length
                ? t("exampleForm.noOther", { target: field.rangeLabel ?? t("exampleForm.example") })
                : t("exampleForm.noTarget", { target: field.rangeLabel ?? t("exampleForm.example"), cls: field.rangeLabel ?? t("exampleForm.class") })}
            </p>
          ) : (
            <>
              <label htmlFor={`${id}-choice`} className="edit-field-label">
                {action === "change" ? t("exampleForm.changeLabel", { label: field.label }) : t("exampleForm.linkTo")}
              </label>
              <select id={`${id}-choice`} value={raw} aria-disabled={busy} onChange={(e) => !busy && setRaw(e.target.value)}>
                <option value="">{t("exampleForm.choose", { target: field.rangeLabel ? locale === "en" ? a(field.rangeLabel) : field.rangeLabel : t("exampleForm.anyExample") })}</option>
                {options.map((o) => (
                  <option key={o.iri} value={o.iri}>
                    {o.label}
                  </option>
                ))}
              </select>
              {(field.optionsTotal ?? 0) > (field.options?.length ?? 0) && (
                <p className="detail-note">
                  {t("exampleForm.options", { shown: field.options?.length ?? 0, total: field.optionsTotal ?? 0 })}
                </p>
              )}
            </>
          )
        ) : (
          <ValueInput
            type={fieldType(field)}
            value={raw}
            lang={lang}
            languages={languages}
            label={action === "change" ? t("exampleForm.newValue", { label: field.label }) : field.label}
            busy={busy}
            describedBy={shown ? `${id}-problem` : undefined}
            invalid={Boolean(shown)}
            onChange={(value, nextLang) => {
              setRaw(value);
              setLang(nextLang);
            }}
          />
        )}
        {shown && (
          <p id={`${id}-problem`} className="edit-error">
            {shown}
          </p>
        )}
        {(options.length > 0 || raw || !relationship) && (
          <div className="edit-actions">
            <button
              type="button"
              className="primary"
              aria-disabled={busy || Boolean(problem)}
              aria-describedby={shown ? `${id}-problem` : undefined}
              onClick={() => void submit()}
            >
              {t(`exampleForm.action.${action}`, { label: field.label })}
            </button>
          </div>
        )}
        {errors[key] && <p className="edit-error">{errors[key]}</p>}
      </div>
    </div>
  );
}
