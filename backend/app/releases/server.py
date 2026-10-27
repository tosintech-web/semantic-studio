"""
FILE: backend/app/releases/server.py
SUMMARY
    Read-only HTTP for verified distribution generations, without editor state.
BASIC IDEA
    Only the five fixed public entries and the current pointer are routable.
    Verify stored bytes before serving; private receipts and ZIPs stay local.
INPUTS / INPUT SOURCES
    An independently populated read-only distribution volume.
EXPECTED OUTPUT
    Immutable version URLs, hash ETags and finite corruption refusals.
"""
import argparse
from pathlib import Path
from fastapi import FastAPI, Request
from starlette.responses import Response, JSONResponse
from .distribution import generation,status
from .package import canonical,digest,FILES
from .profile import ReleaseError


def create_distribution_app(root:Path):
    app=FastAPI(openapi_url=None,docs_url=None,redoc_url=None)
    @app.api_route('/{path:path}',methods=['GET','HEAD'])
    def serve(path:str,request:Request):
        try:
            if path=='current.json':
                current=status(root)
                if current is None: return Response(status_code=404)
                value=canonical(current);headers={'Cache-Control':'no-store'};mime='application/json'
            else:
                parts=path.split('/')
                if len(parts)!=3 or parts[0]!='releases' or parts[2] not in FILES: return Response(status_code=404)
                from .package import release_id
                try: release_id(parts[1])
                except ReleaseError: return Response(status_code=404)
                if not (root/'releases'/parts[1]).exists(): return Response(status_code=404)
                checked=generation(root,parts[1]);value=checked.files[parts[2]]
                headers={'ETag':'"'+digest(value)+'"','Cache-Control':'public, max-age=31536000, immutable'}
                if request.headers.get('if-none-match')==headers['ETag']: return Response(status_code=304,headers=headers)
                mime='application/json' if parts[2].endswith('.json') else 'text/turtle' if parts[2].endswith('.ttl') else 'text/plain'
            headers['X-Content-Type-Options']='nosniff';headers['Content-Length']=str(len(value))
            return Response(b'' if request.method=='HEAD' else value,media_type=mime,headers=headers)
        except (ReleaseError,OSError,ValueError):
            return JSONResponse({'code':'release.unavailable'},status_code=503,headers={'Cache-Control':'no-store'})
    return app


def main(argv=None):
    parser=argparse.ArgumentParser();parser.add_argument('--root',required=True,type=Path);parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8080)
    args=parser.parse_args(argv)
    import uvicorn
    uvicorn.run(create_distribution_app(args.root),host=args.host,port=args.port,access_log=False)
    return 0

if __name__=='__main__':raise SystemExit(main())
