"""
================================================================================
FILE: backend/app/government/import_entities.py
SUMMARY
    Plans language-scoped entity patches without replacing unrelated RDF.
BASIC IDEA
    Resolve identities against accepted S0; construct a detached candidate only.
INPUTS / INPUT SOURCES
    Validated batch intents, project metadata and country reference snapshots.
EXPECTED OUTPUT
    A deterministic preview with exact RDF changes; no accepted mutation.
================================================================================
"""
from rdflib import URIRef,Literal
from rdflib.namespace import RDF,SKOS,OWL,DCTERMS
from .profile import GOV,ORG,DomainError
from .records import ORGANIZATION_TYPES,read_existence,read_relations
from .references import country_detail,organization_field_problems
from .commands import _names
from .import_plan import AmbiguousCode,start_plan,minted,resolve_code,merged_fields,scalar,patch,patch_period,report,finalize


def _owned(graph,node):
    nodes={node,*graph.subjects(GOV.entity,node),*graph.subjects(GOV.subject,node)}
    return {t for n in nodes for t in graph.triples((n,None,None))}


def plan_entities(ctx,batch):
    plan=start_plan(ctx,batch);g=plan.candidate;country=batch['mode']=='countries'
    types={GOV.Country} if country else ORGANIZATION_TYPES
    code_pred=GOV.countryCode if country else ORG.identifier
    counts={}
    for intent in batch['intents']:counts[intent['code']]=counts.get(intent['code'],0)+1
    for intent in batch['intents']:
        try:
            code=intent['code']
            if counts[code]!=1:raise ValueError('The source contains duplicate identifier codes.')
            node=resolve_code(ctx.graph,code,code_pred,types);new=node is None
            if new:node=minted(ctx,plan,'entity:'+code)
            elif country_detail(ctx.graph,node)['unsupported'] if country else organization_field_problems(ctx.graph,node):
                raise ValueError('The existing item has unsupported fields or history.')
            before=_owned(g,node)
            fields=merged_fields(batch,intent,new)
            if new:g.add((node,RDF.type,GOV.Country if country else ORG[scalar(fields,'orgKind','Organization')]));g.add((node,RDF.type,OWL.NamedIndividual));g.add((node,code_pred,Literal(code)))
            if not country and 'orgKind' in fields:
                kind=scalar(fields,'orgKind')
                if kind not in ('Organization','FormalOrganization','OrganizationalUnit'):raise ValueError('Choose a supported ORG type.')
                for typ in ORGANIZATION_TYPES:g.remove((node,RDF.type,typ))
                g.add((node,RDF.type,ORG[kind]))
            for field,predicate,kind in [('names',SKOS.prefLabel,'names'),('aliases',SKOS.altLabel,'aliases'),('description',DCTERMS.description,'scalar')]:
                if field in fields:patch(g,node,predicate,fields[field],kind)
            names=[{'value':str(v),'language':v.language} for v in g.objects(node,SKOS.prefLabel) if isinstance(v,Literal)]
            _names(names)
            if country:
                if 'sources' in fields:patch(g,node,DCTERMS.source,fields['sources'],'sources')
            else:
                ref=getattr(ctx,'country_reference',None)
                if ref is None:raise ValueError('Connect a country master before importing organizations.')
                life=[r for r in read_existence(ctx.graph) if r.entity==str(node)]
                affiliation=[r for r in read_relations(ctx.graph) if r.subject==str(node) and r.predicate==str(GOV.inCountry)]
                country_code=scalar(fields,'countryCode')
                target=resolve_code(ref.graph,country_code,GOV.countryCode,{GOV.Country}) if country_code else None
                if country_code and target is None:raise ValueError('The country code is not in the connected country master.')
                if new and target is None:raise ValueError('New organizations need a country code.')
                if not new and country_code and (len(affiliation)!=1 or affiliation[0].object!=str(target)):raise ValueError('Change country affiliation using the relationship table.')
                choices=[]
                for prefix,records,record_type,property_iri in [('existence',life,GOV.ExistenceRecord,'existenceRecordIri'),('affiliation',affiliation,GOV.RelationRecord,'affiliationRecordIri')]:
                    dated=any(prefix+s in fields for s in ('Start','End'))
                    if not new and dated and not records:raise ValueError('No existing period record can be corrected. Create the missing record explicitly first.')
                    if not new and dated and (len(records)!=1 or intent.get(property_iri)!=records[0].iri):
                        choices.extend(r.iri for r in records);continue
                    if not new and not dated and 'sources' not in fields:continue
                    if not new and len(records)!=1:raise ValueError('Select a single supported initial record.')
                    record=URIRef(records[0].iri) if records else minted(ctx,plan,prefix+':'+code)
                    if new:
                        g.add((record,RDF.type,record_type))
                        if prefix=='existence':g.add((record,GOV.entity,node))
                        else:
                            for triple in [(record,GOV.subject,node),(record,GOV.predicate,GOV.inCountry),(record,GOV.object,target)]:g.add(triple)
                    if new or dated:patch_period(g,record,fields,prefix,records[0].period if records else None)
                    if 'sources' in fields:patch(g,record,DCTERMS.source,fields['sources'],'sources')
                    if not list(g.objects(record,DCTERMS.source)):raise ValueError('Dated records need a source.')
                if choices:
                    report(plan,intent,'needs-review',node,'Confirm the existing period record before correcting it.',choices);continue
            report(plan,intent,'created' if new else 'updated' if before!=_owned(g,node) else 'unchanged',node)
        except (ValueError,DomainError) as exc:
            report(plan,intent,'needs-review' if isinstance(exc,AmbiguousCode) else 'error',reason=str(exc))
    return finalize(plan)
