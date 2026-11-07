/*
FILE: frontend/src/government/imports/MappingStep.tsx
SUMMARY: Source-position mapping, explicit operations and new-row defaults.
BASIC IDEA: Explicit steps retain source input and fence asynchronous ownership.
INPUTS / INPUT SOURCES: Local file, typed server reports and user choices.
EXPECTED OUTPUT: Accessible review and one atomic master update.
*/
import {useI18n} from '../../i18n/I18nProvider';
import type {Inspection,Mapping,Mode,Column} from './types';
import {FIELDS,SETS,REQUIRED,BOUNDARIES,defaultValue,defaultText} from './fields';
export default function MappingStep({inspection,mode,mapping,onChange,selected,onSelected,busy,language}:{inspection:Inspection;mode:Mode;mapping:Mapping;onChange:(v:Mapping)=>void;selected:number[];onSelected:(v:number[])=>void;busy:boolean;language:string}) {
 const {t}=useI18n();
 const edit=(index:number,patch:Partial<Column>)=>{
  const old=patch.field!==undefined?undefined:mapping.columns.find(c=>c.column===index);
  const value={column:index,field:'',op:'set' as const,...old,...patch};
  onChange({...mapping,columns:[...mapping.columns.filter(c=>c.column!==index),...(value.field?[value]:[])]});
 };
 return <fieldset disabled={busy}><legend>{t('masterImport.mapping')}</legend>
 <p>{t('masterImport.rules')}</p><p>{t('masterImport.total',{total:inspection.totalRows})}</p>
 {inspection.columns.map((header,index)=>{const c=mapping.columns.find(c=>c.column===index);const field=c?.field??'';return <fieldset key={index}>
  <legend>{t('masterImport.column',{number:index+1,name:header})}</legend>
  <label>{t('masterImport.field')}<select value={field} onChange={e=>{const f=e.target.value;edit(index,{field:f,op:SETS.has(f)?'append':'set',...(['names','aliases'].includes(f)?{language}:{}),...(f==='sources'?{sourceKind:'text' as const}:{})});}}><option value="">{t('masterImport.ignore')}</option>{FIELDS[mode].map(f=><option key={f} value={f}>{t(`masterImport.field.${f}`)}</option>)}</select></label>
  {field&&<><label>{t('masterImport.operation')}<select value={c?.op??'set'} onChange={e=>edit(index,{op:e.target.value as Column['op']})}>{(SETS.has(field)?['append','replace','clear']:(REQUIRED.has(field)||BOUNDARIES.has(field))?['set']:['set','clear']).map(op=><option key={op} value={op}>{t(`masterImport.op.${op as Column['op']}`)}</option>)}</select></label>
  {['names','aliases'].includes(field)&&<label>{t('masterImport.language')}<input value={c?.language??language} maxLength={100} onChange={e=>edit(index,{language:e.target.value})}/></label>}
  {SETS.has(field)&&<label>{t('masterImport.delimiter')}<input value={c?.delimiter??''} maxLength={8} onChange={e=>edit(index,{delimiter:e.target.value||undefined})}/></label>}
  {field==='sources'&&<label>{t('government.sourceType',{number:index+1})}<select value={c?.sourceKind??'text'} onChange={e=>edit(index,{sourceKind:e.target.value as 'text'|'iri'})}><option value="text">{t('government.sourceText')}</option><option value="iri">{t('government.sourceLink')}</option></select></label>}</>}
  <ul>{inspection.evidence.slice(0,3).map((row,i)=><li key={i}>{t('masterImport.line',{line:inspection.positions[i].startLine})}: <code>{row[index]?.text}</code> ({row[index]?.kind}){row[index]?.truncated?'…':''}</li>)}</ul>
 </fieldset>;})}
 <details><summary>{t('masterImport.defaults')}</summary><p>{t('masterImport.defaultsHelp')}</p>{FIELDS[mode].filter(f=>!REQUIRED.has(f)&&f!=='aliases').map(f=><label key={f}>{t(`masterImport.field.${f}`)}<input maxLength={4096} value={defaultText(mapping.defaults[f])} onChange={e=>{const defaults={...mapping.defaults};if(e.target.value)defaults[f]=defaultValue(f,e.target.value,language);else delete defaults[f];onChange({...mapping,defaults});}}/></label>)}</details>
 <label>{t('masterImport.rows')}<input key={selected.join(',')} defaultValue={selected.join(',')} onBlur={e=>{const raw=e.target.value;const rows=raw?raw.split(',').map(v=>Number(v.trim())):[];onSelected(rows);}} aria-describedby="master-import-row-help"/></label>
 <p id="master-import-row-help">{t('masterImport.rowsHelp')}</p>
 </fieldset>;
}
