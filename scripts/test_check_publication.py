"""
================================================================================
FILE: scripts/test_check_publication.py
SUMMARY
    Exercises publication checks against disposable files and real Git blobs.
BASIC IDEA
    Construct negative inputs at runtime; never commit credential-shaped values.
INPUTS / INPUT SOURCES
    Temporary directories, synthetic records, local Git with no remote.
EXPECTED OUTPUT
    Safe sources pass, prohibited content fails, incomplete inspection is code 2.
================================================================================
"""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).with_name('check_publication.py').resolve()


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.policy = {'version': 1, 'public_samples': [], 'exceptions': []}
        self.write('publication-policy.json', json.dumps(self.policy))

    def write(self, path, data):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data.encode() if isinstance(data, str) else data)
        return target

    def run_check(self, files, *extra):
        self.write('files.list', b'\0'.join(p.encode() for p in files) + b'\0')
        return subprocess.run([sys.executable, str(SCRIPT), '--root', str(self.root),
                               '--files-from', str(self.root / 'files.list'), *extra],
                              capture_output=True, text=True, cwd=self.root)

    def approve(self, path):
        self.policy['public_samples'] = [s for s in self.policy['public_samples'] if s['path'] != path]
        self.policy['public_samples'].append({'path': path, 'source': 'https://example.org/synthetic/',
            'license': 'MIT', 'sha256': hashlib.sha256((self.root / path).read_bytes()).hexdigest()})
        self.write('publication-policy.json', json.dumps(self.policy))

    def test_synthetic_rdf_and_documentation_pass(self):
        self.write('sample.ttl', '@prefix s: <https://example.org/synthetic/> . s:a s:name "合成" .')
        self.approve('sample.ttl')
        self.write('README.md', 'Field names such as client_secret and rawJSON are documentation.')
        self.write('.env.example', 'GOOGLE_CLIENT_SECRET=replace-me\nSESSION_SECRET=change-me\n')
        result = self.run_check(['sample.ttl', 'README.md', '.env.example'])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_private_paths_fail_even_with_public_sample_hash(self):
        for path in ['test_data/a.ttl', '.env', '.env.production', '.aws/config', 'x/secret.key',
                     'crawler_data.organizations.json', 'tag_information_123.xlsx', 'shots/a.svg', 'trace.log']:
            with self.subTest(path=path):
                self.write(path, 'harmless')
                self.approve(path)
                self.assertEqual(self.run_check([path]).returncode, 1)

    def test_renamed_database_records_fail_and_values_are_not_logged(self):
        secret_name = 'private-' + 'record-marker'
        payload = {'_id': {'$oid': 'a' * 24}, 'originalName': secret_name, 'published': True}
        self.write('renamed.json', json.dumps([payload]))
        result = self.run_check(['renamed.json'])
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertNotIn(secret_name, result.stdout + result.stderr)

    def test_rdf_embedded_source_and_internal_comment_fail(self):
        for field in ['rawJSON', 'internalComment']:
            self.write('renamed.ttl', f'@prefix x: <https://example.org/> . x:a x:{field} "private-value" .')
            self.approve('renamed.ttl')
            self.assertEqual(self.run_check(['renamed.ttl']).returncode, 1)

    def test_credential_values_fail_without_echo(self):
        values = ['GOC' + 'SPX-' + 'a' * 30, 'AK' + 'IA' + 'Z' * 16,
                  'gh' + 'p_' + 'a' * 36, '-----BEGIN ' + 'PRIVATE KEY-----']
        for value in values:
            self.write('config.txt', value)
            result = self.run_check(['config.txt'])
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertNotIn(value, result.stdout + result.stderr)

    def test_json_secret_and_escaped_rdf_record_are_refused(self):
        self.write('config.json', json.dumps({'client_secret': 'assembled-' + 'secret-value'}))
        self.assertEqual(self.run_check(['config.json']).returncode, 1)
        record = json.dumps({'_id': {'$oid': 'b' * 24}, 'name': 'private-marker'})
        self.write('embedded.txt', '<urn:a> <urn:opaque> ' + json.dumps(record) + ' .')
        self.assertEqual(self.run_check(['embedded.txt']).returncode, 1)

    def test_both_positive_and_negative_code_are_scanned_without_mention_false_positive(self):
        self.write('script.py', "setting = {'client_secret': value}\n# session_secret is a field\n")
        self.assertEqual(self.run_check(['script.py']).returncode, 0)

    def test_real_secret_assignment_in_example_is_refused(self):
        self.write('.env.example', 'SESSION_SECRET=' + 'random-' + 'value-not-placeholder')
        self.assertEqual(self.run_check(['.env.example']).returncode, 1)

    def test_unknown_binary_and_unregistered_dataset_are_incomplete(self):
        for path, content in [('asset.bin', b'\x00\xff'), ('sample.ttl', b'<urn:a> <urn:b> <urn:c> .')]:
            self.write(path, content)
            self.assertEqual(self.run_check([path]).returncode, 2)

    def test_binary_approval_is_hash_specific(self):
        self.write('asset.bin', b'\x00\xff')
        self.approve('asset.bin')
        self.assertEqual(self.run_check(['asset.bin']).returncode, 0)
        self.write('asset.bin', b'changed')
        self.assertEqual(self.run_check(['asset.bin']).returncode, 2)

    def test_traversal_missing_and_symlink_are_incomplete(self):
        self.write('ok.txt', 'safe')
        (self.root / 'link.txt').symlink_to(self.root / 'ok.txt')
        for path in ['../outside', '/absolute', 'missing', 'link.txt']:
            with self.subTest(path=path):
                self.assertEqual(self.run_check([path]).returncode, 2)

    def test_filename_diagnostic_escapes_newlines(self):
        path = 'folder/line\nbreak.log'
        self.write(path, 'value')
        result = self.run_check([path])
        self.assertEqual(result.returncode, 1)
        self.assertIn('\\n', result.stdout)
        self.assertNotIn('line\nbreak', result.stdout)

    def archive(self, entries):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as z:
            for name, content in entries:
                z.writestr(name, content)
        return stream.getvalue()

    def test_zip_member_checked_without_extraction(self):
        self.write('package.zip', self.archive([('.env', 'never-echo-this')]))
        result = self.run_check(['package.zip'])
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('package.zip', result.stdout)
        self.assertIn('.env', result.stdout)
        self.assertNotIn('never-echo-this', result.stdout)
        self.assertFalse((self.root / '.env').exists())

    def test_nested_or_escaping_archive_is_incomplete(self):
        for entries in [[('../out', 'x')], [('nested.zip', self.archive([('a.txt', 'x')]))]]:
            self.write('package.zip', self.archive(entries))
            self.assertEqual(self.run_check(['package.zip']).returncode, 2)

    def test_archive_member_count_corruption_and_links_are_incomplete(self):
        self.write('package.zip', self.archive([(f'{i}.txt', 'x') for i in range(1001)]))
        self.assertEqual(self.run_check(['package.zip']).returncode, 2)
        self.write('package.zip', b'not-a-zip')
        self.assertEqual(self.run_check(['package.zip']).returncode, 2)
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            link = zipfile.ZipInfo('link')
            link.create_system = 3
            link.external_attr = 0o120777 << 16
            archive.writestr(link, 'target')
        self.write('package.zip', stream.getvalue())
        self.assertEqual(self.run_check(['package.zip']).returncode, 2)

    def test_zip_expansion_limits_and_regular_file_limit(self):
        self.write('package.zip', self.archive([('huge.txt', b'a' * (20 * 1024 * 1024 + 1))]))
        self.assertEqual(self.run_check(['package.zip']).returncode, 2)
        self.write('huge.txt', b'a' * (20 * 1024 * 1024 + 1))
        self.assertEqual(self.run_check(['huge.txt']).returncode, 2)

    def test_invalid_policy_is_incomplete(self):
        self.policy['exceptions'] = [{'path': '**', 'rule': 'credentials', 'reason': 'all'}]
        self.write('publication-policy.json', json.dumps(self.policy))
        self.write('safe.txt', 'safe')
        self.assertEqual(self.run_check(['safe.txt']).returncode, 2)

    def test_exception_does_not_exempt_other_rules(self):
        self.policy['exceptions'] = [{'path': 'config.txt', 'rule': 'source-record', 'reason': 'reviewed dummy'}]
        self.write('publication-policy.json', json.dumps(self.policy))
        self.write('config.txt', 'GOC' + 'SPX-' + 'x' * 30)
        self.assertEqual(self.run_check(['config.txt']).returncode, 1)

    def git(self, *args):
        return subprocess.run(['git', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.org',
                               *args], cwd=self.root, check=True, capture_output=True)

    def test_git_modes_read_blobs_not_harmless_worktree(self):
        self.git('init', '-q')
        self.write('a name\nline.txt', 'GOC' + 'SPX-' + 'x' * 30)
        self.git('add', 'publication-policy.json', 'a name\nline.txt')
        self.git('commit', '-qm', 'fixture')
        self.write('a name\nline.txt', 'safe working tree')
        for args in [('--staged',), ('--git-ref', 'HEAD')]:
            result = subprocess.run([sys.executable, str(SCRIPT), *args], cwd=self.root,
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertNotIn('x' * 30, result.stdout + result.stderr)

    def test_invalid_ref_or_conflicting_modes_are_incomplete(self):
        self.git('init', '-q')
        for args in [('--git-ref', 'missing'), ('--staged', '--git-ref', 'HEAD')]:
            result = subprocess.run([sys.executable, str(SCRIPT), *args], cwd=self.root,
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)


if __name__ == '__main__':
    unittest.main()
