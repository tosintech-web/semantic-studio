"""
FILE: backend/app/releases/http.py
SUMMARY
    Team-only release HTTP adapter using the existing replay envelope.
BASIC IDEA
    The outer team middleware owns browser guards and request identity. This
    adapter validates bounded input and delegates commits to ReleaseService.
INPUTS / INPUT SOURCES
    Authenticated ASGI scope, bounded body and current transaction authorizer.
EXPECTED OUTPUT
    The same status/headers/base64-body envelope on first response and replay.
"""
import json
from urllib.parse import parse_qs
from .profile import ReleaseError
from .package import strict_json
from ..messages import make_message


def dispatch_release_request(service, *, scope, body, expected, request_id, identity, authorize):
    from ..team.workspace import TeamWorkspace
    params=scope['state']['team_path_params']
    pid=params['pid']; method=scope['method']; template=scope['state']['team_route_template']
    def response(value,versions=None,status=200):
        return TeamWorkspace._response(status,[(b'content-type',b'application/json'),(b'cache-control',b'no-store')],json.dumps(value).encode(),versions if versions is not None else service.repository.snapshot()[1])
    try:
        with service.repository.storage.write_transaction() as tx:
            authorize(tx)
        if method=='POST':
            if len(body)>65536: raise ReleaseError('too_large',413)
            try: payload=strict_json(body)
            except (ValueError,UnicodeError,RecursionError): raise ReleaseError() from None
            if type(payload) is not dict: raise ReleaseError()
            if template.endswith('/release-preview'):
                return response(service.preview(project_id=pid,metadata=payload))
            if set(payload)!={'source','license','previewDigest'}: raise ReleaseError()
            return service.approve(actor=scope['state']['principal'].sub,project_id=pid,
                metadata={k:payload[k] for k in ('source','license')},preview_digest=payload['previewDigest'],
                expected=expected,request_id=request_id,identity=identity,authorize=authorize,
                response_factory=lambda summary,v:response(summary,v,201))
        if template.endswith('/package'):
            data=service.read_package(project_id=pid,release_id=params['rid'])
            result=TeamWorkspace._response(200,[(b'content-type',b'application/zip'),(b'cache-control',b'no-store'),
                (b'content-disposition',f'attachment; filename="release-{params["rid"]}.zip"'.encode())],data,{})
        else:
            query=parse_qs(scope.get('query_string',b'').decode(),keep_blank_values=True)
            if set(query)-{'offset','limit'} or any(len(v)!=1 for v in query.values()): raise ReleaseError()
            try: offset,limit=int(query.get('offset',['0'])[0]),int(query.get('limit',['50'])[0])
            except ValueError: raise ReleaseError() from None
            result=response(service.list_releases(project_id=pid,offset=offset,limit=limit))
        if method=='HEAD': result['body']=''
        return result
    except ReleaseError as error:
        from ..government.profile import RELEASE_UNSUPPORTED
        code=error.code if error.code==RELEASE_UNSUPPORTED else 'release.'+error.code
        return response({'code':code,'uiMessage':make_message(code)},status=error.status)
