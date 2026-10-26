"""
================================================================================
FILE: backend/app/team/project_views.py
================================================================================
SUMMARY
    Projects authoritative team documents into ZIP exports and independent copies.
BASIC IDEA
    Saved source bytes remain provenance, while accepted document state supplies
    each ZIP's main RDF entries. Duplicates copy opaque files using the existing
    project service, then hydrate their typed document authority before opening.
INPUTS / INPUT SOURCES
    - A request-bound project store, editing service and immutable saved files.
EXPECTED OUTPUT
    - Current ZIP RDF with preserved originals, or an independent staged copy.
================================================================================
"""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from rdflib import Literal
from rdflib.plugins.serializers.longturtle import LongTurtleSerializer

from ..projects import ProjectStore, DRAFT_DIR, TRASH_DIR
from .rdf_codec import encode_graph, decode_graph


class _ExplicitLiteralTurtle(LongTurtleSerializer):
    def label(self, node, position):
        # Numeric shorthand changes lexical "001" to "1" when Turtle is read
        # again, even with literal normalization disabled. Public n3() retains
        # an explicitly typed quoted literal while keeping normal Turtle layout.
        return node.n3() if isinstance(node, Literal) else super().label(node, position)


class TeamProjectStore(ProjectStore):
    def duplicate(self, pid):
        summary = super().duplicate(pid)
        self.editing.clone_project_authority(pid, summary["id"])
        return self.summary(self.manifest(summary["id"]))

    def export_zip(self, pid):
        folder = self.folder(pid)
        files = {}
        for path in sorted(folder.rglob("*")):
            relative = path.relative_to(folder)
            if relative.parts[0] not in (DRAFT_DIR, TRASH_DIR) and path.is_file():
                files[relative.as_posix()] = path
        original_prefix = ".semantic-studio-originals"
        suffix = 0
        while any(name == original_prefix or name.startswith(original_prefix + "/") for name in files):
            suffix += 1
            original_prefix = f".semantic-studio-originals-{suffix}"
        for document in self.editing._open[pid].values():
            with document.lock:
                name = document.path.relative_to(folder).as_posix()
                files[original_prefix + "/" + name] = files[name]
                if document.last_text is not None and not document.visual_since_save:
                    current = document.last_text.encode("utf-8")
                else:
                    # Serializers may populate namespace bindings. Give them an
                    # independent graph so a read cannot change live authority
                    # or a document's source/serialization cache.
                    stream = BytesIO()
                    _ExplicitLiteralTurtle(decode_graph(encode_graph(document.graph))).serialize(stream, encoding="utf-8")
                    current = stream.getvalue()
                files[name] = current
        buffer = BytesIO()
        with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
            for name, content in sorted(files.items()):
                if isinstance(content, Path):
                    archive.write(content, name)
                else:
                    archive.writestr(name, content)
        return buffer.getvalue()
