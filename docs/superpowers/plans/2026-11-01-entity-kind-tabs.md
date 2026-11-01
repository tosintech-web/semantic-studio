# Entity Kind Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show only dictionary-present classification tabs and a coherent list icon.

**Architecture:** Cached whole-view kind counts travel with paged entities; the
existing bounded page hook owns accepted metadata and rows. The component adds
accessible tabs without changing detail-panel editing.

**Tech Stack:** React/TypeScript, existing inline SVG, FastAPI/rdflib, pytest/Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-entity-kind-tabs-design.md`

## Global Constraints

- Classifications are the existing groups, not arbitrary rdf:type classes.
- Preserve 50-row default/100-row cap, 256KiB bound and all performance limits.
- Never infer tabs from one page or filtered search results.
- Preserve dictionary/view ownership, edit drafts and existing focus rules.

## Review Focus

- A later page or zero-match search must not remove dictionary-present tabs.
- Old responses must not restore old-dictionary classifications.
- Removing a selected kind must not strand focus or show stale rows.
- Missing metadata from an older response must not break All browsing.
- Imports/revision changes must update classifications without losing edits.

### Task 1: Icon and server metadata

- [x] Verify missing-icon and missing-metadata test failures.
- [x] Add coherent decorative table SVG and use it in the existing nav item.
- [x] Cache full-view kind counts and add bounded response metadata.
- [x] Test filter/page invariance, empty dictionaries and view invalidation.

### Task 2: Dynamic tabs and verification

- [x] Test dynamic presence and preserve search/sort/page/focus behavior.
- [x] Implement metadata retention and accessible tab interaction.
- [x] Verify relevant tests, actual browser behavior and production build.
- [x] Independently review and repair any concrete findings.

## Verification

- Frontend feature/hook/budget: 29 tests passed, plus 17 icon/navigation checks.
- Backend entity API/view: 16 tests passed; inventory: 3262 collected, 285 team DB.
- Production build passed; Chrome verified ja/en at 720/1440px, native keyboard
  arrows/Home/End, zero-result search retention and a second dictionary.
- Independent review found the selected-kind/omitted-metadata fallback; a red
  regression reproduced it and the fix passed. Re-review found no further issues.
- Full regression and default-factor performance results are recorded in the PR;
  thresholds and test partitions have not been relaxed.
