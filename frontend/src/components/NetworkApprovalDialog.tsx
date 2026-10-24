/*
================================================================================
FILE: frontend/src/components/NetworkApprovalDialog.tsx
================================================================================

SUMMARY
    The question Semantic Studio asks before it connects to a site: which site,
    why, what is sent, and what the site will see, with Allow and Don't allow
    and a choice between just this time and always. The one place a network
    connection is approved (external-access Stage 1, D-066).

BASIC IDEA
    Rendered by App when api.ts's `send` meets a 409 `approval_required`. The
    server has sent nothing at that point; this dialog is the whole of the
    decision. Every row is text from the 409 body or from networkWords.ts --
    the capability's own name is never shown, and nothing depends on colour.

    For a SPARQL SERVICE question the *What is sent* row is the exact query
    text of each block, in a read-only box, because that text is the whole of
    what leaves the machine: the server fixed it before asking and sends it
    byte for byte (D-069). One box per block, named by its endpoint when there
    are several.

    Built on the About panel's pattern: the backdrop is a sibling, not the
    parent, because aria-hidden on an ancestor would remove the dialog from the
    accessibility tree; focus goes to the heading on open, Tab is trapped, and
    Escape or a click on the backdrop means Don't allow, just this time. Focus
    returns to whatever held it when the question appeared (useDialogTrap).

    The radio pair applies to either answer. *Always* with Allow remembers an
    Allow; *Always* with Don't allow remembers a Block, which the Network panel
    lists and can revoke. *Just this time* with Don't allow records nothing.
    The hint under the pair says so, because "Always, for ..." reads as an
    Allow and a remembered refusal should never be a surprise.

    *Always* is preselected, as in the specification's mock-up: most questions
    are about a site the user will meet again, and a repeat of the same
    question is how people learn to click through questions unread.

INPUTS / INPUT SOURCES (props)
    - requests: the approval requests from the 409 body. The broker raises one
      at a time; more than one is handled by listing every host.
    - onAnswer(allow, remember): called once, for either button, Escape or the
      backdrop.

EXPECTED OUTPUT
    - The dialog and its backdrop.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import { englishTranslator } from "../i18n/format";
import { useCallback, useRef, useState } from "react";
import { alwaysPhrase } from "../networkWords";
import type { ApprovalRequest } from "../types";
import { useDialogTrap } from "./useDialogTrap";

export const SERVICE_NOTHING_ELSE = englishTranslator("network.approval.serviceNothingElse");
export const WHY_EXPLAINED = [englishTranslator("network.approval.whyFirst"), englishTranslator("network.approval.whySecond")] as const;

interface Props {
  requests: ApprovalRequest[];
  onAnswer: (allow: boolean, remember: boolean) => void;
}

export default function NetworkApprovalDialog({ requests, onAnswer }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [remember, setRemember] = useState(true);
  const first = requests[0];
  const hosts = [...new Set(requests.map((r) => r.host))];
  const texts = requests.filter((r) => r.text !== undefined);
  const heading = t(hosts.length === 1 ? "network.approval.headingOne" : "network.approval.headingMany", { hosts: hosts.join(t("common.listSeparator")) });

  const decline = useCallback(() => onAnswer(false, false), [onAnswer]);
  useDialogTrap(panelRef, headingRef, decline);

  return (
    <>
      <div className="modal-backdrop approval-backdrop" aria-hidden="true" onClick={decline} />
      <div
        ref={panelRef}
        className={texts.length > 0 ? "approval-dialog approval-dialog-text" : "approval-dialog"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-heading"
      >
        <h2 id="approval-heading" ref={headingRef} tabIndex={-1} className="approval-heading">
          {heading}
        </h2>

        <dl className="approval-facts">
          <dt>{t("network.approval.why")}</dt>
          <dd>{first.reason}</dd>
          <dt>{t("network.approval.sent")}</dt>
          {texts.length === 0 ? (
            <dd>{first.sends}</dd>
          ) : (
            <dd className="approval-sent">
              {texts.map((r, i) => (
                <textarea
                  key={i}
                  className="approval-text"
                  readOnly
                  value={r.text}
                  rows={Math.min(12, (r.text ?? "").split("\n").length)}
                  aria-label={
                    texts.length === 1 ? t("network.approval.queryText") : t("network.approval.queryAt", { url: r.url })
                  }
                />
              ))}
              <p className="approval-text-note">{t("network.approval.serviceNothingElse")}</p>
            </dd>
          )}
          <dt>{t("network.approval.sees")}</dt>
          <dd>{t("network.approval.addressInfo")}</dd>
          <dt>{t("network.approval.address")}</dt>
          <dd className="approval-url">
            {[...new Set(requests.map((r) => r.url))].join(", ")}
          </dd>
          {!first.encrypted && (
            <>
              <dt>{t("network.approval.encryption")}</dt>
              <dd>{t("network.approval.plain")}</dd>
            </>
          )}
        </dl>

        <details className="approval-why">
          <summary>{t("network.approval.explain")}</summary>
          <p>{t("network.approval.whyFirst")}</p>
          <p>{t("network.approval.whySecond")}</p>
        </details>

        <fieldset className="approval-scope">
          <legend>{t("network.approval.duration")}</legend>
          <label>
            <input
              type="radio"
              name="approval-scope"
              checked={!remember}
              onChange={() => setRemember(false)}
            />{t("network.approval.once")}</label>
          <label>
            <input
              type="radio"
              name="approval-scope"
              checked={remember}
              onChange={() => setRemember(true)}
            />
            {t("network.approval.always", { purpose: alwaysPhrase(first.capability, t), sites: t(hosts.length === 1 ? "network.approval.site" : "network.approval.sites") })}
          </label>
          <p className="approval-hint">{t("network.approval.hint")}</p>
        </fieldset>

        <div className="approval-actions">
          <button className="ghost" onClick={() => onAnswer(false, remember)}>{t("network.approval.decline")}</button>
          <button className="primary" onClick={() => onAnswer(true, remember)}>{t("network.approval.allow")}</button>
        </div>
      </div>
    </>
  );
}
