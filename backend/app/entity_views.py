"""
================================================================================
FILE: backend/app/entity_views.py
SUMMARY
    Bounded, generation-scoped indexes and wire projections for dictionary
    search and lists, including honest totals and a compact UTF-8 byte cap.
BASIC IDEA
    Capture imports/data consistently under the document read lock; cache only
    an identical source/revision/language. Views retain source references so
    recycled object IDs cannot accidentally reuse an index from another view.
    Callers hold ontology.reading() through graph-based page projection too.
INPUTS / INPUT SOURCES
    Ontology, imports switch, explicit display language and existing read views.
EXPECTED OUTPUT
    Immutable index, opaque revision token, source/provenance references,
    pages or compatible search arrays; oversized responses fail explicitly.
================================================================================
"""
from __future__ import annotations

from dataclasses import dataclass
import json
from secrets import token_hex
from types import MappingProxyType
from typing import Mapping

from rdflib import Graph, URIRef
from .entity_index import EntityIndex, EntityMatch, build_entity_index, normalize_query, rank_matches
from .graph_builder import _description, build_viz_graph, lang_matches, preferred_literal
from .imports import imports_service, snapshot_graphs
from .store import Ontology

MAX_VIEWS = 4


class EntityViewChanged(Exception):
    """The snapshots changed repeatedly while their read view was captured."""


@dataclass(frozen=True)
class EntityView:
    index: EntityIndex
    languages: tuple[str, ...] | None
    revision_token: str
    graph: Graph
    source: dict | None
    source_key: tuple
    imported_from: Mapping[str, str]
    data_from: Mapping[str, dict]
    ordered_iris: tuple[str, ...]


def _source(ontology: Ontology, include_imports: bool):
    # Existing reading() returns None when the last snapshot switches off.
    # Compare its generation on both sides even in that case; never attach a
    # new generation to a graph captured before the snapshot transition.
    for _ in range(3):
        before = snapshot_graphs(ontology)[0]
        source = imports_service.reading(ontology, include_imports)
        after = snapshot_graphs(ontology)[0]
        if before == after:
            graph = source['graph'] if source is not None else ontology.ensure_loaded()
            return graph, source, after
    raise EntityViewChanged()


def get_entity_view(ontology: Ontology, *, include_imports: bool, language: str | None) -> EntityView:
    # Always document lock first. No path acquires the model from a shapes
    # document here, and no editor ever needs the private cache lock.
    with ontology.reading(), ontology.entity_lock:
        graph, source, generation = _source(ontology, include_imports)
        languages = ontology.label_langs(language)
        source_key = (ontology.id, ontology.revision, generation, include_imports, id(source), id(graph))
        key = (source_key, languages)
        held = ontology.entity_cache.get(key)
        if held is not None:
            ontology.entity_cache.move_to_end(key)
            return held
        # Label projections may share a raw index: fields and kinds are not UI
        # locale. This also avoids rebuilding the graph just to change names.
        index = next((v.index for v in ontology.entity_cache.values()
                      if v.source_key == source_key and v.graph is graph and v.source is source), None)
        if index is None:
            # Build from the captured graph, never by re-reading view_viz(): an
            # imports re-resolution during this call must not mix two sources.
            nodes = build_viz_graph(graph)['nodes']
            index = build_entity_index(graph, nodes)
        view = EntityView(index, languages, token_hex(16), graph, source, source_key,
                          MappingProxyType(dict(source.get('importedFrom', {}))) if source else MappingProxyType({}),
                          MappingProxyType(dict(source.get('dataFrom', {}))) if source else MappingProxyType({}),
                          tuple(sorted(index.entities, key=lambda iri: (normalize_query(index.entities[iri].display_name(languages)), iri))))
        ontology.entity_cache[key] = view
        while len(ontology.entity_cache) > MAX_VIEWS:
            ontology.entity_cache.popitem(last=False)
        return view


PAGE_BYTES = 256 * 1024
DISPLAY_CHARS = 200
PROPERTY_KINDS = {"property", "objectProperty", "datatypeProperty", "annotationProperty"}
ENTITY_GROUPS = {"all", "concept", "individual", "class", "properties", "other"}


class EntityPageTooLarge(Exception):
    def __init__(self, total: int, suggested_limit: int):
        self.total = total
        self.suggested_limit = suggested_limit
        super().__init__("This response is too large. Reduce the page size or open the entity details by IRI.")


def kind_group(kind: str) -> str:
    if kind in {"concept", "individual", "class"}:
        return kind
    return "properties" if kind in PROPERTY_KINDS else "other"


def match_wire(match: EntityMatch | None):
    return None if match is None else {"reason": match.reason, "value": match.value[:DISPLAY_CHARS], "truncated": len(match.value) > DISPLAY_CHARS}


def _name(view: EntityView, iri: str):
    entity = view.index.entities[iri]
    value = preferred_literal(entity.names, view.languages)
    text = entity.display_name(view.languages)
    tag = value.language if value is not None else None
    fallback = bool(view.languages) and not lang_matches(tag, view.languages[0])
    return text, tag, fallback


def entity_page(view: EntityView, *, query="", kind="all", offset=0, limit=50, sort="label") -> dict:
    """Project a page while the caller holds its document read lock."""
    if kind not in ENTITY_GROUPS or sort not in {"label", "iri"} or offset < 0 or not 1 <= limit <= 100:
        raise ValueError("Invalid entity page parameters")
    matches = {m.iri: m for m in rank_matches(view.index, query, view.languages)} if normalize_query(query) else None
    order = view.ordered_iris if sort == "label" else sorted(view.index.entities)
    found = [iri for iri in order if (matches is None or iri in matches) and
             (kind == "all" or kind_group(view.index.entities[iri].kind) == kind)]
    rows = []
    for iri in found[offset:offset + limit]:
        entity = view.index.entities[iri]
        text, tag, fallback = _name(view, iri)
        description = _description(view.graph, URIRef(iri), view.languages)
        rows.append({"iri": iri, "label": text[:DISPLAY_CHARS], "kind": entity.kind,
                     "description": description["text"][:DISPLAY_CHARS] if description else None,
                     "match": match_wire(matches.get(iri)) if matches is not None else None,
                     "label_language": tag, "label_fallback": fallback, "label_truncated": len(text) > DISPLAY_CHARS,
                     "reference_only": entity.reference_only})
    return {"items": rows, "total": len(found), "offset": offset, "limit": limit, "revision": view.revision_token}


def entity_search(view: EntityView, query: str, *, kind: str | None, limit: int) -> tuple[list[dict], int]:
    """Compatible VizNode array, with the same index/ranking as the list."""
    matches = [m for m in rank_matches(view.index, query, view.languages)
               if kind is None or view.index.entities[m.iri].kind == kind]
    rows = []
    for match in matches[:limit]:
        entity = view.index.entities[match.iri]
        text, tag, fallback = _name(view, match.iri)
        # Preserve the marked Project title used by earlier search consumers.
        if fallback and tag:
            text = f"{text} ({tag})"
        row = {"id": match.iri, "label": text[:DISPLAY_CHARS], "kind": entity.kind,
               "degree": entity.degree, "match": match_wire(match), "label_language": tag,
               "label_fallback": fallback, "label_truncated": len(text) > DISPLAY_CHARS}
        if entity.class_type:
            row["classType"] = entity.class_type
        if view.languages:
            names = [str(value) for _, value in entity.names]
            row["names"] = [name[:DISPLAY_CHARS] for name in names]
            row["names_truncated"] = any(len(name) > DISPLAY_CHARS for name in names)
        if match.iri in view.imported_from:
            row["importedFrom"] = view.imported_from[match.iri]
        if match.iri in view.data_from:
            row["fromData"] = view.data_from[match.iri]["source"]
        rows.append(row)
    return rows, len(matches)


def encode_entity_response(payload, *, total: int, limit: int) -> bytes:
    """Bound the actual compact UTF-8 bytes, never cut an IRI or drop a row."""
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    if len(encoded) > PAGE_BYTES:
        suggested = max(1, min(limit - 1, int(limit * PAGE_BYTES / len(encoded))))
        raise EntityPageTooLarge(total, suggested)
    return encoded
