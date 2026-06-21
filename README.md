# Graph Algorithm Simulator

Build a graph by hand, then watch BFS, DFS, Dijkstra, or Floyd–Warshall run
on it step by step — visited nodes, relaxed edges, and (for Dijkstra) live
shortest-distance updates; Floyd–Warshall shows the all-pairs matrix.

- **Backend:** Flask REST API, `Graph` domain model, pluggable algorithm strategies
- **Frontend:** Cytoscape.js canvas, vanilla JS step player

## Run locally

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000

## How it works

1. Use the toolbar to add nodes, connect edges, edit weights, or delete nodes.
   Click a tool again (or press **Esc**) to exit editing and pan/drag freely.
2. Pick an algorithm and start node (not needed for Floyd–Warshall). Load a
   **preset graph** from the dropdown or build your own, then hit **Run**.
3. The backend builds a `Graph` from your payload, runs the selected algorithm,
   and returns a step trace (`visit`, `discover`, `settle`, `relax`, `update`, …).
   The frontend replays those steps with play/pause and scrubbing.

## Backend layout

```
algorithms/
  graph.py           # Graph — validation, adjacency, from_api_dict()
  models.py          # Edge, TraceResult
  base.py            # Algorithm protocol (Strategy pattern)
  bfs.py, dfs.py, dijkstra.py, floyd_warshall.py
  registry.py        # get_algorithm("bfs") lookup
app.py               # HTTP layer only
tests/               # unittest suite
```

Each algorithm implements `run(graph, start=...) -> TraceResult` and is registered
by name in `registry.py`. To add a new algorithm: create a module, implement the
protocol, and add one line to the registry.

## API

`POST /api/run/<algo>` where `<algo>` is one of `bfs`, `dfs`, `dijkstra`,
`floyd-warshall`.

```json
{
  "nodes": ["A", "B", "C"],
  "edges": [{"source": "A", "target": "B", "weight": 4}],
  "directed": false,
  "start": "A"
}
```

Returns `{"steps": [...], "result": {...}}`.

## Tests

```bash
python -m unittest discover -s tests -v
```

## Deploying (free tier)

**Render or Railway** (recommended — both auto-deploy from GitHub):

1. Push this repo to GitHub.
2. Create a new Web Service on [render.com](https://render.com) or
   [railway.com](https://railway.com) and point it at the repo.
3. Build command: `pip install -r requirements.txt`
   Start command: `gunicorn app:app` (already set in `Procfile`)
4. Deploy. You'll get a public HTTPS URL.

Note: free tiers may "sleep" after inactivity, so the first load after
a while can take a few seconds — worth a one-line mention next to the
link on your resume.

## Ideas for extending this

- Add Bellman-Ford and Kruskal/Prim (MST) — add a class + registry entry
- Add Johnson's algorithm as a companion to Floyd–Warshall for runtime comparison
- Persist saved graphs (e.g. SQLite) so people can share a graph by URL
- Show Big-O complexity and actual step count side by side
