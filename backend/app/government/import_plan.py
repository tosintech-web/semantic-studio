"""
================================================================================
FILE: backend/app/government/import_plan.py
SUMMARY
    Shared master-batch planning, field merging and review facts.
BASIC IDEA
    Resolve identities against accepted S0; construct a detached candidate only.
INPUTS / INPUT SOURCES
    Validated batch intents, project metadata and country reference snapshots.
EXPECTED OUTPUT
    A deterministic preview with exact RDF changes; no accepted mutation.
================================================================================
"""
import hashlib
import json
import uuid
from dataclasses import dataclass, field
from rdflib import Graph, Literal, URIRef
from rdflib.compare import to_isomorphic
from rdflib.namespace import RDF, SKOS, DCTERMS, XSD
from .profile import GOV, ORG, DomainError, parse_profile
from .commands import _names, _sources, _text
from .records import parse_period, period_json, period_statements, PERIOD_PREDICATES
from .import_models import issue


class AmbiguousCode(ValueError):
    pass


def canonical(value):
    return json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':'),allow_nan=False)


def graph_basis(ctx,batch):
    ref=getattr(ctx,'country_reference',None)
    return hashlib.sha256(canonical([str(to_isomorphic(ctx.graph).graph_digest()),ctx.manifest,getattr(ctx,'import_revision',0),ref.basis if ref else None,batch]).encode()).hexdigest()


@dataclass
class MasterImportPlan:
    original: Graph
    candidate: Graph
    basis: str
    rows: list = field(default_factory=list)
    warnings: list = field(default_factory=list)

    @property
    def added(self):return set(self.candidate)-set(self.original)
    @property
    def removed(self):return set(self.original)-set(self.candidate)
    @property
    def ready(self):return not any(r['status'] in ('error','needs-review') for r in self.rows)
    @property
    def noop(self):return self.ready and not self.added and not self.removed

    def result(self,offset=0,limit=50):
        summary={k:sum(r['status']==v for r in self.rows) for k,v in [('created','created'),('updated','updated'),('unchanged','unchanged'),('errors','error'),('needsReview','needs-review')]}
        summary.update(selected=len(self.rows),excluded=getattr(self,'excluded',0))
        return {'basis':self.basis,'ready':self.ready,'noop':self.noop,'summary':summary,'rows':self.rows[offset:offset+limit],'totalRows':len(self.rows),'offset':offset,'limit':limit,'warnings':self.warnings}


def start_plan(ctx,batch):
    profile=parse_profile(ctx.manifest.get('domainProfile'))
    expected='countries-v1' if batch.get('mode')=='countries' else 'government-organizations-v1'
    if ctx.doc!='model' or profile is None or profile.id!=expected:raise DomainError('Choose the matching master profile.',code='government.invalid_profile')
    candidate=Graph()
    for prefix,ns in ctx.graph.namespaces():candidate.bind(prefix,ns)
    candidate+=ctx.graph
    return MasterImportPlan(ctx.graph,candidate,graph_basis(ctx,batch))


def minted(ctx,plan,tag):
    node=URIRef(ctx.base+str(uuid.uuid5(uuid.NAMESPACE_URL,ctx.manifest.get('id','')+plan.basis+tag)))
    if (node,None,None) in ctx.graph:raise ValueError('The candidate identity already exists.')
    return node


def resolve_code(graph,code,predicate,types):
    if not isinstance(code,str) or not code or len(code)>4096:raise ValueError('An identifier code is required.')
    found=set()
    for typ in types:
        for node in graph.subjects(RDF.type,typ):
            values=list(graph.objects(node,predicate))
            matches=[v for v in values if str(v).strip()==code]
            if not matches:continue
            if not isinstance(node,URIRef) or len(values)!=1 or not isinstance(values[0],Literal) or values[0].language or values[0].datatype not in (None,XSD.string):raise AmbiguousCode('The code has unsupported or multiple values.')
            found.add(node)
    if len(found)>1:raise AmbiguousCode('The code matches multiple existing items.')
    return next(iter(found),None)


def merged_fields(batch,intent,new):
    fields={k:list(v) for k,v in intent['fields'].items()}
    if new:
        for name,value in batch.get('mapping',{}).get('defaults',{}).items():
            values=value if isinstance(value,list) else [value]
            if name in ('names','aliases'):
                # Each language is a separate field. An explicit source edit,
                # including clear, owns that language even when it has no value.
                defaults=_names(values,required=False,unique=name=='names')
                present={edit.get('language','').casefold() for edit in fields.get(name,[])}
                missing={}
                for term in defaults:
                    language=term.language.casefold()
                    if language not in present:
                        missing.setdefault(language,[]).append({'value':str(term),'language':language})
                if missing:
                    fields.setdefault(name,[]).extend({'op':'append' if name=='aliases' else 'set','language':language,'values':terms} for language,terms in missing.items())
            elif name not in fields:
                fields[name]=[{'op':'append' if name=='sources' else 'set','values':values}]
    return fields


def scalar(fields,name,default=None):
    edits=fields.get(name)
    if not edits:return default
    if len(edits)!=1 or edits[0]['op'] not in ('set','clear'):raise ValueError('A scalar needs one value or explicit clear.')
    values=edits[0]['values']
    if edits[0]['op']=='clear':return ''
    if len(values)!=1:raise ValueError('A scalar needs exactly one value.')
    return _text(values[0])


def patch(graph,node,predicate,edits,kind):
    for edit in edits:
        op=edit['op'];lang=edit.get('language')
        if kind in ('names','aliases'):
            values=_names(edit['values'],required=False,unique=kind=='names')
            if not lang and values:lang=values[0].language
            if not lang:raise ValueError('Choose a name language.')
            if any(v.language.casefold()!=lang.casefold() for v in values):raise ValueError('One edit owns one language.')
            old={v for v in graph.objects(node,predicate) if isinstance(v,Literal) and v.language and v.language.casefold()==lang.casefold()}
            allowed=('set','clear') if kind=='names' else ('append','replace','clear')
        elif kind=='sources':
            values=_sources(edit['values'],required=False);old=set(graph.objects(node,predicate));allowed=('append','replace','clear')
        else:
            values=[Literal(_text(v)) for v in edit['values']];old=set(graph.objects(node,predicate));allowed=('set','clear')
            if op=='set' and len(values)!=1:raise ValueError('A scalar needs one value.')
        if op not in allowed or (op=='clear' and edit['values']):raise ValueError('The field operation is invalid.')
        if op!='append':
            for value in old:graph.remove((node,predicate,value))
        if op!='clear':
            for value in values:graph.add((node,predicate,value))


def bound(value):
    if isinstance(value,dict):return value
    if value=='open':return {'date':None,'open':True}
    if value=='unknown':return {'date':None,'open':False}
    return {'date':value,'open':False}


def patch_period(graph,node,fields,prefix,old=None):
    raw=period_json(old) if old is not None else {}
    for side in ('Start','End'):
        key=prefix+side
        if key in fields:
            edits=fields[key]
            if len(edits)!=1 or edits[0]['op']!='set' or len(edits[0]['values'])!=1:raise ValueError('A period boundary needs one explicit value.')
            raw[side.lower()]=bound(edits[0]['values'][0])
    period=parse_period(raw)
    for predicate in PERIOD_PREDICATES:graph.remove((node,predicate,None))
    for triple in period_statements(node,period):graph.add(triple)
    return period


def report(plan,intent,status,iri=None,reason=None,choices=None):
    row={'row':intent['row'],'status':status,'issues':[issue(intent['row'],reason)] if reason else [],'fields':[],'recordChoices':choices or [],'normalizations':intent.get('normalizations',[])}
    if iri is not None:row['entityIri']=str(iri)
    plan.rows.append(row)
    return row


def term_json(value):
    from rdflib import BNode
    if isinstance(value,Literal):
        return {'kind':'literal','value':str(value),**({'language':value.language} if value.language else {}),**({'datatype':str(value.datatype)} if value.datatype else {})}
    return {'kind':'bnode' if isinstance(value,BNode) else 'iri','value':str(value)}


def finalize(plan):
    from .validation import validate_history
    if len(plan.candidate)>100000:
        for row in plan.rows:row['status']='error';row['issues'].append(issue(row['row'],'The candidate exceeds 100000 statements.'))
    else:
        problems=validate_history(plan.candidate)
        for problem in problems:
            item={'code':problem.code,'severity':problem.severity,'iri':problem.iri,'args':problem.args}
            if problem.severity=='error':
                for row in plan.rows:row['status']='error';row['issues'].append(issue(row['row'],'The complete proposed history has conflicting records.'))
            else:plan.warnings.append(item)
    for row in plan.rows:
        if row['status'] in ('error','needs-review'):continue
        raw=row.get('recordIri') or row.get('entityIri')
        if raw is None:continue
        entity=URIRef(raw)
        nodes={entity}
        if not row.get('recordIri'):
            for graph in (plan.original,plan.candidate):nodes.update(graph.subjects(GOV.entity,entity));nodes.update(graph.subjects(GOV.subject,entity))
        for node in sorted(nodes,key=str):
            predicates=set(plan.original.predicates(node))|set(plan.candidate.predicates(node))
            for pred in sorted(predicates,key=str):
                before=set(plan.original.objects(node,pred));after=set(plan.candidate.objects(node,pred))
                if before!=after:row['fields'].append({'field':str(pred),'recordIri':str(node),'before':[term_json(v) for v in sorted(before,key=lambda v:v.n3())],'after':[term_json(v) for v in sorted(after,key=lambda v:v.n3())]})
    return plan


def plan_master_import(ctx,batch):
    if batch.get('mode')=='relations':
        from .import_relations import plan_relations
        return plan_relations(ctx,batch)
    from .import_entities import plan_entities
    return plan_entities(ctx,batch)
