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
from ..projects import ProjectStore
from ..project_exports import current_project_zip


class TeamProjectStore(ProjectStore):
    authoritative_document_views = True

    def duplicate(self, pid):
        summary = super().duplicate(pid)
        self.editing.clone_project_authority(pid, summary["id"])
        return self.summary(self.manifest(summary["id"]))

    def export_zip(self, pid):
        return current_project_zip(self, pid, self.editing._open[pid].values())
