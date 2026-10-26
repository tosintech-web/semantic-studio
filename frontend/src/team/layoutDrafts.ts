/*
================================================================================
FILE: frontend/src/team/layoutDrafts.ts
SUMMARY
    Synchronous ownership and explicit recovery of pending team canvas layouts.
BASIC IDEA
    Retain owner-specific retry closures and read baselines across mode unmounts;
    only a review of that exact document can approve a new retry baseline.
INPUTS / INPUT SOURCES
    Canvas pending flags, explicit review versions and explicit retry actions.
EXPECTED OUTPUT
    Observable pending owners without automatic writes or cross-document rebasing.
================================================================================
*/
import {isTeamMode} from "./client";
import type {ResourceVersions} from "./types";
import type {ProjectDocName} from "../types";
export interface LayoutDraftOwner {
 projectId:string; doc:ProjectDocName; name:string;
 retry:()=>Promise<void>; review:(versions:ResourceVersions)=>void;
}
export interface LayoutDraft {id:number;owner:LayoutDraftOwner;failed:boolean;busy:boolean}
const drafts=new Map<LayoutDraftOwner,LayoutDraft>();
const listeners=new Set<()=>void>();
let generation=0;
let nextOwnerId=0;
export function setLayoutDraft(owner:LayoutDraftOwner,pending:boolean,failed=false,busy=false){
 if(!isTeamMode())pending=false;
 const previous=drafts.get(owner);
 if(!pending){if(!drafts.delete(owner))return;}
 else{if(previous?.failed===failed&&previous.busy===busy)return;drafts.set(owner,{id:previous?.id??++nextOwnerId,owner,failed,busy});}
 generation++;for(const listener of listeners)listener();
}
export const layoutDraftGeneration=()=>generation;
export const subscribeLayoutDrafts=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const hasLayoutDrafts=()=>isTeamMode()&&drafts.size>0;
export const pendingLayoutDrafts=()=>[...drafts.values()];
export function reviewLayoutDrafts(projectId:string,doc:ProjectDocName,versions:ResourceVersions){
 for(const {owner} of drafts.values())if(owner.projectId===projectId&&owner.doc===doc)owner.review({...versions});
}
