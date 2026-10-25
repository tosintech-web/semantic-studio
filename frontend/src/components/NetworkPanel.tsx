/*
================================================================================
FILE: frontend/src/components/NetworkPanel.tsx
================================================================================

SUMMARY
    Network settings: the switch that makes Semantic Studio work offline, the
    sites the user has allowed or blocked (each revocable), and the most recent
    connections the application made or refused. The user's view of, and
    control over, everything the network broker does (external-access Stage 1).

BASIC IDEA
    A modal like About, opened from a header control beside it. It makes two
    requests when it opens -- the policy and the activity log -- and none
    before, so the application's mount budget of one request is untouched.

    Three sections, each stated in text:
      * Work offline, a `role="switch"` button whose `aria-checked` is the
        state and whose label says it. Offline refuses every connection with no
        dialog; it is a normal state, not an error, so it is worded as one.
      * Allowed and blocked sites. Remembered decisions only; a just-once
        Allow is spent by the action it was given for and is never a standing
        permission. Revoke returns the site to Ask. Focus moves to the
        section heading after a revoke, because the row that held it is gone.
      * Recent connections, newest first, capped by the server at 200. Each row
        says what happened in words (networkWords.ts); colour adds nothing.

    The corporate network settings (proxy, certificate file, Test connection)
    are a later stage (backlog X-7) and deliberately have no placeholder here.

    Changes are announced in a polite live region, so a screen reader user
    hears that offline took effect or that a site was revoked.

INPUTS / INPUT SOURCES (props)
    - onClose: for the close control, Escape and the backdrop. Focus returns to
      the control that opened the panel (useDialogTrap).
    - The policy and activity from api.ts.

EXPECTED OUTPUT
    - The dialog and its backdrop.
================================================================================
*/

import { useI18n } from "../i18n/I18nProvider";
import type { UiLocale } from "../i18n/types";
import { makeUiMessage, renderUiMessage, type UiMessage } from "../i18n/uiMessage";
import { renderServerError } from "../i18n/serverMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNetworkActivity,
  getNetworkPolicy,
  revokeNetworkGrant,
  setNetworkOffline,
} from "../api";
import { outcomeLabel, purposeLabel } from "../networkWords";
import type { NetworkActivity, NetworkPolicy } from "../types";
import { useDialogTrap } from "./useDialogTrap";

interface Props {
  onClose: () => void;
}

function when(iso: string, locale: UiLocale): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(locale);
}

export default function NetworkPanel({ onClose }: Props) {
  const { t, locale } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sitesHeadingRef = useRef<HTMLHeadingElement>(null);
  const [policy, setPolicy] = useState<NetworkPolicy | null>(null);
  const [activity, setActivity] = useState<NetworkActivity[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState<UiMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useDialogTrap(panelRef, headingRef, onClose);

  useEffect(() => {
    let live = true;
    Promise.all([getNetworkPolicy(), getNetworkActivity()])
      .then(([p, a]) => {
        if (!live) return;
        setPolicy(p);
        setActivity(a);
      })
      .catch((e: unknown) => live && setError(e));
    return () => {
      live = false;
    };
  }, []);

  const toggleOffline = useCallback(async () => {
    if (!policy) return;
    const next = !policy.offline;
    // Not disabled while saving: disabling the focused switch would blur it to
    // <body> (measured in Chrome on the remove control). A second press while
    // the first is in flight is simply ignored.
    if (saving) return;
    setSaving(true);
    try {
      const result = await setNetworkOffline(next);
      setPolicy({ ...policy, offline: result.offline });
      setStatus(makeUiMessage(result.offline ? "network.panel.offlineNotice" : "network.panel.onlineNotice"));
    } catch (e: unknown) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }, [policy, saving]);

  const revoke = useCallback(
    async (id: string, host: string) => {
      if (!policy) return;
      try {
        await revokeNetworkGrant(id);
        setPolicy({ ...policy, grants: policy.grants.filter((g) => g.id !== id) });
        setStatus(makeUiMessage("network.panel.revoked", { host }));
        sitesHeadingRef.current?.focus();
      } catch (e: unknown) {
        setError(e);
      }
    },
    [policy],
  );

  const offline = policy?.offline ?? false;

  return (
    <>
      <div className="modal-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        className="network-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="network-panel-heading"
      >
        <button className="icon-btn about-close" onClick={onClose} aria-label={t("network.panel.close")}>
          ✕
        </button>
        <h2 id="network-panel-heading" ref={headingRef} tabIndex={-1} className="network-heading">
          {t("network.panel.title")}
        </h2>

        {!!error && <><p className="detail-error">{renderServerError(error, t)}</p><details><summary>{t("common.details")}</summary><pre>{error instanceof Error ? error.message : String(error)}</pre></details></>}
        {!policy && !error && <p className="detail-note">{t("network.panel.loading")}</p>}

        {policy && (
          <>
            <section className="network-section" aria-labelledby="network-offline-heading">
              <h3 id="network-offline-heading">{t("network.panel.connections")}</h3>
              <button
                type="button"
                role="switch"
                aria-checked={offline}
                className={offline ? "network-switch on" : "network-switch"}
                onClick={() => void toggleOffline()}
              >
                <span className="network-switch-track" aria-hidden="true">
                  <span className="network-switch-thumb" />
                </span>
                {t("network.panel.offline")}
              </button>
              <p className="network-state">
                {offline
                  ? t("network.panel.offlineState")
                  : t("network.panel.onlineState")}
              </p>
            </section>

            <section className="network-section" aria-labelledby="network-sites-heading">
              <h3 id="network-sites-heading" ref={sitesHeadingRef} tabIndex={-1}>
                {t("network.panel.sites")}
              </h3>
              {policy.grants.length === 0 ? (
                <p className="network-empty">{t("network.panel.emptySites")}</p>
              ) : (
                <ul className="network-list">
                  {policy.grants.map((g) => (
                    <li key={g.id} className="network-row">
                      <span className="network-host">{g.host}</span>
                      <span className="network-purpose">{purposeLabel(g.capability, t)}</span>
                      <span className="network-decision">
                        {g.decision === "allow" ? t("network.panel.allowed") : t("network.panel.blockedState")}
                      </span>
                      <button
                        className="ghost"
                        onClick={() => void revoke(g.id, g.host)}
                        aria-label={t("network.panel.revokeName", { host: g.host, purpose: purposeLabel(g.capability, t) })}
                      >
                        {t("network.panel.revoke")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="network-section" aria-labelledby="network-activity-heading">
              <h3 id="network-activity-heading">{t("network.panel.recent")}</h3>
              {activity && activity.length === 0 ? (
                <p className="network-empty">{t("network.panel.emptyActivity")}</p>
              ) : (
                <ol className="network-list network-activity">
                  {(activity ?? []).map((a, i) => (
                    <li key={`${a.time}-${i}`} className="network-row">
                      <span className="network-when">{when(a.time, locale)}</span>
                      <span className="network-outcome">{outcomeLabel(a.outcome, t)}</span>
                      <span className="network-purpose">{purposeLabel(a.capability, t)}</span>
                      <span className="network-url" title={a.url}>
                        {a.url}
                      </span>
                      {a.bytes > 0 && (
                        <span className="network-bytes">{t("network.panel.bytes", { count: a.bytes })}</span>
                      )}
                      {!a.encrypted && <span className="network-plain">{t("network.panel.plain")}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}

        <p className="visually-hidden" role="status" aria-live="polite">
          {status ? renderUiMessage(status, t) : ""}
        </p>
      </div>
    </>
  );
}
