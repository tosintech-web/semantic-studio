/*
================================================================================
FILE: frontend/src/components/EntityPicker.tsx
================================================================================

SUMMARY
    A search field that picks one class, property or concept (visual-modeling
    5.1): the parent of a class, the range of a relationship, a broader
    concept. Matches come from the document and its resolved imports, one kind
    only, and an imported match says so in text ("Person, from FOAF").

BASIC IDEA
    The WAI-ARIA combobox pattern with a listbox popup: the input keeps focus
    throughout, the arrow keys move an active option announced through
    aria-activedescendant, Enter picks it, Escape closes the list and then
    cancels. Search is the existing endpoint with the new `kind` filter,
    which is applied before its limit so twenty-five properties never crowd
    out the one class wanted. The merged view is always asked for: without
    resolved imports it is the document itself.

    Typing waits a moment before asking, and a stale answer is dropped when a
    newer question has been sent, so a fast typist sees the list for what is
    in the field now.

INPUTS / INPUT SOURCES (props)
    - ontologyId, kind: where to search and for what.
    - label: the field's accessible name ("Parent class").
    - exclude: IRIs not to offer (the entity itself, parents it already has).
    - onPick(iri, label), onCancel.
    - importedOnly: offer only what an import defines (a mapping's target,
      relationships 5.8), and say so when nothing else matches.
    - error: the server's sentence when the pick was refused.

EXPECTED OUTPUT
    - The field and its list; onPick once per choice.
================================================================================
*/

import { useDictionaryDisplayLanguage } from "../dictionary/useDictionaryLanguage";
import { useEffect, useId, useRef, useState } from "react";
import { useEntitySearch } from "../entities/useEntitySearch";
import { useDictionaryView } from "../dictionary/DictionaryViewContext";
import { useI18n } from "../i18n/I18nProvider";
import type { SearchKind, VizNode } from "../types";

interface Props {
  ontologyId: string;
  kind: SearchKind;
  label: string;
  exclude?: string[];
  busy?: boolean;
  error?: string | null;
  onPick: (iri: string, label: string) => void;
  onCancel: () => void;
  /** Offer only what an import defines: a mapping points to another
   *  vocabulary, never to the project's own concepts (relationships 5.8). */
  importedOnly?: boolean;
}

/** How long typing rests before a search is sent. */


export default function EntityPicker({
  ontologyId,
  kind,
  label,
  exclude = [],
  busy = false,
  error = null,
  onPick,
  onCancel,
  importedOnly = false,
}: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const dictionaryLanguage = useDictionaryDisplayLanguage();
  const [query, setQuery] = useState("");
  const { t } = useI18n();
  const view = useDictionaryView();
  const [composing, setComposing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const search = useEntitySearch({ ontologyId, language: dictionaryLanguage, imports: true, ...view, query, composing, kind });
  const results = dismissed ? [] : search.results.filter(n => !exclude.includes(n.id) && (!importedOnly || n.importedFrom));
  const [active, setActive] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => { setActive(search.results.length ? 0 : -1); }, [search.results]);

  const open = results.length > 0;
  const pick = (node: VizNode) => {
    if (!busy) onPick(node.id, node.label);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composing || e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && active < results.length) pick(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (open) {
        setDismissed(true);
        setActive(-1);
      } else {
        onCancel();
      }
    }
  };

  const errorId = `${id}-error`;
  const shownError = error ?? (search.error ? t("common.error") : null);
  return (
    <div className="entity-picker">
      <label htmlFor={`${id}-input`} className="edit-field-label">
        {label}
      </label>
      <div className="entity-picker-row">
        <input
          id={`${id}-input`}
          ref={inputRef}
          type="search"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-describedby={shownError ? errorId : undefined}
          aria-invalid={shownError ? true : undefined}
          readOnly={busy}
          placeholder={t("search.prompt")}
          value={query}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onChange={(e) => { setQuery(e.target.value); setDismissed(false); }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </button>
      </div>
      <ul id={listId} role="listbox" aria-label={label} className="entity-picker-list" hidden={!open}>
        {results.map((node, i) => (
          <li
            key={node.id}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? "active" : undefined}
            // mousedown, not click: a click would blur the input first.
            onMouseDown={(e) => {
              e.preventDefault();
              pick(node);
            }}
          >
            {node.label}
            {node.match && <span className="result-match">{t(`match.${node.match.reason}`, { value: node.match.value })}</span>}
            {node.importedFrom && <span className="entity-picker-from">, {t("search.from", { name: node.importedFrom })}</span>}
          </li>
        ))}
      </ul>
      {query.trim() && !open && !shownError && !composing && (
        <p className="detail-note" role="status">
          {search.loading ? t("search.loading") : importedOnly ? t("search.importNone") : t("search.none")}
        </p>
      )}
      {search.more && !dismissed && <p className="detail-note">{t("search.narrow", { count: 25 })}</p>}
      {shownError && (
        <p id={errorId} className="edit-error">
          {shownError}
        </p>
      )}
    </div>
  );
}
