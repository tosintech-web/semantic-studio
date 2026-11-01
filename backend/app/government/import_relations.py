"""
================================================================================
FILE: backend/app/government/import_relations.py
SUMMARY
    Resolves explicit relationship operations before any candidate is modified.
BASIC IDEA
    S0 owns every lookup; mixed operations on one record are refused together.
INPUTS / INPUT SOURCES
    Reviewed relation intents and detached source/country graphs.
EXPECTED OUTPUT
    A complete, validated candidate graph and row-specific review facts.
================================================================================
"""
from collections import Counter
from rdflib import URIRef
from rdflib.namespace import RDF,DCTERMS
from .profile import GOV,DomainError
from .records import ORGANIZATION_TYPES,RELATION_PREDICATES,read_relations,period_json
from .import_plan import start_plan,minted,resolve_code,merged_fields,patch,patch_period,report,finalize,AmbiguousCode,canonical
from .profile import ORG


def plan_relations(ctx,batch):
    plan=start_plan(ctx,batch);g=plan.candidate
    existing=read_relations(ctx.graph);by_iri={r.iri:r for r in existing};resolved=[]
    for intent in batch['intents']:
        try:
            action=intent.get('action');predicate=URIRef(intent.get('predicate',''))
            if predicate not in RELATION_PREDICATES:raise ValueError('Choose a supported relationship.')
            subject=resolve_code(ctx.graph,intent.get('subjectCode'),ORG.identifier,ORGANIZATION_TYPES)
            if subject is None:raise ValueError('The subject code is not in this organization master.')
            old=None;period=None;obj=None;key=None
            if action in ('correct','end'):
                old=by_iri.get(intent.get('recordIri'))
                if old is None or old.unsupported or old.subject!=str(subject) or old.predicate!=str(predicate):raise ValueError('Choose a supported record belonging to this subject and relationship.')
                if action=='end' and (set(intent['fields'])!={'relationEnd'} or intent.get('objectCode')):raise ValueError('End only changes the explicitly supplied ending date.')
                obj=URIRef(old.object)
            elif action=='add':
                if intent.get('recordIri'):raise ValueError('Add matches by endpoints and period, not a supplied record IRI.')
            else:raise ValueError('Choose add, correct or end.')
            if action=='add' or intent.get('objectCode'):
                reference=getattr(ctx,'country_reference',None)
                graph=reference.graph if predicate==GOV.inCountry and reference else ctx.graph
                if predicate==GOV.inCountry and reference is None:raise ValueError('Connect a country master.')
                obj=resolve_code(graph,intent.get('objectCode'),GOV.countryCode if predicate==GOV.inCountry else ORG.identifier,{GOV.Country} if predicate==GOV.inCountry else ORGANIZATION_TYPES)
                if obj is None:raise ValueError('The relationship target code is missing from its authority.')
            if action=='add':
                fields=merged_fields(batch,intent,True)
                from rdflib import Graph
                period=patch_period(Graph(),URIRef('urn:period'),fields,'relation')
                key=(str(subject),str(predicate),str(obj),canonical(period_json(period)))
                matches=[r for r in existing if (r.subject,r.predicate,r.object,canonical(period_json(r.period)))==key]
                if len(matches)>1:raise AmbiguousCode('Several existing records match this relationship.')
                old=matches[0] if matches else None
                if old and old.unsupported:raise ValueError('The matching relationship has unsupported values.')
            node=URIRef(old.iri) if old else minted(ctx,plan,'relation:'+str(intent['row']['rowId']))
            resolved.append((intent,action,predicate,subject,obj,old,node,key,period))
        except (ValueError,DomainError) as exc:
            report(plan,intent,'needs-review' if isinstance(exc,AmbiguousCode) else 'error',reason=str(exc))
    targets=Counter(str(r[6]) for r in resolved if r[5])
    additions=Counter(r[7] for r in resolved if r[1]=='add')
    for intent,action,predicate,subject,obj,old,node,key,period in resolved:
        try:
            if old and targets[str(node)]>1 or action=='add' and additions[key]>1:raise ValueError('Several source rows target the same relationship record.')
            before=set(g.triples((node,None,None)));fields=merged_fields(batch,intent,old is None)
            if action=='end':
                value=fields['relationEnd'][0]['values'][0]
                from .records import parse_date
                parse_date(value)
            if old is None:
                for t in [(node,RDF.type,GOV.RelationRecord),(node,GOV.subject,subject),(node,GOV.predicate,predicate),(node,GOV.object,obj)]:g.add(t)
            elif action=='correct' and obj!=URIRef(old.object):
                g.remove((node,GOV.object,None));g.add((node,GOV.object,obj))
            if old is None or action in ('correct','end'):
                patch_period(g,node,fields,'relation',old.period if old else None)
            if 'sources' in fields:patch(g,node,DCTERMS.source,fields['sources'],'sources')
            if 'description' in fields:patch(g,node,DCTERMS.description,fields['description'],'scalar')
            if not list(g.objects(node,DCTERMS.source)):raise ValueError('A relationship needs a source.')
            row=report(plan,intent,'created' if old is None else 'updated' if before!=set(g.triples((node,None,None))) else 'unchanged',subject)
            row['recordIri']=str(node)
        except (ValueError,DomainError) as exc:report(plan,intent,'error',reason=str(exc))
    plan.rows.sort(key=lambda r:r['row']['rowId'])
    return finalize(plan)
