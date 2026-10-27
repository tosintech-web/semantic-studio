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
            self.assertEqual(set(service['networks']),{'release_internal','release_host'})
            self.assertTrue(service['read_only'])
            self.assertFalse(service.get('secrets'))
            self.assertTrue(all(p['host_ip']=='127.0.0.1' for p in service['ports']))
            self.assertFalse(any('DB_' in k or 'GOOGLE_' in k for k in service.get('environment',{})))
        self.assertTrue(services['release-distribution']['volumes'][0]['read_only'])
        self.assertEqual(services['release-consumer']['environment']['RELEASE_ORIGIN'],'http://release-files:8080')
        self.assertIn('release-files',services['release-distribution']['networks']['release_internal']['aliases'])
        self.assertFalse(services['release-consumer'].get('volumes'))
        self.assertEqual(services['release-consumer']['command'],['python','-P','/app/examples/release-consumer/app.py'])
        self.assertEqual(services['release-consumer']['depends_on']['release-distribution']['condition'],'service_healthy')
        self.assertEqual(services['release-import']['network_mode'],'none')
        self.assertFalse(services['release-import']['volumes'][0].get('read_only',False))

@unittest.skipUnless(os.environ.get('SEMANTIC_STUDIO_COMPOSE_TESTS')=='1','explicit disposable Docker integration required')
class ReleaseIngressTests(unittest.TestCase):
    def test_loopback_port_reaches_distribution(self):
        import socket,secrets,time,urllib.request,urllib.error
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
        env={**os.environ,'COMPOSE_PROJECT_NAME':'ss-p3-ingress-'+secrets.token_hex(4),'RELEASE_PORT':str(port)}
        args=['docker','compose','-f',str(ROOT/'docker-compose.releases.yml')]
        try:
            subprocess.run(args+['up','-d','--no-build','release-distribution'],env=env,capture_output=True,check=True)
            reached=False
            for _ in range(40):
                try:
                    urllib.request.urlopen(f'http://127.0.0.1:{port}/current.json',timeout=1)
                    reached=True;break
                except urllib.error.HTTPError as error:
                    code=error.code;error.close()
                    if code==404:reached=True;break
                except OSError:pass
                time.sleep(0.1)
            self.assertTrue(reached,'published loopback port must reach the reader')
        finally:
            subprocess.run(args+['down'],env=env,capture_output=True,check=True)
