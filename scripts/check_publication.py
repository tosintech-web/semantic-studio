"""
================================================================================
FILE: scripts/check_publication.py
SUMMARY
    Checks explicitly selected publication blobs without printing their values.
BASIC IDEA
    Git modes read immutable objects, never replacement working files. Limits
    apply before reads, including ZIP expansion. An incomplete scan fails closed.
    A clean result means only that the selected bytes satisfy this rule set.
INPUTS / INPUT SOURCES
    A Git commit/index or NUL-separated relative paths and a versioned policy.
EXPECTED OUTPUT
    Escaped paths and rule names only. Exit 0 clean, 1 findings, 2 incomplete.
================================================================================
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import zipfile

FILE_LIMIT = 20 * 1024 * 1024
TOTAL_LIMIT = 100 * 1024 * 1024
MEMBER_LIMIT = 1000
DATA_EXTENSIONS = {'.ttl', '.rdf', '.nt', '.nq', '.trig', '.n3', '.jsonld', '.csv', '.tsv', '.xlsx'}
RULES = {'private-path', 'credentials', 'source-record', 'internal-source', 'example-secret'}
PLACEHOLDERS = {'', 'replace-me', 'change-me', 'your-client-secret', 'example', 'dummy', 'unset'}
SECRETS = re.compile(
    r'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----'
    r'|\bGOCSPX-[A-Za-z0-9_-]{12,}'
    r'|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'
    r'|\bgh[pousr]_[A-Za-z0-9]{30,}'
    r'|\bgithub_pat_[A-Za-z0-9_]{30,}'
    r'|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}'
)
# Match actual literal assignments, not a documentation mention of a field.
ASSIGNMENT = re.compile(
    r'''(?im)^\s*(?:["']?)(client_secret|session_secret|session_key|private_key|access_token|refresh_token)'''
    r'''(?:["']?)\s*[:=]\s*["']?([^\s"',;}]+)'''
)
INTERNAL_RDF = re.compile(r'(?i)(?::|[/#])(?:rawJSON|sourceJSON|originalJSON|internalComment)>?\s+(?:"|\'|\[)')


class Incomplete(Exception):
    """Carries a rule, never an exception message from an untrusted parser."""


def relative(path: str) -> str:
    if not path or '\\' in path or '\x00' in path or any(p in {'..', '.'} for p in path.split('/')):
        raise Incomplete('invalid-path')
    p = PurePosixPath(path)
    if p.is_absolute() or re.match(r'^[A-Za-z]:', path):
        raise Incomplete('invalid-path')
    return str(p)


def git(*args: str) -> bytes:
    result = subprocess.run(['git', *args], capture_output=True)
    if result.returncode:
        raise Incomplete('git-read')
    return result.stdout


def git_entries(ref: str | None) -> dict[str, tuple[str, str]]:
    entries = {}
    if ref is not None:
        if ref.startswith('-'):
            raise Incomplete('invalid-ref')
        commit = git('rev-parse', '--verify', ref + '^{commit}').decode().strip()
        records = git('ls-tree', '-rz', '--full-tree', commit).split(b'\0')
    else:
        records = git('ls-files', '--stage', '-z').split(b'\0')
    for record in records:
        if not record:
            continue
        metadata, raw_path = record.split(b'\t', 1)
        mode, middle, end = metadata.decode('ascii').split()
        path = relative(os.fsdecode(raw_path))
        if ref is None:
            if end != '0':
                raise Incomplete('unmerged-index')
            oid = middle
        else:
            if middle != 'blob':
                raise Incomplete('unsupported-git-object')
            oid = end
        entries[path] = (mode, oid)
    return entries


def git_blob(entry: tuple[str, str]) -> bytes:
    mode, oid = entry
    if mode not in {'100644', '100755'}:
        raise Incomplete('link-or-special-file')
    if int(git('cat-file', '-s', oid)) > FILE_LIMIT:
        raise Incomplete('file-limit')
    data = git('cat-file', 'blob', oid)
    if len(data) > FILE_LIMIT:
        raise Incomplete('file-limit')
    return data


def file_blob(root: Path, path: str) -> bytes:
    target = root
    for part in PurePosixPath(relative(path)).parts:
        target = target / part
        if target.is_symlink():
            raise Incomplete('link-or-special-file')
    info = target.stat()
    if not stat.S_ISREG(info.st_mode):
        raise Incomplete('link-or-special-file')
    if info.st_size > FILE_LIMIT:
        raise Incomplete('file-limit')
    with target.open('rb') as stream:
        data = stream.read(FILE_LIMIT + 1)
    if len(data) > FILE_LIMIT:
        raise Incomplete('file-limit')
    return data


def policy_from(data: bytes) -> tuple[dict, dict]:
    try:
        policy = json.loads(data)
        if policy['version'] != 1 or not isinstance(policy['public_samples'], list) or not isinstance(policy['exceptions'], list):
            raise ValueError()
        samples, exceptions = {}, {}
        for item in policy['public_samples']:
            path = relative(item['path'])
            if path in samples or not all(isinstance(item[k], str) and item[k] for k in ('source', 'license', 'sha256')):
                raise ValueError()
            if not re.fullmatch('[0-9a-f]{64}', item['sha256']):
                raise ValueError()
            samples[path] = item['sha256']
        for item in policy['exceptions']:
            path = relative(item['path'])
            if any(c in path for c in '*?[') or path.endswith('/') or item['rule'] not in RULES or not item['reason'].strip():
                raise ValueError()
            exceptions.setdefault(path, set()).add(item['rule'])
        return samples, exceptions
    except (ValueError, KeyError, TypeError, AttributeError, UnicodeError):
        raise Incomplete('invalid-policy') from None


def private_path(path: str) -> bool:
    p = PurePosixPath(path)
    name = p.name.lower()
    return (any(part.lower() in {'test_data', '.aws', 'shots', 'screenshots', 'sessions', 'tokens'} for part in p.parts)
            or (name.startswith('.env') and name != '.env.example')
            or p.suffix.lower() in {'.pem', '.key', '.p12', '.pfx', '.log'}
            or name.startswith('tag_information_')
            or name.startswith('crawler_data.organizations')
            or name in {'credentials', 'credentials.json', 'token.json', 'tokens.json', 'id_rsa', 'id_ed25519'})


def source_record(value) -> bool:
    if isinstance(value, dict):
        # Mongo provenance plus actual organisation fields distinguishes records
        # from source text and innocent JSON configurations mentioning the keys.
        if ('_id' in value and isinstance(value['_id'], dict) and '$oid' in value['_id']
                and any(key in value for key in ('originalName', 'name', 'published', 'country'))):
            return True
        return any(source_record(v) for v in value.values())
    if isinstance(value, list):
        return any(source_record(v) for v in value)
    return False


def json_credentials(value) -> bool:
    if isinstance(value, dict):
        for key, item in value.items():
            if str(key).lower() in {'client_secret', 'session_secret', 'session_key', 'private_key', 'access_token', 'refresh_token'}:
                if isinstance(item, str) and item.lower() not in PLACEHOLDERS and not item.startswith(('${', '<')):
                    return True
            if json_credentials(item):
                return True
    if isinstance(value, list):
        return any(json_credentials(v) for v in value)
    return False


class Scanner:
    def __init__(self, samples: dict, exceptions: dict):
        self.samples = samples
        self.exceptions = exceptions
        self.total = 0
        self.findings = False
        self.incomplete = False

    def report(self, path: str, rule: str, *, incomplete=False):
        if not incomplete and rule in self.exceptions.get(path, set()):
            return
        # JSON escaping prevents filenames from injecting terminal lines.
        print(json.dumps(path, ensure_ascii=True), rule)
        if incomplete:
            self.incomplete = True
        else:
            self.findings = True

    def scan(self, path: str, data: bytes, *, depth=0, display: str | None = None):
        label = display or path
        self.total += len(data)
        if len(data) > FILE_LIMIT or self.total > TOTAL_LIMIT:
            raise Incomplete('read-limit')
        if private_path(path):
            self.report(label, 'private-path')
        approved = self.samples.get(path) if depth == 0 else None
        if approved and hashlib.sha256(data).hexdigest() != approved:
            raise Incomplete('sample-hash')
        if path.lower().endswith('.zip') or zipfile.is_zipfile(io.BytesIO(data)):
            if depth:
                raise Incomplete('archive-depth')
            self.archive(label, data)
            return
        try:
            text = data.decode('utf-8-sig')
            if '\x00' in text:
                raise UnicodeError()
        except UnicodeError:
            if not approved:
                raise Incomplete('unapproved-binary')
            return
        if SECRETS.search(text):
            self.report(label, 'credentials')
        for assignment in ASSIGNMENT.finditer(text):
            value = assignment.group(2).lower()
            if value not in PLACEHOLDERS and not value.startswith(('${', '<', 'process.env.', 'os.environ')):
                self.report(label, 'example-secret' if PurePosixPath(path).name == '.env.example' else 'credentials')
        # Escaped source JSON embedded in a Turtle literal is still private.
        unescaped = text.replace('\\\"', '\"')
        if (re.search(r'\"_id\"\s*:', unescaped) and re.search(r'\"\$oid\"\s*:', unescaped)
                and re.search(r'\"(?:originalName|name|published|country)\"\s*:', unescaped)):
            self.report(label, 'source-record')
        if INTERNAL_RDF.search(text):
            self.report(label, 'internal-source')
        try:
            parsed = json.loads(text)
            if source_record(parsed):
                self.report(label, 'source-record')
            if json_credentials(parsed):
                self.report(label, 'credentials')
        except (ValueError, RecursionError):
            # JSON Lines is common in exports; a plain source line is never a
            # record unless it parses as a complete JSON value.
            for line in text.splitlines():
                try:
                    if source_record(json.loads(line)):
                        self.report(label, 'source-record')
                        break
                except (ValueError, RecursionError):
                    pass
        if PurePosixPath(path).suffix.lower() in DATA_EXTENSIONS and not approved:
            # Prohibited data remains a finding; an unregistered otherwise safe
            # dataset is incomplete rather than silently approved.
            if not private_path(path) and not INTERNAL_RDF.search(text):
                raise Incomplete('unregistered-dataset')

    def archive(self, outer: str, data: bytes):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                members = archive.infolist()
                if len(members) > MEMBER_LIMIT:
                    raise Incomplete('archive-members')
                for member in members:
                    path = relative(member.filename.rstrip('/'))
                    label = outer + '!' + path
                    if member.flag_bits & 1 or stat.S_ISLNK(member.external_attr >> 16):
                        raise Incomplete('archive-encrypted-or-link')
                    if member.is_dir():
                        continue
                    if member.file_size > FILE_LIMIT or self.total + member.file_size > TOTAL_LIMIT:
                        raise Incomplete('archive-read-limit')
                    with archive.open(member) as stream:
                        payload = stream.read(FILE_LIMIT + 1)
                    try:
                        self.scan(path, payload, depth=1, display=label)
                    except Incomplete as error:
                        self.report(label, str(error), incomplete=True)
        except (zipfile.BadZipFile, RuntimeError, NotImplementedError):
            raise Incomplete('archive-unreadable') from None


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split('SUMMARY')[1].split('BASIC IDEA')[0].strip())
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--git-ref')
    modes.add_argument('--staged', action='store_true')
    modes.add_argument('--root', type=Path)
    parser.add_argument('--files-from', type=Path)
    args = parser.parse_args(argv)
    if bool(args.root) != bool(args.files_from):
        parser.error('--root requires --files-from; Git modes forbid it')
    try:
        if args.root:
            root = args.root.resolve(strict=True)
            raw = args.files_from.read_bytes()
            if len(raw) > FILE_LIMIT or (raw and not raw.endswith(b'\0')):
                raise Incomplete('invalid-file-list')
            paths = list(dict.fromkeys(relative(os.fsdecode(p)) for p in raw.split(b'\0') if p))
            reader = lambda p: file_blob(root, p)
        else:
            entries = git_entries(args.git_ref)
            paths = list(entries)
            reader = lambda p: git_blob(entries[p])
        samples, exceptions = policy_from(reader('publication-policy.json'))
        scanner = Scanner(samples, exceptions)
        for path in paths:
            try:
                scanner.scan(path, reader(path))
            except (Incomplete, OSError, KeyError, ValueError) as error:
                scanner.report(path, str(error) if isinstance(error, Incomplete) else 'unreadable', incomplete=True)
        return 2 if scanner.incomplete else 1 if scanner.findings else 0
    except (Incomplete, OSError, KeyError, ValueError, RecursionError) as error:
        print('"<selection>"', str(error) if isinstance(error, Incomplete) else 'unreadable', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
