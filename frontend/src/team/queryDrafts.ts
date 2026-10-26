/*
================================================================================
FILE: frontend/src/team/queryDrafts.ts
SUMMARY
    Synchronous ownership of unsaved shared-query definitions and Save prompts.
BASIC IDEA
    Query state owns its dirty baseline; read/display controls never register it.
INPUTS / INPUT SOURCES
    Semantic builder/text changes, successful saves and explicit cancellation.
EXPECTED OUTPUT
    Polling and navigation see pending query intent before asynchronous responses.
================================================================================
*/
import {isTeamMode} from "./client";
export interface QueryDraftOwner {ontologyId:string|null;queryId:string|null}
const drafts=new Set<QueryDraftOwner>();const listeners=new Set<()=>void>();let generation=0;
export function setQueryDraft(owner:QueryDraftOwner,pending:boolean){
 if(!isTeamMode())pending=false;
 if(pending===drafts.has(owner))return;
 if(pending)drafts.add(owner);else drafts.delete(owner);
 generation++;for(const listener of listeners)listener();
}
export const hasQueryDrafts=()=>isTeamMode()&&drafts.size>0;
export const queryDraftGeneration=()=>generation;
export const pendingQueryDrafts=()=>[...drafts];
export const subscribeQueryDrafts=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
