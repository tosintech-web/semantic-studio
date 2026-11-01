# Parallel CI design

The requested change reduces pull-request feedback time while preserving every
existing test partition, budget, and required check. Implementation choices below
are engineering decisions within that request.

## Evidence and alternatives

Baseline: [PR #6 CI, head 78a8cb1](https://github.com/tosintech-web/semantic-studio/actions/runs/41281195046).
Workflow creation to completion: 680 seconds. `budgets` ran for 677 seconds;
its native backend measurements took 279 seconds and its PostgreSQL-runner
measurements 270 seconds. Native compatibility took 265 seconds on Linux and
325 seconds on Windows; Compose/browser took 238 seconds; frontend took 138.
These are one-run observations, not a controlled benchmark.

1. Split only the performance job: low complexity, but leaves Windows as a
   roughly six-minute required gate.
2. Split performance into four independent runners and native compatibility
   into three file-based shards per platform: chosen. It attacks both measured
   long paths without running timing measurements concurrently on one runner.
3. Add in-process pytest workers or shard DB tests: rejected. This adds a
   dependency and would require proving shared fixtures/schema and timing
   isolation; neither is needed for the observed bottlenecks.

## Behavior and boundaries

- Native Linux/Python 3.12 and Windows/Python 3.14 use three runner-isolated
  shards. Sort eligible test files and assign them round-robin; every case in
  a file stays together. Marker selection remains `not team_db and not perf
  and not network`. Local pytest without shard arguments is unchanged.
- Each shard records eligible and selected node IDs. Existing `backend-linux`
  and `backend-windows` gates require successful matrix jobs plus complete,
  non-overlapping shard manifests. Missing, inconsistent, or duplicate coverage
  fails the gate. Inventory collection still records the complete pre-filter
  collection; the inventory test's subprocess does not inherit shard arguments.
- Native backend timing, frontend timing, P1 browser timing, and all backend
  timing in the internal PostgreSQL runner execute in four independent jobs.
  Each remains informational with `BUDGET_FACTOR=2`. An aggregate `budgets`
  reports failure if any measurement failed, without blocking required gates.
- Preserve the PostgreSQL 3.12/3.14 partitions, internal-only DB network,
  synthetic file secrets, Compose/browser coverage, publication, Docker,
  frontend tests/types/build, and cancellation of superseded runs.
- No test, budget, sample count, threshold, API, runtime dependency, or product
  behavior changes. Preserve the pytest ID compatibility fix from PR #6, which
  is still unmerged; do not include that PR's Home CSS changes.

## Validation and cost

Unit tests exercise shard partition completeness, ordering, invalid arguments,
manifest corruption/missing coverage, and workflow contracts. Real pytest
collection verifies the three shard union against an unsharded marker-selected
run and preserves the full inventory. Actual PR CI proves both OS matrices,
DB versions, browsers, and measurements. Record wall time and summed job time
against the baseline, including queue/setup overhead; do not promise a fixed
speedup. More concurrent jobs can consume additional runner minutes. Reverting
this PR restores the original serial commands and check names.

References: [GitHub matrices](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations),
[pytest collection hooks](https://docs.pytest.org/en/stable/reference/reference.html#pytest.hookspec.pytest_collection_modifyitems).
