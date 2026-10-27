"""
================================================================================
FILE: backend/app/government/validation.py
SUMMARY
    Checks temporal government relationship conflicts without inferring dates.
BASIC IDEA
    Overlaps and cycles are errors only when a shared interval is known to
    exist. Missing boundaries preserve warnings. Acyclic containment is peeled
    in linear time before interval-aware searches examine any cyclic core.
INPUTS / INPUT SOURCES
    Dated records in one accepted or proposed project graph.
EXPECTED OUTPUT
    Structured problems for refusal, preview warnings and dated diagnostics.
================================================================================
"""
from collections import defaultdict, deque
from rdflib import Graph

from .profile import GOV, ORG
from .records import Period, Problem, read_relations

MAX_VALIDATION_STEPS = 1_000_000


def _span(period: Period):
    return (period.start.date, period.end.date,
            all(bound.date is not None or bound.open for bound in (period.start, period.end)))


def _intersection(left, right):
    starts = [value for value in (left[0], right[0]) if value is not None]
    ends = [value for value in (left[1], right[1]) if value is not None]
    start, end = max(starts) if starts else None, min(ends) if ends else None
    if start is not None and end is not None and start >= end:
        return None
    return start, end, left[2] and right[2]


def validate_relations(graph: Graph) -> list[Problem]:
    records = [r for r in read_relations(graph) if not r.unsupported]
    problems = []
    groups = defaultdict(list)
    country_groups = defaultdict(list)
    containment = []
    checked = 0
    for record in records:
        if record.predicate in (str(ORG.unitOf), str(ORG.subOrganizationOf)):
            containment.append(record)
            if record.subject == record.object:
                problems.append(Problem("government.cycle", "error", record.iri))
        ends = (record.subject, record.object)
        if record.predicate == str(GOV.cooperatesWith):
            ends = tuple(sorted(ends))
        groups[(record.predicate, *ends)].append(record)
        if record.predicate == str(GOV.inCountry):
            country_groups[record.subject].append(record)
    for code, buckets in (("government.relation_overlap", groups), ("government.country_overlap", country_groups)):
        for group in buckets.values():
            for index, record in enumerate(group):
                for other in group[:index]:
                    checked += 1
                    if checked > MAX_VALIDATION_STEPS:
                        return problems + [Problem("government.validation_limit", "error", record.iri)]
                    overlap = _intersection(_span(record.period), _span(other.period))
                    if overlap is not None:
                        problems.append(Problem(code, "error" if overlap[2] else "warning", record.iri, {"other": other.iri}))
    outgoing, incoming = defaultdict(set), defaultdict(set)
    for record in containment:
        outgoing[record.subject].add(record.object)
        incoming[record.object].add(record.subject)
    core = set(outgoing) | set(incoming)
    queue = deque(node for node in core if not outgoing[node] or not incoming[node])
    while queue:
        node = queue.popleft()
        if node not in core:
            continue
        core.remove(node)
        for parent in outgoing[node]:
            incoming[parent].discard(node)
            if not incoming[parent]:
                queue.append(parent)
        for child in incoming[node]:
            outgoing[child].discard(node)
            if not outgoing[child]:
                queue.append(child)
    adjacency = defaultdict(list)
    for record in containment:
        if record.subject in core and record.object in core:
            adjacency[record.subject].append(record)
    for start in sorted(core):
        stack = [(start, (None, None, True))]
        seen = set()
        while stack:
            node, span = stack.pop()
            key = (node, span)
            if key in seen:
                continue
            seen.add(key)
            for edge in adjacency[node]:
                checked += 1
                # Bound hostile interval combinations; refuse the proposed
                # edit rather than reporting an unchecked graph as valid.
                if checked > MAX_VALIDATION_STEPS:
                    return problems + [Problem("government.validation_limit", "error", start)]
                overlap = _intersection(span, _span(edge.period))
                if overlap is None:
                    continue
                if edge.object == start:
                    problems.append(Problem("government.cycle", "error" if overlap[2] else "warning", edge.iri))
                else:
                    stack.append((edge.object, overlap))
    unique = {}
    for problem in problems:
        unique[(problem.code, problem.severity, problem.iri, str(problem.args))] = problem
    return list(unique.values())


def validate_history(graph: Graph) -> list[Problem]:
    from .records import read_names
    from .profile import ORG, GOV
    problems = validate_relations(graph)
    checked = 0
    names = defaultdict(list)
    for name in read_names(graph):
        if not name.unsupported:
            names[(name.entity, (name.language or '').casefold())].append(name)
    for group in names.values():
        for index, name in enumerate(group):
            for other in group[:index]:
                checked += 1
                if checked > MAX_VALIDATION_STEPS:
                    return problems + [Problem('government.validation_limit', 'error', name.iri)]
                overlap = _intersection(_span(name.period), _span(other.period))
                if overlap is not None:
                    problems.append(Problem('government.name_overlap', 'error' if overlap[2] else 'warning', name.iri, {'other': other.iri}))
    records = [r for r in read_relations(graph) if not r.unsupported]
    countries = defaultdict(list)
    for record in records:
        if record.predicate == str(GOV.inCountry):
            countries[record.subject].append(record)
    for record in records:
        if record.predicate not in {str(ORG.unitOf), str(ORG.subOrganizationOf)}:
            continue
        for left in countries[record.subject]:
            for right in countries[record.object]:
                checked += 1
                if checked > MAX_VALIDATION_STEPS:
                    return problems + [Problem('government.validation_limit', 'error', record.iri)]
                if left.object == right.object:
                    continue
                overlap = _intersection(_span(record.period), _span(left.period))
                if overlap is not None and _intersection(overlap, _span(right.period)) is not None:
                    problems.append(Problem('government.cross_country', 'warning', record.iri))
    return problems
