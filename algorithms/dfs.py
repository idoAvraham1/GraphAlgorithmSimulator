"""Depth-first search with step tracing."""

from __future__ import annotations

from algorithms.graph import Graph
from algorithms.models import TraceResult


class DFS:
    """Depth-first traversal. Ignores edge weights. Emits visit steps for the UI."""

    name = "dfs"
    requires_start = True

    def run(self, graph: Graph, *, start: str | None = None) -> TraceResult:
        """Record each visit; result.order is the DFS visit sequence."""
        if start is None:
            raise ValueError("DFS requires a start node")

        visited: set[str] = set()
        order: list[str] = []
        steps: list[dict] = []

        def visit(node: str, parent: str | None) -> None:
            visited.add(node)
            order.append(node)
            steps.append(
                {
                    "type": "visit",
                    "node": node,
                    "from": parent,
                    "visited": list(visited),
                }
            )
            for neighbor, _weight in graph.neighbors(node):
                if neighbor not in visited:
                    visit(neighbor, node)

        visit(start, None)
        return TraceResult(steps=steps, result={"order": order})
