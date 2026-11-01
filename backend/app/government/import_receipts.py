"""
================================================================================
FILE: backend/app/government/import_receipts.py
SUMMARY
    Authenticates prepared batches with a process-owned ephemeral key.
BASIC IDEA
    Keep source preparation read-only and bind accepted operations to their owner.
INPUTS / INPUT SOURCES
    Bounded source data, canonical batches and authenticated request context.
EXPECTED OUTPUT
    Reviewable values or explicit refusals; accepted graph changes live in editing.py.
================================================================================
"""
import hashlib
import hmac
import secrets
import threading
from .import_plan import canonical
from .profile import DomainError

class SourceReceiptSigner:
    def __init__(self,key=None):self._key=key if key is not None else secrets.token_bytes(32)
    def sign(self,batch,owner):return hmac.new(self._key,canonical([owner,batch]).encode(),hashlib.sha256).hexdigest()
    def verify(self,batch,receipt,owner):
        try:expected=self.sign(batch,owner)
        except (ValueError,TypeError) as exc:raise DomainError('The prepared batch is malformed.') from exc
        if not isinstance(receipt,str) or len(receipt)!=64 or any(c not in '0123456789abcdef' for c in receipt) or not hmac.compare_digest(receipt,expected):
            raise DomainError('The prepared source belongs to another request or expired. Prepare the file again.')

_signer=None
_lock=threading.Lock()
def process_signer():
    global _signer
    with _lock:
        if _signer is None:_signer=SourceReceiptSigner()
        return _signer
