"""Floyd–Warshall all-pairs shortest paths with step tracing."""

from __future__ import annotations

from algorithms.graph import Graph
from algorithms.models import TraceResult


class FloydWarshall:
    """All-pairs shortest paths. No start node — populates the matrix tab in the UI."""

    name = "floyd-warshall"
    requires_start = False

    def run(self, graph: Graph, *, start: str | None = None) -> TraceResult:
        """Emit init/update steps with matrix snapshots; start is ignored."""
        nodes = graph.node_list
        n = len(nodes)
        idx = {node: i for i, node in enumerate(nodes)}
        inf = float("inf")
        dist = [[0 if i == j else inf for j in range(n)] for i in range(n)]
        nxt = [[None for _ in range(n)] for _ in range(n)]

        for e in graph.edge_dicts:
            u, v, w = idx[e["source"]], idx[e["target"]], e["weight"]
            if w < dist[u][v]:
                dist[u][v] = w
                nxt[u][v] = v
            if not graph.directed and w < dist[v][u]:
                dist[v][u] = w
                nxt[v][u] = u

        def matrix_snapshot() -> list[list[float | None]]:
            return [
                [(dist[i][j] if dist[i][j] != inf else None) for j in range(n)]
                for i in range(n)
            ]

        steps: list[dict] = [
            {"type": "init", "k": None, "matrix": matrix_snapshot(), "nodes": nodes}
        ]

        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
                        nxt[i][j] = nxt[i][k]
                        steps.append(
                            {
                                "type": "update",
                                "k": nodes[k],
                                "i": nodes[i],
                                "j": nodes[j],
                                "matrix": matrix_snapshot(),
                                "nodes": nodes,
                            }
                        )

        has_negative_cycle = any(dist[i][i] < 0 for i in range(n))

        final_matrix = matrix_snapshot()
        result_distances = {
            u: {v: final_matrix[idx[u]][idx[v]] for v in nodes} for u in nodes
        }

        return TraceResult(
            steps=steps,
            result={
                "matrix": final_matrix,
                "nodes": nodes,
                "distances": result_distances,
                "has_negative_cycle": has_negative_cycle,
            },
        )
