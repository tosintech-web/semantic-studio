"""
================================================================================
FILE: backend/app/government/commands.py
SUMMARY
    Builds validated editing Changes for country, organization and history entry.
BASIC IDEA
    Validate the full payload and reference basis before returning any mutation.
    Each logical entry owns a UUID identity and all of its dependent records;
    standard editing history supplies the one-step inverse.
INPUTS / INPUT SOURCES
    Editing Context, exact profile metadata and a detached country snapshot.
EXPECTED OUTPUT
    A validated Change, or a structured refusal with no applied statements.
================================================================================
"""
import re

from rdflib import Literal, URIRef
from rdflib.namespace import DCTERMS, OWL, RDF, SKOS, XSD

from .profile import GOV, ORG, DomainError, new_entity_iri, parse_profile
from .records import ORGANIZATION_TYPES, parse_period, period_statements, read_existence, read_relations


def _profile(ctx, expected):
    profile = parse_profile(ctx.manifest.get("domainProfile"))
    if ctx.doc != "model" or profile is None or profile.id != expected:
        raise DomainError("Choose the correct domain group.", code="government.invalid_profile")
    return profile


def _names(raw, *, required=True, unique=True):
    from ..projects import valid_lang
    if not isinstance(raw, list) or (required and not raw) or len(raw) > 100:
        raise DomainError("Give at least one name.", code="government.name_required")
    result, languages = [], set()
    for item in raw:
        if not isinstance(item, dict) or set(item) != {"value", "language"}:
            raise DomainError("Each name needs its value and language.", code="government.name_required")
        value, language = item["value"], item["language"]
        if not isinstance(value, str) or not value.strip() or len(value) > 4096 or not isinstance(language, str) or not valid_lang(language) or (unique and language.casefold() in languages):
            raise DomainError("Give one preferred name per language.", code="government.name_required")
        result.append(Literal(value.strip(), lang=language))
        languages.add(language.casefold())
    return result


def _text(raw, *, maximum=4096):
    if not isinstance(raw, str) or len(raw) > maximum:
        raise DomainError("The input text is missing or too long.")
    return raw.strip()


def _sources(raw, *, required=True):
    if not isinstance(raw, list) or len(raw) > 100 or (required and not raw):
        raise DomainError("Give a source for this record.", code="government.source_required")
    result = []
    for item in raw:
        if not isinstance(item, dict) or set(item) != {"kind", "value"} or item["kind"] not in ("iri", "text"):
            raise DomainError("Choose a source link or bibliographic text.", code="government.source_required")
        value = _text(item["value"])
        if not value:
            raise DomainError("Give a source for this record.", code="government.source_required")
        if item["kind"] == "iri":
            if not re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", value) or re.search(r'[<>"{}|^`\\\x00-\x20]', value):
                raise DomainError("Use an absolute source IRI.", code="government.source_required")
            result.append(URIRef(value))
        else:
            result.append(Literal(value))
    return result


def _period(raw):
    try:
        return parse_period(raw)
    except ValueError as exc:
        raise DomainError("Choose valid dates or explicitly unknown/open bounds.", code="government.period_invalid") from exc


def _target(ctx, raw, types):
    if raw is None:
        return new_entity_iri(ctx.base), True
    if not isinstance(raw, str) or not set(ctx.graph.objects(URIRef(raw), RDF.type)) & set(types):
        raise DomainError("The selected entity is not in this group.", code="government.target_missing", status=404)
    return URIRef(raw), False


def _replace(graph, node, predicates):
    return {statement for p in predicates for statement in graph.triples((node, p, None))}


def cmd_create_country(ctx, args):
    from ..editing import _change, _created
    _profile(ctx, "countries-v1")
    node, created = _target(ctx, args.get("iri"), {GOV.Country})
    if not created and "referenceBasis" in args:
        reference = getattr(ctx, "country_reference", None)
        if reference is None or args["referenceBasis"] != reference.basis:
            raise DomainError("The country group changed after this entry was opened.", code="government.entry_stale", status=409)
    if not created:
        from .references import country_detail
        if country_detail(ctx.graph, node)["unsupported"]:
            raise DomainError("This country has unsupported values and remains read-only.")
    names = _names(args.get("names"))
    sources = _sources(args.get("sources", []), required=False)
    code, description = _text(args.get("code", "")), _text(args.get("description", ""))
    adds = {(node, RDF.type, GOV.Country), (node, RDF.type, OWL.NamedIndividual)}
    adds.update((node, SKOS.prefLabel, name) for name in names)
    adds.update((node, DCTERMS.source, source) for source in sources)
    if code:
        adds.add((node, GOV.countryCode, Literal(code)))
    if description:
        adds.add((node, DCTERMS.description, Literal(description)))
    removes = _replace(ctx.graph, node, {SKOS.prefLabel, GOV.countryCode, DCTERMS.source, DCTERMS.description})
    if "aliases" in args:
        adds.update((node, SKOS.altLabel, alias) for alias in _names(args["aliases"], required=False, unique=False))
        removes.update(_replace(ctx.graph, node, {SKOS.altLabel}))
    change = _change(ctx.graph, "Register country", adds, removes, ui_message=_command_message("government.country_saved"))
    return _created(change, node) if created else change


def _command_message(code):
    from ..messages import make_message
    return make_message(code)


def cmd_create_government_organization(ctx, args):
    from ..editing import _change, _created
    _profile(ctx, "government-organizations-v1")
    reference = getattr(ctx, "country_reference", None)
    if reference is None or args.get("referenceBasis") != reference.basis:
        raise DomainError("The selected country authority changed; select again.", code="government.reference_stale", status=409)
    country = args.get("countryIri")
    if not isinstance(country, str) or (URIRef(country), RDF.type, GOV.Country) not in reference.graph:
        raise DomainError("Choose a country defined by the connected country group.", code="government.country_missing")
    kind = args.get("kind")
    if kind not in ("Organization", "FormalOrganization", "OrganizationalUnit"):
        raise DomainError("Choose an organization type.")
    node, created = _target(ctx, args.get("iri"), ORGANIZATION_TYPES)
    if not created:
        from .references import organization_field_problems
        if organization_field_problems(ctx.graph, node):
            raise DomainError('This organization contains managed RDF that the single-entry form cannot represent.')
    names, sources = _names(args.get("names")), _sources(args.get("sources"))
    existence, affiliation = _period(args.get("existencePeriod")), _period(args.get("countryPeriod"))
    identifier = _text(args.get("identifier", ""))
    adds = {(node, RDF.type, ORG[kind]), (node, RDF.type, OWL.NamedIndividual)}
    adds.update((node, SKOS.prefLabel, name) for name in names)
    if identifier:
        adds.add((node, ORG.identifier, Literal(identifier)))
    removes = _replace(ctx.graph, node, {SKOS.prefLabel, ORG.identifier})
    removes.update((node, RDF.type, t) for t in ctx.graph.objects(node, RDF.type) if t in ORGANIZATION_TYPES)
    # Registration edits the single initial affiliation only. Once history
    # branches, the dated relationship editor must choose the record explicitly.
    life_records = list(ctx.graph.subjects(GOV.entity, node))
    life_records = [r for r in life_records if (r, RDF.type, GOV.ExistenceRecord) in ctx.graph]
    country_records = [r for r in ctx.graph.subjects(GOV.subject, node) if (r, GOV.predicate, GOV.inCountry) in ctx.graph]
    if len(life_records) > 1 or len(country_records) > 1:
        raise DomainError("Edit the organization's dated records separately.")
    existing_nodes = {str(r) for r in [*life_records, *country_records]}
    if any(record.unsupported for record in [*read_existence(ctx.graph), *read_relations(ctx.graph)] if record.iri in existing_nodes):
        raise DomainError("This record contains unsupported RDF and remains read-only.")
    for record_type, existing, period in ((GOV.ExistenceRecord, life_records, existence), (GOV.RelationRecord, country_records, affiliation)):
        record = existing[0] if existing else new_entity_iri(ctx.base)
        if existing:
            removes.update(ctx.graph.triples((record, None, None)))
        adds.add((record, RDF.type, record_type))
        if record_type == GOV.ExistenceRecord:
            adds.add((record, GOV.entity, node))
        else:
            adds.update(((record, GOV.subject, node), (record, GOV.predicate, GOV.inCountry), (record, GOV.object, URIRef(country))))
        adds.update(period_statements(record, period))
        adds.update((record, DCTERMS.source, source) for source in sources)
    _validate_history_delta(ctx, adds, removes)
    change = _change(ctx.graph, "Register government organization", adds, removes, ui_message=_command_message("government.organization_saved"))
    return _created(change, node) if created else change


HISTORY_COMMANDS = frozenset({'PutGovernmentRelation', 'PutGovernmentName', 'ApplyGovernmentChange'})


def history_basis(ctx, name, args):
    """Bind the complete proposal, target graph/settings and read-only authority."""
    import hashlib
    import json
    from rdflib.compare import to_isomorphic
    if len(ctx.graph) > 100_000:
        raise DomainError('The history editor supports at most 100000 statements.', code='government.projection_limit', status=413)
    payload = {key: value for key, value in args.items() if key != 'previewBasis'}
    material = [name, str(to_isomorphic(ctx.graph).graph_digest()), ctx.manifest, payload]
    return hashlib.sha256(json.dumps(material, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def _history_start(ctx, args):
    _profile(ctx, 'government-organizations-v1')
    reference = getattr(ctx, 'country_reference', None)
    if reference is None or args.get('referenceBasis') != reference.basis:
        raise DomainError('The country authority changed; select it again.', code='government.reference_stale', status=409)


def _record_node(ctx, raw, record_type, records, tag):
    import uuid
    if raw is None:
        # The accepted preview and commit mint the same UUID, so the reviewed
        # RDF delta is exact even when the command contains several new records.
        return URIRef(ctx.base + str(uuid.uuid5(uuid.NAMESPACE_URL, ctx.history_basis + tag)))
    match = next((record for record in records if record.iri == raw), None)
    if match is None or match.unsupported:
        raise DomainError('Choose a supported record from this group.')
    return URIRef(raw)


def _organization(ctx, raw):
    if not isinstance(raw, str) or not any((URIRef(raw), RDF.type, kind) in ctx.graph for kind in ORGANIZATION_TYPES):
        raise DomainError('Choose an organization in this group.')
    return URIRef(raw)


def _relation_delta(ctx, args, tag):
    from .records import RELATION_PREDICATES
    subject = _organization(ctx, args.get('subject'))
    predicate = args.get('predicate')
    if not isinstance(predicate, str) or URIRef(predicate) not in RELATION_PREDICATES:
        raise DomainError('Choose a supported relationship.')
    if predicate == str(GOV.inCountry):
        raw = args.get('object')
        if not isinstance(raw, str) or (URIRef(raw), RDF.type, GOV.Country) not in ctx.country_reference.graph:
            raise DomainError('Choose a country in the connected country group.', code='government.country_missing')
        obj = URIRef(raw)
    else:
        obj = _organization(ctx, args.get('object'))
    node = _record_node(ctx, args.get('iri'), GOV.RelationRecord, read_relations(ctx.graph), tag)
    adds = {(node, RDF.type, GOV.RelationRecord), (node, GOV.subject, subject), (node, GOV.predicate, URIRef(predicate)), (node, GOV.object, obj)}
    adds.update(period_statements(node, _period(args.get('period'))))
    adds.update((node, DCTERMS.source, value) for value in _sources(args.get('sources')))
    description = _text(args.get('description', ''))
    if description:
        adds.add((node, DCTERMS.description, Literal(description)))
    return node, adds, set(ctx.graph.triples((node, None, None)))


def _name_delta(ctx, args, tag):
    from .records import read_names
    entity = _organization(ctx, args.get('entity'))
    value = _names([{'value': args.get('value'), 'language': args.get('language')}])[0]
    node = _record_node(ctx, args.get('iri'), GOV.NameRecord, read_names(ctx.graph), tag)
    adds = {(node, RDF.type, GOV.NameRecord), (node, GOV.entity, entity), (node, GOV.nameValue, value)}
    adds.update(period_statements(node, _period(args.get('period'))))
    adds.update((node, DCTERMS.source, value) for value in _sources(args.get('sources')))
    return node, adds, set(ctx.graph.triples((node, None, None)))


def _existence_delta(ctx, args, tag):
    entity = _organization(ctx, args.get('entity'))
    records = [r for r in read_existence(ctx.graph) if r.entity == str(entity)]
    if len(records) > 1 or any(r.unsupported for r in records):
        raise DomainError('Choose a supported existence record.')
    node = URIRef(records[0].iri) if records else _record_node(ctx, None, GOV.ExistenceRecord, [], tag)
    adds = {(node, RDF.type, GOV.ExistenceRecord), (node, GOV.entity, entity)}
    adds.update(period_statements(node, _period(args.get('period'))))
    adds.update((node, DCTERMS.source, value) for value in _sources(args.get('sources')))
    return node, adds, set(ctx.graph.triples((node, None, None)))


def _validate_history_delta(ctx, adds, removes):
    from rdflib import Graph
    from .validation import validate_history
    proposed = Graph()
    for statement in set(ctx.graph) - removes | adds:
        proposed.add(statement)
    if len(proposed) > 100_000:
        raise DomainError('The history editor supports at most 100000 statements.', code='government.projection_limit', status=413)
    problems = validate_history(proposed)
    errors = [problem for problem in problems if problem.severity == 'error']
    if errors:
        raise DomainError('The proposed history has conflicting records.', code='government.history_conflict')
    ctx.history_warnings = [{'code': p.code, 'severity': p.severity, 'iri': p.iri, 'args': p.args} for p in problems]


def _history_change(ctx, label, adds, removes, node):
    from ..editing import _change, _created
    _validate_history_delta(ctx, adds, removes)
    change = _change(ctx.graph, label, sorted(adds, key=lambda t: tuple(v.n3() for v in t)),
                     sorted(removes, key=lambda t: tuple(v.n3() for v in t)), ui_message=_command_message('government.history_saved'))
    return _created(change, node)


def cmd_put_government_relation(ctx, args):
    _history_start(ctx, args)
    node, adds, removes = _relation_delta(ctx, args, 'relation')
    return _history_change(ctx, 'Record government relationship', adds, removes, node)


def cmd_put_government_name(ctx, args):
    _history_start(ctx, args)
    node, adds, removes = _name_delta(ctx, args, 'name')
    return _history_change(ctx, 'Record government name history', adds, removes, node)


def cmd_apply_government_change(ctx, args):
    from .records import parse_date
    _history_start(ctx, args)
    kind = args.get('kind')
    if kind not in {'merge', 'split', 'transfer', 'rename', 'other'}:
        raise DomainError('Choose a change type.')
    try:
        when = parse_date(args.get('effectiveDate'))
    except ValueError as exc:
        raise DomainError('Choose an exact effective date.', code='government.period_invalid') from exc
    ends = []
    for key in ('originalIris', 'resultingIris'):
        raw = args.get(key)
        if not isinstance(raw, list) or not raw or len(raw) > 100 or len(set(v for v in raw if isinstance(v, str))) != len(raw):
            raise DomainError('Choose one to 100 distinct organizations on each side.')
        ends.append([_organization(ctx, value) for value in raw])
    # Identity is a deliberate input. Absorption may retain an original IRI;
    # neither an event kind nor its date implies an organization's closure.
    if kind in {'transfer', 'rename'} and (len(ends[0]) != 1 or ends[0] != ends[1]):
        raise DomainError('A rename or transfer retains the selected organization identity.')
    if kind == 'merge' and len(ends[0]) < 2:
        raise DomainError('A merger requires at least two original organizations.')
    if kind == 'split' and len(ends[1]) < 2:
        raise DomainError('A split requires at least two resulting organizations.')
    if kind in {'merge', 'split'} and set(ends[0]) == set(ends[1]):
        raise DomainError('A merger or split must change the set of organizations.')
    description = _text(args.get('description', ''))
    if kind == 'other' and not description.strip():
        raise DomainError('Explain an otherwise classified reorganization.')
    existing = args.get('iri')
    if existing is not None:
        if not isinstance(existing, str) or (URIRef(existing), RDF.type, ORG.ChangeEvent) not in ctx.graph:
            raise DomainError('Choose an existing change event.')
        from .records import read_changes
        record = next((r for r in read_changes(ctx.graph) if r['iri'] == existing), None)
        if record is None or record['unsupported']:
            raise DomainError('This change contains unsupported RDF and remains read-only.')
        node = URIRef(existing)
    else:
        node = _record_node(ctx, None, ORG.ChangeEvent, [], 'change')
    adds = {(node, RDF.type, ORG.ChangeEvent), (node, GOV.changeKind, Literal(kind)), (node, GOV.effectiveDate, Literal(when.isoformat(), datatype=XSD.date))}
    removes = set(ctx.graph.triples((node, None, None)))
    adds.update(t for t in removes if t[1] in {GOV.relationRecord, GOV.nameRecord, GOV.existenceRecord})
    adds.update((node, predicate, entity) for predicate, entities in zip((ORG.originalOrganization, ORG.resultingOrganization), ends) for entity in entities)
    adds.update((node, DCTERMS.source, source) for source in _sources(args.get('sources')))
    if description:
        adds.add((node, DCTERMS.description, Literal(description)))
    touched = set()
    existence_entities = set()
    for key, builder, predicate in (('relationEdits', _relation_delta, GOV.relationRecord), ('nameEdits', _name_delta, GOV.nameRecord), ('existenceEdits', _existence_delta, GOV.existenceRecord)):
        raw = args.get(key, [])
        if not isinstance(raw, list) or len(raw) > 100:
            raise DomainError('A change has at most 100 edits of each record type.')
        for index, item in enumerate(raw):
            if not isinstance(item, dict):
                raise DomainError('Each edit is an object.')
            record, add, remove = builder(ctx, item, f'{key}:{index}')
            if key == 'existenceEdits':
                if item['entity'] in existence_entities:
                    raise DomainError('Edit each organization existence period only once per change.')
                existence_entities.add(item['entity'])
            if record in touched:
                raise DomainError('Edit each record only once per change.')
            touched.add(record)
            adds.update(add); removes.update(remove); adds.add((node, predicate, record))
    return _history_change(ctx, 'Record government reorganization', adds, removes, node)
