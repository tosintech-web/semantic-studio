"""
================================================================================
FILE: backend/tests/test_entity_budgets.py
SUMMARY
    Measured dictionary index, search, list and graph budgets at three sizes.
BASIC IDEA
    Generate bilingual classes in memory. Separate cold index creation from warm
    search/page reads, measure medians with collection paused and retain honest
    totals and bounded graph/page wire sizes. No private fixtures or network.
INPUTS / INPUT SOURCES
    Synthetic 1k/10k/40k graphs, the production entity view and graph builders.
EXPECTED OUTPUT
    Reproducible timing records and enforced P1 limits without changing RDF.
================================================================================
"""
import gc
import json
from pathlib import Path
from statistics import median
import threading
from time import perf_counter

import pytest
from rdflib import Graph, Literal, OWL, RDF, RDFS, URIRef

from app.entity_index import build_entity_index
from app.entity_views import encode_entity_response, entity_page, entity_search, get_entity_view
from app.graph_builder import budget_viz, build_viz_graph
from app.store import Ontology
from budget import limit_ms


def measured(call):
    call()  # allocator/code warm-up; cold callers explicitly clear their cache
    samples = []
    enabled = gc.isenabled()
    gc.disable()
    try:
        for _ in range(5):
            started = perf_counter()
            call()
            samples.append(1000 * (perf_counter() - started))
    finally:
        if enabled:
            gc.enable()
    return median(samples)


@pytest.mark.perf
@pytest.mark.parametrize("size,cold_limit,warm_limit", [(1000,1000,200),(10000,1000,200),(40000,3000,500)])
def test_entity_index_search_list_and_graph_budgets(size, cold_limit, warm_limit, record_property):
    graph = Graph()
    for number in range(size):
        iri = URIRef(f"https://example.org/p1-budget/C{number:05}")
        graph.add((iri, RDF.type, OWL.Class))
        graph.add((iri, RDFS.label, Literal(f"合成分類{number:05}", lang="ja")))
        graph.add((iri, RDFS.label, Literal(f"Synthetic class {number:05}", lang="en")))
        if number:
            graph.add((iri, RDFS.subClassOf, URIRef(f"https://example.org/p1-budget/C{(number-1)//2:05}")))
    ont = Ontology(id=f"entity-budget-{size}", name="Synthetic", source="upload", format="turtle",
                   meta={}, data_path=Path("unused-synthetic.ttl"), graph=graph, lock=threading.RLock())
    original_statements = frozenset(graph)
    before = build_viz_graph(graph)
    before_ms = measured(lambda: build_viz_graph(graph))
    def read():
        return get_entity_view(ont, include_imports=False, language="ja")
    def cold():
        ont.entity_cache.clear()
        return read()
    raw_index_ms = measured(lambda: build_entity_index(graph, before["nodes"]))
    cold_ms = measured(cold)
    view = read()
    def search():
        return entity_search(read(), "合成", kind=None, limit=25)
    def page():
        return entity_page(read(), query="合成", limit=50)
    search_ms = measured(search)
    page_ms = measured(page)
    hits, total = search()
    result = page()
    assert total == result["total"] == size
    assert len(hits) == 25 and len(result["items"]) == 50
    assert len(encode_entity_response(result, total=size, limit=50)) <= 256 * 1024
    assert all(len(row["label"]) <= 200 for row in result["items"])
    assert get_entity_view(ont, include_imports=False, language="en").index is view.index
    after_ms = measured(lambda: build_viz_graph(graph))
    after = build_viz_graph(graph)
    assert after == before and frozenset(graph) == original_statements
    drawn = budget_viz(after, 2000)
    assert len(drawn["nodes"]) <= 2000
    assert len(json.dumps(drawn, ensure_ascii=False).encode()) < 1024 * 1024
    for key, value in {"size": size, "raw_index_ms": raw_index_ms, "cold_ms": cold_ms, "search_ms": search_ms, "page_ms": page_ms,
                       "graph_before_ms": before_ms, "graph_after_ms": after_ms}.items():
        record_property(key, value)
    print(f"P1 size={size}: raw_index={raw_index_ms:.2f}ms cold_view={cold_ms:.2f}ms search={search_ms:.2f}ms page={page_ms:.2f}ms graph_before={before_ms:.2f}ms graph_after={after_ms:.2f}ms")
    assert raw_index_ms <= limit_ms(cold_limit)
    assert cold_ms <= limit_ms(cold_limit)
    assert search_ms <= limit_ms(warm_limit)
    assert page_ms <= limit_ms(warm_limit)
