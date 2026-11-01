"""
================================================================================
FILE: backend/app/government/import_templates.py
SUMMARY
    Generates synthetic CSV and Excel import templates with textual keys.
BASIC IDEA
    Keep source preparation read-only and bind accepted operations to their owner.
INPUTS / INPUT SOURCES
    Bounded source data, canonical batches and authenticated request context.
EXPECTED OUTPUT
    Reviewable values or explicit refusals; accepted graph changes live in editing.py.
================================================================================
"""
import csv
import io
from .profile import DomainError

EXAMPLES={
 'countries':[['code','name_en','name_ja','description','source'],['001','Example country','例示国','Synthetic example','Example gazette']],
 'organizations':[['code','name_en','country','kind','source'],['ORG-1','Example office','001','Organization','Example gazette']],
 'relations':[['action','record','subject','predicate','object','start','end','source'],['add','','ORG-2','http://www.w3.org/ns/org#unitOf','ORG-1','open','open','Example gazette']],
}

def template(mode,format):
    if mode not in EXAMPLES or format not in ('csv','xlsx'):raise DomainError('Choose a supported template mode and format.')
    if format=='csv':
        out=io.StringIO(newline='');csv.writer(out).writerows(EXAMPLES[mode]);return out.getvalue().encode('utf-8-sig')
    # tabular must configure and verify XML defences before openpyxl loads.
    from .. import tabular
    import openpyxl
    book=openpyxl.Workbook();sheet=book.active;sheet.title='Master'
    for row in EXAMPLES[mode]:sheet.append(row)
    for row in sheet:
        for cell in row:cell.number_format='@'
    out=io.BytesIO();book.save(out);book.close();return out.getvalue()
