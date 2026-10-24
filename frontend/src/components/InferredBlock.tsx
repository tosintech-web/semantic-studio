/*
================================================================================
FILE: frontend/src/components/InferredBlock.tsx
================================================================================

SUMMARY
    The detail panel's **Inferred** block (axioms-and-reasoning 5.7): what a
    current reasoning result concluded about the selected entity -- its new
    kinds, memberships and links, each with **Why?** -- and, for a class,
    that it can never have members. Shown under the stated statements,
    behind Show inferred, and never editable.

BASIC IDEA
    Failures retain their original object and request identity. UI language
    changes translate the explanation without another read; old errors and late
    responses cannot replace a new target's facts.

    The facts are the server's (GET reasoning?about=), fetched again when
    the entity, the result or the revision moves, and shown only for what
    they were fetched for; App only mounts this while the result is current,
    so a stale result's facts never show, nor a previous run's. The block
    is outlined dashed and headed *Inferred* in words. The other end of each
    fact is a link through the app's selection, as the tree's rows are.

INPUTS / INPUT SOURCES (props)
    - projectId, iri, imports: which entity, in which view.
    - resultKey, revision: refetch when either moves.
    - onSelect: select an entity.

EXPECTED OUTPUT
    - The block, or nothing until the facts arrive.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { renderServerError } from "../i18n/serverMessage";
import { useEffect, useState } from "react";
import { getReasoningAbout } from "../api";
import type { ReasoningAbout } from "../types";
import WhyDisclosure from "./WhyDisclosure";

interface Props {
  projectId: string;
  iri: string;
  imports: boolean;
  resultKey: string;
  revision: number;
  label: string;
  onSelect: (iri: string) => void;
}

export default function InferredBlock({ projectId, iri, imports, resultKey, revision, label, onSelect }: Props) {
  const { t } = useI18n();
  // The facts are kept with what they were fetched for, and shown only for
  // that: after a new run the last run's facts showed until the new ones
  // came (PR #55 review).
  const key = [projectId, iri, imports, resultKey, revision].join("|");
  const [held, setHeld] = useState<{ key: string; about: ReasoningAbout } | null>(null);
  const [failure, setFailure] = useState<{ key: string; cause: unknown } | null>(null);
  const error = failure?.key === key ? failure : null;
  const about = held?.key === key ? held.about : null;

  useEffect(() => {
    let cancelled = false;
    setFailure(null);
    getReasoningAbout(projectId, iri, imports)
      .then((found) => !cancelled && setHeld({ key, about: found }))
      .catch((cause: unknown) => !cancelled && setFailure({ key, cause }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (error) {
    return (
      <section className="detail-inferred">
        <h3>{t("inferred.title")}</h3>
        <p className="detail-error">{renderServerError(error.cause, t)}</p>
        <details className="technical-details"><summary>{t("common.details")}</summary><pre>{error.cause instanceof Error ? error.cause.message : String(error.cause)}</pre></details>
      </section>
    );
  }
  if (!about || about.iri !== iri || about.stale) return null;
  return (
    <section className="detail-inferred" aria-label={t("inferred.about", { name: label })}>
      <h3>
        {t("inferred.title")} <span className="count">{about.facts.length}</span>
      </h3>
      {about.neverMembers && <p className="detail-note">{t("inferred.never", { name: label })}</p>}
      {about.facts.length === 0 && !about.neverMembers && (
        <p className="detail-note">{t("inferred.empty", { name: label })}</p>
      )}
      {about.facts.length > 0 && (
        <ul className="detail-inferred-facts">
          {about.facts.map((fact) => {
            const other = fact.s === iri ? fact.o : fact.s;
            return (
              <li key={`${fact.s}|${fact.p}|${fact.o}`}>
                <button type="button" className="term-link" onClick={() => onSelect(other)}>
                  {fact.sentence}
                </button>{" "}
                <span className="why-mark">{t("reasonWords.inferred")}</span>{" "}
                <WhyDisclosure projectId={projectId} fact={fact} label={fact.sentence} onSelect={onSelect} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
