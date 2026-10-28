/*
================================================================================
FILE: frontend/src/government/ProblemText.tsx
SUMMARY
    Plain-language explanations for structured temporal history diagnostics.
BASIC IDEA
    Translate known source facts; retain the record IRI and unknown code as text.
INPUTS / INPUT SOURCES
    Domain problem codes and immutable record identity.
EXPECTED OUTPUT
    Useful bilingual warnings without rendering ontology content as HTML.
================================================================================
*/
import {useI18n} from '../i18n/I18nProvider';
const messages={
 'government.cycle':'government.problem.cycle',
 'government.relation_overlap':'government.problem.relationOverlap',
 'government.country_overlap':'government.problem.countryOverlap',
 'government.name_overlap':'government.problem.nameOverlap',
 'government.inactive_endpoint':'government.problem.inactiveEndpoint',
 'government.record_unsupported':'government.problem.unsupported',
 'government.cross_country':'government.cross_country',
}as const;
export default function ProblemText({code,iri}:{code:string;iri:string}) {
 const {t}=useI18n();const key=messages[code as keyof typeof messages];
 return <>{key?t(key):t('government.historyWarning',{code,iri})} <code>{iri}</code></>;
}
