from flask import Flask, jsonify, render_template, request

from algorithms.graph import Graph, GraphValidationError
from algorithms.registry import get_algorithm, registered_names

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/run/<algo_name>", methods=["POST"])
def run_algorithm(algo_name):
    if algo_name not in registered_names():
        return jsonify({"error": f"Unknown algorithm '{algo_name}'"}), 400

    payload = request.get_json(force=True) or {}
    start = payload.get("start")

    try:
        graph = Graph.from_api_dict(payload) # Read graph from request body
    except GraphValidationError as exc:
        return jsonify({"error": str(exc)}), 400
 
    algo = get_algorithm(algo_name)
    if algo.requires_start:
        if start is None or start not in graph.nodes:
            return jsonify({"error": "Please choose a valid start node"}), 400
    else:
        start = None

    try:
        output = algo.run(graph, start=start).to_dict()
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(output)


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
