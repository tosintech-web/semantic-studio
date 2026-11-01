# Parallel CI verification

## Baseline

[Run 41281195046](https://github.com/tosintech-web/semantic-studio/actions/runs/41281195046),
head `78a8cb1`, measured on 2026-11-01 before this change:

| Measurement | Seconds |
| --- | ---: |
| Workflow creation to completion, including queue/setup | 680 |
| Sum of all job durations (runner time proxy) | 1986 |
| Serial `budgets` job | 677 |
| Native backend measurement step | 279 |
| PostgreSQL-runner measurement step | 270 |
| Linux native compatibility step | 265 |
| Windows native compatibility step | 325 |
| Compose/network/browser job | 238 |
| Frontend job | 138 |

One observed run is a baseline, not a controlled comparison or a guarantee. The
corresponding PR description records the actual new run URL, head, workflow wall
time and sum of job durations. Sum of job durations is not billed cost: OS
multipliers, quota, caching and queue delays can differ. Six native shards and
four independent measurement jobs use more concurrent runners and repeat some
setup; the measured comparison must retain that tradeoff.

## Local checks

- New shard/workflow tests: 15 passed. These execute the actual gate commands
  against synthetic failed, cancelled and missing-output dependencies, as well
  as inspecting the workflow's selections and isolation.
- Existing publication tests: 37 passed. Existing distribution notice tests:
  7 passed. Message-contract generation and diff whitespace checks passed.
- Real native marker-selected collection: 2934 cases. The three shards select
  1171, 980 and 783 cases. Their exact union matches the unsharded collection,
  with no missing or duplicated case and no file divided across shards.
- Every shard's full inventory export still matches all 3261 recorded cases
  and all 285 database cases. No inventory record or prior-case mapping changed.
- Existing inventory tests: 2 passed with the parent explicitly sharded 1/1;
  the inventory subprocess still collects the complete suite independently.
- Invalid `--ci-shard=0/3` is refused with pytest usage exit code 4.

The pytest 9.2 ID setting is the same already-reviewed compatibility fix in
[PR #6](https://github.com/tosintech-web/semantic-studio/pull/6). That PR was
unmerged when this branch was created; its unrelated Home CSS is excluded.

## Reproduction

Run from `backend/`, using an environment with existing development requirements:

```bash
python -m pytest tests --collect-only -q -m "not team_db and not perf and not network" \
  --ci-shard=1/3 --ci-shard-output=/tmp/ci-shards/shard-1.json
# Repeat with 2/3 and 3/3, writing shard-2.json and shard-3.json.
python tests/ci_sharding.py --directory /tmp/ci-shards --total 3
```

From the repository root:

```bash
python -m unittest discover -s scripts -p 'test_ci_*.py'
```

Actual CI is the acceptance evidence for both OS matrices, retained PostgreSQL
3.12/3.14 partitions, browser workflows and all four performance lanes. The
local collection checks alone do not claim those executions passed. Performance
thresholds, median samples, factor 2 in CI, marker exclusions and runner-private
DB access are unchanged.
