"""
================================================================================
FILE: scripts/test_distribution_notices.py
SUMMARY
    Distribution notices follow actual installed Python versions and bytes.
BASIC IDEA
    Fake only distribution metadata over temporary files; reject changed versions,
    missing notices and mismatched originals before creating an output artifact.
INPUTS / INPUT SOURCES
    Synthetic package metadata and independently computed SHA-256 values.
EXPECTED OUTPUT
    Exact original bytes and matching inventory, or a failed distribution gate.
================================================================================
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import tempfile
import unittest
from distribution_notices import collect_python_notices


class DistributionNoticesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.content = b"Synthetic license fixture\r\nOriginal bytes\r\n"
        self.path = "synthetic-1.0.dist-info/LICENSE"
        self.file = self.root / self.path
        self.file.parent.mkdir()
        self.file.write_bytes(self.content)
        root = self.root
        class Distribution:
            metadata = {"Name":"synthetic"}
            version = "1.0"
            files = [PurePosixPath("synthetic-1.0.dist-info/LICENSE")]
            def locate_file(self, path):
                return root / str(path)
        self.dist = Distribution()
        self.inventory = {"components":[{"ecosystem":"python","name":"synthetic","version":"1.0","license":"MIT",
            "status":"text-collected","notices":[{"original_path":self.path,"sha256":hashlib.sha256(self.content).hexdigest()}]}]}
        self.output = self.root / "output"

    def test_actual_version_and_original_bytes_are_in_the_artifact(self):
        collect_python_notices(self.inventory, self.output, [self.dist])
        inventory = json.loads((self.output / "runtime-components.json").read_text())
        component = inventory["components"][0]
        self.assertEqual(component["version"], "1.0")
        self.assertEqual((self.output / component["notices"][0]["text"]).read_bytes(), self.content)
        self.assertNotIn(str(self.root), json.dumps(inventory))

    def test_an_unreviewed_resolved_version_stops_distribution(self):
        self.dist.version = "2.0"
        with self.assertRaisesRegex(ValueError, "synthetic.*2.0"):
            collect_python_notices(self.inventory, self.output, [self.dist])
        self.assertFalse(self.output.exists())

    def test_changed_notice_bytes_stop_distribution(self):
        self.file.write_bytes(b"Different license")
        with self.assertRaisesRegex(ValueError, "notice.*synthetic"):
            collect_python_notices(self.inventory, self.output, [self.dist])
        self.assertFalse(self.output.exists())

    def test_missing_notice_stops_distribution(self):
        self.file.unlink()
        with self.assertRaises((ValueError, FileNotFoundError)):
            collect_python_notices(self.inventory, self.output, [self.dist])
        self.assertFalse(self.output.exists())
