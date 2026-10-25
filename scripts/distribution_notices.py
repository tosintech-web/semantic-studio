"""
================================================================================
FILE: scripts/distribution_notices.py
SUMMARY
    Verify and ship original notices for actual installed Python distributions.
BASIC IDEA
    Match installed application versions to the reviewed source inventory, verify
    every recorded original against installed bytes and refuse additional license
    files absent from that inventory. Write artifacts only after all checks pass.
    Python/base-image installer tooling keeps its upstream-installed notices.
INPUTS / INPUT SOURCES
    importlib.metadata, the pinned inventory and an explicit output directory.
EXPECTED OUTPUT
    Runtime component JSON and exact license texts, or a failed distribution gate.
================================================================================
"""
from __future__ import annotations
import argparse
import hashlib
from importlib import metadata
import json
from pathlib import Path, PurePosixPath
import re

BASE_TOOLS = {"pip", "setuptools", "wheel"}
COLLECTED = {"text-collected", "project-text-collected", "upstream-text-collected"}
NOTICE = re.compile(r"^(?:licen[cs]e|notice|copying|copyright|authors)(?:[._-]|$)", re.I)


def canonical(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def collect_python_notices(inventory, output, distributions=None):
    known = {(canonical(c["name"]), c["version"]): c for c in inventory["components"] if c["ecosystem"] == "python"}
    components, originals = [], {}
    for dist in metadata.distributions() if distributions is None else distributions:
        name = dist.metadata.get("Name", "")
        if canonical(name) in BASE_TOOLS:
            continue
        key = (canonical(name), dist.version)
        source = known.get(key)
        if source is None:
            raise ValueError(f"Unreviewed installed distribution {name}@{dist.version}")
        if source.get("status") not in COLLECTED or not source.get("notices") or dist.files is None:
            raise ValueError(f"Incomplete notices for {name}@{dist.version}")
        recorded = {notice["original_path"] for notice in source["notices"]}
        actual = {str(path) for path in dist.files if NOTICE.match(PurePosixPath(str(path)).name)}
        if actual - recorded:
            raise ValueError(f"Unreviewed additional notice for {name}@{dist.version}")
        notices = []
        for notice in source["notices"]:
            path = PurePosixPath(notice["original_path"])
            if path.is_absolute() or ".." in path.parts:
                raise ValueError(f"Invalid notice path for {name}")
            original = Path(dist.locate_file(path)).read_bytes()
            digest = hashlib.sha256(original).hexdigest()
            if digest != notice["sha256"]:
                raise ValueError(f"Changed notice for {name}@{dist.version}")
            text = f"texts/{digest}.txt"
            originals[text] = original
            notices.append({**notice, "text": text})
        components.append({**source, "name": name, "version": dist.version, "notices": notices})
    components.sort(key=lambda component: (canonical(component["name"]), component["version"]))
    output = Path(output)
    (output / "texts").mkdir(parents=True, exist_ok=True)
    for path, original in originals.items():
        (output / path).write_bytes(original)
    result = {"basis": "Actual installed application distributions; versions and original bytes checked against source inventory. Base-image pip/setuptools/wheel retain their installed upstream notices.", "components": components}
    (output / "runtime-components.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def main():
    parser = argparse.ArgumentParser(description="Verify installed application notices and write a distribution artifact.")
    parser.add_argument("--inventory", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = collect_python_notices(json.loads(args.inventory.read_text(encoding="utf-8")), args.output)
    print(f"Verified {len(result['components'])} installed Python application distributions and their original notices.")


if __name__ == "__main__":
    main()
