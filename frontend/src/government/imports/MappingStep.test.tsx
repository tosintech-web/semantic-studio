// @vitest-environment jsdom
/*
FILE: frontend/src/government/imports/MappingStep.test.tsx
SUMMARY: Mapping controls offer operations supported by the master planner.
BASIC IDEA: Render all boundary fields and inspect their available operations.
INPUTS / INPUT SOURCES: Synthetic source evidence and finite column mappings.
EXPECTED OUTPUT: Period boundaries use explicit open/unknown/date values.
*/
import {it,expect,vi,afterEach} from 'vitest';
import {screen,cleanup,fireEvent} from '@testing-library/react';
import {renderEn as render} from '../../testutils/i18n';
import MappingStep from './MappingStep';
import type {Inspection} from './types';
afterEach(cleanup);
const inspection:Inspection={columns:['start'],columnLengths:[5],positions:[{rowId:1,record:1,startLine:2}],evidence:[[{text:'open',kind:'text',truncated:false,originalHeader:'start'}]],totalRows:1,maxRows:2000,sha256:'s',workbook:null};
it('never offers clear for period boundaries that require an explicit value',()=>{
 for(const field of ['existenceStart','existenceEnd','affiliationStart','affiliationEnd','relationStart','relationEnd']){
  render(<MappingStep inspection={inspection} mode={field.startsWith('relation')?'relations':'organizations'} mapping={{columns:[{column:0,field,op:'set'}],defaults:{},rowOverrides:[]}} onChange={vi.fn()} selected={[1]} onSelected={vi.fn()} busy={false} language="en"/>);
  const operation=screen.getByRole('combobox',{name:'Operation'}) as HTMLSelectElement;
  expect(Array.from(operation.options).map(option=>option.value)).toEqual(['set']);
  cleanup();
 }
});

it('reflects cleared defaults when a fresh inspection resets the mapping',()=>{
 const onChange=vi.fn();const props={inspection,mode:'countries' as const,onChange,selected:[1],onSelected:vi.fn(),busy:false,language:'en'};
 const mapping={columns:[],defaults:{},rowOverrides:[]};
 const view=render(<MappingStep {...props} mapping={mapping}/>);
 fireEvent.change(screen.getByLabelText('Description'),{target:{value:'Old default'}});
 view.rerender(<MappingStep {...props} mapping={onChange.mock.calls[0][0]}/>);
 expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe('Old default');
 view.rerender(<MappingStep {...props} mapping={mapping}/>);
 expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe('');
 cleanup();
});
