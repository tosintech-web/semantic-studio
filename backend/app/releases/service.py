"""
FILE: backend/app/releases/service.py
SUMMARY
    Immutable approved versions of accepted own-model team resources.
BASIC IDEA
    Read typed RDF from one repository snapshot, bind review to its complete
    basis, then commit blob references, workspace generation, audit and replay
    together under the existing current-session authorizer.
INPUTS / INPUT SOURCES
    TeamRepository, private BlobStore, reviewed metadata and expected versions.
EXPECTED OUTPUT
    Stable HTTP replay envelopes and retained release packages.
"""
import base64
import json
from datetime import datetime, timezone
import hmac
import re
from uuid import uuid4
from .profile import project_graph, ReleaseError, MAX_STATEMENTS, PROFILE_ID
from .package import build_package, preview_digest, metadata as validate_metadata, release_id, digest
from ..team.rdf_codec import decode_graph
from ..team.repository import Conflict, MissingExpectation
from ..projects import document_id, PROJECT_ID


def validate_resource(key, payload):
    try:
        release_id(key.removeprefix('release:'))
        fields={'version','projectId','basis','previewDigest','profile','approvedBy','approvedAt','packageBlob','packageBytes','packageSha256'}
        if type(payload) is not dict or set(payload)!=fields or type(payload['version']) is not int or payload['version']!=1: raise ValueError
        if not isinstance(payload['projectId'],str) or not PROJECT_ID.fullmatch(payload['projectId']): raise ValueError
        if type(payload['basis']) is not dict or set(payload['basis'])!={'documentId','resourceVersions'} or payload['basis']['documentId']!=document_id(payload['projectId'],'model'): raise ValueError
        versions=payload['basis']['resourceVersions']
        if type(versions) is not dict or any(not isinstance(k,str) or not k or v is not None and (type(v) is not int or v<1) for k,v in versions.items()): raise ValueError
        if payload['profile']!=PROFILE_ID or not isinstance(payload['approvedBy'],str) or not payload['approvedBy']: raise ValueError
        if datetime.fromisoformat(payload['approvedAt']).utcoffset() is None: raise ValueError
        if any(not isinstance(payload[k],str) or not re.fullmatch('[0-9a-f]{64}',payload[k]) for k in ('previewDigest','packageBlob','packageSha256')): raise ValueError
        if payload['packageBlob']!=payload['packageSha256'] or type(payload['packageBytes']) is not int or not 0<payload['packageBytes']<=50*1024*1024: raise ValueError
    except (ValueError,TypeError,KeyError,AttributeError): raise ReleaseError() from None
    return payload['packageBlob']


class ReleaseService:
    def __init__(self, repository, blobs):
        self.repository,self.blobs=repository,blobs

    def _projection(self, project_id, metadata):
        metadata=validate_metadata(metadata)
        resources,versions=self.repository.snapshot()
        versions.setdefault('workspace',None)
        if not isinstance(project_id,str) or not PROJECT_ID.fullmatch(project_id) or f'file:projects/{project_id}/project.json' not in resources:
            raise ReleaseError('not_found',404)
        manifest_key=f'file:projects/{project_id}/project.json'
        try:
            manifest=json.loads(self.blobs.get(resources[manifest_key]['blob']))
        except (KeyError,ValueError,OSError,TypeError) as error:
            raise ReleaseError('unavailable',503) from error
        if type(manifest) is not dict:
            raise ReleaseError('unavailable',503)
        if manifest.get('domainProfile') is not None:
            from ..government.profile import RELEASE_UNSUPPORTED
            raise ReleaseError(RELEASE_UNSUPPORTED,422)
        oid=document_id(project_id,'model')
        payload=resources.get('graph:'+oid)
        if payload is None: raise ReleaseError('unavailable',503)
        typed=payload['graph']
        if len(typed['triples'])>MAX_STATEMENTS: raise ReleaseError('too_large',413)
        projection=project_graph(decode_graph(typed))
        basis={'documentId':oid,'resourceVersions':versions}
        review=preview_digest(projection,metadata=metadata,basis=basis)
        return projection,basis,review,metadata

    def preview(self, *, project_id, metadata):
        p,basis,review,metadata=self._projection(project_id,metadata)
        package=build_package(p,release_id=str(uuid4()),created_at=datetime.now(timezone.utc).isoformat(),metadata=metadata,approved=False)
        return {'previewDigest':review,'basis':basis,'entityCount':p.entity_count,'statementCount':p.statement_count,
                'excludedByReason':p.excluded_by_reason,'excludedViews':['imports','shapes','snapshots','inference'],
                'package':base64.b64encode(package).decode()}

    def approve(self, *, actor, project_id, metadata, preview_digest, expected, request_id, identity, authorize, response_factory):
        replay=self.repository.read_request(actor,request_id,identity,authorize=authorize)
        if replay is not None: return replay['response']
        p,basis,review,metadata=self._projection(project_id,metadata)
        if not isinstance(preview_digest,str) or not hmac.compare_digest(review,preview_digest): raise ReleaseError('stale',409)
        versions=basis['resourceVersions']
        if 'workspace' not in expected: raise MissingExpectation(['workspace'])
        if any(expected.get(k)!=v for k,v in versions.items()) or any(versions.get(k)!=v for k,v in expected.items()): raise Conflict(expected,versions)
        rid=str(uuid4()); when=datetime.now(timezone.utc).isoformat()
        package=build_package(p,release_id=rid,created_at=when,metadata=metadata,approved=True)
        blob=self.blobs.put(package)
        payload={'version':1,'projectId':project_id,'basis':basis,'previewDigest':review,'profile':PROFILE_ID,
                 'approvedBy':actor,'approvedAt':when,'packageBlob':blob,'packageBytes':len(package),'packageSha256':digest(package)}
        key='release:'+rid
        changes={key:payload,'workspace':{'kind':'workspace'}}
        summary={'releaseId':rid,'approvedAt':when,'entityCount':p.entity_count,'statementCount':p.statement_count}
        new_versions={**versions,key:1,'workspace':(versions.get('workspace') or 0)+1}
        response=response_factory(summary,new_versions)
        committed=self.repository.commit(actor,request_id,{**expected,key:None},changes,
            'POST /api/projects/{pid}/releases',authorize=authorize,identity=identity,response=response)
        return committed['response']

    def list_releases(self, *, project_id, offset, limit):
        if type(offset) is not int or offset<0 or type(limit) is not int or not 1<=limit<=100: raise ReleaseError()
        resources,_=self.repository.snapshot()
        items=[]
        for key,value in resources.items():
            if key.startswith('release:') and value.get('projectId')==project_id:
                validate_resource(key,value)
                items.append({'releaseId':key[8:],'approvedAt':value['approvedAt'],'packageBytes':value['packageBytes']})
        items.sort(key=lambda x:(x['approvedAt'],x['releaseId']),reverse=True)
        return {'items':items[offset:offset+limit],'total':len(items),'offset':offset,'limit':limit}

    def read_package(self, *, project_id, release_id):
        globals()['release_id'](release_id)
        resource=self.repository.read('release:'+release_id)
        if resource is None or resource.payload.get('projectId')!=project_id: raise ReleaseError('not_found',404)
        payload=resource.payload
        blob=validate_resource('release:'+release_id,payload)
        data=self.blobs.get(blob)
        if len(data)!=payload['packageBytes']: raise ReleaseError('unavailable',503)
        return data
