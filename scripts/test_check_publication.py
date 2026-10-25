"""
================================================================================
FILE: scripts/test_check_publication.py
SUMMARY
    Exercises publication checks against disposable files and real Git blobs.
BASIC IDEA
    Construct negative inputs at runtime; cover structural Python credential
    sites, dynamic configuration, full-text secrets and fail-closed parsing.
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

    def test_private_deployment_values_are_injected_without_echo(self):
        value = 'deployment-' + 'internal.example'
        needles = self.write('operator.private-values', value + '\n')
        self.write('README.md', 'Contact ' + value.upper())
        result = self.run_check(['README.md'], '--private-values-file', str(needles))
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('deployment-value', result.stdout)
        self.assertNotIn(value.lower(), (result.stdout + result.stderr).lower())
        self.write('README.md', 'Allowed domains come from server environment settings.')
        self.assertEqual(self.run_check(['README.md'], '--private-values-file', str(needles)).returncode, 0)

    def test_private_value_scan_reaches_archives_and_approved_samples(self):
        value = 'private-' + 'workspace.example'
        needles = self.write('operator.private-values', value + '\n')
        self.write('approved.ttl', '<urn:a> <urn:p> "' + value + '" .')
        self.approve('approved.ttl')
        result = self.run_check(['approved.ttl'], '--private-values-file', str(needles))
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr('guide.md', value)
        self.write('release.zip', archive.getvalue())
        result = self.run_check(['release.zip'], '--private-values-file', str(needles))
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertNotIn(value, result.stdout + result.stderr)

    def test_private_value_file_is_bounded_and_errors_are_sanitized(self):
        marker = 'private-' + 'settings-marker'
        for data in [b'', b'\xff', b'a\0b\n', b'a' * 65537, b'\n' * 4]:
            with self.subTest(size=len(data)):
                needles = self.write(marker + '.private-values', data)
                self.write('safe.md', 'Generic configuration')
                result = self.run_check(['safe.md'], '--private-values-file', str(needles))
                self.assertEqual(result.returncode, 2)
                self.assertNotIn(marker, result.stdout + result.stderr)

    def test_private_values_in_names_are_rejected_and_not_echoed(self):
        value = 'hidden-' + 'tenant.example'
        needles = self.write('operator.private-values', value + '\n')
        filename = value.upper() + '.md'
        self.write(filename, 'Generic description')
        result = self.run_check([filename], '--private-values-file', str(needles))
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(value.lower(), (result.stdout + result.stderr).lower())

    def test_private_values_inside_approved_binary_samples_are_rejected(self):
        value = 'hidden-' + 'workspace.example'
        needles = self.write('operator.private-values', value + '\n')
        self.write('sample.bin', b'\xff\0' + value.upper().encode() + b'\0\xff')
        self.approve('sample.bin')
        result = self.run_check(['sample.bin'], '--private-values-file', str(needles))
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertNotIn(value.lower(), (result.stdout + result.stderr).lower())

    def test_runtime_database_and_private_value_paths_cannot_be_published(self):
        for path in ['team.sqlite', 'team.sqlite-wal', 'x/auth.sqlite3-shm', 'state.db',
                     'state.db-journal', 'operator.private-values']:
            with self.subTest(path=path):
                self.write(path, 'synthetic runtime data')
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

    def test_google_environment_secret_names_are_checked_in_public_templates(self):
        value = 'assembled-' + 'deployment-secret'
        for key in ['GOOGLE_CLIENT_SECRET', 'SEMANTIC_STUDIO_GOOGLE_CLIENT_SECRET']:
            with self.subTest(key=key):
                self.write('.env.example', key + '=' + value + '\n')
                result = self.run_check(['.env.example'])
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertNotIn(value, result.stdout + result.stderr)
                self.write('.env.example', key + '=replace-me\n')
                self.assertEqual(self.run_check(['.env.example']).returncode, 0)

    def test_dataclass_secret_field_checks_default_without_treating_flags_as_values(self):
        self.write('config.py', 'from dataclasses import field\ngoogle_client_secret = field(default=None, repr=False)\n')
        self.assertEqual(self.run_check(['config.py']).returncode, 0)
        value = 'assembled-' + 'credential-default'
        self.write('config.py', 'from dataclasses import field\ngoogle_client_secret = field(default=' + repr(value) + ', repr=False)\n')
        result = self.run_check(['config.py'])
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(value, result.stdout + result.stderr)
        self.write('config.py', 'google_client_secret = field(default_factory=unknown_factory)\n')
        self.assertEqual(self.run_check(['config.py']).returncode, 2)

    def test_json_secret_and_escaped_rdf_record_are_refused(self):
        value = 'assembled-' + 'secret-value'
        self.write('config.json', json.dumps({'client_secret': value}))
        self.assertEqual(self.run_check(['config.json']).returncode, 1)
        record = json.dumps({'_id': {'$oid': 'b' * 24}, 'name': 'private-marker'})
        self.write('embedded.txt', '<urn:a> <urn:opaque> ' + json.dumps(record) + ' .')
        self.assertEqual(self.run_check(['embedded.txt']).returncode, 1)

    def test_both_positive_and_negative_code_are_scanned_without_mention_false_positive(self):
        self.write('script.py', "setting = {'client_secret': value}\n# session_secret is a field\n")
        self.assertEqual(self.run_check(['script.py']).returncode, 0)

    def test_python_runtime_credential_references_pass(self):
        sources = [
            "payload = {\n 'client_secret': self.config.google_client_secret,\n}\n",
            "client_secret = config.secret\n",
            "client_secret = os.environ['GOOGLE_CLIENT_SECRET']\n",
            "client_secret = os.getenv('GOOGLE_CLIENT_SECRET')\n",
            "client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')\n",
            "send(client_secret=config.secret)\n",
            "holder.client_secret: str = config.secret\n",
            "payload['client_secret'] = config.secret\n",
            "not_client_secret = 'ordinary text'\n",
            "payload = {'client_secret_extra': 'ordinary text'}\n",
            "send(not_client_secret='ordinary text')\n",
        ]
        for source in sources:
            with self.subTest(case=sources.index(source)):
                self.write('runtime.py', source)
                result = self.run_check(['runtime.py'])
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_python_static_credential_sites_fail_without_echo(self):
        marker = 'synthetic-' + 'embedded-value'
        templates = [
            "client_secret = {value}", "CLIENT_SECRET: str = {value}",
            "holder.client_secret = {value}", "payload['client_secret'] = {value}",
            "payload = {{'client_secret': {value}}}",
            "payload = {{'outer': [{{'client_secret': {value}}}]}}",
            "send(client_secret={value})", "payload = dict(client_secret={value})",
            "payload = {{'client_' + 'secret': {value}}}",
            "client_secret = {{'nested': {value}}}",
            "client_secret = os.getenv('KEY', {value})",
            "client_secret = {value}.strip",
            "def handler(client_secret={value}): pass",
            "def handler(*, client_secret={value}): pass",
        ]
        values = [repr(marker), 'b' + repr(marker),
                  repr('synthetic-') + ' + ' + repr('embedded-value'),
                  'f' + repr('synthetic-{config.name}-embedded-value')]
        for template in templates:
            for value in values:
                self.write('static.py', template.format(value=value) + '\n')
                result = self.run_check(['static.py'])
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn('credentials', result.stdout)
                self.assertNotIn(marker, result.stdout + result.stderr)

    def test_python_unknown_constructions_and_syntax_fail_closed(self):
        for source in ["client_secret = make_secret()", "client_secret = 123",
                       "client_secret = [x for x in values]", "payload = {'client_secret':"]:
            self.write('unknown.py', source)
            result = self.run_check(['unknown.py'])
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertNotIn(source, result.stdout + result.stderr)

    def test_python_environment_argument_expansion_fails_closed(self):
        for source in [
            "client_secret = os.getenv(*['UNSET_SYNTHETIC_KEY', 'synthetic-default-value'])",
            "client_secret = os.environ.get(*values)",
            "client_secret = os.getenv(**options)",
            "client_secret = os.getenv('UNSET_SYNTHETIC_KEY', **options)",
        ]:
            self.write('expanded.py', source)
            result = self.run_check(['expanded.py'])
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertNotIn('synthetic-default-value', result.stdout + result.stderr)

    def test_python_credential_format_specification_fails_closed(self):
        for source in [
            'client_secret = f\'{"":x<32}\'',
            "client_secret = f'{config.secret:>{width}}'",
        ]:
            self.write('formatted.py', source)
            result = self.run_check(['formatted.py'])
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)

    def test_python_placeholder_credentials_pass(self):
        for value in ['replace-me', 'example', '', '${GOOGLE_SECRET}', '<configured-secret>']:
            self.write('placeholder.py', 'client_secret = ' + repr(value))
            result = self.run_check(['placeholder.py'])
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_python_full_text_secret_rules_cover_comments_and_docstrings(self):
        value = 'gh' + 'p_' + 'x' * 36
        for source in ['# ' + value, repr(value), 'ordinary = ' + repr(value)]:
            self.write('source.py', source)
            result = self.run_check(['source.py'])
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertNotIn(value, result.stdout + result.stderr)

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
