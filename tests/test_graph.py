import unittest

from algorithms.graph import Graph, GraphValidationError
from algorithms.models import Edge


class TestGraph(unittest.TestCase):
    def test_from_api_dict_builds_adjacency_undirected(self):
        graph = Graph.from_api_dict(
            {
                "nodes": ["A", "B", "C"],
                "edges": [{"source": "A", "target": "B", "weight": 2}],
                "directed": False,
            }
        )
        self.assertEqual(graph.neighbors("A"), [("B", 2.0)])
        self.assertEqual(graph.neighbors("B"), [("A", 2.0)])
        self.assertEqual(graph.neighbors("C"), [])

    def test_from_api_dict_directed(self):
        graph = Graph.from_api_dict(
            {
                "nodes": ["A", "B"],
                "edges": [{"source": "A", "target": "B", "weight": 1}],
                "directed": True,
            }
        )
        self.assertEqual(graph.neighbors("A"), [("B", 1.0)])
        self.assertEqual(graph.neighbors("B"), [])

    def test_rejects_empty_nodes(self):
        with self.assertRaises(GraphValidationError):
            Graph.from_api_dict({"nodes": [], "edges": []})

    def test_rejects_unknown_edge_node(self):
        with self.assertRaises(GraphValidationError):
            Graph.from_api_dict(
                {
                    "nodes": ["A"],
                    "edges": [{"source": "A", "target": "Z", "weight": 1}],
                }
            )

    def test_rejects_negative_weight(self):
        with self.assertRaises(GraphValidationError):
            Graph(
                nodes=("A", "B"),
                edges=(Edge("A", "B", -1),),
            )


if __name__ == "__main__":
    unittest.main()
