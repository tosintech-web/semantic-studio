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
import { RELATION_OPTIONS, emptyChange, proposalKey } from './history';
it('offers all five directed relationships without human membership',()=>{
 expect(RELATION_OPTIONS.map(r=>r.iri)).toEqual(['urn:semantic-studio:government:v1#inCountry','http://www.w3.org/ns/org#unitOf','http://www.w3.org/ns/org#subOrganizationOf','urn:semantic-studio:government:v1#supervisedBy','urn:semantic-studio:government:v1#cooperatesWith']);
});
it('keeps identity choices explicit and binds review to complete raw values',()=>{
 const a=emptyChange(); expect(a.originalIris).toEqual([]);expect(a.resultingIris).toEqual([]);expect(a.relationEdits).toEqual([]);
 expect(proposalKey(a)).not.toBe(proposalKey({...a,description:'Changed'}));
 expect(proposalKey(a)).not.toBe(proposalKey({...a,existenceEdits:[{entity:'urn:x',period:{start:{date:null,open:false},end:{date:null,open:false}},sources:[]}]}));
});
