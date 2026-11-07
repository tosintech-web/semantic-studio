"""
================================================================================
FILE: backend/app/government/import_models.py
SUMMARY
    Defines strict, bounded master-import wire contracts.
BASIC IDEA
    Keep untrusted source evidence separate from accepted RDF changes.
INPUTS / INPUT SOURCES
    Explicit source bytes, typed options and user-reviewed field choices.
EXPECTED OUTPUT
    Detached import values or a refusal; no model or persistence mutations.
================================================================================
"""
from dataclasses import dataclass
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from ..tabular import Table

MasterMode = Literal['countries', 'organizations', 'relations']

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

class ColumnMapping(StrictModel):
    column: int = Field(ge=0, lt=100)
    field: str = Field(min_length=1, max_length=40)
    op: Literal['set','append','replace','clear'] = 'set'
    language: str | None = Field(default=None, max_length=100)
    sourceKind: Literal['text','iri'] | None = None
    delimiter: str | None = Field(default=None, min_length=1, max_length=8)

class RecordOverride(StrictModel):
    rowId: int = Field(ge=1,le=2000)
    existenceRecordIri: str | None = Field(default=None,max_length=4096)
    affiliationRecordIri: str | None = Field(default=None,max_length=4096)
    recordIri: str | None = Field(default=None,max_length=4096)

class MasterMapping(StrictModel):
    columns: list[ColumnMapping] = Field(max_length=100)
    defaults: dict = Field(default_factory=dict)
    rowOverrides: list[RecordOverride] = Field(default_factory=list,max_length=2000)

class ReadOptions(StrictModel):
    separator: str | None = None
    encoding: str | None = None
    header: bool = True
    sheet: str | None = Field(default=None,max_length=4096)
    headerRow: int | None = Field(default=None,ge=1,le=1048576)

@dataclass
class MasterTable:
    table: Table
    positions: list[dict]
    evidence: list[list[dict]]

FIELDS = {
 'countries': {'code','names','aliases','description','sources'},
 'organizations': {'code','names','orgKind','countryCode','existenceStart','existenceEnd','affiliationStart','affiliationEnd','existenceRecordIri','affiliationRecordIri','sources'},
 'relations': {'action','recordIri','subjectCode','predicate','objectCode','relationStart','relationEnd','sources','description'},
}
KEYS = {'code','countryCode','subjectCode','objectCode','recordIri','existenceRecordIri','affiliationRecordIri'}

def issue(row, reason, column=None):
    return {'row':row,'code':'government.invalid_input','args':{},'reason':reason,**({'column':column} if column is not None else {})}
