import unittest

from algorithms.dfs import DFS
from algorithms.graph import Graph


SAMPLE = Graph.from_api_dict(
    {
        "nodes": ["A", "B", "C"],
        "edges": [
            {"source": "A", "target": "B", "weight": 1},
            {"source": "A", "target": "C", "weight": 1},
        ],
        "directed": False,
    }
)


class TestDFS(unittest.TestCase):
    def test_visits_all_reachable_nodes(self):
        result = DFS().run(SAMPLE, start="A")
        self.assertEqual(sorted(result.result["order"]), ["A", "B", "C"])
        self.assertEqual(result.steps[0]["type"], "visit")


if __name__ == "__main__":
    unittest.main()
