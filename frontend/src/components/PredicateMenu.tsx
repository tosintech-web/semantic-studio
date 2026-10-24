/*
================================================================================
FILE: frontend/src/components/PredicateMenu.tsx
================================================================================

SUMMARY
    The popover for a predicate (link) chip: toggle OPTIONAL, pick a path
    modifier (none / * / + / ?), and check one or more relationships (each with
    a direction and provenance badge) — checking several forms an alternation.

BASIC IDEA
    Modifier syntax, predicate IRIs and directions stay in the query state;
    current-language hints and labels are derived at render time.

    Presentational over one StepLink and the list of candidate LinkOptions. It
    calls onChange with a partial StepLink patch; the hook applies it. At least
    one relationship must stay checked.

INPUTS / INPUT SOURCES (props)
    - link: the current hop being edited.
    - anchorLabel / targetLabel: the two classes it connects.
    - options: every relationship that could connect them (from the hook).
    - onChange, onClose: edit and dismiss.

EXPECTED OUTPUT
    - The rendered menu; onChange patches to the hop.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import type { LinkOption } from "../sparql/useQueryBuilder";
import type { Modifier, StepLink } from "../sparql/types";

// Stable syntax values; translated descriptions never enter the query state.
const MODIFIERS: { value: Modifier; code: "exact" | "star" | "plus" | "optional" }[] = [
  { value: "", code: "exact" }, { value: "*", code: "star" },
  { value: "+", code: "plus" }, { value: "?", code: "optional" },
];

interface Props {
  link: StepLink;
  anchorLabel: string;
  targetLabel: string;
  options: LinkOption[];
  onChange: (patch: Partial<StepLink>) => void;
  onClose: () => void;
}

export default function PredicateMenu({
  link,
  anchorLabel,
  targetLabel,
  options,
  onChange,
  onClose,
}: Props) {
  const { t } = useI18n();
  const isChecked = (option: LinkOption) =>
    link.predicates.some((p) => p.iri === option.predicate && p.inverse === option.inverse);

  const toggle = (option: LinkOption) => {
    const checked = isChecked(option);
    if (checked && link.predicates.length === 1) return; // keep at least one
    const predicates = checked
      ? link.predicates.filter(
          (p) => !(p.iri === option.predicate && p.inverse === option.inverse),
        )
      : [...link.predicates, { iri: option.predicate, inverse: option.inverse }];
    onChange({ predicates });
  };

  return (
    <div className="menu-card" onClick={(e) => e.stopPropagation()}>
      <div className="menu-header">
        <strong>
          {anchorLabel} → {targetLabel}
        </strong>
        <button className="icon-btn" onClick={onClose} title={t("queryMenu.close")} aria-label={t("queryMenu.close")}>
          ✕
        </button>
      </div>

      <button
        className={link.optional ? "menu-toggle active" : "menu-toggle"}
        onClick={() => onChange({ optional: !link.optional })}
      >
        <span>{link.optional ? "☑" : "☐"} {t("predicateMenu.optional")}</span>
        <span className="hint">{t("predicateMenu.optionalHint")}</span>
      </button>

      <div className="menu-section">{t("predicateMenu.modifier")}</div>
      {MODIFIERS.map((modifier) => (
        <label className="menu-row" key={modifier.value || "none"}>
          <input
            type="radio"
            name="path-modifier"
            checked={link.modifier === modifier.value}
            onChange={() => onChange({ modifier: modifier.value })}
          />
          <span className="menu-row-main">
            {t(`predicateMenu.modifier.${modifier.code}`)}
            <span className="hint">{t(`predicateMenu.hint.${modifier.code}`)}</span>
          </span>
        </label>
      ))}

      <div className="menu-section">{t("predicateMenu.relationships")}</div>
      {options.length === 0 && <p className="detail-note">{t("predicateMenu.empty")}</p>}
      {options.map((option, index) => (
        <label className="menu-row" key={`${option.predicate}|${option.inverse}`}>
          <input
            type="checkbox"
            checked={isChecked(option)}
            onChange={() => toggle(option)}
          />
          <span className="menu-row-main">
            <span>
              {option.inverse && <span className="dir-badge">^</span>}
              {option.label}
              {index === 0 && <span className="primary-badge">{t("predicateMenu.primary")}</span>}
            </span>
            <span className="hint">
              {t(option.inverse ? "predicateMenu.inverse" : "predicateMenu.forward")} · {option.prefixed}
              {option.declared ? t("predicateMenu.declared") : ""}
              {option.restriction && !option.declared ? t("predicateMenu.restriction") : ""}
              {option.inherited ? t("predicateMenu.inherited") : ""}
              {option.count > 0 ? t("predicateMenu.count", { count: option.count }) : ""}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
