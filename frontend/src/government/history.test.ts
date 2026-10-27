/*
================================================================================
FILE: frontend/src/government/history.test.ts
SUMMARY
    Checks relationship direction and review invalidation keys.
BASIC IDEA
    Compare the five actual RDF predicates and raw drafts, independently of labels.
INPUTS / INPUT SOURCES
    Synthetic relationship and reorganization inputs.
EXPECTED OUTPUT
    Complete choices and distinct owner keys when any proposal value changes.
================================================================================
*/
import { expect, it } from 'vitest';
import { RELATION_OPTIONS, emptyChange, proposalKey, validChange } from './history';
it('offers all five directed relationships without human membership',()=>{
 expect(RELATION_OPTIONS.map(r=>r.iri)).toEqual(['urn:semantic-studio:government:v1#inCountry','http://www.w3.org/ns/org#unitOf','http://www.w3.org/ns/org#subOrganizationOf','urn:semantic-studio:government:v1#supervisedBy','urn:semantic-studio:government:v1#cooperatesWith']);
});
it('requires meaningful merge and split participants and an explanation for other changes',()=>{
 const base={...emptyChange(),sources:[{kind:'text' as const,value:'Synthetic act'}]};
 expect(validChange({...base,kind:'merge',originalIris:['a'],resultingIris:['b']})).toBe(false);
 expect(validChange({...base,kind:'split',originalIris:['a'],resultingIris:['b']})).toBe(false);
 for(const kind of ['merge','split']as const)
  expect(validChange({...base,kind,originalIris:['a','b'],resultingIris:['b','a']})).toBe(false);
 expect(validChange({...base,kind:'other',originalIris:['a'],resultingIris:['b'],description:'   '})).toBe(false);
 expect(validChange({...base,kind:'merge',originalIris:['a','b'],resultingIris:['a']})).toBe(true);
 expect(validChange({...base,kind:'split',originalIris:['a'],resultingIris:['a','b']})).toBe(true);
 expect(validChange({...base,kind:'other',originalIris:['a'],resultingIris:['b'],description:'Reason for exceptional change'})).toBe(true);
});
it('keeps identity choices explicit and binds review to complete raw values',()=>{
 const a=emptyChange(); expect(a.originalIris).toEqual([]);expect(a.resultingIris).toEqual([]);expect(a.relationEdits).toEqual([]);
 expect(proposalKey(a)).not.toBe(proposalKey({...a,description:'Changed'}));
 expect(proposalKey(a)).not.toBe(proposalKey({...a,existenceEdits:[{entity:'urn:x',period:{start:{date:null,open:false},end:{date:null,open:false}},sources:[]}]}));
});
