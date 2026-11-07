"""
================================================================================
FILE: backend/app/government/import_context.py
SUMMARY
    Carries server-owned import identity across detached worker requests.
BASIC IDEA
    Keep source preparation read-only and bind accepted operations to their owner.
INPUTS / INPUT SOURCES
    Bounded source data, canonical batches and authenticated request context.
EXPECTED OUTPUT
    Reviewable values or explicit refusals; accepted graph changes live in editing.py.
================================================================================
"""
from contextlib import contextmanager
from contextvars import ContextVar
from .import_receipts import process_signer
from .profile import DomainError

_current=ContextVar('master_import_request',default=None)

def request_owner(request,pid,nonce):
    if not isinstance(nonce,str) or not 1<=len(nonce)<=128:raise DomainError('An import operation identity is required.')
    state=request.scope.get('state',{})
    principal=state.get('principal');auth=state.get('team_request_auth')
    if principal is not None:
        if auth is None:raise DomainError('Authenticate again before preparing this source.',status=401)
        return ['team',pid,'model',principal.sub,auth.token_hash,nonce]
    return ['local',pid,'model',nonce]

@contextmanager
def bind_import_context(signer,owner):
    token=_current.set((signer,owner))
    try:yield
    finally:_current.reset(token)

def verify_import_request(pid,args):
    if set(args)-{'batch','receipt','previewBasis','reportOffset','reportLimit'}:raise DomainError('Unsupported import command fields.')
    context=_current.get()
    if context is None:raise DomainError('Prepare and review the source through an owned request.')
    signer,owner=context
    batch=args.get('batch')
    if not isinstance(batch,dict) or batch.get('version')!=1 or not isinstance(batch.get('intents'),list) or not 1<=len(batch['intents'])<=2000:raise DomainError('Choose a prepared master batch.')
    if owner[1]!=pid or owner[-1]!=batch.get('operationNonce'):raise DomainError('This source belongs to another project or operation.')
    signer.verify(batch,args.get('receipt'),owner)
    return batch
