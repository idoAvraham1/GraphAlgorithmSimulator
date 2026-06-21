"""Shared domain types for graph algorithms."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Edge:
    """A weighted directed edge between two nodes (undirected graphs duplicate in adjacency)."""

    source: str
    target: str
    weight: float = 1.0


@dataclass
class TraceResult:
    """Algorithm output returned to the frontend as JSON."""

    steps: list[dict[str, Any]]  # ordered trace events for step-by-step playback
    result: dict[str, Any]  # final answer (order, distances, matrix, etc.)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for Flask jsonify — shape matches the pre-refactor API."""
        return {"steps": self.steps, "result": self.result}
