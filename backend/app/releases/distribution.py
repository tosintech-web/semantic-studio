"""
FILE: backend/app/releases/distribution.py
SUMMARY
    Explicit local import and atomic activation of approved release packages.
BASIC IDEA
    A single OS writer lock protects immutable generation installation and an
    fsynced pointer. Private receipts record intent before pointer replacement;
    a post-replace interruption is resolved by reading current, never guessing.
INPUTS / INPUT SOURCES
    A trusted operator's bounded package path and dedicated distribution root.
EXPECTED OUTPUT
    Verified public generations and recoverable local activation records.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import tempfile
from uuid import uuid4
from .package import validate_package, release_id, canonical, digest, MAX_BYTES, FILES
from .profile import ReleaseError


def fsync_directory(path):
    if os.name=='nt': return
    fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY)
    try: os.fsync(fd)
    finally: os.close(fd)


def read_bounded(path,limit=MAX_BYTES):
    if path.is_symlink() or not path.is_file(): raise ReleaseError()
    with path.open('rb') as f: data=f.read(limit+1)
    if len(data)>limit: raise ReleaseError('too_large',413)
    return data


@contextmanager
def writer(root):
    root=Path(root)
    if root.is_symlink(): raise ReleaseError()
    root.mkdir(parents=True,exist_ok=True)
    path=root/'.writer.lock'
    fd=os.open(path,os.O_RDWR|os.O_CREAT|getattr(os,'O_NOFOLLOW',0),0o600)
    try:
        if os.name=='nt':
            import msvcrt
            if os.fstat(fd).st_size==0: os.write(fd,b'0')
            os.lseek(fd,0,0);msvcrt.locking(fd,msvcrt.LK_LOCK,1)
        else:
            import fcntl
            fcntl.flock(fd,fcntl.LOCK_EX)
        yield root
    finally:
        os.close(fd)


def receipt(root,value):
    # O_NOFOLLOW prevents an operator error turning the private journal into
    # an overwrite of another mounted file. Failure is visible before activate.
    fd=os.open(root/'receipts.jsonl',os.O_WRONLY|os.O_APPEND|os.O_CREAT|getattr(os,'O_NOFOLLOW',0),0o600)
    try:
        with os.fdopen(fd,'ab',closefd=False) as stream:
            stream.write(canonical(value)+b'\n');stream.flush();os.fsync(stream.fileno())
    finally: os.close(fd)
    fsync_directory(root)


def generation(root,rid):
    release_id(rid);folder=Path(root)/'releases'/rid
    if folder.is_symlink() or folder.parent.is_symlink(): raise ReleaseError()
    data=read_bounded(folder/'package.zip')
    checked=validate_package(data)
    if checked.manifest['releaseId']!=rid: raise ReleaseError()
    for name,value in checked.files.items():
        if read_bounded(folder/name)!=value: raise ReleaseError()
    return checked


def _import_package(package_path:Path,root:Path):
    data=read_bounded(Path(package_path));checked=validate_package(data);rid=checked.manifest['releaseId']
    with writer(root) as root:
        directory=root/'releases'
        if directory.is_symlink(): raise ReleaseError()
        directory.mkdir(exist_ok=True)
        target=directory/rid
        if target.exists():
            generation(root,rid)
            if read_bounded(target/'package.zip')!=data: raise ReleaseError('invalid',409)
            receipt(root,{'operation':'import','releaseId':rid,'sha256':digest(data),'state':'completed','at':datetime.now(timezone.utc).isoformat()})
            return checked.manifest
        stage=Path(tempfile.mkdtemp(prefix='.stage-',dir=root))
        try:
            for name,value in {**checked.files,'package.zip':data}.items():
                with (stage/name).open('xb') as stream:
                    stream.write(value);stream.flush();os.fsync(stream.fileno())
            fsync_directory(stage)
            receipt(root,{'operation':'import','releaseId':rid,'sha256':digest(data),'state':'prepared','at':datetime.now(timezone.utc).isoformat()})
            os.rename(stage,target);fsync_directory(directory);fsync_directory(root)
            receipt(root,{'operation':'import','releaseId':rid,'sha256':digest(data),'state':'completed','at':datetime.now(timezone.utc).isoformat()})
        finally:
            if stage.exists(): shutil.rmtree(stage)
    return checked.manifest


def status(root):
    path=Path(root)/'current.json'
    if not path.exists(): return None
    try:
        value=json.loads(read_bounded(path,4096))
        if type(value) is not dict or set(value)!={'releaseId','manifestSha256'}: raise ValueError
        checked=generation(root,value['releaseId'])
        if value['manifestSha256']!=digest(checked.files['manifest.json']): raise ValueError
        return value
    except (ValueError,KeyError,TypeError): raise ReleaseError() from None


def _activate_release(root:Path,release_id:str):
    with writer(root) as root:
        checked=generation(root,release_id)
        pointer={'releaseId':release_id,'manifestSha256':digest(checked.files['manifest.json'])}
        receipt(root,{'operation':'activate','state':'prepared',**pointer,'at':datetime.now(timezone.utc).isoformat()})
        fd,name=tempfile.mkstemp(prefix='.current-',dir=root)
        try:
            with os.fdopen(fd,'wb') as stream:
                stream.write(canonical(pointer));stream.flush();os.fsync(stream.fileno())
            os.replace(name,root/'current.json');fsync_directory(root)
        finally:
            Path(name).unlink(missing_ok=True)
        receipt(root,{'operation':'activate','state':'completed',**pointer,'at':datetime.now(timezone.utc).isoformat()})
        return pointer


def record_failure(root,operation,rid=None,sha256=None):
    # A failed return does not prove the pointer was unchanged: reconcile the
    # prepared receipt with current after post-replace errors. Never include
    # untrusted paths, metadata or exception strings in the operational journal.
    try:
        with writer(root) as root:
            receipt(root,{'operation':operation,'releaseId':rid,'sha256':sha256,
                'state':'failed','outcome':'unknown','at':datetime.now(timezone.utc).isoformat()})
    except (ReleaseError,OSError):
        pass  # An unwritable journal cannot record its own failure; caller fails.


def import_package(package_path:Path,root:Path):
    try:return _import_package(package_path,root)
    except (ReleaseError,OSError,ValueError):
        rid=sha=None
        try:
            data=read_bounded(Path(package_path));sha=digest(data)
            rid=validate_package(data,require_approved=False).manifest['releaseId']
        except (ReleaseError,OSError,ValueError):pass
        record_failure(root,'import',rid,sha)
        raise


def activate_release(root:Path,release_id:str):
    try:return _activate_release(root,release_id)
    except (ReleaseError,OSError,ValueError):
        rid=None
        try:
            from .package import release_id as checked_id
            rid=checked_id(release_id)
        except ReleaseError:pass
        record_failure(root,'activate',rid)
        raise


def main(argv=None):
    parser=argparse.ArgumentParser(description='Import or activate reviewed local dictionary releases.')
    parser.add_argument('--root',required=True,type=Path)
    sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('import-package').add_argument('--package',required=True,type=Path)
    sub.add_parser('activate').add_argument('--release-id',required=True)
    sub.add_parser('status')
    args=parser.parse_args(argv)
    try:
        value=import_package(args.package,args.root) if args.command=='import-package' else activate_release(args.root,args.release_id) if args.command=='activate' else status(args.root)
        print(json.dumps(value,ensure_ascii=True));return 0
    except (ReleaseError,OSError,ValueError):
        print(json.dumps({'code':'release.invalid'}));return 1

if __name__=='__main__': raise SystemExit(main())
