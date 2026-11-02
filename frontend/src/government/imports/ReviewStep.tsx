/*
FILE: frontend/src/government/imports/ReviewStep.tsx
SUMMARY: True-count review pages with exact field and record choices.
BASIC IDEA: Explicit steps retain source input and fence asynchronous ownership.
INPUTS / INPUT SOURCES: Local file, typed server reports and user choices.
EXPECTED OUTPUT: Accessible review and one atomic master update.
*/
import {useEffect,useRef} from 'react';
import {useI18n} from '../../i18n/I18nProvider';
import {renderServerMessage} from '../../i18n/serverMessage';
import type {Review,Mapping,Term} from './types';
export default function ReviewStep({report,onPage,onExclude,mapping,onMapping,busy}:{report:Review;onPage:(offset:number)=>void;onExclude:(id:number)=>void;mapping:Mapping;onMapping:(v:Mapping)=>void;busy:boolean}) {
 const {t}=useI18n();const s=report.summary;const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();heading.current?.scrollIntoView?.({block:'start'});},[report.basis,report.offset]);
 const values=(terms:Term[])=>terms.map((term,i)=><li key={i}><span>{term.value}</span>{term.language&&<small> @{term.language}</small>}{term.datatype&&<small> · {term.datatype}</small>}</li>);
 return <section aria-label={t('masterImport.review')}><h3 ref={heading} tabIndex={-1}>{t('masterImport.review')}</h3>
 <p role="status">{t('masterImport.summary',{created:s.created,updated:s.updated,unchanged:s.unchanged,errors:s.errors,review:s.needsReview,excluded:s.excluded})}</p>
 {report.warnings.length>0&&<><p>{t('masterImport.warnings',{count:report.warnings.length})}</p><ul>{report.warnings.map((warning,i)=><li key={i}>{renderServerMessage(warning,'',t)}<details><summary>{t('common.details')}</summary><pre>{JSON.stringify(warning,null,2)}</pre></details></li>)}</ul></>}
 <p>{t('masterImport.page',{shown:report.rows.length,total:report.totalRows})}</p>
 <ol>{report.rows.map(row=><li key={row.row.rowId}>
 <strong>{t('masterImport.line',{line:row.row.startLine})} · {t(`masterImport.status.${row.status}`)}</strong><code>{row.entityIri}</code>
 {!!row.normalizations?.length&&<table><caption>{t('masterImport.keyNormalization')}</caption><thead><tr><th>{t('masterImport.field')}</th><th>{t('masterImport.before')}</th><th>{t('masterImport.after')}</th></tr></thead><tbody>{row.normalizations.map((key,i)=><tr key={i}><th>{t('masterImport.column',{number:key.column+1,name:key.field})}</th><td><code>{key.raw}</code></td><td><code>{key.value}</code></td></tr>)}</tbody></table>}
 {row.issues.map((issue,i)=><div key={i}><p>{renderServerMessage(issue,'',t)}</p><details><summary>{t('common.details')}</summary><code>{issue.reason}</code></details></div>)}
 <details><summary>{t('masterImport.diff')}</summary><table><thead><tr><th>{t('masterImport.field')}</th><th>{t('masterImport.before')}</th><th>{t('masterImport.after')}</th></tr></thead><tbody>{row.fields.map((field,i)=><tr key={i}><th><code>{field.field}</code><small>{field.recordIri}</small></th><td><ul>{values(field.before)}</ul></td><td><ul>{values(field.after)}</ul></td></tr>)}</tbody></table></details>
 {!!row.recordChoices?.length&&(['existenceRecordIri','affiliationRecordIri'] as const).map(field=><label key={field}>{t(`masterImport.field.${field}`)}<select value={mapping.rowOverrides.find(r=>r.rowId===row.row.rowId)?.[field]??''} disabled={busy} onChange={e=>{const old=mapping.rowOverrides.find(r=>r.rowId===row.row.rowId);onMapping({...mapping,rowOverrides:[...mapping.rowOverrides.filter(r=>r.rowId!==row.row.rowId),{...old,rowId:row.row.rowId,[field]:e.target.value}]});}}><option value="">{t('masterImport.chooseRecord')}</option>{(row.recordChoices??[]).map(iri=><option key={iri}>{iri}</option>)}</select></label>)}
 <button type="button" disabled={busy} onClick={()=>onExclude(row.row.rowId)}>{t('masterImport.exclude')}</button>
 </li>)}</ol>
 <button type="button" disabled={busy||report.offset===0} onClick={()=>onPage(Math.max(0,report.offset-50))}>{t('government.previousPage')}</button>
 <button type="button" disabled={busy||report.offset+50>=report.totalRows} onClick={()=>onPage(report.offset+50)}>{t('government.nextPage')}</button>
 </section>;
}
