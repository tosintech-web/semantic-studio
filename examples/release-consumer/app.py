"""
FILE: examples/release-consumer/app.py
SUMMARY
    An independent example that verifies and searches one pinned release.
BASIC IDEA
    A fixed operator-configured origin is the only transport destination.
    Redirects and environment proxies are disabled. Adopt a complete verified
    generation atomically; a failed refresh retains the last accepted version.
INPUTS / INPUT SOURCES
    RELEASE_ORIGIN, RELEASE_ID and the distribution service's public files.
EXPECTED OUTPUT
    Search/detail responses without connecting to the editor or its database.
"""
from contextlib import asynccontextmanager
import json
import os
from pathlib import Path
import time
import threading
import unicodedata
from urllib.request import build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.parse import urlsplit
from fastapi import FastAPI
from starlette.responses import FileResponse, JSONResponse
from starlette.concurrency import run_in_threadpool
from app.releases.package import validate_files, release_id, MAX_BYTES, FILES, strict_json
from app.releases.profile import ReleaseError

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

def opener():return build_opener(ProxyHandler({}),NoRedirect())


def _load_release(origin:str,release_id:str):
    parsed=urlsplit(origin)
    if parsed.scheme not in ('http','https') or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ('','/') or parsed.query or parsed.fragment: raise ReleaseError()
    globals()['release_id'](release_id)
    transport=opener();total=0;deadline=time.monotonic()+LOAD_TIMEOUT
    files={}
    for name in sorted(FILES):
        url=origin.rstrip('/')+'/releases/'+release_id+'/'+name
        value=bytearray()
        remaining=deadline-time.monotonic()
        if remaining<=0: raise ReleaseError('unavailable',503)
        with transport.open(url,timeout=min(5,remaining)) as response:
            while True:
                remaining=deadline-time.monotonic()
                if remaining<=0: raise ReleaseError('unavailable',503)
                # urllib's HTTPResponse.read can wait for its entire buffer.
                # read1 returns after available input; reset the socket timeout
                # to the remaining total budget so trickled input cannot renew it.
                sock=getattr(getattr(getattr(response,'fp',None),'raw',None),'_sock',None)
                if sock is not None: sock.settimeout(min(5,remaining))
                chunk=response.read1(min(65536,MAX_BYTES-total+1))
                if not chunk:break
                total+=len(chunk)
                if total>MAX_BYTES: raise ReleaseError('too_large',413)
                if time.monotonic()>deadline: raise ReleaseError('unavailable',503)
                value.extend(chunk)
        files[name]=bytes(value)
    checked=validate_files(files)
    if checked.manifest['releaseId']!=release_id:raise ReleaseError()
    return {'releaseId':release_id,**strict_json(checked.files['dictionary.json'])}


LOAD_TIMEOUT=15
_network_slot=threading.BoundedSemaphore(1)


def load_release(origin:str,release_id:str):
    # urllib cannot enforce a total deadline while DNS, status headers or a
    # chunk-size line trickle. Bound the caller independently. At most one
    # daemon worker may remain outstanding; subsequent refreshes refuse until
    # it exits rather than leaking a thread per retry. Timed-out work never
    # writes Consumer.value, so a late result cannot replace an accepted view.
    if not _network_slot.acquire(blocking=False): raise ReleaseError('unavailable',503)
    completed=threading.Event();result={}
    def fetch():
        try: result['value']=_load_release(origin,release_id)
        except Exception as error: result['error']=error
        finally:
            _network_slot.release();completed.set()
    worker=threading.Thread(target=fetch,daemon=True,name='release-consumer-fetch')
    try:worker.start()
    except Exception:
        _network_slot.release();raise
    if not completed.wait(LOAD_TIMEOUT):raise ReleaseError('unavailable',503)
    if 'error' in result:raise result['error']
    return result['value']


def search(value,query):
    key=unicodedata.normalize('NFKC',query).casefold()
    predicates={'http://www.w3.org/2000/01/rdf-schema#label','http://www.w3.org/2004/02/skos/core#prefLabel','http://www.w3.org/2004/02/skos/core#altLabel','http://www.w3.org/2004/02/skos/core#hiddenLabel'}
    return [entity for entity in value['entities'] if not key or any(
        s['predicate'] in predicates and s['object']['kind']=='literal' and key in unicodedata.normalize('NFKC',s['object']['value']).casefold()
        for s in entity['statements'])]


class Consumer:
    def __init__(self,origin,rid):self.origin,self.rid,self.value=origin,rid,None
    def refresh(self):
        candidate=load_release(self.origin,self.rid)
        self.value=candidate
        return candidate


def create_app(origin,rid):
    release_id(rid);consumer=Consumer(origin,rid)
    @asynccontextmanager
    async def lifespan(_app):
        try: await run_in_threadpool(consumer.refresh)
        except (ReleaseError,OSError,ValueError): pass
        yield
    app=FastAPI(lifespan=lifespan,openapi_url=None,docs_url=None,redoc_url=None)
    @app.get('/')
    def index():return FileResponse(Path(__file__).with_name('index.html'))
    @app.get('/api/search')
    def results(q:str='',offset:int=0):
        if consumer.value is None:return JSONResponse({'code':'release.unavailable'},status_code=503)
        if offset<0 or len(q)>500:return JSONResponse({'code':'release.invalid'},status_code=422)
        rows=search(consumer.value,q)
        return {'releaseId':consumer.value['releaseId'],'items':rows[offset:offset+50],'total':len(rows),'offset':offset}
    @app.post('/api/refresh')
    def refresh():
        try:consumer.refresh();return {'releaseId':consumer.value['releaseId']}
        except (ReleaseError,OSError,ValueError):return JSONResponse({'code':'release.unavailable','retained':consumer.value is not None},status_code=503)
    return app

if __name__=='__main__':
    import uvicorn
    uvicorn.run(create_app(os.environ['RELEASE_ORIGIN'],os.environ['RELEASE_ID']),host='0.0.0.0',port=8081,access_log=False)
