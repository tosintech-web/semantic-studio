/*
================================================================================
FILE: frontend/src/components/PathBar.tsx
================================================================================

SUMMARY
    The chip bar at the top of the query panel showing the query PATH: numbered
    class chips with predicate chips between them, plus per-step remove and a
    clear-all. Clicking a chip opens its menu (class -> properties; predicate ->
    relationship options).

BASIC IDEA
    Purely presentational over the QueryState. It signals which chip's menu
    should open (via onOpenMenu / the OpenMenu type), shows branch markers (dN)
    when a hop attaches to an earlier step, pins, and property counts. The
    actual menus and edits live in sibling components / the hook.

INPUTS / INPUT SOURCES (props)
    - state + stepVars: the path to render and its variable names.
    - theme, classKinds, rdfsClasses, labelFor: for colours and labels;
      a class the graph draws as RDFS-only takes that colour here too.
    - openMenu + onOpenMenu: which chip's menu is open.
    - onRemoveStep, onClear: edit actions.

EXPECTED OUTPUT
    - The rendered path bar; menu-open and edit callbacks.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { formatNumber } from "../i18n/format";
import type { QueryState } from "../sparql/types";
import type { Theme } from "../types";
import { kindColor } from "../types";

// Identifies which chip's popover menu is open: a class chip or a predicate chip.
export interface OpenMenu {
  kind: "class" | "link";
  index: number;
}

interface Props {
  state: QueryState;
  stepVars: string[];
  theme: Theme;
  classKinds: Record<string, string>;
  /** Classes the graph draws as RDFS-only (classType "rdfs"). The schema
   *  carries no class type yet (U-12), so a class the graph's budget left
   *  out is shown in the OWL colour. */
  rdfsClasses?: ReadonlySet<string>;
  labelFor: (iri: string) => string;
  openMenu: OpenMenu | null;
  onOpenMenu: (menu: OpenMenu | null) => void;
  onRemoveStep: (index: number) => void;
  onClear: () => void;
}

export default function PathBar({
  state,
  stepVars,
  theme,
  classKinds,
  rdfsClasses,
  labelFor,
  openMenu,
  onOpenMenu,
  onRemoveStep,
  onClear,
}: Props) {
  const { t, locale } = useI18n();
  // A class's colour as the graph draws it; an unknown or inherited kind is
  // "other" (X-6), an absent one a class.
  const stepColor = (iri: string) =>
    kindColor(classKinds[iri] ?? "class", theme, rdfsClasses?.has(iri) ? "rdfs" : undefined);

  if (state.steps.length === 0) {
    return (
      <div className="path-bar empty">
        <span className="path-label">{t("path.title")}</span>
        <span className="hint">{t("path.empty")}</span>
      </div>
    );
  }

  return (
    <div className="path-bar">
      <span className="path-label">{t("path.title")}</span>
      {state.steps.map((step, index) => {
        const link = step.link;
        const isOpenClass = openMenu?.kind === "class" && openMenu.index === index;
        const isOpenLink = openMenu?.kind === "link" && openMenu.index === index;
        const predicateText = link
          ? link.predicates
              .map((p) => `${p.inverse ? "^" : ""}${labelFor(p.iri)}`)
              .join(" | ") + (link.modifier || "")
          : "";
        const branched = link && link.anchor !== index - 1;
        return (
          <span className="path-group" key={index}>
            {link && (
              <>
                <span className="path-arrow">→</span>
                <button
                  className={[
                    "chip chip-pred",
                    link.optional ? "optional" : "",
                    isOpenLink ? "open" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onOpenMenu(isOpenLink ? null : { kind: "link", index })}
                  title={
                    t("path.linkHint", { step: link.anchor + 1 })
                  }
                >
                  {branched && <span className="chip-branch">↳{link.anchor + 1}</span>}
                  {predicateText}
                  {link.optional && <span className="chip-flag">{t("path.optional")}</span>}
                </button>
                <span className="path-arrow">→</span>
              </>
            )}
            <button
              className={["chip chip-class", isOpenClass ? "open" : ""].filter(Boolean).join(" ")}
              onClick={() => onOpenMenu(isOpenClass ? null : { kind: "class", index })}
              title={t("path.classHint", { variable: stepVars[index] })}
              style={{
                borderColor: stepColor(step.classIri),
              }}
            >
              <span
                className="chip-index"
                style={{ background: stepColor(step.classIri) }}
              >
                {index + 1}
              </span>
              {step.label}
              {step.pin && (
                <span className="chip-flag pin" title={t("path.pinned", { name: step.pin.label })}>
                  ⚲ {step.pin.label}
                </span>
              )}
              {step.props.length > 0 && (
                <span className="chip-count" title={t("path.properties", { count: step.props.length })}>
                  {formatNumber(locale, step.props.length)}
                </span>
              )}
            </button>
            <button
              className="chip-remove"
              title={t("path.removeHint")}
              aria-label={t("path.removeName", { step: index + 1, name: step.label })}
              onClick={() => onRemoveStep(index)}
            >
              ✕
            </button>
          </span>
        );
      })}
      <button className="chip chip-clear" onClick={onClear} title={t("path.clearHint")}>
        {t("path.clear")}
      </button>
    </div>
  );
}
