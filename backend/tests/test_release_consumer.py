"""
FILE: backend/tests/test_release_consumer.py
SUMMARY
    The independent consumer pins versions and verifies received public files.
BASIC IDEA
    Supply a recording HTTP transport with actual release file bytes.
INPUTS / INPUT SOURCES
    Synthetic public packages, malformed responses and requested UUIDs.
EXPECTED OUTPUT
    Stable searchable entities or refusal without replacing an accepted version.
"""
import importlib.util
from pathlib import Path
from io import BytesIO
import pytest
from test_release_package import package,RID
from app.releases.package import validate_package,ReleaseError

spec=importlib.util.spec_from_file_location('release_consumer',Path(__file__).resolve().parents[2]/'examples/release-consumer/app.py')
consumer=importlib.util.module_from_spec(spec);spec.loader.exec_module(consumer)

class Transport:
    def __init__(self,files):self.files=files;self.urls=[]
    def open(self,url,timeout):
        self.urls.append(url)
        return BytesIO(self.files[url.rsplit('/',1)[1]])

def test_pinned_verified_search_keeps_same_name_entities(monkeypatch):
    transport=Transport(validate_package(package()).files)
    monkeypatch.setattr(consumer,'opener',lambda:transport)
    result=consumer.load_release('http://release-distribution:8080',RID)
    assert [e['iri'] for e in consumer.search(result,'犬')]==['urn:test:a','urn:test:b']
    assert all('/releases/'+RID+'/' in url for url in transport.urls)

def test_bad_hash_or_wrong_version_is_refused(monkeypatch):
    files=dict(validate_package(package()).files);files['dictionary.json']=b'private'
    monkeypatch.setattr(consumer,'opener',lambda:Transport(files))
    with pytest.raises(ReleaseError):consumer.load_release('http://release-distribution:8080',RID)
    with pytest.raises(ReleaseError):consumer.load_release('http://release-distribution:8080/other',RID)

def test_uncompressed_boundary_does_not_gain_zip_overhead(monkeypatch):
    files=validate_package(package()).files;limit=sum(map(len,files.values()))
    monkeypatch.setattr(consumer,'MAX_BYTES',limit)
    monkeypatch.setattr('app.releases.package.MAX_BYTES',limit)
    monkeypatch.setattr(consumer,'opener',lambda:Transport(files))
    assert consumer.load_release('http://release-distribution:8080',RID)['releaseId']==RID

def test_slow_trickle_observes_total_deadline(monkeypatch):
    clock=[0.0]
    class Slow(BytesIO):
        def read(self,n=-1):raise AssertionError('unchunked buffered read can wait forever')
        def read1(self,n=-1):clock[0]+=4;return b' '
    class SlowTransport:
        def open(self,*args,**kwargs):return Slow()
    monkeypatch.setattr(consumer,'opener',lambda:SlowTransport())
    monkeypatch.setattr(consumer.time,'monotonic',lambda:clock[0])
    with pytest.raises(ReleaseError):consumer.load_release('http://release-distribution:8080',RID)
    assert clock[0]<=16

def test_total_deadline_also_bounds_header_wait_and_limits_workers(monkeypatch):
    import threading
    import time
    entered=threading.Event();release=threading.Event();finished=threading.Event()
    class HeaderWait:
        def open(self,*args,**kwargs):
            entered.set()
            try:release.wait(2);raise OSError('header unavailable')
            finally:finished.set()
    monkeypatch.setattr(consumer,'opener',lambda:HeaderWait())
    monkeypatch.setattr(consumer,'LOAD_TIMEOUT',0.02,raising=False)
    start=time.monotonic()
    try:
        with pytest.raises(ReleaseError):consumer.load_release('http://release-distribution:8080',RID)
        assert entered.is_set() and time.monotonic()-start<0.5
        with pytest.raises(ReleaseError):consumer.load_release('http://release-distribution:8080',RID)
    finally:release.set();assert finished.wait(2)
