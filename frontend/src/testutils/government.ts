/*
================================================================================
FILE: frontend/src/testutils/government.ts
SUMMARY
    Complete synthetic project and domain read fixtures for government UI tests.
BASIC IDEA
    Real project-store behavior uses API-level doubles, never mocked form logic.
INPUTS / INPUT SOURCES
    Literal synthetic project IDs, RDF identities and date/source values.
EXPECTED OUTPUT
    Complete independent fixtures shared by entry-form tests.
================================================================================
*/
import type { OpenedProject, ChangeResult } from "../types";

export const PID = "prj-222222222222";
export const COUNTRY_IRI = "http://example.org/countries#synthetic";
export const BASIS = { sourceProjectId: "prj-111111111111", sourceToken: "source-a" };
export const UNKNOWN = { start: { date: null, open: false }, end: { date: null, open: false } };
export const PAGE = { items: [{ iri: COUNTRY_IRI, label: "Synthetic country", code: "SYN" }], total: 1, offset: 0, limit: 50, basis: BASIS };
export const DETAIL_PAGE = { ...PAGE, basis:{...BASIS,sourceProjectId:PID}, items: [{ ...PAGE.items[0], names: [{ value: "Synthetic country", language: "en" }, { value: "合成国", language: "ja" }], aliases: [{ value: "Alternative", language: "en" }], sources: [{ kind: "text", value: "Synthetic source" }], description: "Description", unsupported: [] }] };
export const VIEW = {
  names:{items:[],total:0,offset:0,limit:50},changes:{items:[],total:0,offset:0,limit:50},existences:{items:[],total:0,offset:0,limit:50},activeRelations:{items:[],total:0,offset:0,limit:50},
  at: "2020-04-01", basis: "view-a", organizations: { items: [], total: 0, offset: 0, limit: 50 },
  relations: { items: [], total: 0, offset: 0, limit: 50 }, uncertain: { items: [], total: 0, offset: 0, limit: 50 }, diagnostics: [], referenceBasis: BASIS,
  kindOptions: [{ value: "Organization", iri: "http://www.w3.org/ns/org#Organization", label: "Organization" },
    { value: "FormalOrganization", iri: "http://www.w3.org/ns/org#FormalOrganization", label: "Formal organization" },
    { value: "OrganizationalUnit", iri: "http://www.w3.org/ns/org#OrganizationalUnit", label: "Organizational unit" }],
};

export function opened(profile = "countries-v1", pid = PID): OpenedProject {
  return {
    project: { id: pid, name: "Synthetic", createdAt: "", updatedAt: "", baseIri: "http://example.org/data#", prefix: "data", primaryLanguage: "en", languages: ["ja"], documents: [{ file: "model.ttl", role: "model" }], counts: {}, kind: "ontology", domainProfile: { id: profile, version: 1, ...(profile === "government-organizations-v1" ? { countryProjectId: BASIS.sourceProjectId } : {}) } },
    documents: [{ doc: "model", ontologyId: `${pid}-model`, revision: 0, dirty: false, canUndo: false, undoLabel: null, canRedo: false, redoLabel: null, triples: 2 }],
    recovery: { available: false, draftTime: null },
  };
}

export function changed(pid = PID): ChangeResult {
  return { revision: 1, label: "Saved", created: "http://example.org/data#new", state: { ...opened("countries-v1", pid).documents[0], revision: 1, dirty: true, canUndo: true, undoLabel: "Saved" } };
}
