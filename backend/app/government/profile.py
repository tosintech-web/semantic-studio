"""
================================================================================
FILE: backend/app/government/profile.py
SUMMARY
    Defines supported government project profiles and their shared vocabulary.
BASIC IDEA
    A manifest chooses authoring tools without copying standard definitions into
    its model. Unknown profiles remain readable; writes accept only exact v1
    profiles. UUID identities survive changes to names and optional codes.
INPUTS / INPUT SOURCES
    Profile JSON, project base IRIs, the application vocabulary and pinned ORG.
EXPECTED OUTPUT
    Validated immutable profiles, fresh identities and detached vocabulary RDF.
================================================================================
"""
from dataclasses import dataclass
from pathlib import Path
import re
import uuid

from rdflib import Graph, Namespace, URIRef

GOV = Namespace("urn:semantic-studio:government:v1#")
ORG = Namespace("http://www.w3.org/ns/org#")
PROFILE_TEMPLATES = {"countries": "countries-v1", "government-organizations": "government-organizations-v1"}


class ProfileConflict(ValueError):
    """A profile confirmation no longer refers to the reviewed graph/settings."""


@dataclass(frozen=True)
class DomainProfile:
    id: str
    version: int = 1
    country_project_id: str | None = None

    def as_dict(self) -> dict:
        result = {"id": self.id, "version": self.version}
        if self.country_project_id is not None:
            result["countryProjectId"] = self.country_project_id
        return result


def parse_profile(raw: dict | None) -> DomainProfile | None:
    """Unknown metadata is preserved by storage, never enabled as v1 tools."""
    if not isinstance(raw, dict) or set(raw) - {"id", "version", "countryProjectId"}:
        return None
    if raw.get("id") not in PROFILE_TEMPLATES.values() or type(raw.get("version")) is not int or raw["version"] != 1:
        return None
    source = raw.get("countryProjectId")
    if "countryProjectId" in raw:
        if raw["id"] != "government-organizations-v1" or not isinstance(source, str) or not re.fullmatch(r"prj-[0-9a-f]{12}", source):
            return None
    return DomainProfile(raw["id"], 1, source)


def new_entity_iri(base: str) -> URIRef:
    # Project base validation is also applied here for callers outside HTTP.
    from ..projects import BASE_IRI
    if not isinstance(base, str) or not BASE_IRI.fullmatch(base):
        raise ValueError("An entity needs a valid project base IRI")
    return URIRef(base + str(uuid.uuid4()))


def load_domain_vocabulary() -> Graph:
    """Return a detached graph so no editor can mutate the pinned originals."""
    from ..imports import bundled_for, load_bundled
    graph = Graph().parse(Path(__file__).parents[1] / "domain_vocab" / "government-v1.ttl", format="turtle")
    for iri in ("http://www.w3.org/ns/org", "http://www.w3.org/2004/02/skos/core"):
        entry = bundled_for(iri)
        if entry is None:
            raise RuntimeError("Missing bundled government vocabulary")
        graph += load_bundled(entry)
    return graph
