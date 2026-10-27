"""
FILE: scripts/test_release_compose.py
SUMMARY
    Verify the resolved distribution overlay has no private editor capability.
BASIC IDEA
    Inspect Docker Compose's normalized configuration, not YAML source text.
INPUTS / INPUT SOURCES
    Release overlay with a synthetic fixed version and local input path.
EXPECTED OUTPUT
    Internal networking, loopback ports and exactly one public-volume writer.
"""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]

class ReleaseComposeTests(unittest.TestCase):
    def test_resolved_isolation(self):
        env={**os.environ,'RELEASE_ID':'12345678-1234-4234-8234-123456789012'}
        result=subprocess.run(['docker','compose','--profile','release-maintenance','-f',str(ROOT/'docker-compose.releases.yml'),'config','--format','json'],env=env,capture_output=True,text=True,check=True)
        config=json.loads(result.stdout);services=config['services']
        self.assertTrue(config['networks']['release_internal']['internal'])
        for name in ('release-distribution','release-consumer'):
            service=services[name]
            self.assertEqual(set(service['networks']),{'release_internal'})
            self.assertTrue(service['read_only'])
            self.assertFalse(service.get('secrets'))
            self.assertTrue(all(p['host_ip']=='127.0.0.1' for p in service['ports']))
            self.assertFalse(any('DB_' in k or 'GOOGLE_' in k for k in service.get('environment',{})))
        self.assertTrue(services['release-distribution']['volumes'][0]['read_only'])
        self.assertFalse(services['release-consumer'].get('volumes'))
        self.assertEqual(services['release-import']['network_mode'],'none')
        self.assertFalse(services['release-import']['volumes'][0].get('read_only',False))
