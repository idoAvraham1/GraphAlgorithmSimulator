import unittest

from algorithms.dijkstra import Dijkstra
from algorithms.graph import Graph


SAMPLE = Graph.from_api_dict(
    {
        "nodes": ["A", "B", "C", "D"],
        "edges": [
            {"source": "A", "target": "B", "weight": 1},
            {"source": "A", "target": "C", "weight": 4},
            {"source": "B", "target": "D", "weight": 2},
            {"source": "C", "target": "D", "weight": 1},
        ],
        "directed": False,
    }
)


class TestDijkstra(unittest.TestCase):
    def test_shortest_distances_from_a(self):
        result = Dijkstra().run(SAMPLE, start="A")
        distances = result.result["distances"]
        self.assertEqual(distances["A"], 0)
        self.assertEqual(distances["B"], 1)
        self.assertEqual(distances["C"], 4)
        self.assertEqual(distances["D"], 3)


if __name__ == "__main__":
    unittest.main()
