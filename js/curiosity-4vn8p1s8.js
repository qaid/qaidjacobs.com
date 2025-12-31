import {
  createElement,
  createSVGElement,
  query
} from "./main-65mq6067.js";
import"./main-3hqyeswk.js";

// src/containers/base.ts
var renderers = new Map;
function registerRenderer(type, renderer) {
  renderers.set(type, renderer);
}
function clearContainerContent(cardEl) {
  const curiosityStage = query(".curiosity-stage", cardEl);
  if (curiosityStage)
    curiosityStage.remove();
  const essayContent = query(".essay-content", cardEl);
  if (essayContent)
    essayContent.remove();
  const durationalContent = query(".durational-content", cardEl);
  if (durationalContent)
    durationalContent.remove();
}
function updateContainerHeader(cardEl, options) {
  const eyebrowEl = query(".eyebrow", cardEl);
  const titleEl = query("h2", cardEl);
  const ledeEl = query(".lede", cardEl);
  if (eyebrowEl && options.eyebrow !== undefined) {
    eyebrowEl.textContent = options.eyebrow;
  }
  if (titleEl) {
    if (options.hideTitle) {
      titleEl.style.display = "none";
    } else {
      titleEl.style.display = "";
      if (options.title !== undefined) {
        titleEl.textContent = options.title;
      }
    }
  }
  if (ledeEl && options.lede !== undefined) {
    ledeEl.textContent = options.lede;
  }
}
function setContainerType(overlayEl, node) {
  const isEssay = node.subtype === "essay" || node.type === "essay";
  const isCuriosity = node.type === "curiosity";
  const isDurational = node.type === "durational" || node.subtype === "dj-mix" || node.subtype === "talk" || node.subtype === "podcast";
  overlayEl.classList.toggle("is-essay", isEssay);
  overlayEl.classList.toggle("is-curiosity", isCuriosity);
  overlayEl.classList.toggle("is-durational", isDurational);
}
function getRendererForNode(node) {
  if (node.subtype && renderers.has(node.subtype)) {
    return renderers.get(node.subtype);
  }
  return renderers.get(node.type);
}

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

// src/containers/curiosity.ts
var VB_SIZE = 1000;
var VB_CENTER = VB_SIZE / 2;
var PALETTE_KEYS = ["music", "movement", "questions"];
var refreshCallback = null;
function endpointToRectEdge(fromX, fromY, toX, toY, halfW, halfH) {
  const vx = toX - fromX;
  const vy = toY - fromY;
  const denom = Math.max(0.000001, Math.max(Math.abs(vx) / Math.max(0.000001, halfW), Math.abs(vy) / Math.max(0.000001, halfH)));
  return {
    x: toX - vx / denom,
    y: toY - vy / denom
  };
}
function recomputeLines(stage, svg, centerPill, placed) {
  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0)
    return;
  while (svg.lastChild)
    svg.removeChild(svg.lastChild);
  const centerRect = centerPill.getBoundingClientRect();
  const cW = centerRect.width / stageRect.width * VB_SIZE;
  const cH = centerRect.height / stageRect.height * VB_SIZE;
  const cHalfW = cW / 2;
  const cHalfH = cH / 2;
  placed.forEach(({ el, cx: itemCx, cy: itemCy }) => {
    const r = el.getBoundingClientRect();
    const wVb = r.width / stageRect.width * VB_SIZE;
    const hVb = r.height / stageRect.height * VB_SIZE;
    const halfW = wVb / 2;
    const halfH = hVb / 2;
    const start = endpointToRectEdge(itemCx, itemCy, VB_CENTER, VB_CENTER, cHalfW, cHalfH);
    const end = endpointToRectEdge(VB_CENTER, VB_CENTER, itemCx, itemCy, halfW, halfH);
    const line = createSVGElement("line", {
      x1: String(start.x),
      y1: String(start.y),
      x2: String(end.x),
      y2: String(end.y),
      "stroke-width": "2"
    });
    svg.appendChild(line);
  });
}
var curiosityRenderer = {
  async render(nodeId, cardEl) {
    clearContainerContent(cardEl);
    let data;
    try {
      data = await loadJSON(`content/curiosities/${nodeId}.json`);
    } catch (e) {
      console.error("Failed to load curiosity data:", e);
      return;
    }
    const stage = createElement("div", { className: "curiosity-stage" });
    const svg = createSVGElement("svg", {
      class: "curiosity-lines",
      viewBox: `0 0 ${VB_SIZE} ${VB_SIZE}`,
      preserveAspectRatio: "none"
    });
    const center = createElement("div", { className: "curiosity-center" });
    const centerPill = createElement("div", { className: "curiosity-center-pill" }, [
      data.central || nodeId
    ]);
    center.appendChild(centerPill);
    stage.appendChild(svg);
    stage.appendChild(center);
    const connected = Array.isArray(data.connected) ? data.connected.slice(0, 30) : [];
    const count = connected.length;
    const radius = count <= 8 ? 310 : 360;
    const placed = [];
    connected.forEach((item, idx) => {
      const baseAngle = idx / Math.max(1, count) * Math.PI * 2;
      const jitter = (hashStringToInt(item.label || String(idx)) % 1000 / 1000 - 0.5) * 0.42;
      const angle = baseAngle + jitter;
      const rJitter = (hashStringToInt(`${item.label}-r`) % 1000 / 1000 - 0.5) * 60;
      const r = radius + rJitter;
      const x = VB_CENTER + Math.cos(angle) * r;
      const y = VB_CENTER + Math.sin(angle) * r;
      const hasLink = item.linksTo && typeof item.linksTo === "string";
      const btn = createElement("button", {
        type: "button",
        className: hasLink ? "curiosity-item curiosity-item-linked" : "curiosity-item"
      });
      if (hasLink) {
        btn.addEventListener("click", () => {
          window.open(item.linksTo, "_blank", "noopener,noreferrer");
        });
      } else {
        btn.disabled = true;
      }
      const paletteKey = PALETTE_KEYS[hashStringToInt(item.label || String(idx)) % PALETTE_KEYS.length];
      const palette = THREAD_PALETTES[paletteKey];
      btn.style.color = palette[0];
      const label = createElement("span", { className: "curiosity-label" }, [item.label || ""]);
      btn.appendChild(label);
      btn.style.left = `${x / VB_SIZE * 100}%`;
      btn.style.top = `${y / VB_SIZE * 100}%`;
      const jx = hashStringToInt(`${item.label}-jx`) % 7 - 3;
      const jy = hashStringToInt(`${item.label}-jy`) % 7 - 3;
      btn.style.setProperty("--jx", `${jx}px`);
      btn.style.setProperty("--jy", `${jy}px`);
      stage.appendChild(btn);
      placed.push({ el: btn, cx: x, cy: y });
    });
    updateContainerHeader(cardEl, {
      title: data.title || nodeId,
      lede: ""
    });
    refreshCallback = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          recomputeLines(stage, svg, centerPill, placed);
        });
      });
    };
    refreshCallback();
    cardEl.appendChild(stage);
  },
  cleanup() {
    refreshCallback = null;
  }
};
function getRefreshCallback() {
  return refreshCallback;
}
registerRenderer("curiosity", curiosityRenderer);
export {
  getRefreshCallback,
  curiosityRenderer
};

export { loadJSON, DOT_SIZE, DOT_RADIUS, THREAD_PALETTES, get, set, registerRenderer, clearContainerContent, updateContainerHeader, setContainerType, getRendererForNode };
