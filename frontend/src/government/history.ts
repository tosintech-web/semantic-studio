/*
================================================================================
FILE: frontend/src/government/history.ts
SUMMARY
    Pure government history drafts, predicates and review ownership keys.
BASIC IDEA
    Keep direction, stable identities and unknown periods separate from labels.
INPUTS / INPUT SOURCES
    Typed entry values and exact RDF predicate IRIs.
EXPECTED OUTPUT
    Fresh drafts, complete relationship choices and immutable review keys.
================================================================================
*/
import {unknownPeriod,localToday,validNames,validPeriod,validSources} from './form';
import type {RelationInput,NameInput,ChangeInput,ExistenceInput} from './types';
export const RELATION_OPTIONS = [
 {iri:'urn:semantic-studio:government:v1#inCountry',key:'government.relation.inCountry'},
 {iri:'http://www.w3.org/ns/org#unitOf',key:'government.relation.unitOf'},
 {iri:'http://www.w3.org/ns/org#subOrganizationOf',key:'government.relation.subOrganizationOf'},
 {iri:'urn:semantic-studio:government:v1#supervisedBy',key:'government.relation.supervisedBy'},
 {iri:'urn:semantic-studio:government:v1#cooperatesWith',key:'government.relation.cooperatesWith'},
] as const;
export function emptyRelation():RelationInput {return {subject:'',predicate:RELATION_OPTIONS[1].iri,object:'',period:unknownPeriod(),sources:[{kind:'text',value:''}],description:''};}
export function emptyName(language="en"):NameInput {return {entity:'',value:'',language,period:unknownPeriod(),sources:[{kind:'text',value:''}]};}
export function emptyExistence():ExistenceInput {return {entity:'',period:unknownPeriod(),sources:[{kind:'text',value:''}]};}
export function emptyChange():ChangeInput {return {kind:'merge',effectiveDate:localToday(),originalIris:[],resultingIris:[],relationEdits:[],nameEdits:[],existenceEdits:[],sources:[{kind:'text',value:''}],description:''};}
export function proposalKey(value:unknown):string {return JSON.stringify(value);}
export function validRelation(value:RelationInput):boolean {return Boolean(value.subject&&value.object&&RELATION_OPTIONS.some(r=>r.iri===value.predicate)&&validPeriod(value.period)&&validSources(value.sources));}
export function validName(value:NameInput):boolean {return Boolean(value.entity&&validNames([{value:value.value,language:value.language}])&&validPeriod(value.period)&&validSources(value.sources));}
export function validExistence(value:ExistenceInput):boolean {return Boolean(value.entity&&validPeriod(value.period)&&validSources(value.sources));}
export function validChange(value:ChangeInput):boolean {
 const datePeriod={start:{date:value.effectiveDate,open:false},end:{date:null,open:true}};
 return validPeriod(datePeriod)&&value.originalIris.length>0&&value.resultingIris.length>0&&value.originalIris.length<=100&&value.resultingIris.length<=100&&
  (value.kind!=='rename'&&value.kind!=='transfer'||value.originalIris.length===1&&value.resultingIris.length===1&&value.originalIris[0]===value.resultingIris[0])&&
  (value.kind!=='merge'||value.originalIris.length>=2)&&
  (value.kind!=='split'||value.resultingIris.length>=2)&&
  (!['merge','split'].includes(value.kind)||value.originalIris.length!==value.resultingIris.length||value.originalIris.some(iri=>!value.resultingIris.includes(iri)))&&
  (value.kind!=='other'||Boolean(value.description.trim()))&&
  validSources(value.sources)&&value.relationEdits.every(validRelation)&&value.nameEdits.every(validName)&&value.existenceEdits.every(validExistence);
}
