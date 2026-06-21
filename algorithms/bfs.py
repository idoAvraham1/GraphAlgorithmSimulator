"""Breadth-first search with step tracing."""

from __future__ import annotations

from collections import deque

from algorithms.graph import Graph
from algorithms.models import TraceResult


class BFS:
    """Level-order traversal. Ignores edge weights. Emits visit/discover steps for the UI."""

    name = "bfs"
    requires_start = True

    def run(self, graph: Graph, *, start: str | None = None) -> TraceResult:
        """Record each visit and discovery; result.order is the BFS visit sequence."""
        if start is None:
            raise ValueError("BFS requires a start node")

        visited = {start}
        order = [start]
        queue = deque([start])
        steps = [
            {
                "type": "visit",
                "node": start,
                "visited": list(visited),
                "frontier": list(queue),
            }
        ]

        while queue:
            current = queue.popleft()
            for neighbor, _weight in graph.neighbors(current):
                if neighbor not in visited:
                    visited.add(neighbor)
                    order.append(neighbor)
                    queue.append(neighbor)
                    steps.append(
                        {
                            "type": "discover",
                            "from": current,
                            "node": neighbor,
                            "visited": list(visited),
                            "frontier": list(queue),
                        }
                    )

        return TraceResult(steps=steps, result={"order": order})
