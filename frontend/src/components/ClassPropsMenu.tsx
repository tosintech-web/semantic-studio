/*
================================================================================
FILE: frontend/src/components/ClassPropsMenu.tsx
================================================================================

SUMMARY
    The popover for a class chip: choose which data (literal) properties to
    return for that step, and optionally add a filter to each (operator + value),
    with the operator set and input type chosen from the property's datatype.
    Also unpins a pinned individual.

BASIC IDEA
    Current-language labels are derived from original QueryStep facts; UI
    locale changes preserve filter inputs, selected properties and query text.

    Presentational over one QueryStep and the class's available data properties.
    Toggling a property adds/removes it; a filter forces the property present
    (so its "optional" toggle disables). Datatype drives which operators and
    input control are offered. It calls onChange with a partial QueryStep patch.

INPUTS / INPUT SOURCES (props)
    - step: the step being edited.
    - available: the class's data properties (from the hook, incl. inherited).
    - onChange, onClose: edit and dismiss.

EXPECTED OUTPUT
    - The rendered menu; onChange patches to the step (props / pin).
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { translateParts } from "../i18n/parts";
import { NUMERIC_TYPES, TEMPORAL_TYPES } from "../sparql/generate";
import type { FilterOp, QueryStep, SelectedProp } from "../sparql/types";
import type { SchemaDataProp } from "../types";

const XSD = "http://www.w3.org/2001/XMLSchema#";

/** Datatypes with a native HTML input; other ordered types fall back to text. */
const NATIVE_INPUTS: Record<string, string> = {
  [`${XSD}date`]: "date",
  [`${XSD}dateTime`]: "datetime-local",
  [`${XSD}time`]: "time",
};

function opsFor(datatype?: string): FilterOp[] {
  if (datatype && (NUMERIC_TYPES.has(datatype) || TEMPORAL_TYPES.has(datatype))) {
    return ["=", "!=", ">", ">=", "<", "<="];
  }
  return ["=", "!=", "contains", "startsWith", "lang"];
}

function inputTypeFor(datatype?: string): string {
  if (!datatype) return "text";
  if (NUMERIC_TYPES.has(datatype)) return "number";
  return NATIVE_INPUTS[datatype] ?? "text";
}

interface Props {
  step: QueryStep;
  available: SchemaDataProp[];
  onChange: (patch: Partial<QueryStep>) => void;
  onClose: () => void;
}

export default function ClassPropsMenu({ step, available, onChange, onClose }: Props) {
  const { locale, t } = useI18n();
  const selectedByIri = new Map(step.props.map((p) => [p.predicateIri, p]));

  const setProps = (props: SelectedProp[]) => onChange({ props });

  const toggle = (prop: SchemaDataProp) => {
    if (selectedByIri.has(prop.predicate)) {
      setProps(step.props.filter((p) => p.predicateIri !== prop.predicate));
    } else {
      setProps([
        ...step.props,
        {
          predicateIri: prop.predicate,
          label: prop.label,
          datatype: prop.datatype,
          optional: true,
        },
      ]);
    }
  };

  const patchProp = (iri: string, patch: Partial<SelectedProp>) =>
    setProps(step.props.map((p) => (p.predicateIri === iri ? { ...p, ...patch } : p)));

  return (
    <div className="menu-card" onClick={(e) => e.stopPropagation()}>
      <div className="menu-header">
        <strong>{t("propsMenu.title", { name: step.label })}</strong>
        <button className="icon-btn" onClick={onClose} title={t("queryMenu.close")} aria-label={t("queryMenu.close")}>
          ✕
        </button>
      </div>

      {step.pin && (
        <div className="pin-row">
          <span>
            {translateParts(locale, "propsMenu.pinned", { name: step.pin }).map((part, index) => typeof part === "string" ? part : <strong key={index}>{part.label}</strong>)}
          </span>
          <button className="ghost" onClick={() => onChange({ pin: null })}>
            {t("propsMenu.unpin", { name: step.label })}
          </button>
        </div>
      )}

      {available.length === 0 && (
        <p className="detail-note">{t("propsMenu.empty")}</p>
      )}

      {available.length > 0 && (
        <div className="menu-actions">
          <button
            className="ghost"
            onClick={() =>
              setProps(
                available.map((prop) => ({
                  predicateIri: prop.predicate,
                  label: prop.label,
                  datatype: prop.datatype,
                  optional: selectedByIri.get(prop.predicate)?.optional ?? true,
                  filter: selectedByIri.get(prop.predicate)?.filter,
                })),
              )
            }
          >
            {t("propsMenu.all")}
          </button>
          <button className="ghost" onClick={() => setProps([])}>
            {t("propsMenu.clear")}
          </button>
        </div>
      )}

      {available.map((prop) => {
        const selected = selectedByIri.get(prop.predicate);
        const filterActive = !!selected?.filter && selected.filter.value.trim() !== "";
        return (
          <div className="prop-row" key={prop.predicate}>
            <label className="menu-row">
              <input type="checkbox" checked={!!selected} onChange={() => toggle(prop)} />
              <span className="menu-row-main">
                {prop.label}
                <span className="hint">
                  {prop.datatypePrefixed}
                  {prop.count > 0 ? t("propsMenu.count", { count: prop.count }) : ""}
                </span>
              </span>
            </label>

            {selected && (
              <div className="filter-row">
                <select
                  value={selected.filter?.op ?? ""}
                  onChange={(e) =>
                    patchProp(prop.predicate, {
                      filter: e.target.value
                        ? {
                            op: e.target.value as FilterOp,
                            value: selected.filter?.value ?? "",
                          }
                        : undefined,
                    })
                  }
                  title={t("propsMenu.operator")} aria-label={t("propsMenu.operator")}
                >
                  <option value="">{t("propsMenu.noFilter")}</option>
                  {opsFor(prop.datatype).map((op) => (
                    <option key={op} value={op}>
                      {t(`propsMenu.op.${op}`)}
                    </option>
                  ))}
                </select>
                {selected.filter && (
                  <input
                    type={selected.filter.op === "lang" ? "text" : inputTypeFor(prop.datatype)}
                    value={selected.filter.value}
                    placeholder={selected.filter.op === "lang" ? "en" : t("propsMenu.value")}
                    aria-label={t("propsMenu.valueLabel", { label: prop.label })}
                    onChange={(e) =>
                      patchProp(prop.predicate, {
                        filter: { op: selected.filter!.op, value: e.target.value },
                      })
                    }
                  />
                )}
                <button
                  className={selected.optional && !filterActive ? "toggle-pill active" : "toggle-pill"}
                  disabled={filterActive}
                  onClick={() => patchProp(prop.predicate, { optional: !selected.optional })}
                  title={
                    filterActive
                      ? t("propsMenu.required")
                      : t("propsMenu.optionalHint")
                  }
                >
                  {t("propsMenu.optional")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
