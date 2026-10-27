/*
================================================================================
FILE: frontend/src/projects/form.ts
================================================================================

SUMMARY
    Country and government domain templates use the existing ontology kind.
    The New project form's rules, kept out of the component so they can be
    tested without rendering: the two kinds of project and the templates each
    offers (relationships 5.1, D-089), the defaults a name implies (base IRI
    and prefix), and what makes each field invalid, in a sentence.

BASIC IDEA
    The same rules the server applies in projects.py, restated so the form can
    say what is wrong before anything is sent: Create is disabled with its
    reason until the form is valid (Section 6). The server still checks; this
    is the explanation, not the control.

    Open question 2 closed as recommended: the base IRI defaults to
    http://example.org/<slug>#, editable, and the prefix to the slug.

INPUTS / INPUT SOURCES
    - The form's field values.

EXPECTED OUTPUT
    - KIND_CHOICES; defaults, and a map of field -> sentence for whatever is
      invalid; the first reason Create is unavailable.
================================================================================
*/

import type { Translator } from "../i18n/types";
import { englishTranslator } from "../i18n/format";
import type { ProjectKind, ProjectTemplate } from "../types";

/** The two kinds a project can be, asked first (relationships 5.1). The
 *  sentences are the spec's, word for word: they are what a learner reads to
 *  choose, so a paraphrase here is a change to the product. */
export interface KindChoice {
  kind: ProjectKind;
  label: string;
  sentence: string;
  templates: { value: ProjectTemplate; label: string }[];
}

export function kindChoices(t: Translator = englishTranslator): KindChoice[] { return [
  {
    kind: "ontology",
    label: t("project.ontology"),
    sentence:
      t("project.ontologyHelp"),
    templates: [
      { value: "empty", label: t("project.template.empty") },
      { value: "small", label: t("project.template.small") },
      { value: "countries", label: t("project.template.countries") },
      { value: "government-organizations", label: t("project.template.government-organizations") },
    ],
  },
  {
    kind: "taxonomy",
    label: t("project.taxonomy"),
    sentence:
      t("project.taxonomyHelp"),
    templates: [
      { value: "taxonomy-empty", label: t("project.template.taxonomy-empty") },
      { value: "taxonomy-small", label: t("project.template.taxonomy-small") },
    ],
  },
]; }

/** Legacy pure callers retain explicitly English choices. */
export const KIND_CHOICES = kindChoices();

export const CHOOSE_KIND = englishTranslator("project.chooseKind");

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

export function defaultBaseIri(name: string): string {
  return `http://example.org/${slugify(name)}#`;
}

export function defaultPrefix(name: string): string {
  let letters = slugify(name).replace(/[^a-z0-9]/g, "");
  if (!letters || !/^[a-z]/.test(letters)) letters = "p" + letters;
  return letters.slice(0, 20);
}

// The server's patterns (projects.py), restated.
const BASE_IRI = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s<>"{}|\\^`]*[#/]$/;
const PREFIX = /^[A-Za-z]([A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/;
const LANG_TAG =
  /^[A-Za-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|[0-9]{3}))?(-([A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*$/;

export function validLanguageTag(tag: string): boolean {
  return LANG_TAG.test(tag);
}

export interface NewProjectFields {
  name: string;
  baseIri: string;
  prefix: string;
  primaryLanguage: string;
}

export type FieldErrors = Partial<Record<keyof NewProjectFields, string>>;

export function validate(fields: NewProjectFields, t: Translator = englishTranslator): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) errors.name = t("project.error.name");
  else if (fields.name.trim().length > 120) errors.name = t("project.error.nameLength");
  if (!BASE_IRI.test(fields.baseIri.trim())) {
    errors.baseIri =
      t("project.error.base");
  }
  if (!PREFIX.test(fields.prefix.trim())) {
    errors.prefix = t("project.error.prefix");
  }
  if (!validLanguageTag(fields.primaryLanguage.trim())) {
    errors.primaryLanguage = t("project.error.language");
  }
  return errors;
}

/** The first reason Create is unavailable, in field order, or null. */
export function firstReason(errors: FieldErrors): string | null {
  for (const key of ["name", "baseIri", "prefix", "primaryLanguage"] as const) {
    if (errors[key]) return errors[key]!;
  }
  return null;
}
