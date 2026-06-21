import unittest

from algorithms.registry import get_algorithm, registered_names


class TestRegistry(unittest.TestCase):
    def test_registered_names(self):
        names = registered_names()
        self.assertIn("bfs", names)
        self.assertIn("floyd-warshall", names)

    def test_unknown_algorithm_raises(self):
        with self.assertRaises(KeyError):
            get_algorithm("bellman-ford")

    def test_get_bfs_requires_start(self):
        algo = get_algorithm("bfs")
        self.assertTrue(algo.requires_start)

    def test_get_floyd_does_not_require_start(self):
        algo = get_algorithm("floyd-warshall")
        self.assertFalse(algo.requires_start)


if __name__ == "__main__":
    unittest.main()
