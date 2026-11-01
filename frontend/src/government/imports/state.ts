/*
FILE: frontend/src/government/imports/state.ts
SUMMARY: Pure wizard transition and stale response fencing.
BASIC IDEA: Keep explicit source choices and reviewed ownership together.
INPUTS / INPUT SOURCES: Typed API responses and user actions.
EXPECTED OUTPUT: Bounded, reviewable master import without implicit retries.
*/
export interface State {phase:'source'|'mapping'|'review'|'result';token:number;busy:boolean}
export const initial:State={phase:'source',token:0,busy:false};
type Action={type:'edit'}|{type:'start'}|{type:'inspected'|'reviewed'|'applied'|'failed';token:number};
export function transition(s:State,a:Action):State {
 if(a.type==='edit')return {...s,phase:'mapping',token:s.token+1,busy:false};
 if(a.type==='start')return {...s,busy:true};
 if(a.token!==s.token)return s;
 return {...s,busy:false,phase:a.type==='inspected'?'mapping':a.type==='reviewed'?'review':a.type==='applied'?'result':s.phase};
}
