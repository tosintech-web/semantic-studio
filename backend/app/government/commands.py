"""
================================================================================
FILE: backend/app/government/commands.py
SUMMARY
    Builds ordinary editing Changes for country and government registration.
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
    change = _change(ctx.graph, "Register government organization", adds, removes, ui_message=_command_message("government.organization_saved"))
    return _created(change, node) if created else change
