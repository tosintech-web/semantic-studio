# Parallel CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Shorten CI feedback while proving complete existing coverage.

**Architecture:** Runner-isolated native shards and four independent performance
lanes; retained aggregate checks verify job outcomes and shard manifests.

**Tech Stack:** GitHub Actions, Python standard library, existing pytest/PyYAML.

**Spec:** `docs/superpowers/specs/2026-11-01-parallel-ci-design.md`

## Global Constraints

- Preserve native Python 3.12/3.14, internal DB 3.12/3.14 and all prior cases.
- Preserve all budget factors, thresholds, samples and informational status.
- Preserve required check names, read-only workflow permissions and cancellation.
- No new runtime or test dependency; no product changes.

## Review Focus

- Invalid/missing shard arguments must fail rather than silently omit tests.
- Marker filtering and the full inventory must remain authoritative.
- Missing/duplicate manifests must fail the aggregate gate.
- A failed/cancelled matrix leg must never yield a successful aggregate.
- A failed performance lane must not cancel other measurements or block gates.

### Task 1: Prove native test sharding

**Files:** `backend/tests/ci_sharding.py`, `backend/tests/conftest.py`,
`scripts/test_ci_sharding.py`, `backend/pytest.ini`.

- [x] Add failing unit tests for partition/inventory/manifest boundaries.
- [x] Run tests and observe failure; implement the minimal standard-library helper.
- [x] Integrate optional CLI arguments after marker filtering; retain full inventory.
- [x] Verify real unsharded collection equals the disjoint three-shard union.
- [x] Verify existing inventory test still passes, including its subprocess.

### Task 2: Parallel workflow with complete gates

**Files:** `.github/workflows/ci.yml`, `scripts/test_ci_workflow.py`, `CLAUDE.md`.

- [x] Add failing workflow-contract tests for all retained lanes/gates and markers.
- [x] Implement native matrices/artifacts and complete aggregate checks.
- [x] Split performance lanes; keep their outcome visible in `budgets`.
- [x] Run new tests, existing script tests, real collection and syntax checks.
- [x] Update house instructions for the changed CI graph.

### Task 3: Review and actual CI evidence

**Files:** `docs/ci-parallel-verification.md` and the files above as findings require.

- [ ] Obtain independent whole-diff review; reproduce/fix concrete findings.
- [ ] Re-review until no concrete findings remain.
- [ ] Check publication, commit/push, create PR; inspect all actual CI jobs.
- [ ] Record baseline/new wall and summed runner seconds with limitations.
- [ ] Update PR description, preserve worktree for review; do not merge.
