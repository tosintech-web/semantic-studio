"""
================================================================================
FILE: backend/app/shacl.py
================================================================================

SUMMARY
    Recorded validation reports can be read in another label language without a new check.
    Validation on demand (shacl-authoring 5.6, 5.7, D-092, D-094): a
    project's data -- its model with unsaved changes and its resolved
    imports -- checked against every shape in its shapes document with
    pySHACL, and the report turned into one panel per shape, with counts, a
    state and a sentence per problem in the learner's own names.

BASIC IDEA
    Generated violation sentences carry flat display facts. Authored sh:message
    stays literal, and only the existing capped problem output is enriched.

    Owned refusals add validated display facts at their source. Legacy text,
    exception types and input-processing rules remain unchanged.

    pySHACL runs with inference off, SHACL Advanced Features off, JavaScript
    off and owl:imports in the shapes not followed (Section 9, OPTIONS
    below; a test asserts each). Inference is not needed for what learners
    write: pySHACL already finds an Employee through rdfs:subClassOf when a
    shape targets Person, and turning RDFS inference on cost five times the
    time on the spec's measurement. The run is on a worker thread under a
    30-second limit, as SPARQL queries are, in a copy of the request's
    context; past it the caller is told how many shapes and statements were
    being checked rather than given half a report.

    pySHACL refuses a whole run when one shape is broken (`sh:minCount
    "x"`). One bad shape must not hide every other result (S14), so a
    refused run is repeated shape by shape (`use_shapes`) to find the ones
    that cannot run, each of which becomes a *Could not run* panel with
    pySHACL's reason, and the rest run together. Only a refused run pays
    for this.

    A SPARQL-based constraint with SERVICE is refused by pySHACL itself
    ("must not contain a federated query"), and behind that rdflib's SERVICE
    handler fails closed outside the query runner (sparql_service): two
    locks, no request leaves the process (S15).

    A result's source shape is a property shape, or a shape nested deeper;
    each is walked up through sh:property and sh:node to the listed shape
    it belongs to, which is the panel. A panel counts the focus nodes its
    target selects in the data -- instances of the target class and of its
    subclasses, the way pySHACL selects them -- so it can say *2 of 5 people
    fail* and tell *nothing to check* (grey, never green) from a pass.

    pySHACL's messages are technical (*Less than 1 values on ex:bob->ex:name*),
    so each constraint component the form offers has its own sentence,
    built from the data's names: *Bob has no name; every Person must have at
    least 1.* A shape's own sh:message replaces it, as the learner asked for
    it. What *Check it in data too* writes (axioms-and-reasoning 5.8) has
    sentences too: a qualified count of a class or a type (*order 7 is not
    linked by has line to an Order line; every Order must be.*) and a
    sh:hasValue. Any other component keeps pySHACL's message, prefixed with
    the rule.

    A panel carries at most 200 problems and the true total (Section 9), so
    a run with 100,000 problems cannot make a huge response.

INPUTS / INPUT SOURCES
    - The data graph and the shapes graph, as copies editing.py took under
      the documents' locks.
    - The project's languages, primary first, for names and sentences.
    - Optionally, which data snapshot each individual came from, so a panel
      can name the data it checked (csv-data-import 5.6).

EXPECTED OUTPUT
    - validate(...) -> {"stopped", "shapes": [panel...], "statements",
      "shapeCount", "durationMs"}; each panel {id, name, state, focusCount,
      failingCount, problemCount, warningCount, target, problems,
      problemsTotal, error}.
================================================================================
"""

from __future__ import annotations

from .messages import literal_part, make_message, word_part, MessageText
import contextvars
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeout
from typing import Callable, Optional

import pyshacl
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.namespace import OWL, RDF, RDFS, SKOS, XSD

from . import examples
from .graph_builder import pick_label_in, prefixed
from .sentences import article, verb
from .shapes_form import (
    DEFINITION_PATH,
    SH,
    _list,
    datatype_json,
    listed_shapes,
    path_kind,
    path_label,
    path_parts,
    path_of,
    shape_id,
)

# The 30-second limit of 5.6, read at call time so a test can shorten it.
VALIDATE_TIMEOUT_SECONDS = 30.0
# Problems one panel carries; the total beside it is always the true one.
PANEL_CAP = 200

# Section 9, every one asserted by a test.
OPTIONS = {
    "inference": "none",
    "advanced": False,
    "js": False,
    "do_owl_imports": False,
}

# Failing first, then what could not run, then warnings, nothing, passes.
STATE_ORDER = {"fails": 0, "error": 1, "warnings": 2, "nothing": 3, "passes": 4}

LANGUAGE_NAMES = {
    "ar": "Arabic", "ca": "Catalan", "cs": "Czech", "da": "Danish", "de": "German",
    "el": "Greek", "en": "English", "es": "Spanish", "fi": "Finnish", "fr": "French",
    "he": "Hebrew", "hi": "Hindi", "hu": "Hungarian", "it": "Italian", "ja": "Japanese",
    "ko": "Korean", "la": "Latin", "nb": "Norwegian", "nl": "Dutch", "no": "Norwegian",
    "pl": "Polish", "pt": "Portuguese", "ro": "Romanian", "ru": "Russian", "sv": "Swedish",
    "tr": "Turkish", "uk": "Ukrainian", "zh": "Chinese",
}

DATATYPE_WORDS = {
    XSD.string: "text",
    RDF.langString: "text in a language",
    XSD.integer: "a whole number",
    XSD.decimal: "a number",
    XSD.boolean: "true or false",
    XSD.date: "a date",
    XSD.dateTime: "a date and time",
    XSD.anyURI: "a web address",
}

_NUMERIC = {XSD.integer, XSD.decimal, XSD.double, XSD.float, XSD.int, XSD.long,
            XSD.nonNegativeInteger, XSD.positiveInteger, XSD.boolean}

IRREGULAR = {"person": "people", "child": "children", "man": "men", "woman": "women",
             "class": "classes", "datum": "data"}


class ShapesRefused(Exception):
    """pySHACL would not run the shapes: one is broken. Carries its reason."""

    def __init__(self, message: str, *, ui_message: dict | None = None):
        super().__init__(message)
        self.ui_message = ui_message


def _refusal_text(error: ShapesRefused) -> str:
    """Keep run_shapes' string contract while forwarding producer-owned facts."""
    wire = error.ui_message
    return MessageText(str(error), wire["code"], **wire["args"]) if wire else str(error)


def language_name(tag: str) -> str:
    base = (tag or "").split("-")[0].lower()
    return LANGUAGE_NAMES.get(base, tag)


def plural(word: str) -> str:
    """The plural of a noun phrase's last word, for counts in sentences. A
    word that says which one in brackets, *name (label)*, is the word before
    the brackets: *names (label)*."""
    if not word:
        return word
    if word.endswith(")") and " (" in word:
        head, _, note = word.rpartition(" (")
        return f"{plural(head)} ({note}"
    head, _, last = word.rpartition(" ")
    lower = last.lower()
    if lower in IRREGULAR:
        out = IRREGULAR[lower]
        out = out[:1].upper() + out[1:] if last[:1].isupper() else out
    elif lower.endswith("y") and len(lower) > 1 and lower[-2] not in "aeiou":
        out = last[:-1] + "ies"
    elif lower.endswith(("s", "x", "z", "ch", "sh")):
        out = last + "es"
    else:
        out = last + "s"
    return f"{head} {out}" if head else out


def noun(label: str) -> str:
    """A class name inside a sentence: lower case unless it is an acronym."""
    return label[:1].lower() + label[1:] if label[1:2].islower() else label


def possessive(name: str) -> str:
    return f"{name}'s"


def _run(data: Graph, shapes: Graph, use: Optional[list] = None):
    """One pySHACL run; ShapesRefused when it will not load the shapes."""
    kwargs = dict(OPTIONS)
    if use is not None:
        kwargs["use_shapes"] = use
    try:
        conforms, report, text = pyshacl.validate(
            data, shacl_graph=shapes, inplace=True, abort_on_first=False, **kwargs
        )
    except Exception as exc:  # ShapeLoadError, ConstraintLoadError and friends
        raise ShapesRefused(
            _reason(str(exc)),
            ui_message=make_message("validation.shapes_refused"),
        ) from exc
    if not isinstance(report, Graph):
        # pySHACL reports some refusals as a "Validation Failure" text.
        raise ShapesRefused(
            _reason(str(text)),
            ui_message=make_message("validation.shapes_refused"),
        )
    return report


def _reason(message: str) -> str:
    """pySHACL's reason, without its pointer to the specification."""
    lines = [line.strip() for line in message.splitlines() if line.strip()]
    lines = [line for line in lines if not line.startswith("For reference")]
    text = " ".join(lines) or "pySHACL could not check this shape."
    return text.removeprefix("Validation Failure - ")


def run_shapes(data: Graph, shapes: Graph, listed: list) -> tuple[list, dict]:
    """All results, and the reason each shape that could not run gave."""
    try:
        return _results(_run(data, shapes)), {}
    except ShapesRefused as whole:
        errors: dict = {}
        good = []
        for node in listed:
            try:
                _run(data, shapes, [node])
                good.append(node)
            except ShapesRefused as exc:
                errors[node] = _refusal_text(exc)
        if not errors and listed:
            # Each runs alone but not together (a shared nested shape):
            # every panel says so rather than none.
            return [], {node: _refusal_text(whole) for node in listed}
        return (_results(_run(data, shapes, good)) if good else []), errors


def _results(report: Graph) -> list[dict]:
    out = []
    for result in report.subjects(RDF.type, SH.ValidationResult):
        out.append({
            "focus": report.value(result, SH.focusNode),
            "path": report.value(result, SH.resultPath),
            "value": report.value(result, SH.value),
            "source": report.value(result, SH.sourceShape),
            "component": report.value(result, SH.sourceConstraintComponent),
            "severity": report.value(result, SH.resultSeverity),
            "message": report.value(result, SH.resultMessage),
        })
    return out


def _owners(shapes: Graph, listed: list) -> Callable:
    """source shape -> the listed shape it belongs to, through sh:property
    and sh:node (and qualified shapes), whatever the depth."""
    listed_set = set(listed)
    parents: dict = {}
    for predicate in (SH.property, SH.node, SH.qualifiedValueShape):
        for parent, child in shapes.subject_objects(predicate):
            parents.setdefault(child, []).append(parent)
    cache: dict = {}

    def owner(node):
        if node in cache:
            return cache[node]
        seen, queue = set(), [node]
        found = None
        while queue:
            current = queue.pop(0)
            if current in listed_set:
                found = current
                break
            if current in seen:
                continue
            seen.add(current)
            queue.extend(parents.get(current, []))
        cache[node] = found
        return found

    return owner


def focus_nodes(data: Graph, shapes: Graph, node) -> set:
    """What the shape's targets select in the data (SHACL 2.1.3)."""
    found: set = set()
    for cls in shapes.objects(node, SH.targetClass):
        classes = {cls}
        queue = [cls]
        while queue:
            current = queue.pop()
            for sub in data.subjects(RDFS.subClassOf, current):
                if sub not in classes:
                    classes.add(sub)
                    queue.append(sub)
        for c in classes:
            found.update(data.subjects(RDF.type, c))
    found.update(shapes.objects(node, SH.targetNode))
    for prop in shapes.objects(node, SH.targetSubjectsOf):
        found.update(data.subjects(prop, None))
    for prop in shapes.objects(node, SH.targetObjectsOf):
        found.update(data.objects(None, prop))
    if (node, RDF.type, RDFS.Class) in shapes or (node, RDF.type, OWL.Class) in shapes:
        found.update(data.subjects(RDF.type, node))
    return found


def _limit_arg(value):
    """Represent RDF integers exactly across JSON/JavaScript; never cap RDF data."""
    if value is None:
        return None
    return value if isinstance(value, int) and abs(value) <= 2**53 - 1 else str(value)


def _said(text: str, code: str, facts, extra=None) -> str:
    # Sorting needs every legacy sentence, while only the existing capped output
    # needs display facts. Do not evaluate metadata-only graph reads for the rest.
    if facts is None:
        return text
    return MessageText(text, "validation.violation." + code, **facts, **(extra() if extra else {}))


class Sentences:
    """The sentences of 5.7, built from the data's names."""

    def __init__(self, data: Graph, shapes: Graph, languages: list):
        self.data = data
        self.shapes = shapes
        self.languages = languages

    def name(self, node) -> str:
        if isinstance(node, URIRef):
            return pick_label_in(self.data, node, self.languages)[0]
        return "a node without a name"

    def value(self, term) -> Optional[str]:
        if term is None:
            return None
        if isinstance(term, Literal):
            if term.language:
                return f'"{term}"@{term.language}'
            if term.datatype in _NUMERIC:
                return str(term)
            return f'"{term}"'
        return self.name(term)

    def every(self, owner) -> str:
        """*every Person*, from the listed shape's target class."""
        target = self.shapes.value(owner, SH.targetClass) if owner is not None else None
        if target in (OWL.Class, RDFS.Class):
            return "every class"
        if target == SKOS.Concept:
            return "every concept"
        if isinstance(target, URIRef):
            return f"every {self.name(target)}"
        return "the rule"

    def _path_key(self, result: dict):
        path = result["path"]
        key = (path,) if isinstance(path, URIRef) else None
        if key is None and result["source"] is not None:
            # The report's blank nodes are copies; the form owns the actual path.
            key = path_of(self.shapes, self.shapes.value(result["source"], SH.path))
        return key

    def path_words(self, result: dict) -> tuple[str, str]:
        """The path's label and its kind (attribute, relationship ...)."""
        key = self._path_key(result)
        if key is None:
            return "value", "other"
        if tuple(key) == DEFINITION_PATH:
            return "definition", "definition"
        return path_label(self.data, tuple(key), self.languages), path_kind(self.data, tuple(key))

    def count(self, focus, path) -> int:
        if isinstance(path, URIRef):
            return len(set(self.data.objects(focus, path)))
        return 0

    def sentence(self, result: dict, owner, *, ui_metadata: bool = True) -> str:
        source = result["source"]
        own = self.shapes.value(source, SH.message) if source is not None else None
        if own is None and owner is not None:
            own = self.shapes.value(owner, SH.message)
        if own is not None:
            return str(own)
        focus = result["focus"]
        facts = self._facts(result) if ui_metadata else None
        who = self.name(focus)
        label, kind = self.path_words(result)
        every = self.every(owner)
        value = self.value(result["value"])
        component = result["component"]
        relationship = kind == "relationship"
        if component == SH.MinCountConstraintComponent:
            limit = self._number(source, SH.minCount)
            have = self._have(focus, result)
            if relationship:
                if have == 0:
                    return _said(
                        f'{who} is not linked by {label}; {every} must be, at least {limit} times.' if limit != 1 else f'{who} is not linked by {label}; {every} must be.',
                        'min_count.relationship',
                        facts,
                        lambda: dict(
                            have=have,
                            limit=_limit_arg(limit),
                        ),
                    )
                return _said(
                    f'{who} is linked by {label} {have} times; {every} must be at least {limit} times.',
                    'min_count.relationship',
                    facts,
                    lambda: dict(
                        have=have,
                        limit=_limit_arg(limit),
                    ),
                )
            if have == 0:
                return _said(
                    f'{who} has no {label}; {every} must have at least {limit}.',
                    'min_count.attribute',
                    facts,
                    lambda: dict(
                        have=have,
                        limit=_limit_arg(limit),
                    ),
                )
            return _said(
                f'{who} has {have} {(label if have == 1 else plural(label))}; {every} must have at least {limit}.',
                'min_count.attribute',
                facts,
                lambda: dict(
                    have=have,
                    limit=_limit_arg(limit),
                ),
            )
        if component == SH.MaxCountConstraintComponent:
            limit = self._number(source, SH.maxCount)
            have = self._have(focus, result)
            if relationship:
                return _said(
                    f"{who} is linked by {label} {have} times; {every} may be at most {limit} {('time' if limit == 1 else 'times')}.",
                    'max_count.relationship',
                    facts,
                    lambda: dict(
                        have=have,
                        limit=_limit_arg(limit),
                    ),
                )
            return _said(
                f'{who} has {have} {plural(label)}; {every} may have at most {limit}.',
                'max_count.attribute',
                facts,
                lambda: dict(
                    have=have,
                    limit=_limit_arg(limit),
                ),
            )
        if component == SH.DatatypeConstraintComponent:
            wanted = self.shapes.value(source, SH.datatype)
            word = DATATYPE_WORDS.get(wanted) or f"of the type {datatype_json(wanted)}"
            return _said(
                f'{possessive(who)} {label} {value} is not {word}.',
                'datatype',
                facts,
                lambda: dict(
                    value=self._value_parts(result['value']),
                    datatype=datatype_json(wanted),
                ),
            )
        if component == SH.ClassConstraintComponent:
            cls = self.shapes.value(source, SH["class"])
            cls_name = self.name(cls) if cls is not None else "the class the rule names"
            return _said(
                f'{who} {verb(label)} {value}, which is not {article(cls_name)} {cls_name}.',
                'class',
                facts,
                lambda: dict(
                    value=self._value_parts(result['value']),
                    qualifier=self._class_parts(cls),
                ),
            )
        if component in (SH.MinLengthConstraintComponent, SH.MaxLengthConstraintComponent):
            shorter = component == SH.MinLengthConstraintComponent
            limit = self._number(source, SH.minLength if shorter else SH.maxLength)
            return _said(
                f"{possessive(who)} {label} {value} is {('shorter' if shorter else 'longer')} than {limit} {('character' if limit == 1 else 'characters')}.",
                'min_length' if shorter else 'max_length',
                facts,
                lambda: dict(
                    value=self._value_parts(result['value']),
                    limit=_limit_arg(limit),
                ),
            )
        if component == SH.PatternConstraintComponent:
            return _said(
                f'{possessive(who)} {label} {value} does not match the pattern of the rule.',
                'pattern',
                facts,
                lambda: dict(
                    value=self._value_parts(result['value']),
                ),
            )
        if component in (SH.MinInclusiveConstraintComponent, SH.MaxInclusiveConstraintComponent):
            low = component == SH.MinInclusiveConstraintComponent
            bound = self.shapes.value(source, SH.minInclusive if low else SH.maxInclusive)
            return _said(
                f"{possessive(who)} {label} {value} is {('below the minimum' if low else 'above the maximum')} of {bound}.",
                'min_inclusive' if low else 'max_inclusive',
                facts,
                lambda: dict(
                    value=self._value_parts(result['value']),
                    bound=self._value_parts(bound),
                ),
            )
        if component == SH.InConstraintComponent:
            members = _list(self.shapes, self.shapes.value(source, SH["in"])) or []
            allowed = ", ".join(str(m) if isinstance(m, Literal) else self.name(m) for m in members)
            return _said(
                f'{possessive(who)} {label} {value} is not one of: {allowed}.',
                'in',
                facts,
                lambda: dict(
                    value=self._value_parts(result['value']),
                    allowed=self._parts_list((self._value_parts(item) for item in members)),
                ),
            )
        if component == SH.LanguageInConstraintComponent:
            term = result["value"]
            lang = term.language if isinstance(term, Literal) and term.language else None
            tags = [str(t) for t in (_list(self.shapes, self.shapes.value(source, SH.languageIn)) or [])]
            where = f"in {language_name(lang)}" if lang else "without a language"
            if sorted(t.lower() for t in tags) == sorted(t.lower() for t in self.languages):
                return _said(
                    f"{possessive(who)} {label} {value} is {where}, which is not one of the project's languages.",
                    'language.project.tagged' if lang else 'language.project.untagged',
                    facts,
                    lambda: dict(
                        value=self._value_parts(result['value']),
                        allowed=self._language_list(tags),
                        **{'language': self._language_parts(lang)} if lang else {},
                    ),
                )
            allowed = ", ".join(language_name(t) for t in tags)
            return _said(
                f'{possessive(who)} {label} {value} is {where}, which is not one of: {allowed}.',
                'language.allowed.tagged' if lang else 'language.allowed.untagged',
                facts,
                lambda: dict(
                    value=self._value_parts(result['value']),
                    allowed=self._language_list(tags),
                    **{'language': self._language_parts(lang)} if lang else {},
                ),
            )
        if component == SH.UniqueLangConstraintComponent:
            return self._unique_lang(focus, result["path"], who, label, ui_facts=facts, ui_metadata=ui_metadata)
        if component == SH.QualifiedMinCountConstraintComponent:
            lang = self._qualified_language(source)
            if lang is not None:
                return _said(
                    f'{who} has no {label} in {language_name(lang)}; {every} must have one.',
                    'qualified_language',
                    facts,
                    lambda: dict(
                        language=self._language_parts(lang),
                        limit=_limit_arg(self._number(source, SH.qualifiedMinCount)),
                    ),
                )
        if component in (SH.QualifiedMinCountConstraintComponent, SH.QualifiedMaxCountConstraintComponent):
            # What Check it in data too writes for a restriction (axioms 5.8):
            # a count of values that are of a class, or of a type.
            said = self._qualified_count(component, source, focus, result["path"], who, label, every, relationship, ui_facts=facts, ui_metadata=ui_metadata)
            if said is not None:
                return said
        if component == SH.HasValueConstraintComponent:
            wanted = self.shapes.value(source, SH.hasValue)
            return _said(
                f'{who} does not have {label} {self.value(wanted)}; {every} must.',
                'has_value',
                facts,
                lambda: dict(
                    wanted=self._value_parts(wanted),
                ),
            )
        message = result["message"]
        rule = label if label != "value" else self._shape_name(owner)
        return _said(
            f'{rule}: {message}' if message is not None else f'{rule}: this value breaks the rule.',
            'other',
            facts,
            lambda: dict(
                rule=self._group_parts(result, owner),
            ),
        )

    def _name_parts(self, node) -> list[dict]:
        if isinstance(node, URIRef):
            return [literal_part(self.name(node))]
        if isinstance(node, Literal):
            return [literal_part(self.value(node))]
        return [word_part("words.validation.unnamed_node")]

    def _value_parts(self, node) -> list[dict]:
        return [word_part("words.validation.missing_value")] if node is None else self._name_parts(node)

    def _class_parts(self, node) -> list[dict]:
        return self._name_parts(node) if isinstance(node, URIRef) else [word_part("words.validation.required_class")]

    def _path_parts(self, result: dict) -> list[dict]:
        key = self._path_key(result)
        return path_parts(self.data, key, self.languages) if key is not None else [word_part("words.field.value")]

    def _facts(self, result: dict) -> dict:
        return {"focus": self._name_parts(result["focus"]), "path": self._path_parts(result)}

    def _helper_facts(self, focus, path, label, facts, enabled):
        if not enabled:
            return None
        if facts is not None:
            return facts
        return {"focus": self._name_parts(focus), "path": path_parts(self.data, (path,), self.languages)
                if isinstance(path, URIRef) else [literal_part(label)]}

    def _language_parts(self, tag: str) -> list[dict]:
        base = tag.lower().split("-")[0]
        if base in LANGUAGE_NAMES:
            return [word_part("words.language." + base), literal_part(" (" + tag + ")")]
        return [literal_part(tag)]

    def _parts_list(self, groups, *, separator="words.list.or", empty="words.validation.no_allowed_values") -> list[dict]:
        parts = []
        for index, group in enumerate(groups):
            if index:
                parts.append(word_part(separator))
            parts.extend(group)
        return parts or [word_part(empty)]

    def _language_list(self, tags, *, separator="words.list.or") -> list[dict]:
        return self._parts_list((self._language_parts(tag) for tag in tags), separator=separator,
                                empty="words.validation.no_allowed_languages")

    def _group_parts(self, result: dict, owner) -> list[dict]:
        label, _ = self.path_words(result) if result["path"] is not None else ("", "")
        if label and label != "value":
            return self._path_parts(result)
        name = self.shapes.value(owner, RDFS.label) if owner is not None else None
        return [literal_part(str(name))] if name is not None else [word_part("words.validation.this_shape")]

    def _number(self, source, predicate):
        value = self.shapes.value(source, predicate)
        try:
            return int(value)
        except (TypeError, ValueError):
            return value

    def _have(self, focus, result: dict) -> int:
        path = result["path"]
        if isinstance(path, URIRef):
            return self.count(focus, path)
        label, _ = self.path_words(result)
        if label == "definition":
            return sum(len(set(self.data.objects(focus, p))) for p in DEFINITION_PATH)
        return 0

    def _unique_lang(
        self, focus, path, who: str, label: str, *, ui_facts=None, ui_metadata=True,
    ) -> str:
        facts = self._helper_facts(focus, path, label, ui_facts, ui_metadata)
        counts: dict = {}
        if isinstance(path, URIRef):
            for value in self.data.objects(focus, path):
                if isinstance(value, Literal) and value.language:
                    tag = value.language.lower()
                    counts[tag] = counts.get(tag, 0) + 1
        repeated = [(tag, n) for tag, n in sorted(counts.items()) if n > 1]
        if not repeated:
            return _said(
                f'{who} has more than one {label} in one language; one per language is allowed.',
                'unique_language',
                facts,
            )
        parts = [f"{n} {plural(label)} in {language_name(tag)}" for tag, n in repeated]
        return _said(
            f"{who} has {' and '.join(parts)}; one per language is allowed.",
            'unique_language.one' if len(repeated) == 1 else 'unique_language.many',
            facts,
            lambda: (
                dict(language=self._language_parts(repeated[0][0]), count=repeated[0][1])
                if len(repeated) == 1
                else dict(languages=self._language_list([tag for tag, n in repeated], separator='words.list.and'), count=sum((n for tag, n in repeated)))
            ),
        )

    def _qualified_language(self, source) -> Optional[str]:
        inner = self.shapes.value(source, SH.qualifiedValueShape) if source is not None else None
        tags = _list(self.shapes, self.shapes.value(inner, SH.languageIn)) if inner is not None else None
        return str(tags[0]) if tags and len(tags) == 1 else None

    def _qualified_count(
        self, component, source, focus, path, who, label, every, relationship,
        *, ui_facts=None, ui_metadata=True,
    ) -> Optional[str]:
        """*order 7 is not linked by has line to an Order line; every Order
        must be.* A qualified shape saying only sh:class or sh:datatype; any
        other is left to the generic sentence."""
        facts = self._helper_facts(focus, path, label, ui_facts, ui_metadata)
        inner = self.shapes.value(source, SH.qualifiedValueShape) if source is not None else None
        if inner is None:
            return None
        cls = self.shapes.value(inner, SH["class"])
        datatype = self.shapes.value(inner, SH.datatype)
        if (cls is None) == (datatype is None):
            return None
        low = component == SH.QualifiedMinCountConstraintComponent
        limit = self._number(source, SH.qualifiedMinCount if low else SH.qualifiedMaxCount)
        values = list(self.data.objects(focus, path)) if isinstance(path, URIRef) else []
        if cls is not None:
            kinds = examples.subclasses(self.data, cls)
            have = sum(1 for v in values if set(self.data.objects(v, RDF.type)) & kinds)
            one = f"{article(self.name(cls))} {self.name(cls)}"
            many = plural(self.name(cls))
        else:
            # pySHACL takes a plain literal for xsd:string (RDF 1.1), and so does the count.
            have = sum(1 for v in values if isinstance(v, Literal) and (
                v.datatype == datatype
                or (datatype == XSD.string and v.datatype is None and not v.language)))
            one = DATATYPE_WORDS.get(datatype) or f"of the type {datatype_json(datatype)}"
            # *a date*, *dates*; a word with no article (*text*) reads the same.
            bare = one.split(" ", 1)[1] if one.startswith(("a ", "an ")) else None
            many = plural(bare) if bare else one
        times = "time" if limit == 1 else "times"
        if relationship and low and have == 0:
            tail = "must be." if limit == 1 else f"must be, at least {limit} {times}."
            return _said(
                f'{who} is not linked by {label} to {one}; {every} {tail}',
                'qualified.' + ('min' if low else 'max') + ('.class' if cls is not None else '.datatype'),
                facts,
                lambda: dict(
                    have=have,
                    limit=_limit_arg(limit),
                    qualifier=self._class_parts(cls) if cls is not None else [literal_part(datatype_json(datatype))],
                ),
            )
        if relationship:
            bound = "at least" if low else "at most"
            return _said(
                f'{who} is linked by {label} to {have} {(many if have != 1 else one)}; {every} must be {bound} {limit} {times}.',
                'qualified.' + ('min' if low else 'max') + ('.class' if cls is not None else '.datatype'),
                facts,
                lambda: dict(
                    have=have,
                    limit=_limit_arg(limit),
                    qualifier=self._class_parts(cls) if cls is not None else [literal_part(datatype_json(datatype))],
                ),
            )
        words = f"{label if have == 1 else plural(label)} that {'is' if have == 1 else 'are'} {one if have == 1 else many}"
        if low:
            return _said(
                f"{who} has {have or 'no'} {words}; {every} must have at least {limit}.",
                'qualified.' + ('min' if low else 'max') + ('.class' if cls is not None else '.datatype'),
                facts,
                lambda: dict(
                    have=have,
                    limit=_limit_arg(limit),
                    qualifier=self._class_parts(cls) if cls is not None else [literal_part(datatype_json(datatype))],
                ),
            )
        return _said(
            f'{who} has {have} {words}; {every} may have at most {limit}.',
            'qualified.' + ('min' if low else 'max') + ('.class' if cls is not None else '.datatype'),
            facts,
            lambda: dict(
                have=have,
                limit=_limit_arg(limit),
                qualifier=self._class_parts(cls) if cls is not None else [literal_part(datatype_json(datatype))],
            ),
        )

    def _shape_name(self, owner) -> str:
        label = self.shapes.value(owner, RDFS.label) if owner is not None else None
        return str(label) if label is not None else "This shape"

    def group(self, result: dict, owner, *, ui_metadata: bool = True) -> str:
        """What a problem is grouped under in its panel: the rule's path."""
        label, _ = self.path_words(result) if result["path"] is not None else ("", "")
        text = label if label and label != "value" else self._shape_name(owner)
        return MessageText(text, "validation.term", term=self._group_parts(result, owner)) if ui_metadata else text


def _target(shapes: Graph, node, sentences: Sentences) -> Optional[dict]:
    target = shapes.value(node, SH.targetClass)
    if target in (OWL.Class, RDFS.Class):
        one = "class"
    elif target == SKOS.Concept:
        one = "concept"
    elif isinstance(target, URIRef):
        one = noun(sentences.name(target))
    else:
        return None
    return {"iri": str(target), "label": sentences.name(target), "one": one, "many": plural(one)}


def _severity(term) -> str:
    return {SH.Violation: "violation", SH.Warning: "warning", SH.Info: "info"}.get(term, "violation")


# Where a blank-node shape is named for one run: pySHACL's use_shapes takes
# IRIs only, and the shape-by-shape pass must reach every listed shape.
_ALIAS = "urn:x-semantic-studio:shape:"


def named_shapes(shapes: Graph, listed: list) -> tuple[Graph, list, dict]:
    """A copy of the shapes with each listed blank-node shape under an IRI,
    the listed shapes as they are in it, and each one's id for the panels.
    The document itself is untouched."""
    aliases = {node: URIRef(_ALIAS + str(node)) for node in listed if isinstance(node, BNode)}
    ids = {aliases.get(node, node): shape_id(node) for node in listed}
    if not aliases:
        return shapes, listed, ids
    copy = Graph()
    for prefix, namespace in shapes.namespaces():
        copy.bind(prefix, namespace)
    swap = lambda t: aliases.get(t, t)  # noqa: E731
    for s, p, o in shapes:
        copy.add((swap(s), p, swap(o)))
    return copy, [aliases.get(node, node) for node in listed], ids


def panels(
    data: Graph, shapes: Graph, listed: list, results: list, errors: dict, languages: list,
    ids: Optional[dict] = None, sources: Optional[dict] = None,
) -> list[dict]:
    sentences = Sentences(data, shapes, languages)
    owner_of = _owners(shapes, listed)
    by_owner: dict = {node: [] for node in listed}
    for result in results:
        owner = owner_of(result["source"])
        if owner is not None:
            by_owner[owner].append(result)
    out = []
    for node in listed:
        label = shapes.value(node, RDFS.label)
        name = str(label) if label is not None else (
            prefixed(shapes, node) if isinstance(node, URIRef) and not str(node).startswith(_ALIAS) else "Unnamed shape")
        panel = {
            "id": ids[node] if ids else shape_id(node),
            "name": name,
            "target": _target(shapes, node, sentences),
            "focusCount": 0,
            "failingCount": 0,
            "problemCount": 0,
            "warningCount": 0,
            "problems": [],
            "problemsTotal": 0,
            "error": None,
            # The data snapshots whose individuals this shape checked
            # (csv-data-import 5.6), so the panel can say so.
            "data": [],
        }
        if label is None and (not isinstance(node, URIRef) or str(node).startswith(_ALIAS)):
            panel["nameUiMessage"] = make_message("words.validation.unnamed_shape")
        if node in errors:
            panel["state"] = "error"
            panel["error"] = str(errors[node])
            if getattr(errors[node], "ui_message", None) is not None:
                panel["errorUiMessage"] = errors[node].ui_message
            out.append(panel)
            continue
        found = by_owner[node]
        focus = focus_nodes(data, shapes, node)
        focus.update(r["focus"] for r in found if r["focus"] is not None)
        violations = [r for r in found if r["severity"] in (None, SH.Violation)]
        panel["focusCount"] = len(focus)
        if sources:
            panel["data"] = sorted({sources[f] for f in focus if f in sources})
        panel["failingCount"] = len({r["focus"] for r in violations})
        panel["problemCount"] = len(violations)
        panel["warningCount"] = len(found) - len(violations)
        if violations:
            panel["state"] = "fails"
        elif found:
            panel["state"] = "warnings"
        elif not focus:
            panel["state"] = "nothing"
        else:
            panel["state"] = "passes"
        problems = []
        for r in found:
            problems.append({
                "focus": str(r["focus"]) if isinstance(r["focus"], URIRef) else None,
                "focusLabel": sentences.name(r["focus"]),
                "group": sentences.group(r, node, ui_metadata=False),
                "sentence": sentences.sentence(r, node, ui_metadata=False),
                "_source": r,
                "value": sentences.value(r["value"]),
                "severity": _severity(r["severity"]),
            })
        problems.sort(key=lambda p: (p["group"].casefold(), p["focusLabel"].casefold(), p["sentence"]))
        panel["problemsTotal"] = len(problems)
        panel["problems"] = problems[:PANEL_CAP]
        for problem in panel["problems"]:
            report = problem.pop("_source")
            said = sentences.sentence(report, node)
            if getattr(said, "ui_message", None) is not None:
                problem["uiMessage"] = said.ui_message
            group = sentences.group(report, node)
            problem["groupUiMessage"] = group.ui_message
            if not isinstance(report["focus"], URIRef):
                problem["focusLabelUiMessage"] = make_message("validation.term", term=sentences._name_parts(report["focus"]))
            if report["value"] is not None and not isinstance(report["value"], (URIRef, Literal)):
                problem["valueUiMessage"] = make_message("validation.term", term=sentences._value_parts(report["value"]))
        out.append(panel)
    out.sort(key=lambda p: (STATE_ORDER[p["state"]], p["name"].casefold(), p["id"]))
    return out


class ResultReading:
    """The last check's display views; formatting never checks the model again.

    The renderer closes over the private checked graphs and recorded report.
    Returned API values remain ordinary dictionaries with the original basis.
    """
    def __init__(self, result: dict, languages, render: Optional[Callable] = None):
        self.result = result
        self.languages = tuple(languages)
        self.render = render
        self._views: dict = {}
        self._lock = threading.Lock()

    def for_languages(self, languages) -> dict:
        chosen = tuple(languages)
        if self.render is None or chosen == self.languages:
            return self.result
        with self._lock:
            if chosen not in self._views:
                self._views[chosen] = {**self.result, "shapes": self.render(list(chosen))}
            return self._views[chosen]


def validate(
    data: Graph, shapes: Graph, languages: list, timeout: Optional[float] = None,
    sources: Optional[dict] = None,
    *, on_reading: Optional[Callable[[ResultReading], None]] = None,
) -> dict:
    """Check the data against every shape, under the time limit (5.6)."""
    # A plain Graph, never a Dataset: rdflib follows a SPARQL constraint's
    # FROM <file:///...> or FROM <http://...> only on a dataset, through a
    # loader the broker does not see. On a plain Graph the clause is
    # ignored (security review of this build).
    if type(data) is not Graph:
        raise TypeError("The data checked must be a plain rdflib Graph.")
    limit = VALIDATE_TIMEOUT_SECONDS if timeout is None else timeout
    listed = listed_shapes(shapes)
    started = time.perf_counter()

    def work():
        named, run_listed, ids = named_shapes(shapes, listed)
        results, errors = run_shapes(data, named, run_listed) if listed else ([], {})
        def render(chosen):
            return panels(data, named, run_listed, results, errors, chosen, ids, sources)
        return render(languages), render

    base = {"statements": len(data), "shapeCount": len(listed)}
    pool = ThreadPoolExecutor(max_workers=1)
    try:
        future = pool.submit(contextvars.copy_context().run, work)
        try:
            shown, render = future.result(timeout=limit)
        except FuturesTimeout:
            # rdflib and pySHACL cannot be interrupted; the thread is left to
            # finish on its own and its answer is dropped, as SPARQL's is.
            return {**base, "stopped": True, "shapes": [], "durationMs": round(limit * 1000)}
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
    result = {
        **base,
        "stopped": False,
        "shapes": shown,
        "durationMs": round((time.perf_counter() - started) * 1000, 1),
    }
    if on_reading is not None:
        on_reading(ResultReading(result, languages, render))
    return result
