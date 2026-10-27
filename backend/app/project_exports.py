"""
================================================================================
FILE: backend/app/project_exports.py
SUMMARY
    Captures accepted project documents alongside their original saved sources.
BASIC IDEA
    Serialize detached RDF so a read cannot change namespace/cache authority.
    Keep opaque files and originals while omitting drafts and trashed data.
INPUTS / INPUT SOURCES
    A project store and owned open-document snapshots under its editing gate.
EXPECTED OUTPUT
    Relative file entries or a ZIP containing complete accepted RDF and metadata.
================================================================================
"""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from rdflib import Graph, Literal
from rdflib.plugins.serializers.longturtle import LongTurtleSerializer
from .projects import DRAFT_DIR, TRASH_DIR


class _ExplicitLiteralTurtle(LongTurtleSerializer):
    def label(self, node, position):
        # Numeric shorthand would normalize an authored lexical "001" to "1".
        return node.n3() if isinstance(node, Literal) else super().label(node, position)


def current_project_files(projects, pid, documents):
    folder = projects.folder(pid)
    files = {}
    for path in sorted(folder.rglob('*')):
        relative = path.relative_to(folder)
        if relative.parts[0] not in (DRAFT_DIR, TRASH_DIR) and path.is_file():
            files[relative.as_posix()] = path
    original_prefix = '.semantic-studio-originals'
    suffix = 0
    while any(name == original_prefix or name.startswith(original_prefix + '/') for name in files):
        suffix += 1
        original_prefix = f'.semantic-studio-originals-{suffix}'
    for document in documents:
        with document.lock:
            name = document.path.relative_to(folder).as_posix()
            if name in files:
                files[original_prefix + '/' + name] = files[name]
            if document.last_text is not None and not document.visual_since_save:
                current = document.last_text.encode('utf-8')
            else:
                graph = Graph(bind_namespaces='none')
                for prefix, namespace in document.graph.namespaces():
                    graph.bind(prefix, namespace, override=True, replace=True)
                for statement in document.graph:
                    graph.add(statement)
                stream = BytesIO()
                _ExplicitLiteralTurtle(graph).serialize(stream, encoding='utf-8')
                current = stream.getvalue()
            files[name] = current
    return files


def current_project_zip(projects, pid, documents):
    files = current_project_files(projects, pid, documents)
    buffer = BytesIO()
    with ZipFile(buffer, 'w', ZIP_DEFLATED) as archive:
        for name, content in sorted(files.items()):
            if isinstance(content, Path):
                archive.write(content, name)
            else:
                archive.writestr(name, content)
    return buffer.getvalue()
