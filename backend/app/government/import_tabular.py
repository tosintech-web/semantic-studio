"""
================================================================================
FILE: backend/app/government/import_tabular.py
SUMMARY
    Reads source positions and Excel cell types through the existing defences.
BASIC IDEA
    Keep untrusted source evidence separate from accepted RDF changes.
INPUTS / INPUT SOURCES
    Explicit source bytes, typed options and user-reviewed field choices.
EXPECTED OUTPUT
    Detached import values or a refusal; no model or persistence mutations.
================================================================================
"""
import csv
import datetime
import io
from .. import tabular
from .import_models import MasterTable, ReadOptions


def _cell(column, header, value, kind=None):
    text = tabular.cell_text(value) if value is not None else ''
    if kind is None:
        kind = 'empty' if value is None else 'boolean' if isinstance(value,bool) else 'date' if isinstance(value,(datetime.date,datetime.time)) else 'number' if isinstance(value,(int,float)) else 'text'
    if len(text)>tabular.MAX_CELL:
        raise ValueError('A cell exceeds 32767 characters.')
    return {'column':column,'originalHeader':header,'text':text,'kind':kind,'truncated':False,'length':len(text)}


def _assemble(columns, header, rows, workbook=None, separator=',', encoding='utf-8', total=None):
    width=len(columns)
    evidence=[];positions=[]
    for number,cells in rows[:tabular.MAX_ROWS]:
        cells=cells+[(None,None)]*(width-len(cells))
        evidence.append([_cell(i,header[i] if i<len(header) else '',value,kind) for i,(value,kind) in enumerate(cells[:width])])
        positions.append({'rowId':len(positions)+1,'record':len(positions)+1,'startLine':number,**({'sheet':workbook['sheet']} if workbook else {})})
    table=tabular.Table(columns,[[c['text'].strip() for c in r] for r in evidence],len(rows) if total is None else total,separator,encoding,True,workbook=workbook)
    return MasterTable(table,positions,evidence)


def read_master_table(data:bytes,filename:str,options:dict)->MasterTable:
    options=ReadOptions.model_validate(options).model_dump(exclude_none=True)
    tabular.check_size(len(data))
    if not tabular.is_workbook(data,filename):
        # The normal reader owns limits and dialect validation; evidence adds
        # physical positions and untrimmed values without changing its DTO.
        checked=tabular.read_file(data,filename,options)
        text,_=tabular.decode(data,options.get('encoding'))
        reader=csv.reader(io.StringIO(text,newline=''),delimiter=checked.separator)
        rows=[];header=[];first=True
        while True:
            start=reader.line_num+1
            try: values=next(reader)
            except StopIteration: break
            if not values: continue
            if first and options.get('header',True):header=values;first=False;continue
            first=False
            if len(rows)<tabular.MAX_ROWS:rows.append((start,[(v,'text') for v in values]))
        result=_assemble(checked.columns,header,rows,separator=checked.separator,encoding=checked.encoding,total=checked.total)
        result.table.header=checked.header
        return result
    tabular.check_workbook(data,filename)
    book=tabular._open_workbook(data)
    try:
        from openpyxl.worksheet._reader import WorkSheetParser
        from openpyxl.worksheet._read_only import ReadOnlyWorksheet
        sheets=[s for s in book.worksheets if isinstance(s,ReadOnlyWorksheet)]
        name=options.get('sheet')
        chosen=next((s for s in sheets if s.title==name),None) if name else next((s for s in sheets if tabular._has_values(s)),sheets[0] if sheets else None)
        if chosen is None: raise ValueError('Choose an existing worksheet.')
        header_row=options.get('headerRow');header=None;rows=[];width=0;total=0
        # Both passes use the guarded workbook parser, never a new XML path.
        # Formula evidence is retained even when its cached value is absent.
        cached={}
        for n,c in tabular._sheet_cells(chosen):
            if n < (header_row or 1):continue
            if len(cached)>=tabular.MAX_ROWS+1:break
            cached[n]=dict(c)
        with chosen._get_source() as source:
            parser=WorkSheetParser(source,chosen._shared_strings,data_only=False,epoch=book.epoch,date_formats=book._date_formats,timedelta_formats=book._timedelta_formats)
            for number,cells in parser.parse():
                raw={c['column']:c for c in cells if c['value'] is not None}
                if not raw:continue
                if max(raw)>tabular.MAX_COLUMNS:raise ValueError('A table has more than 100 columns.')
                line=[]
                for col in range(1,max(raw)+1):
                    cell=raw.get(col);value=cell['value'] if cell else None
                    formula=cell is not None and cell.get('data_type')=='f'
                    line.append((cached.get(number,{}).get(col) if formula else value,'formula' if formula else None))
                if header_row is None:header_row=number
                if number<header_row:continue
                if number==header_row:
                    header=[tabular.cell_text(v) if v is not None else '' for v,_ in line];width=len(header);continue
                if header is None:raise ValueError('The selected header row is empty.')
                total+=1
                if total<=tabular.MAX_ROWS:
                    width=max(width,len(line));rows.append((number,line))
        if not header or not any(header):raise ValueError('The selected header row is empty.')
        columns,_=tabular._named(header,width)
        listing=[{'name':s.title,'rows':total if s is chosen else tabular._rows_below_first(s)} for s in sheets]
        return _assemble(columns,header,rows,workbook={'sheet':chosen.title,'headerRow':header_row,'sheets':listing},total=total)
    finally:book.close()
