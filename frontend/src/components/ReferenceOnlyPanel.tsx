/*
================================================================================
FILE: frontend/src/components/ReferenceOnlyPanel.tsx
SUMMARY
    Read-only details for a referenced IRI that has no dictionary definition.
BASIC IDEA
    Preserve the whole identifier and provide a copy operation, never an editor.
INPUTS / INPUT SOURCES
    Selected reference-only IRI from the complete dictionary index.
EXPECTED OUTPUT
    A translated explanation and clipboard result in a polite live region.
================================================================================
*/
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
export default function ReferenceOnlyPanel({ iri, onClose }: { iri: string; onClose(): void }) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [iri]);
  const [copy, setCopy] = useState<"success" | "failure" | null>(null);
  return <aside className="detail-panel" aria-label={t("entities.reference")}>
    <h2 ref={heading} tabIndex={-1}>{t("entities.reference")}</h2><p>{t("entities.undefined")}</p>
    <code className="reference-iri">{iri}</code>
    <button type="button" onClick={() => { void (async () => { try { await navigator.clipboard.writeText(iri); setCopy("success"); } catch { setCopy("failure"); } })(); }}>{t("entities.copy")}</button>
    <button type="button" onClick={onClose}>{t("common.cancel")}</button>
    <p role="status" aria-live="polite">{copy === "success" ? t("entities.copied") : copy === "failure" ? t("common.error") : ""}</p>
  </aside>;
}
