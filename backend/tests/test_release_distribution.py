"""
FILE: backend/tests/test_release_distribution.py
SUMMARY
    Independent distribution survives restart and rejects unsafe generations.
BASIC IDEA
    Import real packages, activate them and drive the read-only HTTP service.
INPUTS / INPUT SOURCES
    Temporary local stores and synthetic release ZIPs.
EXPECTED OUTPUT
    Atomic current pointers, retained old versions and no private HTTP paths.
"""
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.releases.distribution import import_package,activate_release,status
from app.releases.server import create_distribution_app
from app.releases.package import build_package,ReleaseError
from app.releases.profile import project_graph
from test_release_package import graph,META,RID
RID2='22345678-1234-4234-8234-123456789012'

def source(tmp_path,rid=RID,approved=True):
    p=tmp_path/(rid+'.zip');p.write_bytes(build_package(project_graph(graph()),release_id=rid,created_at='2026-10-27T00:00:00+00:00',metadata=META,approved=approved));return p

def test_import_activate_restart_and_rollback(tmp_path):
    root=tmp_path/'public'; import_package(source(tmp_path),root)
    assert status(root) is None
    first=activate_release(root,RID)
    import_package(source(tmp_path,RID2),root);activate_release(root,RID2)
    assert activate_release(root,RID)==first
    with TestClient(create_distribution_app(root)) as client:
        assert client.get('/current.json').json()['releaseId']==RID
        response=client.get(f'/releases/{RID}/dictionary.json')
        assert response.status_code==200
        assert client.head(f'/releases/{RID}/dictionary.json').content==b''
        assert client.get(f'/releases/{RID}/dictionary.json',headers={'If-None-Match':response.headers['etag']}).status_code==304
        for path in ('/','/receipts.jsonl','/.lock',f'/releases/{RID}/package.zip'):
            assert client.get(path).status_code==404
        assert client.post('/current.json').status_code==405

def test_preview_and_conflicting_id_do_not_replace_current(tmp_path):
    root=tmp_path/'public';import_package(source(tmp_path),root);activate_release(root,RID)
    with pytest.raises(ReleaseError):import_package(source(tmp_path,RID2,False),root)
    p=source(tmp_path)
    data=build_package(project_graph(graph()),release_id=RID,created_at='2026-10-28T00:00:00+00:00',metadata=META,approved=True);p.write_bytes(data)
    with pytest.raises(ReleaseError):import_package(p,root)
    assert status(root)['releaseId']==RID

def test_failure_before_replace_preserves_current(tmp_path,monkeypatch):
    root=tmp_path/'public';import_package(source(tmp_path),root);activate_release(root,RID);import_package(source(tmp_path,RID2),root)
    import app.releases.distribution as module
    original=module.os.replace
    def fail(source,target):
        if Path(target).name=='current.json': raise OSError('disk failure')
        return original(source,target)
    monkeypatch.setattr(module.os,'replace',fail)
    with pytest.raises(OSError): activate_release(root,RID2)
    assert status(root)['releaseId']==RID

def test_corrupt_or_symlink_files_never_served(tmp_path):
    root=tmp_path/'public';import_package(source(tmp_path),root);activate_release(root,RID)
    (root/'releases'/RID/'dictionary.json').write_bytes(b'private!')
    with TestClient(create_distribution_app(root)) as c:
        assert c.get(f'/releases/{RID}/dictionary.json').status_code==503
    with pytest.raises(ReleaseError):activate_release(root,RID)

def test_first_install_fsyncs_public_root(tmp_path,monkeypatch):
    import app.releases.distribution as module
    original=module.fsync_directory;seen=[]
    def record(path):seen.append(Path(path));return original(path)
    monkeypatch.setattr(module,'fsync_directory',record)
    root=tmp_path/'public';import_package(source(tmp_path),root)
    assert root in seen

def test_receipts_record_completed_import_and_failed_activation(tmp_path):
    root=tmp_path/'public';import_package(source(tmp_path),root)
    rows=[json.loads(line) for line in (root/'receipts.jsonl').read_text().splitlines()]
    assert [(r['operation'],r['state']) for r in rows]==[('import','prepared'),('import','completed')]
    with pytest.raises(ReleaseError):activate_release(root,RID2)
    rows=[json.loads(line) for line in (root/'receipts.jsonl').read_text().splitlines()]
    assert rows[-1]['operation']=='activate' and rows[-1]['state']=='failed'
    assert rows[-1]['releaseId']==RID2

def test_rejected_import_records_finite_failure(tmp_path):
    root=tmp_path/'public'
    with pytest.raises(ReleaseError):import_package(source(tmp_path,approved=False),root)
    row=json.loads((root/'receipts.jsonl').read_text().splitlines()[-1])
    assert row['state']=='failed' and row['operation']=='import'
    assert 'Source' not in json.dumps(row) and 'Synthetic' not in json.dumps(row)
