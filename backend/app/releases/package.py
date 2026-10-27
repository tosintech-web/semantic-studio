"""
FILE: backend/app/releases/package.py
SUMMARY
    Deterministic public release packages and bounded, strict verification.
BASIC IDEA
    Render only the projected graph. Validate every ZIP byte and typed JSON
    term, then independently reproduce the Turtle and all declared counts.
INPUTS / INPUT SOURCES
    Detached projections, public metadata, or untrusted package bytes.
EXPECTED OUTPUT
    A fixed five-file ZIP or a finite refusal without private diagnostics.
"""
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
import hashlib
import json
import re
import stat
import zlib
from uuid import UUID
from zipfile import ZipFile, ZipInfo, BadZipFile, ZIP_DEFLATED, ZIP_STORED
from rdflib import Graph, URIRef, Literal
from .profile import Projection, ReleaseError, project_graph, PROFILE_ID, PROFILE_VERSION, ALLOWED
from ..team.rdf_codec import _decode_term, private_rdf_diagnostics

MAX_BYTES = 50 * 1024 * 1024
FILES = frozenset(('manifest.json','dictionary.ttl','dictionary.json','LICENSE.txt','NOTICE.txt'))


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def release_id(value):
    try:
        if not isinstance(value, str) or str(UUID(value)) != value:
            raise ValueError
    except (ValueError, AttributeError):
        raise ReleaseError() from None
    return value


def metadata(value):
    if (type(value) is not dict or set(value) != {'source','license'} or
        any(not isinstance(v,str) or not v.strip() or len(v.encode('utf-8')) > 8192 for v in value.values())):
        raise ReleaseError()
    return dict(value)


def json_graph(graph):
    entities = []
    for subject in sorted(set(graph.subjects()), key=str):
        statements = []
        for _, p, o in graph.triples((subject,None,None)):
            obj = {'kind':'iri','value':str(o)} if isinstance(o,URIRef) else {
                'kind':'literal','value':str(o),'language':o.language,
                'datatype':str(o.datatype) if o.datatype is not None else None}
            statements.append({'predicate':str(p),'object':obj})
        statements.sort(key=canonical)
        entities.append({'iri':str(subject),'statements':statements})
    return {'version':1,'entities':entities}


def turtle(graph):
    # Full IRIs prevent a source's private namespace bindings being exported;
    # explicit literal n3 avoids numeric lexical normalization such as 001.
    lines = sorted(f'{s.n3()} {p.n3()} {o.n3()} .\n' for s,p,o in graph)
    return ''.join(lines).encode('utf-8')


def preview_digest(projection, *, metadata: dict, basis: dict):
    checked = globals()['metadata'](metadata)
    return digest(canonical({'graph':json_graph(projection.graph),'profile':PROFILE_ID,
                             'profileVersion':PROFILE_VERSION,'metadata':checked,'basis':basis}))


def build_package(projection: Projection, *, release_id: str, created_at: str, metadata: dict, approved: bool) -> bytes:
    globals()['release_id'](release_id)
    metadata = globals()['metadata'](metadata)
    try:
        if datetime.fromisoformat(created_at).utcoffset() is None: raise ValueError
    except (ValueError,TypeError): raise ReleaseError() from None
    if type(approved) is not bool: raise ReleaseError()
    # Reproject to enforce rules even when a caller supplies a forged DTO.
    projection = project_graph(projection.graph)
    files = {'dictionary.ttl':turtle(projection.graph), 'dictionary.json':canonical(json_graph(projection.graph)),
             'LICENSE.txt':metadata['license'].encode(),
             'NOTICE.txt':('Source: '+metadata['source']+'\nProfile: dictionary-v1 / 1\nReviewed RDF/JSON dictionary distribution.\n').encode()}
    manifest = {'formatVersion':1,'releaseId':release_id,'approved':approved,'createdAt':created_at,
        'profileId':PROFILE_ID,'profileVersion':PROFILE_VERSION,**metadata,
        'entityCount':projection.entity_count,'statementCount':projection.statement_count,
        'files':{name:{'bytes':len(value),'sha256':digest(value)} for name,value in files.items()}}
    files['manifest.json'] = canonical(manifest)
    if sum(map(len,files.values())) > MAX_BYTES: raise ReleaseError('too_large',413)
    output=BytesIO()
    with ZipFile(output,'w',compression=ZIP_DEFLATED) as archive:
        for name,value in sorted(files.items()):
            info=ZipInfo(name,date_time=(1980,1,1,0,0,0)); info.compress_type=ZIP_DEFLATED
            archive.writestr(info,value)
    value=output.getvalue()
    if len(value)>MAX_BYTES: raise ReleaseError('too_large',413)
    return value


def strict_json(data):
    def pairs(items):
        result={}
        for k,v in items:
            if k in result: raise ValueError
            result[k]=v
        return result
    return json.loads(data,object_pairs_hook=pairs,parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))

@dataclass(frozen=True)
class ValidatedPackage:
    manifest: dict
    files: dict[str,bytes]


@private_rdf_diagnostics()
def validate_package(data: bytes, *, require_approved: bool = True) -> ValidatedPackage:
    try:
        if len(data)>MAX_BYTES: raise ReleaseError('too_large',413)
        files={}; total=0
        with ZipFile(BytesIO(data)) as archive:
            infos=archive.infolist()
            if len(infos)!=5 or {i.filename for i in infos}!=FILES: raise ValueError
            for info in infos:
                if info.compress_type not in (ZIP_DEFLATED, ZIP_STORED): raise ValueError
                mode=info.external_attr >> 16
                if stat.S_ISLNK(mode) or info.is_dir() or info.flag_bits & 1 or info.file_size>MAX_BYTES: raise ValueError
                value=bytearray()
                with archive.open(info) as stream:
                    while chunk:=stream.read(min(65536,MAX_BYTES-total+1)):
                        total+=len(chunk)
                        if total>MAX_BYTES: raise ReleaseError('too_large',413)
                        value.extend(chunk)
                if len(value)!=info.file_size: raise ValueError
                files[info.filename]=bytes(value)
        return validate_files(files, require_approved=require_approved)
    except ReleaseError: raise
    except (ValueError,TypeError,KeyError,AttributeError,UnicodeError,BadZipFile,RuntimeError,OverflowError,RecursionError,zlib.error):
        raise ReleaseError() from None


@private_rdf_diagnostics()
def validate_files(files: dict[str,bytes], *, require_approved: bool = True) -> ValidatedPackage:
    """Validate downloaded public files without reconstructing a second ZIP."""
    try:
        if type(files) is not dict or set(files)!=FILES or any(type(v) is not bytes for v in files.values()): raise ValueError
        if sum(map(len,files.values()))>MAX_BYTES: raise ReleaseError('too_large',413)
        m=strict_json(files['manifest.json'])
        if type(m) is not dict or set(m)!={'formatVersion','releaseId','approved','createdAt','profileId','profileVersion','source','license','entityCount','statementCount','files'}: raise ValueError
        if type(m['formatVersion']) is not int or m['formatVersion']!=1 or m['profileId']!=PROFILE_ID or type(m['profileVersion']) is not int or m['profileVersion']!=1: raise ValueError
        release_id(m['releaseId']); metadata({k:m[k] for k in ('source','license')})
        if type(m['approved']) is not bool or require_approved and not m['approved']: raise ValueError
        if datetime.fromisoformat(m['createdAt']).utcoffset() is None: raise ValueError
        if type(m['files']) is not dict or set(m['files'])!=FILES-{'manifest.json'}: raise ValueError
        for name,entry in m['files'].items():
            if type(entry) is not dict or set(entry)!={'bytes','sha256'} or type(entry['bytes']) is not int or entry['bytes']!=len(files[name]) or entry['sha256']!=digest(files[name]): raise ValueError
        j=strict_json(files['dictionary.json'])
        if type(j) is not dict or set(j)!={'version','entities'} or type(j['version']) is not int or j['version']!=1 or type(j['entities']) is not list: raise ValueError
        g=Graph(bind_namespaces='none'); subjects=set()
        for entity in j['entities']:
            if type(entity) is not dict or set(entity)!={'iri','statements'} or not isinstance(entity['iri'],str) or entity['iri'] in subjects or type(entity['statements']) is not list or not entity['statements']: raise ValueError
            subjects.add(entity['iri'])
            for statement in entity['statements']:
                if type(statement) is not dict or set(statement)!={'predicate','object'} or statement['predicate'] not in {str(p) for p in ALLOWED}: raise ValueError
                obj=statement['object']
                if type(obj) is not dict or obj.get('kind') not in ('iri','literal'): raise ValueError
                term=_decode_term({'type':'uri' if obj['kind']=='iri' else 'literal',**{k:v for k,v in obj.items() if k!='kind'}})
                g.add((URIRef(entity['iri']),URIRef(statement['predicate']),term))
        p=project_graph(g)
        if canonical(j)!=canonical(json_graph(g)) or files['dictionary.ttl']!=turtle(g): raise ValueError
        if any(type(m[k]) is not int for k in ('entityCount','statementCount')) or m['entityCount']!=p.entity_count or m['statementCount']!=p.statement_count: raise ValueError
        if files['LICENSE.txt']!=m['license'].encode(): raise ValueError
        expected_notice=('Source: '+m['source']+'\nProfile: dictionary-v1 / 1\nReviewed RDF/JSON dictionary distribution.\n').encode()
        if files['NOTICE.txt']!=expected_notice: raise ValueError
        return ValidatedPackage(m,files)
    except ReleaseError: raise
    except (ValueError,TypeError,KeyError,AttributeError,UnicodeError,BadZipFile,RuntimeError,OverflowError,RecursionError,zlib.error):
        raise ReleaseError() from None
