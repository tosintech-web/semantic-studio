"""
FILE: backend/tests/test_master_import_tabular.py
SUMMARY: Source evidence and safe master identifier reading.
BASIC IDEA: Read generated CSV/workbooks and assert physical positions and cell types.
INPUTS / INPUT SOURCES: Synthetic files including formulas and formatted numeric keys.
EXPECTED OUTPUT: Preserved strings, positions and explicit unsupported-key issues.
"""
import io
import pytest
from app import tabular
from app.government.import_tabular import read_master_table
from app.government.import_mapping import map_master_rows


def workbook(rows):
    import openpyxl
    b=openpyxl.Workbook();s=b.active;s.title='Master'
    for row in rows:s.append(row)
    out=io.BytesIO();b.save(out);b.close();return out.getvalue()


def test_csv_positions_survive_blank_and_multiline_records():
    t=read_master_table(b'code,name\n\n001,"First\nname"\n002,Second\n','data.csv',{})
    assert [p['startLine'] for p in t.positions]==[3,5]
    assert [p['record'] for p in t.positions]==[1,2]
    assert t.evidence[0][0]['text']=='001'
    assert t.evidence[0][1]['text']=='First\nname'


def test_xlsx_key_evidence_is_not_display_text():
    t=read_master_table(workbook([['code','name'],['001','Text'],[1,'Number'],['=1','Formula'],[1234567890123456,'Long']]),'data.xlsx',{})
    assert [row[0]['kind'] for row in t.evidence]==['text','number','formula','number']
    mapped=map_master_rows(t,'countries',{'columns':[{'column':0,'field':'code','op':'set'},{'column':1,'field':'names','language':'en','op':'set'}]},[1,2,3,4])
    assert [x['row']['rowId'] for x in mapped['issues']]==[2,3,4]
    assert mapped['intents'][0]['code']=='001'


def test_formula_only_row_without_cache_is_not_blank():
    t=read_master_table(workbook([['code'],['=1']]),'data.xlsx',{})
    assert t.table.total==1
    assert t.evidence[0][0]['kind']=='formula'


def test_duplicate_headers_and_proto_names_keep_column_identity():
    t=read_master_table(b'code,code,__proto__\n A ,B,Value\n','data.csv',{})
    assert t.table.columns==['code','code (2)','__proto__']
    mapped=map_master_rows(t,'countries',{'columns':[{'column':1,'field':'code','op':'set'},{'column':2,'field':'names','language':'en','op':'set'}]},[1])
    assert mapped['intents'][0]['code']=='B'
    assert t.evidence[0][0]['text']==' A '


@pytest.mark.parametrize('selection',[[],[0],[2],[1,1],[{}],{'1':1},'1'])
def test_invalid_selection_refused(selection):
    t=read_master_table(b'code\nA\n','data.csv',{})
    with pytest.raises(ValueError):map_master_rows(t,'countries',{'columns':[]},selection)


def test_mixed_set_operations_are_refused_before_mapping_rows():
    t=read_master_table(b'code,s1,s2\nAA,First,Second\n','data.csv',{})
    columns=[{'column':0,'field':'code','op':'set'},{'column':1,'field':'sources','op':'append'},{'column':2,'field':'sources','op':'replace'}]
    with pytest.raises(ValueError):map_master_rows(t,'countries',{'columns':columns},[1])

    duplicate_names=[{'column':0,'field':'code','op':'set'},{'column':1,'field':'names','language':'en','op':'set'},{'column':2,'field':'names','language':'EN','op':'set'}]
    with pytest.raises(ValueError):map_master_rows(t,'countries',{'columns':duplicate_names},[1])
