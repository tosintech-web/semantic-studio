/*
FILE: frontend/src/government/imports/fields.ts
SUMMARY: Finite field labels and default conversions.
BASIC IDEA: Explicit steps retain source input and fence asynchronous ownership.
INPUTS / INPUT SOURCES: Local file, typed server reports and user choices.
EXPECTED OUTPUT: Accessible review and one atomic master update.
*/
import type {Mode} from './types';
export const FIELDS={countries:['code','names','aliases','description','sources'],organizations:['code','names','orgKind','countryCode','existenceStart','existenceEnd','affiliationStart','affiliationEnd','existenceRecordIri','affiliationRecordIri','sources'],relations:['action','recordIri','subjectCode','predicate','objectCode','relationStart','relationEnd','sources','description']} as const satisfies Record<Mode,readonly string[]>;
export const SETS=new Set(['aliases','sources']);
export const REQUIRED=new Set(['code','countryCode','subjectCode','objectCode','action','predicate','orgKind','recordIri','existenceRecordIri','affiliationRecordIri']);
export function defaultValue(field:string,value:string,language:string):unknown {
 if(field==='names'||field==='aliases')return [{value,language}];
 if(field==='sources')return [{kind:'text',value}];
 return value;
}
