import unittest

from algorithms.floyd_warshall import FloydWarshall
from algorithms.graph import Graph


SAMPLE = Graph.from_api_dict(
    {
        "nodes": ["A", "B"],
        "edges": [{"source": "A", "target": "B", "weight": 3}],
        "directed": True,
    }
)


class TestFloydWarshall(unittest.TestCase):
    def test_all_pairs_distances(self):
        result = FloydWarshall().run(SAMPLE)
        matrix = result.result["matrix"]
        self.assertEqual(matrix[0][1], 3)
        self.assertIsNone(matrix[1][0])
        self.assertEqual(result.steps[0]["type"], "init")


if __name__ == "__main__":
    unittest.main()
