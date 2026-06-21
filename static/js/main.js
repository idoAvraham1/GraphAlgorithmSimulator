// ---------------------------------------------------------------------------
// Graph Algorithm Simulator — frontend
// Builds a graph on a Cytoscape canvas, sends it to the Flask backend,
// then animates the returned step trace.
// ---------------------------------------------------------------------------

const ONBOARDING_KEY = "graph-sim-onboarding-v1";

const ALGO_META = {
  bfs: { name: "BFS", desc: "O(V + E) · Level-order traversal" },
  dfs: { name: "DFS", desc: "O(V + E) · Depth-first exploration" },
  dijkstra: { name: "Dijkstra", desc: "O((V + E) log V) · Shortest path, non-negative weights" },
  "floyd-warshall": { name: "Floyd–Warshall", desc: "O(V³) · All-pairs shortest paths" },
};

const GRAPH_PRESETS = {
  sample: {
    label: "Sample graph",
    directed: false,
    positions: {
      A: { x: 120, y: 200 },
      B: { x: 300, y: 100 },
      C: { x: 300, y: 300 },
      D: { x: 480, y: 200 },
      E: { x: 650, y: 200 },
    },
    edges: [
      ["A", "B", 4],
      ["A", "C", 2],
      ["B", "C", 1],
      ["B", "D", 5],
      ["C", "D", 8],
      ["D", "E", 3],
    ],
  },
  disconnected: {
    label: "Disconnected components",
    directed: false,
    positions: {
      A: { x: 90, y: 140 },
      B: { x: 240, y: 140 },
      C: { x: 390, y: 140 },
      D: { x: 90, y: 300 },
      E: { x: 240, y: 300 },
      F: { x: 390, y: 300 },
    },
    edges: [
      ["A", "B", 1],
      ["B", "C", 1],
      ["D", "E", 1],
      ["E", "F", 1],
    ],
  },
  "weighted-paths": {
    label: "Weighted paths",
    directed: false,
    positions: {
      A: { x: 100, y: 220 },
      B: { x: 280, y: 90 },
      C: { x: 280, y: 350 },
      D: { x: 500, y: 220 },
    },
    edges: [
      ["A", "B", 1],
      ["A", "C", 4],
      ["B", "D", 2],
      ["C", "D", 1],
      ["A", "D", 10],
    ],
  },
  dense: {
    label: "Dense graph",
    directed: true,
    positions: {
      A: { x: 140, y: 110 },
      B: { x: 380, y: 110 },
      C: { x: 140, y: 290 },
      D: { x: 380, y: 290 },
    },
    edges: [
      ["A", "B", 3],
      ["A", "C", 8],
      ["A", "D", 5],
      ["B", "C", 2],
      ["B", "D", 1],
      ["C", "D", 4],
    ],
  },
};

const cy = cytoscape({
  container: document.getElementById("cy"),
  style: [
    {
      selector: "node",
      style: {
        "background-color": "#FFFFFF",
        "border-width": 2,
        "border-color": "#6B7280",
        label: "data(id)",
        color: "#374151",
        "font-family": "JetBrains Mono, monospace",
        "font-size": 13,
        "text-valign": "center",
        "text-halign": "center",
        width: 40,
        height: 40,
        "transition-property": "background-color, border-color, border-width",
        "transition-duration": "180ms",
      },
    },
    {
      selector: "node.frontier",
      style: { "border-color": "#FFB454", "border-width": 3 },
    },
    {
      selector: "node.visited",
      style: { "background-color": "#E6FFFA", "border-color": "#58E6D9" },
    },
    {
      selector: "node.current",
      style: { "background-color": "#FFF4E0", "border-color": "#FFB454", "border-width": 4 },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#9CA3AF",
        "target-arrow-color": "#9CA3AF",
        "target-arrow-shape": "none",
        "curve-style": "bezier",
        label: "data(weight)",
        color: "#4B5563",
        "font-family": "JetBrains Mono, monospace",
        "font-size": 11,
        "text-background-color": "#FFFFFF",
        "text-background-opacity": 1,
        "text-background-padding": 2,
        "overlay-padding": 10,
        "overlay-opacity": 0,
        "transition-property": "line-color, width",
        "transition-duration": "180ms",
      },
    },
    {
      selector: "edge.directed",
      style: { "target-arrow-shape": "triangle" },
    },
    {
      selector: "edge.active",
      style: { "line-color": "#FFB454", "target-arrow-color": "#FFB454", width: 3 },
    },
    {
      selector: "edge.tree",
      style: { "line-color": "#58E6D9", "target-arrow-color": "#58E6D9", width: 3 },
    },
    {
      selector: "edge.editing",
      style: {
        "line-color": "#79C0FF",
        "target-arrow-color": "#79C0FF",
        width: 4,
      },
    },
  ],
  layout: { name: "preset" },
  minZoom: 0.4,
  maxZoom: 2.5,
  wheelSensitivity: 0.3,
  boxSelectionEnabled: false,
});

let isPlaybackActive = false;

// Larger tap targets on touch devices
if (window.matchMedia("(pointer: coarse)").matches) {
  cy.style()
    .selector("node")
    .style({ width: 48, height: 48, "font-size": 14 })
    .update();
}

let nodeCounter = 0;
let mode = null;
let connectSource = null;
let pendingEdgeTarget = null;
let editingEdge = null;
let popoverContext = "create"; // 'create' | 'edit'
let currentPresetId = "sample";
let pendingPresetId = null;
let previewMousePos = null;

const canvasWrap = document.getElementById("canvas-wrap");
const modeBadge = document.getElementById("mode-badge");
const modeBadgeLabel = document.getElementById("mode-badge-label");
const modeHint = document.getElementById("mode-hint");
const startSelect = document.getElementById("start-select");
const startField = document.getElementById("start-field");
const algoSelect = document.getElementById("algo-select");
const directedToggle = document.getElementById("directed-toggle");
const algoDesc = document.getElementById("algo-desc");
const colorLegend = document.getElementById("color-legend");
const progressWrap = document.getElementById("progress-wrap");
const stepProgress = document.getElementById("step-progress");
const stepProgressFill = document.getElementById("step-progress-fill");
const runStats = document.getElementById("run-stats");

const clearDialog = document.getElementById("clear-dialog");
const clearDialogBackdrop = document.getElementById("clear-dialog-backdrop");
const clearDialogCancel = document.getElementById("clear-dialog-cancel");
const clearDialogConfirm = document.getElementById("clear-dialog-confirm");

const shortcutsBtn = document.getElementById("shortcuts-btn");
const shortcutsDialog = document.getElementById("shortcuts-dialog");
const shortcutsDialogBackdrop = document.getElementById("shortcuts-dialog-backdrop");
const shortcutsDialogClose = document.getElementById("shortcuts-dialog-close");

const presetSelect = document.getElementById("preset-select");
const presetDialog = document.getElementById("preset-dialog");
const presetDialogBackdrop = document.getElementById("preset-dialog-backdrop");
const presetDialogCancel = document.getElementById("preset-dialog-cancel");
const presetDialogConfirm = document.getElementById("preset-dialog-confirm");
const presetDialogDesc = document.getElementById("preset-dialog-desc");

const connectPreview = document.getElementById("connect-preview");
const connectPreviewLine = document.getElementById("connect-preview-line");

const addNodeBtn = document.getElementById("add-node-btn");
const connectModeBtn = document.getElementById("connect-mode-btn");
const editEdgeBtn = document.getElementById("edit-edge-btn");
const deleteModeBtn = document.getElementById("delete-mode-btn");

const weightPopover = document.getElementById("weight-popover");
const weightInput = document.getElementById("weight-input");
const weightPopoverLabel = document.getElementById("weight-popover-label");
const weightConfirm = document.getElementById("weight-confirm");
const weightCancel = document.getElementById("weight-cancel");
const weightDelete = document.getElementById("weight-delete");
const weightPopoverClose = document.getElementById("weight-popover-close");
const toastContainer = document.getElementById("toast-container");
const onboardingEl = document.getElementById("onboarding");

function updateAlgoDesc() {
  const meta = ALGO_META[algoSelect.value];
  if (meta) algoDesc.textContent = meta.desc;
}

function setNodeGrabbing(enabled) {
  if (enabled) cy.nodes().grabify();
  else cy.nodes().ungrabify();
}

function showDialog(dialog) {
  dialog.hidden = false;
}

function hideDialog(dialog) {
  dialog.hidden = true;
}

function isDialogOpen() {
  return (
    !clearDialog.hidden ||
    !shortcutsDialog.hidden ||
    !presetDialog.hidden ||
    !onboardingEl.hidden
  );
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

updateAlgoDesc();
setNodeGrabbing(true);

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

function showToast(message, type = "info", duration = 4500) {
  const icons = { info: "ℹ", error: "✕", warning: "!", success: "✓" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
    <span class="toast-body">${message}</span>
    <button type="button" class="toast-close" aria-label="Dismiss">×</button>
  `;

  const dismiss = () => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  };

  toast.querySelector(".toast-close").addEventListener("click", dismiss);
  toastContainer.appendChild(toast);

  if (duration > 0) setTimeout(dismiss, duration);
}

// ---------------------------------------------------------------------------
// Edge weight popover
// ---------------------------------------------------------------------------

function hideWeightPopover() {
  weightPopover.hidden = true;
  pendingEdgeTarget = null;
  popoverContext = "create";
  if (editingEdge) {
    editingEdge.removeClass("editing");
    editingEdge = null;
  }
  if (connectSource) {
    connectSource.removeClass("frontier");
    connectSource = null;
  }
  weightDelete.hidden = true;
  weightConfirm.textContent = "Add edge";
  hideConnectPreview();
}

// ---------------------------------------------------------------------------
// Connect-mode preview line
// ---------------------------------------------------------------------------

function hideConnectPreview() {
  connectPreview.hidden = true;
  previewMousePos = null;
}

function updateConnectPreview(clientX, clientY) {
  if (clientX !== undefined && clientY !== undefined) {
    const rect = canvasWrap.getBoundingClientRect();
    previewMousePos = { x: clientX - rect.left, y: clientY - rect.top };
  }

  if (mode !== "connect" || !connectSource || !weightPopover.hidden) {
    connectPreview.hidden = true;
    return;
  }

  const src = connectSource.renderedPosition();
  const target = previewMousePos || { x: src.x, y: src.y };

  connectPreview.hidden = false;
  connectPreviewLine.setAttribute("x1", String(src.x));
  connectPreviewLine.setAttribute("y1", String(src.y));
  connectPreviewLine.setAttribute("x2", String(target.x));
  connectPreviewLine.setAttribute("y2", String(target.y));
}

canvasWrap.addEventListener("mousemove", (e) => updateConnectPreview(e.clientX, e.clientY));
canvasWrap.addEventListener("mouseleave", hideConnectPreview);

function edgeEndpoints(edge) {
  return {
    source: cy.getElementById(edge.data("source")),
    target: cy.getElementById(edge.data("target")),
  };
}

function edgeLabel(sourceId, targetId) {
  const arrow = directedToggle.checked ? "→" : "↔";
  return `${sourceId} ${arrow} ${targetId}`;
}

function positionWeightPopoverAtEndpoints(sourceNode, targetNode) {
  const sourcePos = sourceNode.renderedPosition();
  const targetPos = targetNode.renderedPosition();
  const screenX = (sourcePos.x + targetPos.x) / 2;
  const screenY = (sourcePos.y + targetPos.y) / 2;

  weightPopover.hidden = false;
  const popW = weightPopover.offsetWidth || 240;
  const popH = weightPopover.offsetHeight || 140;
  let left = screenX - popW / 2;
  let top = screenY - popH - 12;
  left = Math.max(8, Math.min(left, canvasWrap.clientWidth - popW - 8));
  top = Math.max(8, Math.min(top, canvasWrap.clientHeight - popH - 8));
  weightPopover.style.left = `${left}px`;
  weightPopover.style.top = `${top}px`;
}

function positionWeightPopoverForEdge(edge) {
  const { source, target } = edgeEndpoints(edge);
  positionWeightPopoverAtEndpoints(source, target);
}

function parseWeightInput() {
  const raw = weightInput.value.trim();
  const weight = parseFloat(raw);
  if (raw === "" || Number.isNaN(weight) || weight < 0) {
    showToast("Enter a valid non-negative number for the edge weight.", "warning");
    weightInput.focus();
    return null;
  }
  return weight;
}

function showCreateWeightPopover(sourceNode, targetNode) {
  popoverContext = "create";
  pendingEdgeTarget = targetNode;
  weightPopoverLabel.textContent = edgeLabel(sourceNode.id(), targetNode.id());
  weightInput.value = "1";
  weightDelete.hidden = true;
  weightConfirm.textContent = "Add edge";
  positionWeightPopoverAtEndpoints(sourceNode, targetNode);
  weightInput.focus();
  weightInput.select();
}

function showEditWeightPopover(edge) {
  if (editingEdge) editingEdge.removeClass("editing");
  popoverContext = "edit";
  editingEdge = edge;
  edge.addClass("editing");
  const sourceId = edge.data("source");
  const targetId = edge.data("target");
  weightPopoverLabel.textContent = edgeLabel(sourceId, targetId);
  weightInput.value = String(edge.data("weight"));
  weightDelete.hidden = false;
  weightConfirm.textContent = "Save";
  positionWeightPopoverForEdge(edge);
  weightInput.focus();
  weightInput.select();
}

function confirmEdgeWeight() {
  const weight = parseWeightInput();
  if (weight === null) return;

  if (popoverContext === "edit" && editingEdge) {
    const sourceId = editingEdge.data("source");
    const targetId = editingEdge.data("target");
    editingEdge.data("weight", weight);
    showToast(`Updated edge ${edgeLabel(sourceId, targetId)} — weight ${weight}`, "success", 2500);
    hideWeightPopover();
    return;
  }

  if (!connectSource || !pendingEdgeTarget) return;

  const source = connectSource;
  const target = pendingEdgeTarget;

  const existing = cy.edges().filter((e) => {
    const s = e.data("source");
    const t = e.data("target");
    return (
      (s === source.id() && t === target.id()) ||
      (!directedToggle.checked && s === target.id() && t === source.id())
    );
  });
  if (existing.length > 0) {
    showToast(`An edge between ${source.id()} and ${target.id()} already exists.`, "warning");
    hideWeightPopover();
    return;
  }

  cy.add({
    group: "edges",
    data: {
      id: `${source.id()}-${target.id()}-${Date.now()}`,
      source: source.id(),
      target: target.id(),
      weight,
    },
    classes: directedToggle.checked ? "directed" : "",
  });

  showToast(`Added edge ${source.id()} → ${target.id()} (weight ${weight})`, "success", 2500);
  hideWeightPopover();
}

function deleteEdgeFromPopover() {
  if (!editingEdge) return;
  const sourceId = editingEdge.data("source");
  const targetId = editingEdge.data("target");
  editingEdge.remove();
  showToast(`Removed edge ${sourceId} → ${targetId}. Nodes kept.`, "info", 2500);
  hideWeightPopover();
}

weightConfirm.addEventListener("click", confirmEdgeWeight);
weightCancel.addEventListener("click", hideWeightPopover);
weightDelete.addEventListener("click", deleteEdgeFromPopover);
weightPopoverClose.addEventListener("click", hideWeightPopover);

weightInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    confirmEdgeWeight();
  } else if (e.key === "Escape") {
    hideWeightPopover();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!weightPopover.hidden) hideWeightPopover();
    else if (!presetDialog.hidden) cancelPresetLoad();
    else if (!clearDialog.hidden) hideDialog(clearDialog);
    else if (!shortcutsDialog.hidden) hideDialog(shortcutsDialog);
    else if (mode) setMode(null);
    return;
  }

  if (isTypingTarget(document.activeElement) || isDialogOpen() || !weightPopover.hidden) return;

  const key = e.key.toLowerCase();

  if (key === "?") {
    e.preventDefault();
    showDialog(shortcutsDialog);
    return;
  }

  if (key === "f") {
    e.preventDefault();
    fitGraphView();
    return;
  }

  if (key === "r") {
    e.preventDefault();
    runBtn.click();
    return;
  }

  if (key === " ") {
    e.preventDefault();
    if (!playBtn.disabled) playBtn.click();
    return;
  }

  if (e.key === "ArrowLeft" && !stepBackBtn.disabled) {
    e.preventDefault();
    goToStep(stepIndex - 1);
    return;
  }

  if (e.key === "ArrowRight" && !stepFwdBtn.disabled) {
    e.preventDefault();
    goToStep(stepIndex + 1);
    return;
  }

  const modeKeys = { "1": "add", "2": "connect", "3": "edit-edge", "4": "delete" };
  if (modeKeys[key]) {
    e.preventDefault();
    toggleMode(modeKeys[key]);
  }
});

cy.on("pan zoom resize", () => {
  if (!connectPreview.hidden) updateConnectPreview();
  if (weightPopover.hidden) return;
  if (popoverContext === "edit" && editingEdge) {
    positionWeightPopoverForEdge(editingEdge);
  } else if (connectSource && pendingEdgeTarget) {
    positionWeightPopoverAtEndpoints(connectSource, pendingEdgeTarget);
  }
});

// ---------------------------------------------------------------------------
// Graph editing modes
// ---------------------------------------------------------------------------

function nextNodeLabel() {
  let n = nodeCounter++;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

function refreshStartOptions() {
  const ids = cy.nodes().map((n) => n.id());
  startSelect.innerHTML = ids.map((id) => `<option value="${id}">${id}</option>`).join("");
}

function fitGraphView() {
  if (cy.nodes().length === 0) return;
  cy.resize();
  cy.fit(undefined, 50);
}

function syncCanvasSize() {
  cy.resize();
}

document.getElementById("fit-btn").addEventListener("click", fitGraphView);

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(syncCanvasSize, 100);
});

if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => syncCanvasSize()).observe(canvasWrap);
}

const MODE_LABELS = {
  add: "Add mode",
  connect: "Connect mode",
  "edit-edge": "Edit edge mode",
  delete: "Delete node mode",
};

const MODE_HINTS = {
  add: "Click empty canvas to add a node. Click + Node again or Esc to exit.",
  connect: "Click a source node, then a target. Click Connect again or Esc to exit.",
  "edit-edge": "Click an edge to edit its weight or remove it. Click again or Esc to exit.",
  delete: "Click a node to remove it and its edges. Click again or Esc to exit.",
};

const NONE_HINT = "Select a tool to edit, or drag nodes to reposition.";

const MODE_BUTTONS = [
  { btn: addNodeBtn, mode: "add" },
  { btn: connectModeBtn, mode: "connect" },
  { btn: editEdgeBtn, mode: "edit-edge" },
  { btn: deleteModeBtn, mode: "delete" },
];

function setMode(newMode) {
  if (newMode !== mode) hideWeightPopover();

  mode = newMode;

  if (mode !== "connect") {
    connectSource = null;
    hideConnectPreview();
  }
  cy.nodes().removeClass("frontier");

  canvasWrap.classList.remove("mode-add", "mode-connect", "mode-edit-edge", "mode-delete");

  if (mode) {
    canvasWrap.classList.add(`mode-${mode}`);
    modeBadge.hidden = false;
    modeBadge.setAttribute("aria-hidden", "false");
    modeBadgeLabel.textContent = MODE_LABELS[mode];
    modeHint.textContent = MODE_HINTS[mode];
  } else {
    modeBadge.hidden = true;
    modeBadge.setAttribute("aria-hidden", "true");
    modeHint.textContent = NONE_HINT;
  }

  MODE_BUTTONS.forEach(({ btn, mode: btnMode }) => {
    const isActive = mode === btnMode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (!isPlaybackActive) {
    setNodeGrabbing(mode !== "delete");
  }
}

function toggleMode(targetMode) {
  if (mode === targetMode) setMode(null);
  else setMode(targetMode);
}

addNodeBtn.addEventListener("click", () => toggleMode("add"));
connectModeBtn.addEventListener("click", () => toggleMode("connect"));
editEdgeBtn.addEventListener("click", () => toggleMode("edit-edge"));
deleteModeBtn.addEventListener("click", () => toggleMode("delete"));

document.getElementById("clear-btn").addEventListener("click", () => {
  if (cy.nodes().length === 0) return;
  showDialog(clearDialog);
});

function clearGraph() {
  cy.elements().remove();
  nodeCounter = 0;
  refreshStartOptions();
  resetTrace();
  setMode(null);
  showToast("Graph cleared.", "info", 2500);
}

clearDialogCancel.addEventListener("click", () => hideDialog(clearDialog));
clearDialogBackdrop.addEventListener("click", () => hideDialog(clearDialog));
clearDialogConfirm.addEventListener("click", () => {
  hideDialog(clearDialog);
  clearGraph();
});

shortcutsBtn.addEventListener("click", () => showDialog(shortcutsDialog));
shortcutsDialogClose.addEventListener("click", () => hideDialog(shortcutsDialog));
shortcutsDialogBackdrop.addEventListener("click", () => hideDialog(shortcutsDialog));

cy.on("tap", (evt) => {
  if (evt.target !== cy) return;
  if (!weightPopover.hidden) hideWeightPopover();
  if (mode !== "add") return;
  const id = nextNodeLabel();
  cy.add({
    group: "nodes",
    data: { id },
    position: { x: evt.position.x, y: evt.position.y },
  });
  refreshStartOptions();
});

cy.on("tap", "node", (evt) => {
  const node = evt.target;

  if (mode === "delete") {
    const id = node.id();
    const edgeCount = node.connectedEdges().length;
    node.remove();
    refreshStartOptions();
    const detail = edgeCount ? ` and ${edgeCount} edge${edgeCount === 1 ? "" : "s"}` : "";
    showToast(`Removed node ${id}${detail}.`, "info", 2500);
    return;
  }

  if (mode === "connect") {
    if (!connectSource) {
      connectSource = node;
      node.addClass("frontier");
      updateConnectPreview();
      return;
    }
    if (connectSource.id() === node.id()) {
      connectSource.removeClass("frontier");
      connectSource = null;
      hideConnectPreview();
      return;
    }
    hideConnectPreview();
    showCreateWeightPopover(connectSource, node);
  }
});

cy.on("tap", "edge", (evt) => {
  if (mode === "edit-edge") {
    showEditWeightPopover(evt.target);
  }
});

directedToggle.addEventListener("change", () => {
  cy.edges().toggleClass("directed", directedToggle.checked);
});

// ---------------------------------------------------------------------------
// Insight tabs (trace pane)
// ---------------------------------------------------------------------------

const insightTabs = document.querySelectorAll(".insight-tab");
const insightPanels = document.querySelectorAll(".insight-panel");
const tabDistances = document.getElementById("tab-distances");
const tabMatrix = document.getElementById("tab-matrix");

function setActiveTab(tabName) {
  insightTabs.forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  insightPanels.forEach((panel) => {
    const active = panel.id === `panel-${tabName}`;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

insightTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
});

function updateTabsForAlgorithm(algo) {
  const isFloyd = algo === "floyd-warshall";
  const isDijkstra = algo === "dijkstra";
  tabDistances.hidden = !isDijkstra;
  tabMatrix.hidden = !isFloyd;
  if (isFloyd) setActiveTab("matrix");
  else setActiveTab("steps");
}

algoSelect.addEventListener("change", () => {
  startField.style.display = algoSelect.value === "floyd-warshall" ? "none" : "flex";
  updateAlgoDesc();
  updateTabsForAlgorithm(algoSelect.value);
  resetTrace();
});

// Mobile trace pane collapse
const tracePane = document.getElementById("trace-pane");
const tracePaneToggle = document.getElementById("trace-pane-toggle");

tracePaneToggle.addEventListener("click", () => {
  const collapsed = tracePane.classList.toggle("collapsed");
  tracePaneToggle.textContent = collapsed ? "Show panel" : "Hide panel";
  tracePaneToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
});

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

const onboarding = document.getElementById("onboarding");
const onboardingNext = document.getElementById("onboarding-next");
const onboardingSkip = document.getElementById("onboarding-skip");
let onboardingStep = 0;

function showOnboardingStep(step) {
  onboardingStep = step;
  onboarding.querySelectorAll(".onboarding-step").forEach((el) => {
    el.classList.toggle("active", parseInt(el.dataset.step, 10) === step);
  });
  onboarding.querySelectorAll(".onboarding-dot").forEach((dot) => {
    dot.classList.toggle("active", parseInt(dot.dataset.step, 10) === step);
  });
  onboardingNext.textContent = step >= 2 ? "Got it" : "Next";
}

function dismissOnboarding() {
  onboarding.hidden = true;
  localStorage.setItem(ONBOARDING_KEY, "1");
}

function maybeShowOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) return;
  onboarding.hidden = false;
  showOnboardingStep(0);
}

onboardingNext.addEventListener("click", () => {
  if (onboardingStep >= 2) dismissOnboarding();
  else showOnboardingStep(onboardingStep + 1);
});

onboardingSkip.addEventListener("click", dismissOnboarding);

// ---------------------------------------------------------------------------
// Running the algorithm
// ---------------------------------------------------------------------------

let steps = [];
let stepIndex = -1;
let playTimer = null;
let lastNodesOrder = [];

const traceLog = document.getElementById("trace-log");
const traceEmpty = document.getElementById("trace-empty");
const stepCounter = document.getElementById("step-counter");
const runBtn = document.getElementById("run-btn");
const playBtn = document.getElementById("play-btn");
const stepBackBtn = document.getElementById("step-back-btn");
const stepFwdBtn = document.getElementById("step-fwd-btn");
const speedSlider = document.getElementById("speed-slider");
const distanceTable = document.getElementById("distance-table");
const distanceEmpty = document.getElementById("distance-empty");
const distanceTableWrap = distanceTable.closest(".table-wrap");
const matrixWrap = document.getElementById("matrix-table-wrap");
const matrixEmpty = document.getElementById("matrix-empty");
const traceSubtitle = document.getElementById("trace-subtitle");

function setTraceEmptyVisible(visible) {
  traceLog.classList.toggle("has-entries", !visible);
  if (traceEmpty) traceEmpty.style.display = visible ? "flex" : "none";
}

function setDistanceEmptyVisible(visible) {
  distanceTableWrap.classList.toggle("has-data", !visible);
  if (distanceEmpty) distanceEmpty.style.display = visible ? "flex" : "none";
}

function setMatrixEmptyVisible(visible) {
  matrixWrap.classList.toggle("has-data", !visible);
  if (matrixEmpty) matrixEmpty.style.display = visible ? "flex" : "none";
}

function updateProgressBar(index, total) {
  if (total <= 0) {
    progressWrap.hidden = true;
    stepProgressFill.style.width = "0%";
    stepProgress.setAttribute("aria-valuenow", "0");
    return;
  }
  progressWrap.hidden = false;
  const pct = Math.round(((index + 1) / total) * 100);
  stepProgressFill.style.width = `${pct}%`;
  stepProgress.setAttribute("aria-valuenow", String(pct));
}

function computeRunStats(stepList) {
  const visited = new Set();
  let edgeOps = 0;
  stepList.forEach((s) => {
    if (s.node && (s.type === "visit" || s.type === "settle" || s.type === "discover")) {
      visited.add(s.node);
    }
    if (s.type === "discover" || s.type === "relax") edgeOps += 1;
  });
  return { visited: visited.size, edgeOps, total: stepList.length };
}

function renderRunStats(stats) {
  runStats.innerHTML = `
    <span class="run-stat"><strong>${stats.total}</strong> steps</span>
    <span class="run-stat"><strong>${stats.visited}</strong> nodes touched</span>
    <span class="run-stat"><strong>${stats.edgeOps}</strong> edge updates</span>
  `;
  runStats.hidden = false;
}

function setPlaybackActive(active) {
  isPlaybackActive = active;
  colorLegend.hidden = !active;
  if (active) {
    setNodeGrabbing(false);
  } else {
    setNodeGrabbing(mode !== "delete");
    runStats.hidden = true;
  }
}

function resetTrace() {
  clearInterval(playTimer);
  playTimer = null;
  steps = [];
  stepIndex = -1;
  traceLog.querySelectorAll(".entry").forEach((el) => el.remove());
  setTraceEmptyVisible(true);
  stepCounter.textContent = "0 / 0";
  updateProgressBar(-1, 0);
  distanceTable.innerHTML = "";
  matrixWrap.innerHTML = "";
  setDistanceEmptyVisible(true);
  setMatrixEmptyVisible(true);
  cy.elements().removeClass("visited current frontier active tree");
  [playBtn, stepBackBtn, stepFwdBtn].forEach((b) => (b.disabled = true));
  playBtn.textContent = "▶";
  playBtn.setAttribute("aria-label", "Play");
  traceSubtitle.textContent = "Step through the execution and watch the graph update.";
  setPlaybackActive(false);
}

function describeStep(step) {
  switch (step.type) {
    case "visit":
      return `<span class="tag">visit</span> Visit node ${step.node}`;
    case "discover":
      return `<span class="tag">discover</span> Found ${step.node} from ${step.from}`;
    case "settle":
      return `<span class="tag">settle</span> Finalize ${step.node} — distance ${step.distance}`;
    case "relax":
      return `<span class="tag">relax</span> Improve path to ${step.node} via ${step.from} → ${step.distance}`;
    case "init":
      return `<span class="tag">init</span> Initialize distance matrix`;
    case "update":
      return `<span class="tag">update</span> Try route through ${step.k}: ${step.i} → ${step.j}`;
    default:
      return JSON.stringify(step);
  }
}

function renderTraceLog() {
  traceLog.querySelectorAll(".entry").forEach((el) => el.remove());
  steps.forEach((s, i) => {
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = "entry";
    entry.dataset.i = String(i);
    entry.innerHTML = describeStep(s);
    entry.addEventListener("click", () => {
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
        playBtn.textContent = "▶";
        playBtn.setAttribute("aria-label", "Play");
      }
      goToStep(i);
    });
    traceLog.appendChild(entry);
  });
  setTraceEmptyVisible(steps.length === 0);
}

function renderDistanceTable(nodes, distances) {
  const rows = nodes
    .map((n) => {
      const d = distances[n];
      const display = d === null || d === undefined ? "—" : d;
      const cls = d === null || d === undefined ? "unreachable" : "highlight";
      return `<tr><td>${n}</td><td class="${cls}">${display}</td></tr>`;
    })
    .join("");
  distanceTable.innerHTML = `<tr><th>Node</th><th>Distance</th></tr>${rows}`;
  setDistanceEmptyVisible(false);
}

function renderMatrix(nodes, matrix, options = {}) {
  const { flashCell = null, pivotNode = null } = options;
  const header = `<tr><th></th>${nodes.map((n) => `<th>${n}</th>`).join("")}</tr>`;
  const rows = nodes
    .map(
      (rowId, i) =>
        `<tr><th>${rowId}</th>${matrix[i]
          .map((v, j) => {
            const colId = nodes[j];
            const classes = [v === null ? "unreachable" : ""];
            if (pivotNode && (rowId === pivotNode || colId === pivotNode)) {
              classes.push("matrix-pivot");
            }
            return `<td data-row="${rowId}" data-col="${colId}" class="${classes.filter(Boolean).join(" ")}">${v === null ? "∞" : v}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");
  matrixWrap.innerHTML = `<table>${header}${rows}</table>`;
  setMatrixEmptyVisible(false);

  if (flashCell) flashMatrixCell(flashCell.i, flashCell.j);
}

function flashMatrixCell(rowId, colId) {
  const cell = matrixWrap.querySelector(`td[data-row="${CSS.escape(rowId)}"][data-col="${CSS.escape(colId)}"]`);
  if (!cell) return;
  cell.classList.remove("matrix-flash");
  void cell.offsetWidth;
  cell.classList.add("matrix-flash");
}

function applyStepToCanvas(step) {
  cy.nodes().removeClass("current");
  cy.edges().removeClass("active");

  if (step.visited) {
    cy.nodes().forEach((n) => n.toggleClass("visited", step.visited.includes(n.id())));
  }

  if (step.node) {
    cy.getElementById(step.node).addClass("current");
  }

  if (step.from && step.node) {
    const edge = cy.edges().filter((e) => {
      const s = e.data("source");
      const t = e.data("target");
      return (s === step.from && t === step.node) || (s === step.node && t === step.from);
    });
    edge.addClass("active");
    if (step.type === "discover" || step.type === "relax") edge.addClass("tree");
  }

  if (step.distances) renderDistanceTable(cy.nodes().map((n) => n.id()), step.distances);
  if (step.matrix) {
    const nodes = step.nodes || lastNodesOrder;
    const matrixOptions = {};
    if (step.type === "update") {
      matrixOptions.flashCell = { i: step.i, j: step.j };
      matrixOptions.pivotNode = step.k;
    }
    renderMatrix(nodes, step.matrix, matrixOptions);
  }
}

function goToStep(i) {
  if (i < 0 || i >= steps.length) return;
  stepIndex = i;
  applyStepToCanvas(steps[i]);
  stepCounter.textContent = `${i + 1} / ${steps.length}`;
  updateProgressBar(i, steps.length);
  traceLog.querySelectorAll(".entry").forEach((el, idx) => {
    el.classList.toggle("active", idx === i);
  });
  const activeEl = traceLog.querySelectorAll(".entry")[i];
  if (activeEl) activeEl.scrollIntoView({ block: "nearest" });

  stepBackBtn.disabled = i <= 0;
  stepFwdBtn.disabled = i >= steps.length - 1;
}

stepBackBtn.addEventListener("click", () => goToStep(stepIndex - 1));
stepFwdBtn.addEventListener("click", () => goToStep(stepIndex + 1));

playBtn.addEventListener("click", () => {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
    playBtn.textContent = "▶";
    playBtn.setAttribute("aria-label", "Play");
    return;
  }
  playBtn.textContent = "⏸";
  playBtn.setAttribute("aria-label", "Pause");
  playTimer = setInterval(() => {
    if (stepIndex >= steps.length - 1) {
      clearInterval(playTimer);
      playTimer = null;
      playBtn.textContent = "▶";
      playBtn.setAttribute("aria-label", "Play");
      return;
    }
    goToStep(stepIndex + 1);
  }, parseInt(speedSlider.value, 10));
});

function getNodeDegree(nodeId) {
  return cy.edges().filter((e) => {
    const s = e.data("source");
    const t = e.data("target");
    return s === nodeId || t === nodeId;
  }).length;
}

function validateBeforeRun(nodes, edges, algo, start) {
  if (nodes.length === 0) {
    showToast("Add at least one node before running an algorithm.", "warning");
    return false;
  }

  if (nodes.length === 1 && edges.length === 0) {
    showToast("Your graph has a single isolated node — add edges to explore traversal.", "info");
  } else if (edges.length === 0) {
    showToast("No edges yet — the algorithm can only visit the start node.", "info");
  }

  if (algo !== "floyd-warshall") {
    if (!start || !nodes.includes(start)) {
      showToast("Choose a valid start node from the dropdown.", "warning");
      return false;
    }
    if (getNodeDegree(start) === 0 && edges.length > 0) {
      showToast(
        `Start node ${start} isn't connected to any edges — the run may only visit that node.`,
        "warning"
      );
    }
  }

  return true;
}

runBtn.addEventListener("click", async () => {
  resetTrace();

  const nodes = cy.nodes().map((n) => n.id());
  const edges = cy.edges().map((e) => ({
    source: e.data("source"),
    target: e.data("target"),
    weight: e.data("weight"),
  }));
  const directed = directedToggle.checked;
  const algo = algoSelect.value;
  const start = startSelect.value;

  if (!validateBeforeRun(nodes, edges, algo, start)) return;

  lastNodesOrder = nodes;

  const body = { nodes, edges, directed };
  if (algo !== "floyd-warshall") body.start = start;

  runBtn.disabled = true;
  runBtn.textContent = "Running…";

  try {
    const res = await fetch(`/api/run/${algo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Something went wrong running the algorithm.", "error");
      return;
    }

    steps = data.steps;
    renderTraceLog();
    updateTabsForAlgorithm(algo);
    setPlaybackActive(true);
    renderRunStats(computeRunStats(steps));

    const meta = ALGO_META[algo];
    traceSubtitle.textContent = `${meta?.name || algo} — ${steps.length} steps. Click any step or use ← → to scrub.`;

    [playBtn, stepBackBtn, stepFwdBtn].forEach((b) => (b.disabled = false));
    goToStep(0);
    showToast(`Algorithm finished — ${steps.length} steps to explore.`, "success", 3000);
  } catch (err) {
    showToast(`Could not reach the server: ${err.message}`, "error");
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "▶ Run";
  }
});

// ---------------------------------------------------------------------------
// Graph presets
// ---------------------------------------------------------------------------

function loadGraphPreset(presetId) {
  const preset = GRAPH_PRESETS[presetId];
  if (!preset) return;

  cy.elements().remove();
  hideConnectPreview();

  Object.entries(preset.positions).forEach(([id, position]) => {
    cy.add({ group: "nodes", data: { id }, position });
  });
  nodeCounter = Object.keys(preset.positions).length;

  preset.edges.forEach(([source, target, weight]) => {
    cy.add({
      group: "edges",
      data: {
        id: `${source}-${target}-${presetId}`,
        source,
        target,
        weight,
      },
      classes: preset.directed ? "directed" : "",
    });
  });

  directedToggle.checked = preset.directed;
  refreshStartOptions();
  resetTrace();
  fitGraphView();
  setMode(null);
}

function applyPreset(presetId) {
  loadGraphPreset(presetId);
  currentPresetId = presetId;
  presetSelect.value = presetId;
  pendingPresetId = null;
  showToast(`Loaded ${GRAPH_PRESETS[presetId].label}.`, "info", 2500);
}

function cancelPresetLoad() {
  hideDialog(presetDialog);
  presetSelect.value = currentPresetId;
  pendingPresetId = null;
}

presetSelect.addEventListener("change", () => {
  const next = presetSelect.value;
  if (next === currentPresetId) return;

  pendingPresetId = next;
  const preset = GRAPH_PRESETS[next];
  presetDialogDesc.textContent = `Replace your current graph with "${preset.label}"?`;

  if (cy.nodes().length > 0) {
    showDialog(presetDialog);
  } else {
    applyPreset(next);
  }
});

presetDialogCancel.addEventListener("click", cancelPresetLoad);
presetDialogBackdrop.addEventListener("click", cancelPresetLoad);
presetDialogConfirm.addEventListener("click", () => {
  hideDialog(presetDialog);
  if (pendingPresetId) applyPreset(pendingPresetId);
});

loadGraphPreset("sample");
syncCanvasSize();
updateTabsForAlgorithm(algoSelect.value);
maybeShowOnboarding();
