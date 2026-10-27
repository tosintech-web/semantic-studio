"""
================================================================================
FILE: backend/app/team/permissions.py
SUMMARY
    Explicit authorization inventory for every team endpoint.
BASIC IDEA
    New endpoints inherit no privileges; computations differ from shared writes.
INPUTS / INPUT SOURCES
    Decoded request paths, methods and current server-owned roles.
EXPECTED OUTPUT
    A route policy and path parameters, or default denial.
================================================================================
"""
from dataclasses import dataclass
from starlette.routing import compile_path


@dataclass(frozen=True)
class RoutePolicy:
    method: str
    template: str
    operation: str
    shared_update: bool = False

    @property
    def minimum_role(self):
        return {'public':None,'read':'viewer','compute':'viewer','edit':'editor','admin':'admin','preview_release':'editor'}[self.operation]


def allows(role, operation):
    return role in {'viewer','editor','admin'} and operation in {'read','compute','edit','admin','preview_release'} and (
        operation in {'read','compute'} or role == 'admin' or role == 'editor' and operation in {'edit','preview_release'})


# Independent of router objects: deriving privileges from verbs or prefixes
# would silently authorize a newly added endpoint.
_ROUTE_ROWS = (
    ('GET','/api/health','public'),
    ('GET','/api/auth/status','public'),
    ('POST','/api/auth/login','public'),
    ('GET','/api/auth/callback','public'),
    ('POST','/api/auth/logout','compute'),
    ('GET','/api/ontologies','read'),
    ('POST','/api/ontologies/loads/{load_id}/cancel','edit'),
    ('POST','/api/ontologies/upload','edit'),
    ('POST','/api/ontologies/fetch','edit'),
    ('DELETE','/api/ontologies/{oid}','admin'),
    ('GET','/api/ontologies/{oid}/graph','read'),
    ('GET','/api/ontologies/{oid}/neighborhood','read'),
    ('POST','/api/ontologies/{oid}/nodes','compute'),
    ('GET','/api/ontologies/{oid}/node','read'),
    ('GET','/api/ontologies/{oid}/entities','read'),
    ('GET','/api/ontologies/{oid}/search','read'),
    ('GET','/api/ontologies/{oid}/source','read'),
    ('GET','/api/ontologies/{oid}/documentation','read'),
    ('GET','/api/ontologies/{oid}/hierarchy','read'),
    ('GET','/api/ontologies/{oid}/query-schema','read'),
    ('GET','/api/ontologies/{oid}/embedded-queries','read'),
    ('GET','/api/ontologies/{oid}/query-node','read'),
    ('POST','/api/ontologies/{oid}/sparql','compute'),
    ('GET','/api/ontologies/{oid}/imports','read'),
    ('POST','/api/ontologies/{oid}/imports/resolve','edit'),
    ('POST','/api/ontologies/{oid}/imports/refresh','edit'),
    ('POST','/api/ontologies/{oid}/imports/cancel','edit'),
    ('POST','/api/ontologies/{oid}/imports/mapping','edit'),
    ('POST','/api/ontologies/{oid}/imports/files','edit'),
    ('GET','/api/queries','read'),
    ('POST','/api/queries','edit'),
    ('DELETE','/api/queries/{qid}','admin'),
    ('GET','/api/network/policy','read'),
    ('GET','/api/network/activity','read'),
    ('POST','/api/network/grants','admin'),
    ('DELETE','/api/network/grants/{grant_id}','admin'),
    ('PUT','/api/network/offline','admin'),
    ('GET','/api/projects','read'),
    ('POST','/api/projects','edit'),
    ('PATCH','/api/projects/{pid}','edit'),
    ('POST','/api/projects/{pid}/duplicate','edit'),
    ('DELETE','/api/projects/{pid}','admin'),
    ('GET','/api/projects/{pid}/export','read'),
    ('POST','/api/projects/{pid}/open','compute'),
    ('POST','/api/projects/{pid}/close','compute'),
    ('POST','/api/projects/{pid}/documents','edit'),
    ('POST','/api/projects/{pid}/documents/{doc}/commands','edit'),
    ('GET','/api/projects/{pid}/documents/{doc}/source','read'),
    ('PUT','/api/projects/{pid}/documents/{doc}/source','edit'),
    ('GET','/api/projects/{pid}/documents/{doc}/canvas','read'),
    ('GET','/api/projects/{pid}/documents/{doc}/layout','read'),
    ('PUT','/api/projects/{pid}/documents/{doc}/layout','edit'),
    ('POST','/api/projects/{pid}/documents/{doc}/undo','edit'),
    ('POST','/api/projects/{pid}/documents/{doc}/redo','edit'),
    ('POST','/api/projects/{pid}/documents/{doc}/save','edit'),
    ('GET','/api/projects/{pid}/documents/{doc}/download','read'),
    ('POST','/api/projects/{pid}/recover','edit'),
    ('GET','/api/projects/{pid}/shapes','read'),
    ('GET','/api/projects/{pid}/shapes/suggestions','read'),
    ('GET','/api/projects/{pid}/validate','read'),
    ('POST','/api/projects/{pid}/validate','compute'),
    ('POST','/api/projects/{pid}/reasoning','compute'),
    ('DELETE','/api/projects/{pid}/reasoning','compute'),
    ('GET','/api/projects/{pid}/reasoning','read'),
    ('GET','/api/projects/{pid}/reasoning/why','read'),
    ('GET','/api/projects/{pid}/documents/{doc}/annotation-properties','read'),
    ('GET','/api/projects/{pid}/documents/{doc}/languages','read'),
    ('POST','/api/projects/{pid}/data/inspect','compute'),
    ('POST','/api/projects/{pid}/data/preview','compute'),
    ('POST','/api/projects/{pid}/data','edit'),
    ('GET','/api/projects/{pid}/data','read'),
    ('POST','/api/projects/{pid}/data/{sid}/refresh','edit'),
    ('PATCH','/api/projects/{pid}/data/{sid}','edit'),
    ('DELETE','/api/projects/{pid}/data/{sid}','admin'),
    ('POST','/api/examples/restore','admin'),
    ('POST','/api/projects/{pid}/release-preview','preview_release'),
    ('POST','/api/projects/{pid}/releases','admin'),
    ('GET','/api/projects/{pid}/releases','read'),
    ('GET','/api/projects/{pid}/releases/{rid}/package','read'),
    ('GET','/api/team/versions','read'),
    ('GET','/api/team/history','read'),
    ('GET','/api/team/users','admin'),
    ('PATCH','/api/team/users','admin'),
    ('PATCH','/api/team/users/{sub}','admin'),
)
ROUTE_POLICIES=tuple(RoutePolicy(method,path,operation,operation in {'edit','admin'} and method!='GET')
                     for method,path,operation in _ROUTE_ROWS)
_COMPILED=tuple((policy,compile_path(policy.template)[0]) for policy in ROUTE_POLICIES)


def classify_route(method,path):
    method='GET' if method=='HEAD' else method
    for policy,pattern in _COMPILED:
        if policy.method==method:
            match=pattern.fullmatch(path)
            if match:
                return policy,match.groupdict()
    return None
