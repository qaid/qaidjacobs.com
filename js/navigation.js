import {
  isMobile,
  onEnvChange
} from "./main-hnqehzpe.js";
import {
  focusEssay
} from "./main.js";
import {
  THREAD_COLORS,
  loadJSON
} from "./main-cgea2d6s.js";
import {
  createElement,
  getById,
  queryAll
} from "./main-k51qvqm5.js";
import"./main-3hqyeswk.js";

// src/navigation.ts
var EDGE = 48;
var overlay = getById("nav-overlay");
var overlayWeb = getById("nav-overlay-web");
var triggers = Array.from(queryAll(".nav-trigger"));
var isOpen = false;
var lastTrigger = null;
var armed = true;
var nodesLoaded = false;
var TYPE_LABEL = {
  essay: "Essay",
  durational: "Listen",
  curiosity: "Curiosity",
  artifact: "Scrapbook",
  bio: "About"
};
function typeKind(node) {
  if (node.subtype === "dj-mix")
    return "Mix";
  if (node.subtype === "podcast")
    return "Podcast";
  if (node.subtype === "talk" || node.subtype === "performance")
    return "Talk";
  return TYPE_LABEL[node.type] || "Node";
}
function accessibleName(node) {
  const kind = typeKind(node);
  const title = node.title || node.id;
  const threads = (node.threads || []).join(", ");
  return threads ? `${kind}: ${title}. Threads: ${threads}.` : `${kind}: ${title}.`;
}
function threadAccent(node) {
  const t = node.threads && node.threads[0];
  return t ? THREAD_COLORS[t] || THREAD_COLORS.questions : THREAD_COLORS.questions;
}
async function buildOverlayWeb() {
  if (!overlayWeb || nodesLoaded)
    return;
  let nodes = [];
  try {
    [nodes] = await Promise.all([
      loadJSON("content/nodes/landing-nodes.json"),
      loadJSON("content/connections.json").catch(() => [])
    ]);
  } catch {
    nodes = [];
  }
  const list = createElement("ul", { className: "nav-web-list" });
  nodes.filter((node) => node.type !== "bio").forEach((node) => {
    const li = createElement("li", { className: "nav-web-item" });
    const btn = createElement("button", {
      className: "nav-web-node",
      type: "button",
      "data-type": node.type,
      "data-id": node.id
    });
    btn.setAttribute("aria-label", accessibleName(node));
    btn.style.setProperty("--accent", threadAccent(node));
    const glyph = createElement("span", { className: "nav-web-glyph" });
    glyph.dataset.type = node.type;
    if (node.subtype)
      glyph.dataset.subtype = node.subtype;
    glyph.setAttribute("aria-hidden", "true");
    const text = createElement("span", { className: "nav-web-text" });
    const kind = createElement("span", { className: "nav-web-kind" }, [typeKind(node)]);
    const title = createElement("span", { className: "nav-web-title" }, [
      node.title || node.id
    ]);
    text.appendChild(kind);
    text.appendChild(title);
    btn.appendChild(glyph);
    btn.appendChild(text);
    btn.addEventListener("click", () => {
      close();
      window.setTimeout(() => focusEssay(node.id), 60);
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
  overlayWeb.innerHTML = "";
  overlayWeb.appendChild(list);
  nodesLoaded = true;
}
function setTriggerState(pressed) {
  triggers.forEach((t) => {
    t.setAttribute("aria-pressed", String(pressed));
    t.setAttribute("aria-label", pressed ? "Close navigation" : "Open navigation");
    t.classList.toggle("is-active", pressed);
  });
}
async function open(viaHover, originator) {
  if (!overlay || isOpen)
    return;
  isOpen = true;
  lastTrigger = originator || triggers[0] || null;
  await buildOverlayWeb();
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  document.body.classList.add("nav-open");
  setTriggerState(true);
  if (!viaHover) {
    const firstNode = overlay.querySelector(".nav-web-node");
    (firstNode || overlay).focus?.();
  }
}
function close() {
  if (!overlay || !isOpen)
    return;
  isOpen = false;
  armed = false;
  overlay.classList.remove("is-open");
  document.body.classList.remove("nav-open");
  setTriggerState(false);
  const onDone = () => {
    if (!isOpen && overlay)
      overlay.hidden = true;
    overlay?.removeEventListener("transitionend", onDone);
  };
  overlay.addEventListener("transitionend", onDone);
  window.setTimeout(() => {
    if (!isOpen && overlay && !overlay.classList.contains("is-open")) {
      overlay.hidden = true;
    }
  }, 320);
  lastTrigger?.focus?.();
  lastTrigger = null;
}
function toggle(originator) {
  if (isOpen)
    close();
  else
    open(false, originator);
}
var pointerRaf = 0;
var pendingX = 0;
var pendingY = 0;
function inEdgeZone(x, y) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return x <= EDGE || x >= w - EDGE || y >= h - EDGE;
}
function processPointer() {
  pointerRaf = 0;
  if (isMobile())
    return;
  const inZone = inEdgeZone(pendingX, pendingY);
  if (!inZone) {
    armed = true;
    return;
  }
  if (inZone && !isOpen && armed) {
    open(true);
  }
}
function onPointerMove(e) {
  if (e.pointerType === "touch")
    return;
  pendingX = e.clientX;
  pendingY = e.clientY;
  if (!pointerRaf)
    pointerRaf = requestAnimationFrame(processPointer);
}
function initNavigation() {
  if (!overlay)
    return;
  triggers.forEach((t) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      toggle(t);
    });
  });
  const closeBtn = getById("nav-overlay-close");
  closeBtn?.addEventListener("click", () => close());
  overlay.addEventListener("pointerdown", (e) => {
    if (e.target === overlay)
      close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      e.stopPropagation();
      close();
    }
  });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  onEnvChange(() => {
    armed = true;
  });
}
initNavigation();
export {
  toggle as toggleNav,
  open as openNav,
  close as closeNav
};
