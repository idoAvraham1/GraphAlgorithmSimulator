"""Algorithm registry — lightweight lookup by name."""

from __future__ import annotations

from algorithms.base import Algorithm
from algorithms.bfs import BFS
from algorithms.dfs import DFS
from algorithms.dijkstra import Dijkstra
from algorithms.floyd_warshall import FloydWarshall

# URL name → strategy instance. Add new algorithms here only — app.py stays unchanged.
_REGISTRY: dict[str, Algorithm] = {
    "bfs": BFS(),
    "dfs": DFS(),
    "dijkstra": Dijkstra(),
    "floyd-warshall": FloydWarshall(),
}


def get_algorithm(name: str) -> Algorithm:
    """Return the algorithm runner for a URL name (e.g. 'bfs' from /api/run/bfs)."""
    try:
        return _REGISTRY[name]
    except KeyError as exc:
        raise KeyError(f"Unknown algorithm '{name}'") from exc


def registered_names() -> frozenset[str]:
    """Valid algorithm names; used in app.py to reject unknown /api/run/<name> requests."""
    return frozenset(_REGISTRY.keys())


# Backward-compatible export for imports expecting ALGORITHMS dict
ALGORITHMS = _REGISTRY
