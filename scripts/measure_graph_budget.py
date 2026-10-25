"""
================================================================================
FILE: scripts/measure_graph_budget.py
SUMMARY
    Reproduce before/after graph measurements without loading any user data.
BASIC IDEA
    Choose a checkout with PYTHONPATH and use a private temporary library. Measure
    the same synthetic class trees with five-sample medians and GC paused. Refuse
    a measurement if either source file changes while it is running.
INPUTS / INPUT SOURCES
    The selected backend's graph_builder/axioms and tests.budget; synthetic RDF only.
EXPECTED OUTPUT
    JSON with source SHA-256 values, comparable graph JSON bytes and time budgets.
================================================================================
"""
import gc
import hashlib
import json
import os
from pathlib import Path
from statistics import median
from tempfile import TemporaryDirectory
from time import perf_counter

from rdflib import Graph, Literal, OWL, RDF, RDFS, URIRef


def measured(call):
    call()
    samples = []
    enabled = gc.isenabled()
    gc.disable()
    try:
        for _ in range(5):
            started = perf_counter()
            call()
            samples.append((perf_counter() - started) * 1000)
    finally:
        if enabled:
            gc.enable()
    return median(samples)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    # Set this before importing app modules, even when callers omit the env var.
    with TemporaryDirectory(prefix="semantic-studio-graph-budget-") as scratch:
        os.environ["SEMANTIC_STUDIO_DATA_DIR"] = scratch
        from app import axioms, graph_builder
        from tests.budget import limit_ms
        sources = {"graph_builder": graph_builder.__file__, "axioms": axioms.__file__}
        hashes = {name: digest(path) for name, path in sources.items()}
        rows = []
        for size in (1000, 10000, 40000):
            graph = Graph()
            for number in range(size):
                iri = URIRef(f"https://example.org/p1-compare/C{number:05}")
                graph.add((iri, RDF.type, OWL.Class))
                graph.add((iri, RDFS.label, Literal(f"合成分類{number:05}", lang="ja")))
                graph.add((iri, RDFS.label, Literal(f"Synthetic class {number:05}", lang="en")))
                if number:
                    graph.add((iri, RDFS.subClassOf, URIRef(f"https://example.org/p1-compare/C{(number-1)//2:05}")))
            full = graph_builder.build_viz_graph(graph)
            build = measured(lambda: graph_builder.build_viz_graph(graph))
            budget = measured(lambda: graph_builder.budget_viz(full, 2000))
            drawn = graph_builder.budget_viz(full, 2000)
            # Identical JSON settings for both checkouts; conservatively includes spaces.
            byte_count = len(json.dumps(drawn, ensure_ascii=False).encode())
            assert len(full["nodes"]) == size
            assert len(drawn["nodes"]) == min(2000, size)
            assert byte_count < 1024 * 1024
            assert budget <= limit_ms(50)
            rows.append({"size": size, "graph_build_ms": build, "budget_ms": budget,
                         "response_bytes": byte_count, "drawn": len(drawn["nodes"]), "edges": len(drawn["edges"])})
        assert hashes == {name: digest(path) for name, path in sources.items()}, "Selected source changed during measurement"
        print(json.dumps({"source_sha256": hashes, "measurements": rows}, indent=2))


if __name__ == "__main__":
    main()
