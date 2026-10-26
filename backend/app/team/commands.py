"""
================================================================================
FILE: backend/app/team/commands.py
================================================================================
SUMMARY
    Materializes isolated existing services from authoritative team resources.
BASIC IDEA
    Keep mutable evaluation detached until the authoritative transaction commits.
INPUTS / INPUT SOURCES
    - Validated team service requests and private persistent storage.
EXPECTED OUTPUT
    - Durable state with explicit failure and replay semantics.
================================================================================
"""
from pathlib import Path, PurePosixPath
from .context import bind_services
from .rdf_codec import encode_graph, decode_graph
from .project_views import TeamProjectStore


def resource_path(root, relative):
    path = PurePosixPath(relative)
    # A POSIX key must retain its meaning after a backup moves to Windows.
    # Colons can reset a drive while joining components or name an alternate
    # data stream, even though PurePosixPath calls the same key relative.
    if not relative or path.is_absolute() or ".." in path.parts or "\\" in relative or ":" in relative or str(path) != relative:
        raise ValueError("Invalid workspace file path")
    return Path(root).joinpath(*path.parts)

class Candidate:
    def __init__(self, root, resources, blobs):
        from ..store import OntologyStore, restore_team_graph
        from ..editing import EditingService
        from ..queries_store import SavedQueryStore
        from ..network_broker import NetworkBroker
        from ..imports import ImportsService
        self.root, self.blobs = Path(root), blobs
        for key, payload in resources.items():
            if key.startswith("file:"):
                path = resource_path(root, key[5:])
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(blobs.get(payload["blob"]))
        store = OntologyStore(root)
        projects = TeamProjectStore(root)
        hydration = dict(resources)
        class TeamEditing(EditingService):
            def _load(self, pid, doc, manifest):
                document = super()._load(pid, doc, manifest)
                oid = document.ontology.id
                if "graph:" + oid in hydration:
                    restore_team_graph(document.ontology, hydration["graph:" + oid]["graph"])
                state = hydration.get("state:" + oid)
                if state is not None:
                    for field in ("last_text", "visual_since_save", "dirty", "saved_text"):
                        setattr(document, field, state[field])
                    document.ontology.revision = state["revision"]
                return document

            def clone_project_authority(self, source, target):
                from ..projects import document_id
                for role, document in self._open[source].items():
                    with document.lock:
                        oid = document_id(target, role)
                        hydration["graph:" + oid] = {"graph": encode_graph(document.graph)}
                        hydration["state:" + oid] = {
                            "last_text": document.last_text, "visual_since_save": document.visual_since_save,
                            "dirty": document.dirty, "saved_text": document.saved_text,
                            "revision": document.ontology.revision,
                        }
                # Hydrate before open's layout prune can see the old raw file.
                # The copied raw bytes stay untouched for source provenance.
                self.open(target)
                for sid, original in self.snapshots._loaded.get(source, {}).items():
                    copied = self.snapshots._loaded[target][sid]
                    restore_team_graph(copied, encode_graph(original.graph))
                self.snapshots._generation[target] = self.snapshots._generation[source]

            def _arm(self, document):
                # Team edits are durable transactions, never timer-owned drafts.
                self._cancel(document)

            def close(self, pid, discard=False):
                return super().close(pid, discard=True)
        editing = TeamEditing(projects, store)
        projects.editing = editing
        self.services = {"store": store, "project_store": projects,
                         "editing_service": editing, "saved_queries": SavedQueryStore(root),
                         "broker": NetworkBroker(root), "imports_service": ImportsService(store)}
        with bind_services(self.services):
            for project in projects.list():
                editing.open(project["id"])
            for ontology in list(store._items.values()) + list(store._documents.values()):
                graph = resources.get("graph:" + ontology.id)
                if graph is not None:
                    restore_team_graph(ontology, graph["graph"])
            for pid, snapshots in editing.snapshots._loaded.items():
                generation = resources.get("state:snapshots:" + pid)
                if generation is not None:
                    editing.snapshots._generation[pid] = generation["generation"]
                for sid, snapshot in snapshots.items():
                    payload = resources.get("graph:snapshot:" + pid + ":" + sid)
                    if payload is not None:
                        restore_team_graph(snapshot, payload["graph"])
            for key, payload in resources.items():
                if key.startswith("graph:import:"):
                    self.services["imports_service"].cache._graphs[key[len("graph:import:"):]] = decode_graph(payload["graph"])

    def capture(self):
        result = {}
        with bind_services(self.services):
            for project in self.services["project_store"].list():
                if not self.services["editing_service"].is_open(project["id"]):
                    self.services["editing_service"].open(project["id"])
        from ..projects import graph_counts, _now
        # The shared graph is already durable independently of formatting Save.
        # Cards must describe that graph while the original source stays exact.
        for pid, documents in self.services["editing_service"]._open.items():
            model = documents["model"]
            counts = graph_counts(model.graph)
            manifest = self.services["project_store"].manifest(pid)
            if manifest.get("counts") != counts:
                self.services["project_store"].update_manifest(pid, counts=counts, updatedAt=_now())
        # Exclude timers' scratch files: only application data is versioned.
        for path in self.root.rglob("*"):
            if path.is_file() and not path.name.endswith(".tmp") and ".draft" not in path.relative_to(self.root).parts:
                result["file:" + path.relative_to(self.root).as_posix()] = {"blob": self.blobs.put(path.read_bytes())}
        store = self.services["store"]
        for ontology in list(store._items.values()) + list(store._documents.values()):
            if ontology.graph is not None:
                result["graph:" + ontology.id] = {"graph": encode_graph(ontology.graph)}
        for docs in self.services["editing_service"]._open.values():
            for document in docs.values():
                result["state:" + document.ontology.id] = {
                    "last_text": document.last_text, "visual_since_save": document.visual_since_save,
                    "dirty": document.dirty, "saved_text": document.saved_text,
                    "revision": document.ontology.revision,
                }
        snapshots = self.services["editing_service"].snapshots
        for pid, loaded in snapshots._loaded.items():
            result["state:snapshots:" + pid] = {"generation": snapshots._generation[pid]}
            for sid, snapshot in loaded.items():
                result["graph:snapshot:" + pid + ":" + sid] = {"graph": encode_graph(snapshot.graph)}
        for key, graph in self.services["imports_service"].cache._graphs.items():
            result["graph:import:" + key] = {"graph": encode_graph(graph)}
        return result
