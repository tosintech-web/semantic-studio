"""
================================================================================
FILE: backend/app/government/references.py
SUMMARY
    Reads country authority and provides paged, versioned cross-project choices.
BASIC IDEA
    A shared editing gate orders local mutations and snapshots. Team candidates
    already require all repository versions at commit, including the read-only
    country graph and manifest. Reference hashes never depend on display language.
INPUTS / INPUT SOURCES
    Accepted project graphs, profile metadata, query text and display languages.
EXPECTED OUTPUT
    Detached snapshots, opaque authority tokens and complete candidate counts.
================================================================================
"""
from dataclasses import dataclass
from functools import wraps
import hashlib
import json

from rdflib import Graph, Literal, URIRef
from rdflib.compare import to_isomorphic
from rdflib.namespace import RDF, SKOS

from ..graph_builder import pick_label_in
from .profile import GOV, DomainError, DomainProfile, parse_profile


@dataclass(frozen=True)
class ReferenceSnapshot:
    project_id: str
    graph: Graph
    profile: DomainProfile

    @property
    def basis(self) -> dict:
        return reference_basis(source_project_id=self.project_id, graph=self.graph, profile=self.profile)


def editing_locked(method):
    @wraps(method)
    def locked(self, *args, **kwargs):
        with self.reference_lock:
            return method(self, *args, **kwargs)
    return locked


def metadata_locked(handler):
    @wraps(handler)
    def locked(*args, **kwargs):
        from ..editing import editing_service
        with editing_service.reference_lock:
            return handler(*args, **kwargs)
    return locked


def project_snapshot(service, pid: str) -> tuple[dict, Graph]:
    """Do not open, format-save or recover a group merely to read its RDF."""
    with service.reference_lock:
        manifest = service.projects.manifest(pid)
        document = service.document(pid, "model") if service.is_open(pid) else service._load(pid, "model", manifest)
        with document.lock:
            snapshot = Graph()
            for prefix, namespace in document.graph.namespaces():
                snapshot.bind(prefix, namespace)
            snapshot += document.graph
        return manifest, snapshot


def country_reference(service, pid: str) -> ReferenceSnapshot:
    manifest = service.projects.manifest(pid)
    profile = parse_profile(manifest.get("domainProfile"))
    if profile is None:
        raise DomainError("This project has no supported domain profile.", code="government.invalid_profile")
    source_id = pid if profile.id == "countries-v1" else profile.country_project_id
    if source_id is None:
        raise DomainError("Connect a country group before registering organizations.", code="government.profile_source", status=409)
    from ..projects import UnknownProject
    try:
        source_manifest, graph = project_snapshot(service, source_id)
    except UnknownProject as exc:
        raise DomainError("The selected country group is no longer available.", code="government.reference_stale", status=409) from exc
    source_profile = parse_profile(source_manifest.get("domainProfile"))
    if source_profile is None or source_profile.id != "countries-v1":
        raise DomainError("The selected country group changed its profile.", code="government.reference_stale", status=409)
    return ReferenceSnapshot(source_id, graph, source_profile)


def reference_basis(*, source_project_id: str, graph: Graph, profile: DomainProfile) -> dict:
    content = str(to_isomorphic(graph).graph_digest()) + json.dumps(profile.as_dict(), sort_keys=True)
    return {"sourceProjectId": source_project_id, "sourceToken": hashlib.sha256(content.encode()).hexdigest()}


def country_choices(source: Graph, *, query: str, offset: int, limit: int, languages: list[str]) -> dict:
    if len(query) > 200 or offset < 0 or not 1 <= limit <= 100:
        raise DomainError("Country search supports 200 characters and pages of at most 100.")
    needle = query.casefold().strip()
    found = []
    for iri in set(source.subjects(RDF.type, GOV.Country)):
        if not isinstance(iri, URIRef):
            continue
        labels = [str(v) for p in (SKOS.prefLabel, SKOS.altLabel, GOV.countryCode) for v in source.objects(iri, p)]
        if needle and not any(needle in value.casefold() for value in [str(iri), *labels]):
            continue
        code = sorted(str(v) for v in source.objects(iri, GOV.countryCode) if isinstance(v, Literal))
        found.append({"iri": str(iri), "label": pick_label_in(source, iri, languages)[0], "code": code[0] if code else None})
    found.sort(key=lambda row: (row["label"].casefold(), row["iri"]))
    return {"items": found[offset:offset + limit], "total": len(found), "offset": offset, "limit": limit}


def profile_reference_snapshots(service, pid: str, proposed: dict | None) -> tuple[dict, set[str]]:
    """A switch preview owns both old and new country authority, including loss."""
    from ..projects import UnknownProject
    old = parse_profile(service.projects.manifest(pid).get("domainProfile"))
    new = parse_profile(proposed)
    identifiers = {p.country_project_id for p in (old, new) if p and p.country_project_id is not None}
    bases, available = {}, set()
    for source_id in sorted(identifiers):
        try:
            manifest, graph = project_snapshot(service, source_id)
        except UnknownProject:
            bases[source_id] = {"missing": True}
            continue
        profile = parse_profile(manifest.get("domainProfile"))
        if profile is None or profile.id != "countries-v1":
            bases[source_id] = {"unsupported": manifest.get("domainProfile")}
            continue
        bases[source_id] = reference_basis(source_project_id=source_id, graph=graph, profile=profile)
        if new and new.country_project_id == source_id:
            available = {str(node) for node in graph.subjects(RDF.type, GOV.Country) if isinstance(node, URIRef)}
    return bases, available
