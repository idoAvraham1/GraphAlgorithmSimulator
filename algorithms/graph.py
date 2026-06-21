"""Graph domain model — structure and adjacency queries only."""

from __future__ import annotations

from dataclasses import dataclass
from functools import cached_property

from algorithms.models import Edge


class GraphValidationError(ValueError):
    """Raised when graph data violates domain invariants."""


@dataclass
class Graph:
    """Validated graph structure. Algorithms query neighbors here — no algo logic on Graph."""

    nodes: tuple[str, ...]
    edges: tuple[Edge, ...]
    directed: bool = False

    def __post_init__(self) -> None:
        if not self.nodes:
            raise GraphValidationError("Graph must have at least one node")
        if len(self.nodes) != len(set(self.nodes)):
            raise GraphValidationError("Node ids must be unique")

        node_set = set(self.nodes)
        for edge in self.edges:
            if edge.source not in node_set or edge.target not in node_set:
                raise GraphValidationError(
                    f"Edge {edge.source!r} -> {edge.target!r} references an unknown node"
                )
            if edge.weight < 0:
                raise GraphValidationError("Edge weights must be non-negative")

    @classmethod
    def from_api_dict(cls, data: dict) -> Graph:
        """Build a Graph from the JSON payload sent by the frontend."""
        raw_nodes = data.get("nodes", [])
        raw_edges = data.get("edges", [])
        directed = bool(data.get("directed", False))

        nodes = tuple(raw_nodes)
        edges = tuple(
            Edge(
                source=e["source"],
                target=e["target"],
                weight=float(e.get("weight", 1)),
            )
            for e in raw_edges
        )
        return cls(nodes=nodes, edges=edges, directed=directed)

    @cached_property
    def _adjacency(self) -> dict[str, list[tuple[str, float]]]:
        """Adjacency list built once; undirected edges are mirrored."""
        adj: dict[str, list[tuple[str, float]]] = {n: [] for n in self.nodes}
        for edge in self.edges:
            adj[edge.source].append((edge.target, edge.weight))
            if not self.directed:
                adj[edge.target].append((edge.source, edge.weight))
        return adj

    def neighbors(self, node: str) -> list[tuple[str, float]]:
        """Return sorted (neighbor, weight) pairs for a node."""
        return sorted(self._adjacency[node])

    @property
    def node_list(self) -> list[str]:
        """Mutable list copy of nodes (for algorithms that need list API)."""
        return list(self.nodes)

    @property
    def edge_dicts(self) -> list[dict]:
        """Edge list as dicts (compat for matrix-style initialization)."""
        return [
            {"source": e.source, "target": e.target, "weight": e.weight}
            for e in self.edges
        ]
