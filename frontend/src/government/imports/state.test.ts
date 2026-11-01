/*
FILE: frontend/src/government/imports/state.test.ts
SUMMARY: Owner and review invalidation contracts for the master wizard.
BASIC IDEA: Drive user edits and delayed results through a pure transition.
INPUTS / INPUT SOURCES: Synthetic owners and request tokens.
EXPECTED OUTPUT: Stale responses never authorize confirmation.
*/
import {describe,it,expect} from 'vitest';
import {initial,transition} from './state';
describe('master import ownership',()=>{
 it('invalidates a reviewed result when mapping changes',()=>{
  const s=transition({...initial,token:1,phase:'review'}, {type:'edit'});
  expect(s.phase).toBe('mapping');expect(s.token).toBe(2);
 });
 it('ignores responses belonging to earlier input',()=>{
  expect(transition({...initial,token:2},{type:'reviewed',token:1})).toEqual({...initial,token:2});
 });
});
