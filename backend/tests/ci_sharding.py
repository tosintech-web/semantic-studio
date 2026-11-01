"""
================================================================================
FILE: backend/tests/ci_sharding.py
SUMMARY
    Optional native pytest shards and proof of their complete case coverage.
BASIC IDEA
    Assign sorted eligible files round-robin without splitting module fixtures.
    Each runner records the same eligible IDs and its own exact selection; the
    existing required gates reject missing, duplicate or inconsistent manifests.
INPUTS / INPUT SOURCES
    Explicit one-based shard arguments and pytest's marker-filtered node IDs.
EXPECTED OUTPUT
    A deterministic manifest, or a failing coverage check; no application state.
================================================================================
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re


def parse_shard(value: str) -> tuple[int, int]:
    if not re.fullmatch(r'[1-9][0-9]*/[1-9][0-9]*', value):
        raise ValueError('shard must be INDEX/TOTAL, with 1 <= INDEX <= TOTAL')
    index, total = map(int, value.split('/'))
    if index > total:
        raise ValueError('shard index exceeds total')
    return index, total


def _file(node: str) -> str:
    return node.split('::', 1)[0].replace('\\', '/')


def make_manifest(nodes: list[str], shard: tuple[int, int]) -> dict:
    index, total = parse_shard(f'{shard[0]}/{shard[1]}')
    if not nodes or any(not isinstance(node, str) or '::' not in node for node in nodes):
        raise ValueError('eligible cases must be nonempty pytest node IDs')
    if len(nodes) != len(set(nodes)):
        raise ValueError('duplicate eligible case')
    files = sorted({_file(node) for node in nodes})
    if total > len(files):
        raise ValueError('more shards than eligible test files')
    owned = set(files[index - 1::total])
    return {'version': 1, 'shard': index, 'total': total,
            'eligible': sorted(nodes),
            'selected': sorted(node for node in nodes if _file(node) in owned)}


def verify_manifests(directory: Path, total: int) -> int:
    parse_shard(f'1/{total}')
    expected = {directory / f'shard-{i}.json' for i in range(1, total + 1)}
    if set(directory.glob('shard-*.json')) != expected:
        raise ValueError('missing or unexpected shard manifest')
    eligible = None
    seen: set[str] = set()
    for index in range(1, total + 1):
        data = json.loads((directory / f'shard-{index}.json').read_text(encoding='utf-8'))
        if not isinstance(data, dict) or data.get('version') != 1:
            raise ValueError('unsupported shard manifest')
        if data.get('shard') != index or data.get('total') != total:
            raise ValueError('inconsistent shard identity')
        nodes = data.get('eligible')
        if not isinstance(nodes, list):
            raise ValueError('missing eligible cases')
        expected_manifest = make_manifest(nodes, (index, total))
        # Recompute file ownership too: a complete union alone could hide a
        # split module and change fixture behavior between parallel runners.
        if data != expected_manifest:
            raise ValueError('manifest does not match deterministic file ownership')
        if eligible is None:
            eligible = set(nodes)
        elif set(nodes) != eligible:
            raise ValueError('shards disagree about eligible cases')
        selected = data['selected']
        if seen.intersection(selected):
            raise ValueError('case selected by more than one shard')
        seen.update(selected)
    if seen != eligible:
        raise ValueError('shards do not cover every eligible case')
    return len(seen)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--total', type=int, required=True)
    args = parser.parse_args()
    try:
        count = verify_manifests(args.directory, args.total)
    except (ValueError, OSError) as error:
        parser.exit(1, f'Native shard coverage failed: {error}\n')
    print(f'Native shard coverage: {count} unique cases across {args.total} shards')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
