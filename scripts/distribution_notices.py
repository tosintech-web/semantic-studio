"""
================================================================================
FILE: scripts/distribution_notices.py
SUMMARY
    Verify and ship original notices for installed Python and libpq dependencies.
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
import subprocess
import sysconfig

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


def discover_native_packages():
    """Follow the actual dynamically loaded libpq closure, including base libs.

    Run only in the Debian distribution image. No library path comes from an
    ontology or archive, and no shell evaluates ldd/dpkg output as commands.
    """
    architecture = sysconfig.get_config_var('MULTIARCH')
    if not architecture or not re.fullmatch(r'[a-zA-Z0-9_-]+', architecture):
        raise ValueError('Unknown native distribution architecture')
    libpq = Path('/usr/lib') / architecture / 'libpq.so.5'
    linked = subprocess.check_output(['ldd', str(libpq)], text=True)
    paths = {str(libpq.resolve())}
    paths.update(str(Path(p).resolve()) for p in re.findall(r'(/[^\s()]+)', linked))
    if 'not found' in linked or len(paths) < 2:
        raise ValueError('Incomplete libpq native closure')
    packages = {}
    for path in sorted(paths):
        owned = subprocess.check_output(['dpkg-query', '-S', path], text=True).strip()
        owner = owned.split(': ', 1)[0]
        if '\n' in owned or not re.fullmatch(r'[a-z0-9+.-]+(?::[a-z0-9]+)?', owner):
            raise ValueError('Ambiguous native library ownership')
        version = subprocess.check_output(['dpkg-query', '-W', '-f=${Version}', owner], text=True)
        packages[owner.split(':')[0]] = version
    if 'libpq5' not in packages:
        raise ValueError('Missing libpq package provenance')
    return packages


def collect_native_notices(inventory, output, *, packages=None, root=Path('/')):
    packages = discover_native_packages() if packages is None else packages
    if not packages or 'libpq5' not in packages:
        raise ValueError('Incomplete native dependency closure')
    known = {(c['name'], c['version']): c for c in inventory['components'] if c['ecosystem'] == 'debian'}
    components, originals = [], {}
    for name, version in sorted(packages.items()):
        component = known.get((name, version))
        if component is None or component.get('status') not in COLLECTED or not component.get('notices'):
            raise ValueError(f'Unreviewed native distribution {name}@{version}')
        notices = []
        for notice in component['notices']:
            path = PurePosixPath(notice['original_path'])
            if '..' in path.parts or not str(path).startswith('/usr/share/doc/'):
                raise ValueError('Invalid native notice path')
            data = (Path(root) / str(path).lstrip('/')).read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            if digest != notice['sha256']:
                raise ValueError(f'Changed native notice for {name}@{version}')
            relative = f'texts/{digest}.txt'
            originals[relative] = data
            notices.append({**notice, 'text': relative})
        components.append({**component, 'notices': notices})
    output = Path(output)
    (output / 'texts').mkdir(parents=True, exist_ok=True)
    for path, data in originals.items():
        (output / path).write_bytes(data)
    result = {'basis': 'Actual Debian libpq dynamic dependency closure and original package copyrights; versions and hashes verified.', 'components': components}
    (output / 'native-components.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return result


def main():
    parser = argparse.ArgumentParser(description="Verify installed application notices and write a distribution artifact.")
    parser.add_argument("--inventory", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument('--native-inventory', type=Path)
    args = parser.parse_args()
    result = collect_python_notices(json.loads(args.inventory.read_text(encoding="utf-8")), args.output)
    print(f"Verified {len(result['components'])} installed Python application distributions and their original notices.")
    if args.native_inventory:
        native = collect_native_notices(json.loads(args.native_inventory.read_text(encoding='utf-8')), args.output.parent / 'native')
        print(f"Verified {len(native['components'])} native library packages and their original copyrights.")


if __name__ == "__main__":
    main()
