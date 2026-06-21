import unittest

from algorithms.bfs import BFS
from algorithms.graph import Graph


SAMPLE = Graph.from_api_dict(
    {
        "nodes": ["A", "B", "C", "D"],
        "edges": [
            {"source": "A", "target": "B", "weight": 1},
            {"source": "A", "target": "C", "weight": 1},
            {"source": "B", "target": "D", "weight": 1},
        ],
        "directed": False,
    }
)


class TestBFS(unittest.TestCase):
    def test_visit_order_from_a(self):
        result = BFS().run(SAMPLE, start="A")
        self.assertEqual(result.result["order"], ["A", "B", "C", "D"])
        self.assertTrue(result.steps)
        self.assertEqual(result.steps[0]["type"], "visit")


if __name__ == "__main__":
    unittest.main()
