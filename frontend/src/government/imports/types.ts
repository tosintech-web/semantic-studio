/*
FILE: frontend/src/government/imports/types.ts
SUMMARY: Finite master import wire contracts.
BASIC IDEA: Keep explicit source choices and reviewed ownership together.
INPUTS / INPUT SOURCES: Typed API responses and user actions.
EXPECTED OUTPUT: Bounded, reviewable master import without implicit retries.
*/
import type {ChangeResult} from '../../types';
import type {ResourceVersions} from '../../team/types';
export type Mode='countries'|'organizations'|'relations';
export interface Position {rowId:number;record:number;startLine:number;sheet?:string}
export interface Evidence {text:string;kind:string;truncated:boolean;originalHeader:string}
export interface Inspection {columns:string[];columnLengths:number[];positions:Position[];evidence:Evidence[][];totalRows:number;maxRows:number;sha256:string;workbook:{sheets?:{name:string}[]}|null}
export interface Column {column:number;field:string;op:'set'|'append'|'replace'|'clear';language?:string;sourceKind?:'text'|'iri';delimiter?:string}
export interface Mapping {columns:Column[];defaults:Record<string,unknown>;rowOverrides:{rowId:number;existenceRecordIri?:string;affiliationRecordIri?:string;recordIri?:string}[]}
export interface Options {separator?:string;encoding?:string;header:boolean;sheet?:string;headerRow?:number}
export interface Issue {row?:Position;column?:number;code:string;args:Record<string,unknown>;reason:string}
export interface Batch {version:1;mode:Mode;source:{sha256:string;filename:string;totalRows:number};operationNonce:string;intents:unknown[];mapping:Mapping;selectedRows:number[]}
export interface Prepared {batch:Batch|null;receipt:string|null;issues:Issue[];summary:{selected:number;excluded:number};requiredBytes:number}
export interface Term {kind:string;value:string;language?:string;datatype?:string}
export interface FieldChange {field:string;recordIri:string;before:Term[];after:Term[]}
export interface KeyNormalization {field:string;column:number;raw:string;value:string}
export interface Row {normalizations?:KeyNormalization[];row:Position;status:'created'|'updated'|'unchanged'|'error'|'needs-review';entityIri?:string;issues:Issue[];fields:FieldChange[];recordChoices?:string[]}
export interface Review {basis:string;ready:boolean;noop:boolean;summary:{selected:number;excluded:number;created:number;updated:number;unchanged:number;errors:number;needsReview:number};rows:Row[];totalRows:number;offset:number;limit:number;warnings:Issue[]}
export interface ReviewOwner {pid:string;session:number;authEpoch:number;nonce:string}
export interface Reviewed {report:Review;resourceVersions:ResourceVersions}
export interface Applied extends ChangeResult {noop:boolean;importReport:Review}
export interface Signed {batch:Batch;receipt:string}
