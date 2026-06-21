# Graph Algorithm Simulator

Interactive web app for building weighted graphs and stepping through **BFS**, **DFS**, **Dijkstra**, and **Floyd–Warshall** with live visualization — visited nodes, frontier updates, edge relaxations, and all-pairs distance matrices.

**Stack:** Flask · Gunicorn · Cytoscape.js · vanilla JS

## Features

- Draw graphs on a canvas — add nodes, connect edges, edit weights, toggle directed/undirected
- Step-by-step playback with play/pause, scrubbing, and a clickable step log
- Algorithm-specific panels: visit order (BFS/DFS), shortest distances (Dijkstra), distance matrix (Floyd–Warshall)
- Preset example graphs, keyboard shortcuts, and run statistics

## Quick start

```bash
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open [http://localhost:5000](http://localhost:5000).

For production-style local runs:

```bash
gunicorn app:app
```

## Usage

1. Use the toolbar to add nodes, connect edges, edit weights, or delete nodes. Click a tool again (or press **Esc**) to exit editing mode and pan/drag freely.
2. Choose an algorithm and start node (Floyd–Warshall needs no start). Load a **preset** from the dropdown or build your own graph, then click **Run**.
3. Watch the trace replay on the canvas. Scrub the timeline or click steps in the log to jump around.

Press **?** in the app for the full shortcut list.

## Architecture

```
algorithms/
  models.py          Edge, TraceResult
  graph.py           Graph — validation, adjacency, from_api_dict()
  base.py            Algorithm protocol (Strategy pattern)
  bfs.py, dfs.py, dijkstra.py, floyd_warshall.py
  registry.py        name → algorithm lookup
app.py               HTTP layer
templates/           index.html
static/              Cytoscape canvas + step player
tests/               unittest suite
```

Each algorithm implements `run(graph, *, start=...) -> TraceResult` and is registered by name in `registry.py`. To add a new one: create a module, implement the protocol, add one line to the registry.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Web UI |
| `GET` | `/healthz` | Health check |
| `POST` | `/api/run/<algo>` | Run algorithm and return step trace |

`<algo>` is one of `bfs`, `dfs`, `dijkstra`, `floyd-warshall`.

**Request body:**

```json
{
  "nodes": ["A", "B", "C"],
  "edges": [{"source": "A", "target": "B", "weight": 4}],
  "directed": false,
  "start": "A"
}
```

**Response:**

```json
{
  "steps": [{"type": "visit", "node": "A", "...": "..."}],
  "result": {"order": ["A", "B", "C"]}
}
```

Step types vary by algorithm: `visit` / `discover` (BFS), `visit` (DFS), `settle` / `relax` (Dijkstra), `init` / `update` (Floyd–Warshall).

## Tests

```bash
python -m unittest discover -s tests -v
```

## Deploy

The repo includes a `Procfile` for platforms that read it automatically.

**Render** (recommended for a stable free-tier demo link):

1. Push this repo to GitHub.
2. Create a **Web Service** on [render.com](https://render.com) and connect the repo.
3. **Build command:** `pip install -r requirements.txt`
4. **Start command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Deploy — Render provides a public HTTPS URL.

[Railway](https://railway.com) works the same way if you prefer it.

> Free tiers may sleep after inactivity. The first visit after idle time can take a few seconds to wake up.

## Possible extensions

- Bellman–Ford; Kruskal / Prim (MST)
- Johnson's algorithm alongside Floyd–Warshall for runtime comparison
- Persist and share graphs via URL (e.g. SQLite + encoded state)
- Display Big-O complexity vs. actual step count
