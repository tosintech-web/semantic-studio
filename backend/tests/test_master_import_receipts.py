"""
FILE: backend/tests/test_master_import_receipts.py
SUMMARY: Prepared source authenticity binds every value and its request owner.
BASIC IDEA: Change one authenticated component or the ephemeral process key.
INPUTS / INPUT SOURCES: Synthetic batches and private deterministic test keys.
EXPECTED OUTPUT: Tampered or expired preparations cannot authorize a command.
"""
import copy
import pytest
from app.government.import_receipts import SourceReceiptSigner
from app.government.profile import DomainError

@pytest.mark.parametrize('field',['source','mapping','selectedRows','intents','operationNonce'])
def test_receipt_refuses_each_changed_batch_component(field):
    signer=SourceReceiptSigner(b'a'*32);owner=['local','p','model','nonce']
    batch={'source':'s','mapping':{},'selectedRows':[1],'intents':[{}],'operationNonce':'nonce'}
    receipt=signer.sign(batch,owner);changed=copy.deepcopy(batch);changed[field]='changed'
    with pytest.raises(DomainError):signer.verify(changed,receipt,owner)

@pytest.mark.parametrize('owner',[['local','other','model','nonce'],['local','p','shapes','nonce'],['team','p','model','bob','session','nonce']])
def test_receipt_refuses_another_project_document_or_actor(owner):
    signer=SourceReceiptSigner(b'a'*32);batch={'test':1};receipt=signer.sign(batch,['local','p','model','nonce'])
    with pytest.raises(DomainError):signer.verify(batch,receipt,owner)


def test_receipt_expires_after_process_key_rotation():
    owner=['local','p','model','n'];batch={'test':1};first=SourceReceiptSigner(b'a'*32)
    receipt=first.sign(batch,owner);first.verify(batch,receipt,owner)
    with pytest.raises(DomainError):SourceReceiptSigner(b'b'*32).verify(batch,receipt,owner)
