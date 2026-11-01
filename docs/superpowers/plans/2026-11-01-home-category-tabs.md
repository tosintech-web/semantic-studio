# Home category tabs implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans.

**Goal:** Put country masters, organization masters and vocabulary/concept models on one row of Home tabs, with one active list and its creation action.

**Architecture:** Extend GroupNavigation to host the existing library as its third panel, selected initially. Home excludes supported country/organization profiles from that library; unknown profiles remain visible there. Existing guarded callbacks, file routes, ordering and card actions remain authoritative.

**Tech Stack:** React, TypeScript, existing i18n, Vitest and the Chrome driver; no dependencies.

**Spec:** The approved conversation: three parallel category tabs, per-category list/create action, ontology/taxonomy selected inside generic creation. The user selected 語彙・概念モデル as the third label.

## Global constraints

- Japanese tabs: 国マスター / 組織マスター / 語彙・概念モデル.
- Home reads supplied summaries only; no graph request on a category switch.
- Keep the existing organization-master ORG creation flow and generic creation choices.
- Keyboard: Tab enters the selected tab; Left/Right/Home/End select and focus tabs. Global focus-visible styling supplies the ring. Each tab announces its name/selection and owns a labelled panel.
- Preserve unrelated user changes in the current checkout. The user subsequently authorized review, a scoped commit, push and PR creation on a dedicated branch.

## Review focus

- Category changes cannot mix master projects into the generic library.
- Unknown profiles, uploaded files and examples remain reachable.
- Arrow-key wrap and exactly one selected tab agree with the visible panel.
- Viewers can open groups but cannot create; loading/error states remain visible.
- UI-language changes keep the selected category and search/draft state.

## Task 1: Unified Home categories

- [x] Add failing GroupNavigation and HomeScreen tests for the approved category structure, creation routes, filtering, keyboard selection and loading/error behavior.
- [x] Extend GroupNavigation with a vocabulary panel, accessible tabs, explicit category names and loading/error props; keep per-master paging and permission checks.
- [x] Move the existing Home library into that panel; filter supported master profiles from its input, update creation wording and i18n inventory.
- [x] Update the real-browser government workflow to use the tabs, verify their AX selection/keyboard behavior, and retain existing creation and editing acceptance.
- [x] Run focused tests, frontend suite/build and Chrome acceptance. Report broad-suite failures separately; do not silently relax budgets.

## Verification record

- Focused regression suite: 7 files, 301 tests passed (App, Home, category navigation, creation dialog, i18n coverage, focus and styles).
- Production build: passed (TypeScript and Vite); existing chunk-size advisory remains.
- Real Chrome government workflow: passed, including Japanese category labels, one selected tab, Arrow/Home/End focus, generic creation choices, fixed ORG creation, all master editing workflows and narrow view.
- Full frontend run with four workers: 2,630 passed, 4 failed. Failures were the unchanged 5-second timeout cases in ReasoningPanel (page reset; Show more focus) and ChangeForm (country-basis reconfirmation), and the miniature 2 ms budget (2.616 ms).
- Serial rerun of all three failing files: 56/56 passed in 22.98 seconds. The full concurrent run remains a failed run; no timeout or budget was relaxed.
- Independent read-only review: no actionable findings. Follow-up author check retained master management menus via the existing ProjectCard; its export regression test was observed failing before the fix and passing afterwards.
- Ruling: keep the current checkout and existing action callbacks; supported profiles alone determine category membership. This preserves uncommitted prior work and keeps unknown profiles accessible.
- No backend contract, dependency, persistence format or deployment changed.

Verification logs: `/private/tmp/semantic-home-tabs-final-focused.log`, `/private/tmp/semantic-home-tabs-build.log`, `/private/tmp/semantic-home-tabs-browser-final.log`, `/private/tmp/semantic-home-tabs-full-final.log`, `/private/tmp/semantic-home-tabs-timing-retry.log`.
Screenshot: `.claude/skills/run-semantic-viewer/shots/home-category-tabs-ja.png`.

## PR review follow-up

The final independent review found one P2 issue: deleting the sole master on the last page retained an out-of-range offset. The page offset is now clamped to the remaining groups and synchronized to state so later additions do not jump pages. The regression was observed failing before the fix; it covers removal and later growth of the list. No merge-blocking issue was reported.

Final pre-commit verification is recorded in the PR description. Unrelated account-menu, user-guide, AGENTS and agent-ninja changes are excluded from the commit.
