"""
================================================================================
FILE: backend/app/entity_views.py
SUMMARY
    Bounded, generation-scoped index views for dictionary search and lists.
BASIC IDEA
    Capture imports/data consistently under the document read lock; cache only
    an identical source/revision/language. Views retain source references so
    recycled object IDs cannot accidentally reuse an index from another view.
    Callers hold ontology.reading() through graph-based page projection too.
INPUTS / INPUT SOURCES
    Ontology, imports switch, explicit display language and existing read views.
EXPECTED OUTPUT
    Immutable index, opaque revision token and source/provenance references.
================================================================================
"""
from __future__ import annotations

from dataclasses import dataclass
from secrets import token_hex
from types import MappingProxyType
from typing import Mapping

from rdflib import Graph
from .entity_index import EntityIndex, build_entity_index
from .graph_builder import build_viz_graph
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
                          MappingProxyType(dict(source.get('dataFrom', {}))) if source else MappingProxyType({}))
        ontology.entity_cache[key] = view
        while len(ontology.entity_cache) > MAX_VIEWS:
            ontology.entity_cache.popitem(last=False)
        return view
