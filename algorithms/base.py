"""Algorithm interface (Strategy pattern)."""

from __future__ import annotations

from typing import Protocol

from algorithms.graph import Graph
from algorithms.models import TraceResult


class Algorithm(Protocol):
    """Structural interface — implementors (BFS, DFS, …) need not inherit from this class.

    The * in run() means start must be passed as a keyword arg (e.g. start="A").
    """

    name: str  # registry key, matches /api/run/<name>
    requires_start: bool  # False for Floyd–Warshall (all-pairs)

    def run(self, graph: Graph, *, start: str | None = None) -> TraceResult: ...
