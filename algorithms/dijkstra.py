"""Dijkstra shortest-path with step tracing."""

from __future__ import annotations

import heapq

from algorithms.graph import Graph
from algorithms.models import TraceResult


class Dijkstra:
    """Single-source shortest paths (non-negative weights). Populates the Distances tab."""

    name = "dijkstra"
    requires_start = True

    def run(self, graph: Graph, *, start: str | None = None) -> TraceResult:
        """Emit settle/relax steps with a distances snapshot; result includes paths."""
        if start is None:
            raise ValueError("Dijkstra requires a start node")

        nodes = graph.node_list
        dist = {n: float("inf") for n in nodes}
        prev = {n: None for n in nodes}
        dist[start] = 0
        visited: set[str] = set()
        pq: list[tuple[float, str]] = [(0, start)]
        steps: list[dict] = []

        while pq:
            d, current = heapq.heappop(pq)
            if current in visited:
                continue
            visited.add(current)
            steps.append(
                {
                    "type": "settle",
                    "node": current,
                    "distance": d,
                    "distances": {
                        k: (v if v != float("inf") else None) for k, v in dist.items()
                    },
                    "visited": list(visited),
                }
            )
            for neighbor, weight in graph.neighbors(current):
                if neighbor in visited:
                    continue
                new_dist = d + weight
                if new_dist < dist[neighbor]:
                    dist[neighbor] = new_dist
                    prev[neighbor] = current
                    heapq.heappush(pq, (new_dist, neighbor))
                    steps.append(
                        {
                            "type": "relax",
                            "from": current,
                            "node": neighbor,
                            "distance": new_dist,
                            "distances": {
                                k: (v if v != float("inf") else None)
                                for k, v in dist.items()
                            },
                            "visited": list(visited),
                        }
                    )

        paths: dict[str, list[str] | None] = {}
        for n in nodes:
            if dist[n] == float("inf"):
                paths[n] = None
                continue
            path: list[str] = []
            node: str | None = n
            while node is not None:
                path.append(node)
                node = prev[node]
            paths[n] = list(reversed(path))

        clean_dist = {k: (v if v != float("inf") else None) for k, v in dist.items()}
        return TraceResult(
            steps=steps,
            result={"distances": clean_dist, "paths": paths},
        )
