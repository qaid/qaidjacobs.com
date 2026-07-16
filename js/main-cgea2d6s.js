// src/utils/data.ts
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
function hashStringToInt(str) {
  let h = 2166136261;
  for (let i = 0;i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// src/state/store.ts
var DOT_SIZE = 14;
var DOT_RADIUS = DOT_SIZE / 2;
var THREAD_PALETTES = {
  music: ["#ff7a9e", "#ff9cc0", "#ffd3e1"],
  movement: ["#4fd1c5", "#7de8dd", "#b1fff4"],
  questions: ["#f6c56c", "#ffd28c", "#ffe7b8"]
};
var THREAD_COLORS = {
  music: "#ff7a9e",
  movement: "#4fd1c5",
  questions: "#f6c56c"
};
var initialState = {
  phrases: [],
  nodes: [],
  threads: [],
  isContainerMode: false,
  activeNodeId: null,
  pendingNodeId: null,
  isAnimatingContainer: false,
  isNodeSwitching: false,
  dotElementsById: new Map,
  lastNodesPx: [],
  curiosityCentralById: new Map,
  activeParticleStreams: new Map,
  refreshCuriosityLines: null
};
var state = { ...initialState };
var subscribers = new Map;
var anySubscribers = new Set;
function get(key) {
  return state[key];
}
function set(key, value) {
  const prev = state[key];
  if (prev === value)
    return;
  state = { ...state, [key]: value };
  const keySubscribers = subscribers.get(key);
  if (keySubscribers) {
    keySubscribers.forEach((fn) => fn(value, prev));
  }
  anySubscribers.forEach((fn) => fn(state));
}

export { loadJSON, hashStringToInt, DOT_SIZE, THREAD_PALETTES, THREAD_COLORS, get, set };
