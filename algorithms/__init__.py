"""Backend algorithms package: Graph model, strategy runners, and registry lookup."""

from algorithms.registry import ALGORITHMS, get_algorithm, registered_names

__all__ = ["ALGORITHMS", "get_algorithm", "registered_names"]
