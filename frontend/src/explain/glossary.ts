/*
================================================================================
FILE: frontend/src/explain/glossary.ts
================================================================================

SUMMARY
    The one fixed list of what the standard terms mean (explain-panel 5.3,
    D-114): RDF, RDFS, OWL, SKOS, Dublin Core and XML Schema terms, each
    defined in one plain sentence, keyed by full IRI. And which of them a
    detail panel shows, in the order they first appear, for its *What these
    words mean* list.

BASIC IDEA
    Built into the app, never fetched and never generated: a definition is
    indexed here by IRI or not listed. Each IRI references one ja/en catalog
    definition. SKOS mappings share the editing choices' meaning keys, so the
    two displays cannot acquire competing definitions.

    The English compatibility definitions are one sentence of at most 25 words,
    starting lower case, as it follows the term's name and a colon, and
    names no prefixed term: a learner who needs this list cannot read one.
    glossary.test.ts holds every entry to that, and checks that every
    standard term the bundled examples show is here (exampleTerms.json).

    A panel shows a term as a predicate, as a value, as a subject that
    references the entity, or as a literal's type (^^xsd:date). A literal's
    type is looked up by the full IRI the server sends beside its prefixed
    form, never by the prefix, which is whatever the file bound: xs:date is
    XML Schema's date, and a dc: bound to Dublin Core terms is not the
    original set (code review).

INPUTS / INPUT SOURCES
    - The rows the panel lists: its statements and its references.

EXPECTED OUTPUT
    - GLOSSARY: full IRI -> definition.
    - definition(iri): one entry, own-key (X-6), or undefined.
    - panelTerms(statements, references): the defined terms the panel shows,
      each once, in first-appearance order, with the name the panel shows.
================================================================================
*/

import { translate } from "../i18n/format";
import type { MessageId, UiLocale } from "../i18n/types";
import { own } from "../theme/kinds";
import type { NodeDetails, TermRef } from "../types";

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL = "http://www.w3.org/2002/07/owl#";
const SKOS = "http://www.w3.org/2004/02/skos/core#";
const DCTERMS = "http://purl.org/dc/terms/";
const DC = "http://purl.org/dc/elements/1.1/";
const XSD = "http://www.w3.org/2001/XMLSchema#";

type DefinitionCode = Extract<MessageId, `glossary.${string}` | `mapping.${string}.meaning`>;
const DEFINITION_CODES: Record<string, DefinitionCode> = {
  [`${RDF}type`]: "glossary.rdf.type",
  [`${RDF}Property`]: "glossary.rdf.Property",
  [`${RDF}langString`]: "glossary.rdf.langString",
  [`${RDF}List`]: "glossary.rdf.List",
  [`${RDF}first`]: "glossary.rdf.first",
  [`${RDF}rest`]: "glossary.rdf.rest",
  [`${RDF}nil`]: "glossary.rdf.nil",
  [`${RDFS}subClassOf`]: "glossary.rdfs.subClassOf",
  [`${RDFS}subPropertyOf`]: "glossary.rdfs.subPropertyOf",
  [`${RDFS}domain`]: "glossary.rdfs.domain",
  [`${RDFS}range`]: "glossary.rdfs.range",
  [`${RDFS}label`]: "glossary.rdfs.label",
  [`${RDFS}comment`]: "glossary.rdfs.comment",
  [`${RDFS}Class`]: "glossary.rdfs.Class",
  [`${RDFS}Literal`]: "glossary.rdfs.Literal",
  [`${RDFS}Resource`]: "glossary.rdfs.Resource",
  [`${RDFS}Datatype`]: "glossary.rdfs.Datatype",
  [`${RDFS}isDefinedBy`]: "glossary.rdfs.isDefinedBy",
  [`${RDFS}seeAlso`]: "glossary.rdfs.seeAlso",
  [`${RDFS}member`]: "glossary.rdfs.member",
  [`${OWL}Ontology`]: "glossary.owl.Ontology",
  [`${OWL}Class`]: "glossary.owl.Class",
  [`${OWL}Thing`]: "glossary.owl.Thing",
  [`${OWL}Nothing`]: "glossary.owl.Nothing",
  [`${OWL}NamedIndividual`]: "glossary.owl.NamedIndividual",
  [`${OWL}ObjectProperty`]: "glossary.owl.ObjectProperty",
  [`${OWL}DatatypeProperty`]: "glossary.owl.DatatypeProperty",
  [`${OWL}AnnotationProperty`]: "glossary.owl.AnnotationProperty",
  [`${OWL}FunctionalProperty`]: "glossary.owl.FunctionalProperty",
  [`${OWL}InverseFunctionalProperty`]: "glossary.owl.InverseFunctionalProperty",
  [`${OWL}SymmetricProperty`]: "glossary.owl.SymmetricProperty",
  [`${OWL}AsymmetricProperty`]: "glossary.owl.AsymmetricProperty",
  [`${OWL}TransitiveProperty`]: "glossary.owl.TransitiveProperty",
  [`${OWL}ReflexiveProperty`]: "glossary.owl.ReflexiveProperty",
  [`${OWL}IrreflexiveProperty`]: "glossary.owl.IrreflexiveProperty",
  [`${OWL}inverseOf`]: "glossary.owl.inverseOf",
  [`${OWL}equivalentClass`]: "glossary.owl.equivalentClass",
  [`${OWL}equivalentProperty`]: "glossary.owl.equivalentProperty",
  [`${OWL}disjointWith`]: "glossary.owl.disjointWith",
  [`${OWL}AllDisjointClasses`]: "glossary.owl.AllDisjointClasses",
  [`${OWL}members`]: "glossary.owl.members",
  [`${OWL}sameAs`]: "glossary.owl.sameAs",
  [`${OWL}differentFrom`]: "glossary.owl.differentFrom",
  [`${OWL}versionInfo`]: "glossary.owl.versionInfo",
  [`${OWL}versionIRI`]: "glossary.owl.versionIRI",
  [`${OWL}priorVersion`]: "glossary.owl.priorVersion",
  [`${OWL}imports`]: "glossary.owl.imports",
  [`${OWL}deprecated`]: "glossary.owl.deprecated",
  [`${OWL}Restriction`]: "glossary.owl.Restriction",
  [`${OWL}onProperty`]: "glossary.owl.onProperty",
  [`${OWL}onClass`]: "glossary.owl.onClass",
  [`${OWL}someValuesFrom`]: "glossary.owl.someValuesFrom",
  [`${OWL}allValuesFrom`]: "glossary.owl.allValuesFrom",
  [`${OWL}hasValue`]: "glossary.owl.hasValue",
  [`${OWL}cardinality`]: "glossary.owl.cardinality",
  [`${OWL}minCardinality`]: "glossary.owl.minCardinality",
  [`${OWL}maxCardinality`]: "glossary.owl.maxCardinality",
  [`${OWL}qualifiedCardinality`]: "glossary.owl.qualifiedCardinality",
  [`${OWL}minQualifiedCardinality`]: "glossary.owl.minQualifiedCardinality",
  [`${OWL}maxQualifiedCardinality`]: "glossary.owl.maxQualifiedCardinality",
  [`${OWL}intersectionOf`]: "glossary.owl.intersectionOf",
  [`${OWL}unionOf`]: "glossary.owl.unionOf",
  [`${OWL}complementOf`]: "glossary.owl.complementOf",
  [`${OWL}oneOf`]: "glossary.owl.oneOf",
  [`${OWL}disjointUnionOf`]: "glossary.owl.disjointUnionOf",
  [`${SKOS}Concept`]: "glossary.skos.Concept",
  [`${SKOS}ConceptScheme`]: "glossary.skos.ConceptScheme",
  [`${SKOS}Collection`]: "glossary.skos.Collection",
  [`${SKOS}OrderedCollection`]: "glossary.skos.OrderedCollection",
  [`${SKOS}prefLabel`]: "glossary.skos.prefLabel",
  [`${SKOS}altLabel`]: "glossary.skos.altLabel",
  [`${SKOS}hiddenLabel`]: "glossary.skos.hiddenLabel",
  [`${SKOS}definition`]: "glossary.skos.definition",
  [`${SKOS}scopeNote`]: "glossary.skos.scopeNote",
  [`${SKOS}note`]: "glossary.skos.note",
  [`${SKOS}example`]: "glossary.skos.example",
  [`${SKOS}editorialNote`]: "glossary.skos.editorialNote",
  [`${SKOS}historyNote`]: "glossary.skos.historyNote",
  [`${SKOS}changeNote`]: "glossary.skos.changeNote",
  [`${SKOS}notation`]: "glossary.skos.notation",
  [`${SKOS}broader`]: "glossary.skos.broader",
  [`${SKOS}narrower`]: "glossary.skos.narrower",
  [`${SKOS}related`]: "glossary.skos.related",
  [`${SKOS}inScheme`]: "glossary.skos.inScheme",
  [`${SKOS}hasTopConcept`]: "glossary.skos.hasTopConcept",
  [`${SKOS}topConceptOf`]: "glossary.skos.topConceptOf",
  [`${SKOS}member`]: "glossary.skos.member",
  [`${SKOS}memberList`]: "glossary.skos.memberList",
  [`${SKOS}exactMatch`]: "mapping.exactMatch.meaning",
  [`${SKOS}closeMatch`]: "mapping.closeMatch.meaning",
  [`${SKOS}broadMatch`]: "mapping.broadMatch.meaning",
  [`${SKOS}narrowMatch`]: "mapping.narrowMatch.meaning",
  [`${SKOS}relatedMatch`]: "mapping.relatedMatch.meaning",
  [`${DCTERMS}title`]: "glossary.dcterms.title",
  [`${DCTERMS}description`]: "glossary.dcterms.description",
  [`${DCTERMS}creator`]: "glossary.dcterms.creator",
  [`${DCTERMS}contributor`]: "glossary.dcterms.contributor",
  [`${DCTERMS}publisher`]: "glossary.dcterms.publisher",
  [`${DCTERMS}created`]: "glossary.dcterms.created",
  [`${DCTERMS}modified`]: "glossary.dcterms.modified",
  [`${DCTERMS}issued`]: "glossary.dcterms.issued",
  [`${DCTERMS}date`]: "glossary.dcterms.date",
  [`${DCTERMS}license`]: "glossary.dcterms.license",
  [`${DCTERMS}rights`]: "glossary.dcterms.rights",
  [`${DCTERMS}source`]: "glossary.dcterms.source",
  [`${DCTERMS}subject`]: "glossary.dcterms.subject",
  [`${DCTERMS}Agent`]: "glossary.dcterms.Agent",
  [`${DC}title`]: "glossary.dc.title",
  [`${DC}description`]: "glossary.dc.description",
  [`${DC}date`]: "glossary.dc.date",
  [`${DC}creator`]: "glossary.dc.creator",
  [`${DC}subject`]: "glossary.dc.subject",
  [`${XSD}string`]: "glossary.xsd.string",
  [`${XSD}integer`]: "glossary.xsd.integer",
  [`${XSD}nonNegativeInteger`]: "glossary.xsd.nonNegativeInteger",
  [`${XSD}positiveInteger`]: "glossary.xsd.positiveInteger",
  [`${XSD}int`]: "glossary.xsd.int",
  [`${XSD}decimal`]: "glossary.xsd.decimal",
  [`${XSD}double`]: "glossary.xsd.double",
  [`${XSD}float`]: "glossary.xsd.float",
  [`${XSD}boolean`]: "glossary.xsd.boolean",
  [`${XSD}date`]: "glossary.xsd.date",
  [`${XSD}dateTime`]: "glossary.xsd.dateTime",
  [`${XSD}time`]: "glossary.xsd.time",
  [`${XSD}gYear`]: "glossary.xsd.gYear",
  [`${XSD}anyURI`]: "glossary.xsd.anyURI",
};

/** Unknown and inherited IRIs have no definition, never an invented meaning. */
export function definition(iri: string, locale: UiLocale = "en"): string | undefined {
  const code = own(DEFINITION_CODES, iri);
  if (!code) return undefined;
  const meaning = translate(locale, code);
  return locale === "en" && code.startsWith("mapping.") ? meaning[0].toLowerCase() + meaning.slice(1) : meaning;
}
// The historical English export is a projection of the same definition keys.
export const GLOSSARY: Record<string, string> = Object.fromEntries(Object.keys(DEFINITION_CODES).map(iri => [iri, definition(iri)!]));

export interface PanelTerm {
  iri: string;
  /** The name the panel shows it by: its label, or its prefixed form. */
  name: string;
  prefixed: string;
  definition: string;
}

/** An IRI's last name, after its # or last /. */
function local(iri: string): string {
  const cut = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"));
  return iri.slice(cut + 1);
}

/** A term as the panel shows it, or null for one with nothing to define:
 *  a URI by its label (the Term button's rule), a literal by its type. */
function shown(term: TermRef): { iri: string; name: string; prefixed: string } | null {
  if (term.type === "uri") {
    const prefixed = term.prefixed ?? term.value;
    const name = term.label && term.label !== prefixed ? term.label : prefixed;
    return { iri: term.value, name, prefixed };
  }
  if (term.type === "literal" && term.datatypeIri) {
    const iri = term.datatypeIri;
    return { iri, name: local(iri), prefixed: term.datatype ?? iri };
  }
  return null;
}

/** The defined terms a panel shows, each once, in the order they first
 *  appear: its statements row by row, predicate then value, then the
 *  references, subject then predicate. */
export function panelTerms(
  statements: NodeDetails["outgoing"],
  references: NodeDetails["incoming"],
  locale: UiLocale = "en",
): PanelTerm[] {
  const order: TermRef[] = [
    ...statements.flatMap((row) => [row.predicate, row.object]),
    ...references.flatMap((row) => [row.subject, row.predicate]),
  ];
  const seen = new Set<string>();
  const out: PanelTerm[] = [];
  for (const term of order) {
    const found = shown(term);
    if (!found || seen.has(found.iri)) continue;
    const meaning = definition(found.iri, locale);
    if (meaning === undefined) continue;
    seen.add(found.iri);
    out.push({ ...found, definition: meaning });
  }
  return out;
}
