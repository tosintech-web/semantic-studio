/*
================================================================================
FILE: frontend/src/components/WhyDisclosure.tsx
================================================================================

SUMMARY
    **Why?** for one concluded fact (axioms-and-reasoning 5.6, AC-5): a
    disclosure button whose reason -- one step, the facts and rules it used
    -- opens in place below it as a list, each line marked *stated* or
    *inferred* in text. An inferred line has its own **Why?**, so a learner
    walks back to what they wrote one step at a time.

BASIC IDEA
    Retain original failure objects and render their metadata in the current UI
    locale, with escaped details. State belongs to one project and fact; a new
    target mounts a new disclosure and late responses to the old one are ignored.

    The reason is asked of the server only when the disclosure first opens,
    and kept while it stays mounted: a long result has thousands of facts
    and nobody opens most of them. The button is a real disclosure
    (aria-expanded, aria-controls), and the list is read after it.

    A line that is a class's rule -- written with blank nodes, so with no
    fact of its own -- is shown as its sentence, stated, with no Why?. A
    fact no family explains says so in the server's words. Nothing here is
    an href: a line's subject is selected through the app's own selection,
    as a tree row is.

INPUTS / INPUT SOURCES (props)
    - projectId, fact: which fact; label: its sentence, for the button's
      accessible description.
    - onSelect: select an entity, as the rest of the app does.

EXPECTED OUTPUT
    - The disclosure, and its reason when open.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { renderServerError } from "../i18n/serverMessage";
import { useEffect, useId, useRef, useState } from "react";
import { getWhy } from "../api";
import { premiseMark } from "../reasoning/reasonSentences";
import type { ReasoningPremise, WhyReason } from "../types";

interface Props {
  projectId: string;
  fact: { s: string; p: string; o: string };
  /** The fact's sentence, which names what the button asks about. */
  label: string;
  onSelect?: (iri: string) => void;
}

export default function WhyDisclosure(props: Props) {
  // Locale-dependent labels do not change the target or close its disclosure.
  const { projectId, fact } = props;
  return <Disclosure key={JSON.stringify([projectId, fact.s, fact.p, fact.o])} {...props} />;
}

function Disclosure({ projectId, fact, label, onSelect }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<WhyReason | null>(null);
  const [error, setError] = useState<{ cause: unknown } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const listId = useId();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && reason === null) {
      setError(null);
      getWhy(projectId, fact)
        .then((found) => { if (alive.current) setReason(found); })
        .catch((cause: unknown) => { if (alive.current) setError({ cause }); });
    }
  };

  return (
    <span className="why">
      <button
        type="button"
        className="term-link why-button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("reasonUI.whyLabel", { label })}
        onClick={toggle}
      >
        {t("reasonUI.why")}
      </button>
      {open && (
        <div id={listId} className="why-reason">
          {error && <>
            <p className="edit-error" role="alert">{renderServerError(error.cause, t)}</p>
            <details className="technical-details"><summary>{t("common.details")}</summary><pre>{error.cause instanceof Error ? error.cause.message : String(error.cause)}</pre></details>
          </>}
          {!error && reason === null && <p className="detail-note">{t("reasonUI.finding")}</p>}
          {reason && <Reason projectId={projectId} reason={reason} onSelect={onSelect} />}
        </div>
      )}
    </span>
  );
}

function Reason({
  projectId,
  reason,
  onSelect,
}: {
  projectId: string;
  reason: WhyReason;
  onSelect?: (iri: string) => void;
}) {
  const { t } = useI18n();
  if (reason.family === "stated" || reason.premises.length === 0) {
    return <p className="detail-note why-plain">{reason.sentence}</p>;
  }
  return (
    <>
      <p className="why-because">{t("reasonUI.because")}</p>
      <ul className="why-premises">
        {reason.premises.map((premise, i) => (
          <Premise key={`${premise.s}|${premise.p}|${premise.o}|${i}`} projectId={projectId} premise={premise} onSelect={onSelect} />
        ))}
      </ul>
    </>
  );
}

function Premise({
  projectId,
  premise,
  onSelect,
}: {
  projectId: string;
  premise: ReasoningPremise;
  onSelect?: (iri: string) => void;
}) {
  const { locale } = useI18n();
  const mark = premiseMark(premise.inferred, locale);
  return (
    <li className={`why-premise${premise.inferred ? " inferred" : ""}`}>
      {onSelect ? (
        <button type="button" className="term-link" onClick={() => onSelect(premise.s)}>
          {premise.sentence}
        </button>
      ) : (
        <span>{premise.sentence}</span>
      )}{" "}
      <span className="why-mark">{mark}</span>
      {premise.inferred && premise.o !== null && (
        <>
          {" "}
          <WhyDisclosure
            projectId={projectId}
            fact={{ s: premise.s, p: premise.p, o: premise.o }}
            label={premise.sentence}
            onSelect={onSelect}
          />
        </>
      )}
    </li>
  );
}
