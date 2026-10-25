"""
================================================================================
FILE: backend/tests/test_reasoning_explanation_messages.py
SUMMARY
    One-step explanations and definition premises capture source display facts.
BASIC IDEA
    Build a minimal RDF witness for each candidate branch. The public Why
    boundary must return metadata for both its conclusion and every premise,
    while the internal traversal keeps its legacy strings and allocations.
INPUTS / INPUT SOURCES
    Synthetic RDF chains, equivalent terms, property characteristics and rules.
EXPECTED OUTPUT
    Whole explanation descriptors, flat source noun parts and unchanged RDF.
================================================================================
"""
import json
import pytest
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.collection import Collection
from rdflib.namespace import OWL, RDF, RDFS
from app import reasoning as r
from app.messages import make_message

EX = 'https://example.test/'
S, O, M, X, Y, P, Q, K = (URIRef(EX + key) for key in ('s','o','m','x','y','p','q','k'))
def names(term):
    if isinstance(term, BNode): return 'something'
    if isinstance(term, Literal): return str(term)
    return '名前 <b>{' + str(term).rsplit('/', 1)[-1] + '}'
def parts(term): return [{'text': names(term)}]

def intersection(owner, members):
    graph = Graph(); head = BNode(); definition = BNode()
    Collection(graph, head, members)
    return definition, [*graph, (owner, OWL.equivalentClass, definition), (definition, OWL.intersectionOf, head)]

def cases():
    def case(code, target, stated, **args): return code, target, stated, args
    out = [
        case('same_kind', (S,RDFS.subClassOf,O), [(S,OWL.equivalentClass,O)], s=S,o=O),
        case('kind_chain', (S,RDFS.subClassOf,O), [(S,RDFS.subClassOf,M),(M,RDFS.subClassOf,O)], s=S,m=M,o=O),
        case('kind_equivalent', (S,RDFS.subClassOf,O), [(S,RDFS.subClassOf,M),(M,OWL.equivalentClass,O)], s=S,m=M,o=O),
        case('mutual_kind', (S,OWL.equivalentClass,O), [(S,RDFS.subClassOf,O),(O,RDFS.subClassOf,S)], s=S,o=O),
        case('equivalent_chain', (S,OWL.equivalentClass,O), [(S,OWL.equivalentClass,M),(M,OWL.equivalentClass,O)], s=S,m=M,o=O),
        case('member_kind', (S,RDF.type,O), [(S,RDF.type,K),(K,RDFS.subClassOf,O)], s=S,k=K,o=O),
        case('member_equivalent', (S,RDF.type,O), [(S,RDF.type,K),(K,OWL.equivalentClass,O)], s=S,k=K,o=O),
        case('domain', (S,RDF.type,O), [(S,P,Y),(P,RDFS.domain,O)], s=S,p=P,y=Y,o=O),
        case('range', (S,RDF.type,O), [(Y,P,S),(P,RDFS.range,O)], s=S,p=P,y=Y,o=O),
        case('same_member', (S,RDF.type,O), [(S,OWL.sameAs,M),(M,RDF.type,O)], s=S,m=M,o=O),
        case('functional', (S,OWL.sameAs,O), [(X,P,S),(X,P,O),(P,RDF.type,OWL.FunctionalProperty)], x=X,p=P,s=S,o=O),
        case('inverse_functional', (S,OWL.sameAs,O), [(S,P,Y),(O,P,Y),(P,RDF.type,OWL.InverseFunctionalProperty)], s=S,o=O,p=P,y=Y),
        case('same_chain', (S,OWL.sameAs,O), [(S,OWL.sameAs,M),(M,OWL.sameAs,O)], s=S,m=M,o=O),
        case('inverse_link', (S,P,O), [(O,Q,S),(P,OWL.inverseOf,Q)], s=S,p=P,o=O,q=Q),
        case('symmetric_link', (S,P,O), [(O,P,S),(P,RDF.type,OWL.SymmetricProperty)], s=S,p=P,o=O),
        case('transitive_link', (S,P,O), [(S,P,M),(M,P,O),(P,RDF.type,OWL.TransitiveProperty)], s=S,p=P,m=M,o=O),
        case('subproperty_link', (S,P,O), [(S,Q,O),(Q,RDFS.subPropertyOf,P)], s=S,p=P,q=Q,o=O),
        case('equivalent_property_link', (S,P,O), [(S,Q,O),(Q,OWL.equivalentProperty,P)], s=S,p=P,q=Q,o=O),
        case('same_subject_link', (S,P,O), [(S,OWL.sameAs,M),(M,P,O)], s=S,m=M,p=P,o=O),
        case('same_object_link', (S,P,O), [(O,OWL.sameAs,M),(S,P,M)], s=S,o=O,m=M,p=P),
    ]
    definition, triples = intersection(S, [O,K])
    out.append(case('definition_kind',(S,RDFS.subClassOf,O),triples,s=S,o=O))
    definition = BNode()
    out.append(case('definition_member',(S,RDF.type,O),[(O,OWL.equivalentClass,definition),
        (definition,OWL.onProperty,P),(definition,OWL.hasValue,Y),(S,P,Y)],s=S,o=O))
    for owner in (True,False):
        rule = BNode(); triples=[(rule,OWL.onProperty,P),(rule,OWL.allValuesFrom,O),(X,P,S),(X,RDF.type,rule)]
        if owner: triples += [(X,RDF.type,K),(K,RDFS.subClassOf,rule)]
        out.append(case('only_owned' if owner else 'only', (S,RDF.type,O),triples,x=X,p=P,s=S,o=O,**({'k':K} if owner else {})))
    for kind in (OWL.maxCardinality,OWL.maxQualifiedCardinality):
        rule=BNode()
        out.append(case('maximum_one',(S,OWL.sameAs,O),[(rule,kind,Literal(1)),(rule,OWL.onProperty,P),
            (X,RDF.type,rule),(X,P,S),(X,P,O)],x=X,p=P,s=S,o=O))
    rule=BNode()
    out.append(case('has_value',(S,P,O),[(S,RDF.type,K),(K,RDFS.subClassOf,rule),
        (rule,OWL.onProperty,P),(rule,OWL.hasValue,O)],s=S,k=K,p=P,o=O))
    return out

@pytest.mark.parametrize('code,target,stated,args',cases(),ids=[row[0] for row in cases()])
def test_every_candidate_keeps_legacy_reason_and_exposes_its_source_facts(code,target,stated,args):
    stated_index=r.Index(stated); closure=r.Index([*stated,target]); before=set(closure.all)
    core=r.Explainer(stated_index,closure,names).explain(target)
    assert core['family'] is not None, 'The fixture must exercise a real explanation branch'
    outcome=r.Outcome('done',r.Key(1,0,False,False),stated=stated_index,closure=closure,names=names)
    answer=outcome.why(*(str(term) for term in target))
    assert answer.get('uiMessage') is not None, answer
    expected='reasoning.fact.equivalent' if code=='same_kind' else 'reasoning.reason.'+code
    assert answer['uiMessage']['code']==expected
    for key,value in args.items(): assert answer['uiMessage']['args'][key]==parts(value)
    assert make_message(expected,**answer['uiMessage']['args'])==answer['uiMessage']
    assert answer['sentence']==core['sentence'] and answer['family']==core['family']
    assert len(answer['premises'])==len(core['premises'])
    for legacy,described in zip(core['premises'],answer['premises']):
        assert described.get('uiMessage') is not None, described
        assert {k:v for k,v in described.items() if k!='uiMessage'}==legacy
        assert make_message(described['uiMessage']['code'],**described['uiMessage']['args'])==described['uiMessage']
    assert closure.all==before and stated_index.all==set(stated)

@pytest.mark.parametrize('stated', [True,False])
def test_stated_and_unexplained_reasons_use_facts_instead_of_captured_english(stated):
    triple=(S,P,Literal('something <img>{value}',lang='ja'))
    index=r.Index([triple] if stated else [])
    result=r.Outcome('done',r.Key(1,0,False,False),stated=index,closure=r.Index([triple]),names=names)
    answer=result.why(str(S),str(P),triple[2].n3())
    assert answer.get('uiMessage') is not None
    assert answer['uiMessage']==make_message('reasoning.reason.stated',s=parts(S),p=parts(P),o=parts(triple[2])) if stated else answer['uiMessage']==make_message('reasoning.reason.unsupported')
    assert answer['premises']==[] and answer['sentence']

@pytest.mark.parametrize('restriction', ['value','some','anything','unknown','no_property'])
def test_definition_expression_parts_are_flat_and_source_typed(restriction):
    definition=BNode(); triples=[]
    if restriction!='no_property': triples.append((definition,OWL.onProperty,P))
    if restriction=='value': triples.append((definition,OWL.hasValue,Literal('something <b>{value}',lang='ja')))
    if restriction in ('some','anything'): triples.append((definition,OWL.someValuesFrom,O if restriction=='some' else OWL.Thing))
    index=r.Index(triples); explainer=r.Explainer(index,index,names)
    text=explainer._defines(K,definition,ui_metadata=True)
    wire=getattr(text,'ui_message',None)
    assert wire is not None and wire['code']=='reasoning.definition'
    assert wire['args']['name']==parts(K)
    expression=wire['args']['expression']; assert expression
    for part in expression:
        assert set(part)=={'text'} or set(part)=={'code','args'}
        if 'code' in part: assert part['code'].startswith('words.') and part['args']=={}
    assert make_message(wire['code'],**wire['args'])==wire
    assert str(text)==explainer._defines(K,definition)
    if restriction=='value': assert {'text':'something <b>{value}'} in expression
    assert json.loads(json.dumps(wire,ensure_ascii=False))==wire
