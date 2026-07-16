import {
  ambientMotionEnabled,
  prefersReducedMotion
} from "./main-hnqehzpe.js";
import {
  closeEssay,
  focusEssay
} from "./main.js";
import {
  clearContainerContent,
  getRendererForNode,
  registerRenderer,
  setContainerType,
  updateContainerHeader
} from "./curiosity-4rfym7d9.js";
import {
  DOT_SIZE,
  THREAD_COLORS,
  THREAD_PALETTES,
  get,
  loadJSON,
  set
} from "./main-cgea2d6s.js";
import {
  createElement,
  getById,
  query
} from "./main-k51qvqm5.js";
import {
  __require,
  __toESM
} from "./main-3hqyeswk.js";

// src/components/phrase.ts
var phraseTextEl = null;
var phraseByEl = null;
var currentPhraseText = "";
var currentPhraseBy = "";
function initPhrase() {
  phraseTextEl = document.querySelector(".phrase-text");
  phraseByEl = getById("phrase-by");
}
function hidePhrase() {
  document.body.classList.add("phrase-hidden");
  document.body.classList.remove("phrase-fade-in");
}
function showPhraseSlow() {
  document.body.classList.add("phrase-fade-in");
  document.body.classList.remove("phrase-hidden");
  window.setTimeout(() => {
    document.body.classList.remove("phrase-fade-in");
  }, 1100);
}
function rotatePhrase(phrases) {
  if (!phrases.length || !phraseTextEl)
    return;
  const next = phrases[Math.floor(Math.random() * phrases.length)];
  currentPhraseText = next.text || "";
  currentPhraseBy = next.by ? `— ${next.by}` : "";
  phraseTextEl.textContent = currentPhraseText;
  if (phraseByEl) {
    phraseByEl.textContent = currentPhraseBy;
  }
}

// src/components/brownian.ts
var MOTION_CONFIG = {
  STEP_SIZE: 0.005,
  DIRECTION_CHANGE_RATE: 0.995,
  BASE_SPEED: 0.08,
  FOOTER_CLEARANCE: 320,
  EDGE_PADDING: 20
};
var dotMotions = new Map;
var rafId = null;
var globalPaused = false;
function gaussianRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function getViewportBounds() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxBottomY = viewportHeight - MOTION_CONFIG.FOOTER_CLEARANCE;
  return {
    minX: MOTION_CONFIG.EDGE_PADDING,
    maxX: viewportWidth - MOTION_CONFIG.EDGE_PADDING,
    minY: MOTION_CONFIG.EDGE_PADDING,
    maxY: maxBottomY - MOTION_CONFIG.EDGE_PADDING
  };
}
function updateMotion() {
  let hasActiveDots = false;
  const bounds = getViewportBounds();
  dotMotions.forEach((state) => {
    if (state.isPaused || globalPaused) {
      return;
    }
    hasActiveDots = true;
    if (Math.random() > MOTION_CONFIG.DIRECTION_CHANGE_RATE) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = MOTION_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.5);
      state.velocityX = Math.cos(angle) * speed;
      state.velocityY = Math.sin(angle) * speed;
    }
    state.velocityX += gaussianRandom() * MOTION_CONFIG.STEP_SIZE;
    state.velocityY += gaussianRandom() * MOTION_CONFIG.STEP_SIZE;
    state.x += state.velocityX;
    state.y += state.velocityY;
    if (state.x < bounds.minX) {
      state.x = bounds.minX;
      state.velocityX = Math.abs(state.velocityX);
    } else if (state.x > bounds.maxX) {
      state.x = bounds.maxX;
      state.velocityX = -Math.abs(state.velocityX);
    }
    if (state.y < bounds.minY) {
      state.y = bounds.minY;
      state.velocityY = Math.abs(state.velocityY);
    } else if (state.y > bounds.maxY) {
      state.y = bounds.maxY;
      state.velocityY = -Math.abs(state.velocityY);
    }
    state.dotElement.style.left = `${state.x}px`;
    state.dotElement.style.top = `${state.y}px`;
  });
  if (hasActiveDots || !globalPaused) {
    rafId = requestAnimationFrame(updateMotion);
  } else {
    rafId = null;
  }
}
function initBrownianMotion(dotElements) {
  stopBrownianMotion();
  if (!ambientMotionEnabled())
    return;
  dotElements.forEach((dotElement, nodeId) => {
    const currentLeft = parseFloat(dotElement.style.left || "0");
    const currentTop = parseFloat(dotElement.style.top || "0");
    const angle = Math.random() * 2 * Math.PI;
    const speed = MOTION_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.5);
    dotMotions.set(nodeId, {
      nodeId,
      dotElement,
      x: currentLeft,
      y: currentTop,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      isPaused: false
    });
  });
  globalPaused = false;
  if (rafId === null) {
    rafId = requestAnimationFrame(updateMotion);
  }
}
function pauseMotion(nodeId) {
  const state = dotMotions.get(nodeId);
  if (state) {
    state.isPaused = true;
  }
}
function resumeMotion(nodeId) {
  const state = dotMotions.get(nodeId);
  if (state) {
    state.isPaused = false;
    if (rafId === null && !globalPaused) {
      rafId = requestAnimationFrame(updateMotion);
    }
  }
}
function pauseAllMotion() {
  globalPaused = true;
}
function resumeAllMotion() {
  globalPaused = false;
  if (!ambientMotionEnabled() || dotMotions.size === 0)
    return;
  if (rafId === null) {
    rafId = requestAnimationFrame(updateMotion);
  }
}
function stopBrownianMotion() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  dotMotions.clear();
  globalPaused = false;
}

// src/components/web.ts
var threadElements = [];
var dotElements = new Map;
var currentNodesPx = [];
function nodesToPx(nodes, container) {
  const rect = container.getBoundingClientRect();
  return nodes.map((n) => ({
    ...n,
    center: {
      x: n.x / 100 * rect.width,
      y: n.y / 100 * rect.height
    }
  }));
}
function createThreadLine(from, to, thread, index) {
  const line = createElement("div", { className: "thread" });
  const threadTypes = thread.threads?.length ? thread.threads : ["questions"];
  const colors = threadTypes.map((t) => THREAD_COLORS[t] || THREAD_COLORS.questions);
  const primaryThread = threadTypes[0];
  line.dataset.thread = primaryThread;
  line.dataset.threads = threadTypes.join(" ");
  line.dataset.from = thread.from;
  line.dataset.to = thread.to;
  const stops = colors.length === 1 ? `${colors[0]}, ${colors[0]}` : colors.map((c, i) => `${c} ${Math.round(i / (colors.length - 1) * 100)}%`).join(", ");
  line.style.setProperty("--blend", stops);
  line.style.setProperty("--i", String(index));
  const x1 = from.center.x;
  const y1 = from.center.y;
  const x2 = to.center.x;
  const y2 = to.center.y;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  line.style.width = `${dist}px`;
  line.style.left = `${x1}px`;
  line.style.top = `${y1}px`;
  line.style.transformOrigin = "0 0";
  line.style.transform = `rotate(${angle}deg)`;
  return line;
}
var TYPE_LABEL = {
  essay: "Essay",
  durational: "Listen",
  curiosity: "Curiosity",
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
function labelSide(node, containerWidth) {
  return node.center.x > containerWidth * 0.62 ? "left" : "right";
}
function accessibleName(node) {
  const kind = typeKind(node);
  const title = node.title || node.id;
  const threads = (node.threads || []).join(", ");
  return threads ? `${kind}: ${title}. Threads: ${threads}.` : `${kind}: ${title}.`;
}
function createNodeDot(node, index, containerWidth, callbacks) {
  const wrap = createElement("div", {
    className: "node",
    "data-type": node.type,
    "data-id": node.id,
    role: "button",
    tabindex: "0",
    "aria-label": accessibleName(node)
  });
  const side = labelSide(node, containerWidth);
  wrap.dataset.labelSide = side;
  wrap.style.setProperty("--i", String(index));
  wrap.style.left = `${node.center.x}px`;
  wrap.style.top = `${node.center.y}px`;
  const marker = createElement("div", { className: "node-dot brownian" });
  marker.dataset.type = node.type;
  if (node.subtype)
    marker.dataset.subtype = node.subtype;
  const label = createElement("div", { className: "node-label" });
  const kindEl = createElement("span", { className: "node-label-kind" }, [typeKind(node)]);
  const titleEl = createElement("span", { className: "node-label-title" }, [
    node.title || node.id
  ]);
  label.appendChild(kindEl);
  label.appendChild(titleEl);
  wrap.appendChild(marker);
  wrap.appendChild(label);
  wrap.dataset.origLeft = wrap.style.left;
  wrap.dataset.origTop = wrap.style.top;
  wrap.title = node.title || node.id;
  wrap.addEventListener("click", () => callbacks.onClick(node));
  wrap.addEventListener("mouseenter", () => callbacks.onHoverEnter(node));
  wrap.addEventListener("mouseleave", () => callbacks.onHoverLeave(node));
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      callbacks.onClick(node);
    }
  });
  wrap.addEventListener("focus", () => callbacks.onHoverEnter(node));
  wrap.addEventListener("blur", () => callbacks.onHoverLeave(node));
  return wrap;
}
function renderWeb(container, callbacks) {
  if (!container)
    return;
  const nodes = get("nodes");
  const threads = get("threads");
  container.innerHTML = "";
  threadElements = [];
  dotElements = new Map;
  const nodesPx = nodesToPx(nodes, container);
  currentNodesPx = nodesPx;
  threads.forEach((thread, idx) => {
    const from = nodesPx.find((n) => n.id === thread.from);
    const to = nodesPx.find((n) => n.id === thread.to);
    if (!from || !to)
      return;
    const line = createThreadLine(from, to, thread, idx);
    container.appendChild(line);
    threadElements.push(line);
  });
  const containerWidth = container.getBoundingClientRect().width;
  nodesPx.forEach((node, idx) => {
    const dot = createNodeDot(node, idx, containerWidth, callbacks);
    container.appendChild(dot);
    dotElements.set(node.id, dot);
  });
  initBrownianMotion(dotElements);
  const isContainerMode = get("isContainerMode");
  const activeNodeId = get("activeNodeId");
  if (isContainerMode && activeNodeId) {}
}
function getThreadElements() {
  return threadElements;
}
function getDotElements() {
  return dotElements;
}
function getCurrentNodesPx() {
  return currentNodesPx;
}
function setDotContainerMode(dot, mode) {
  dot.classList.remove("container-nav", "container-active", "container-hidden");
  switch (mode) {
    case "nav":
      dot.classList.add("container-nav");
      break;
    case "active":
      dot.classList.add("container-active");
      break;
    case "active-hidden":
      dot.classList.add("container-active", "container-hidden");
      break;
    case "hidden":
      dot.classList.add("container-hidden");
      break;
  }
}
function resetDotPositions() {
  dotElements.forEach((dot) => {
    dot.classList.remove("container-nav", "container-active", "container-hidden");
    dot.style.zIndex = "";
    const origLeft = dot.dataset.origLeft;
    const origTop = dot.dataset.origTop;
    if (origLeft != null)
      dot.style.left = origLeft;
    if (origTop != null)
      dot.style.top = origTop;
  });
}

// src/utils/animation.ts
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// src/components/particles.ts
function threadColors(thread) {
  const list = (thread.dataset.threads || thread.dataset.thread || "questions").split(" ").filter(Boolean);
  return list.map((t) => (THREAD_PALETTES[t] || THREAD_PALETTES.questions)[0]);
}
var PARTICLE_COUNT = 25;
var STREAM_DURATION = 2400;
var activeStreams = new Map;
var streamParticles = new Map;
function getCurrentDotPosition(dotElement) {
  const left = parseFloat(dotElement.style.left || "0");
  const top = parseFloat(dotElement.style.top || "0");
  return { x: left, y: top };
}
function createParticle(container, sourceDot, targetDot, color, streamId, index, onComplete) {
  const particle = createElement("div", { className: "particle" });
  particle.style.background = color;
  particle.style.boxShadow = `0 0 4px ${color}, 0 0 2px ${color}`;
  const sourcePos = getCurrentDotPosition(sourceDot);
  particle.style.left = `${sourcePos.x}px`;
  particle.style.top = `${sourcePos.y}px`;
  container.appendChild(particle);
  const baseDelay = STREAM_DURATION / PARTICLE_COUNT;
  const randomDelay = baseDelay * index * (0.8 + Math.random() * 0.4);
  const randomDuration = STREAM_DURATION * (0.9 + Math.random() * 0.2);
  setTimeout(() => {
    if (!activeStreams.has(streamId)) {
      particle.remove();
      return;
    }
    particle.style.opacity = "1";
    const startPos = getCurrentDotPosition(sourceDot);
    const endPos = getCurrentDotPosition(targetDot);
    let startX = startPos.x;
    let startY = startPos.y;
    let endX = endPos.x;
    let endY = endPos.y;
    let dx = endX - startX;
    let dy = endY - startY;
    let distance = Math.hypot(dx, dy);
    let perpX = -dy / distance;
    let perpY = dx / distance;
    const waveAmplitude = 3 + Math.random() * 4;
    const waveFrequency = 2 + Math.random() * 2;
    const randomOffset = (Math.random() - 0.5) * 2;
    let startTime = null;
    function animate(timestamp) {
      if (!activeStreams.has(streamId)) {
        particle.remove();
        return;
      }
      if (!startTime)
        startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / randomDuration, 1);
      const currentStartPos = getCurrentDotPosition(sourceDot);
      const currentEndPos = getCurrentDotPosition(targetDot);
      startX = currentStartPos.x;
      startY = currentStartPos.y;
      endX = currentEndPos.x;
      endY = currentEndPos.y;
      dx = endX - startX;
      dy = endY - startY;
      distance = Math.hypot(dx, dy);
      perpX = -dy / distance;
      perpY = dx / distance;
      const easeProgress = easeInOutQuad(progress);
      const wave = Math.sin(easeProgress * Math.PI * waveFrequency) * waveAmplitude * (1 - easeProgress);
      const currentX = startX + dx * easeProgress + perpX * (wave + randomOffset);
      const currentY = startY + dy * easeProgress + perpY * (wave + randomOffset);
      particle.style.left = `${currentX}px`;
      particle.style.top = `${currentY}px`;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
        onComplete();
      }
    }
    requestAnimationFrame(animate);
  }, randomDelay);
  return particle;
}
function createParticleStream(container, sourceDot, targetDot, colors, streamId) {
  const particles = [];
  function spawnParticle(index) {
    if (!activeStreams.has(streamId))
      return;
    const color = colors[index % colors.length];
    const particle = createParticle(container, sourceDot, targetDot, color, streamId, index, () => {
      if (activeStreams.has(streamId)) {
        spawnParticle(index);
      }
    });
    particles.push(particle);
  }
  for (let i = 0;i < PARTICLE_COUNT; i++) {
    spawnParticle(i);
  }
  return particles;
}
function startParticleStreams(nodeId, _nodesPx, threadElements2, container, dotElements2) {
  stopParticleStreams(nodeId);
  if (!ambientMotionEnabled())
    return;
  const connectedThreads = threadElements2.filter((thread) => thread.dataset.from === nodeId || thread.dataset.to === nodeId);
  const allParticles = [];
  connectedThreads.forEach((thread, idx) => {
    const fromNodeId = thread.dataset.from;
    const toNodeId = thread.dataset.to;
    if (!fromNodeId || !toNodeId)
      return;
    const fromDot = dotElements2.get(fromNodeId);
    const toDot = dotElements2.get(toNodeId);
    if (!fromDot || !toDot)
      return;
    const colors = threadColors(thread);
    const isFromHovered = fromNodeId === nodeId;
    const sourceDot = isFromHovered ? fromDot : toDot;
    const targetDot = isFromHovered ? toDot : fromDot;
    const streamId = `${nodeId}-${idx}`;
    activeStreams.set(streamId, true);
    const particles = createParticleStream(container, sourceDot, targetDot, colors, streamId);
    allParticles.push(...particles);
  });
  streamParticles.set(nodeId, allParticles);
}
function stopParticleStreams(nodeId) {
  const particles = streamParticles.get(nodeId);
  if (particles) {
    particles.forEach((particle) => {
      if (particle.parentNode) {
        particle.remove();
      }
    });
    streamParticles.delete(nodeId);
  }
  const streamKeys = Array.from(activeStreams.keys());
  streamKeys.forEach((key) => {
    if (key === nodeId || key.startsWith(`${nodeId}-`)) {
      activeStreams.delete(key);
    }
  });
}

// src/containers/essay.ts
var markedModule = null;
async function getMarked() {
  if (!markedModule) {
    markedModule = await import("./marked.esm-5snfdrkk.js");
  }
  return markedModule.marked;
}
async function loadEssayMarkdown(essayFile) {
  const res = await fetch(`content/essays/${essayFile}`);
  if (!res.ok) {
    throw new Error(`Failed to load essay: ${res.status} ${res.statusText}`);
  }
  return res.text();
}
var essayRenderer = {
  async render(nodeId, cardEl) {
    clearContainerContent(cardEl);
    let nodeData;
    try {
      nodeData = await loadJSON(`content/nodes/${nodeId}.json`);
    } catch (e) {
      console.error("Failed to load node data:", e);
      return;
    }
    if (!nodeData.essayFile) {
      console.error("No essayFile specified in node data");
      return;
    }
    let markdownText;
    try {
      markdownText = await loadEssayMarkdown(nodeData.essayFile);
    } catch (e) {
      console.error("Failed to load essay markdown:", e);
      return;
    }
    const marked = await getMarked();
    const htmlContent = marked.parse(markdownText);
    const article = createElement("article", { className: "essay-content" });
    article.innerHTML = htmlContent;
    updateContainerHeader(cardEl, {
      eyebrow: "",
      lede: "",
      hideTitle: true
    });
    cardEl.appendChild(article);
  },
  cleanup() {}
};
registerRenderer("essay", essayRenderer);

// src/containers/durational.ts
var particleStates = [];
var animationFrameId = null;
var containerRect = null;
var activeContentEl = null;
var scWidget = null;
var SC_API_SRC = "https://w.soundcloud.com/player/api.js";
var scApiPromise = null;
function loadSoundCloudApi() {
  if (scApiPromise)
    return scApiPromise;
  scApiPromise = new Promise((resolve) => {
    const w = window;
    if (w.SC?.Widget) {
      resolve(w.SC);
      return;
    }
    const existing = document.querySelector(`script[src="${SC_API_SRC}"]`);
    const onReady = () => resolve(window.SC || null);
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => resolve(null));
      return;
    }
    const script = document.createElement("script");
    script.src = SC_API_SRC;
    script.async = true;
    script.addEventListener("load", onReady);
    script.addEventListener("error", () => resolve(null));
    document.head.appendChild(script);
  });
  return scApiPromise;
}
function saturationCurve(progress) {
  const p = Math.max(0, Math.min(1, progress));
  return 0.25 + 0.75 * Math.sin(Math.PI * p);
}
function applyIntensity(intensity) {
  if (!activeContentEl)
    return;
  activeContentEl.style.setProperty("--durational-intensity", intensity.toFixed(3));
}
async function wireSoundCloudCurve(iframe) {
  applyIntensity(saturationCurve(0));
  const SC = await loadSoundCloudApi();
  if (!SC?.Widget)
    return;
  try {
    scWidget = SC.Widget(iframe);
    scWidget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
      applyIntensity(saturationCurve(e.relativePosition ?? 0));
    });
    scWidget.bind(SC.Widget.Events.FINISH, () => applyIntensity(saturationCurve(1)));
  } catch {
    scWidget = null;
  }
}
function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match?.[1] || "";
}
function extractVimeoId(url) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || "";
}
function extractSpotifyId(url) {
  const match = url.match(/spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  return match ? `${match[1]}/${match[2]}` : "";
}
function createEmbed(media) {
  const iframe = createElement("iframe", {
    className: "durational-embed"
  });
  iframe.setAttribute("allow", "autoplay");
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("allowfullscreen", "");
  switch (media.source) {
    case "soundcloud":
      iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(media.url)}&color=%23c4956a&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;
      break;
    case "mixcloud":
      iframe.src = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(media.url)}`;
      break;
    case "youtube":
      const ytId = extractYouTubeId(media.url);
      iframe.src = `https://www.youtube.com/embed/${ytId}?rel=0`;
      break;
    case "vimeo":
      const vimeoId = extractVimeoId(media.url);
      iframe.src = `https://player.vimeo.com/video/${vimeoId}`;
      break;
    case "spotify":
      const spotifyId = extractSpotifyId(media.url);
      iframe.src = `https://open.spotify.com/embed/${spotifyId}`;
      break;
  }
  return iframe;
}
function animateParticles() {
  if (!containerRect)
    return;
  const nudgeChance = 0.005;
  const nudgeStrength = 0.08;
  const drift = 0.002;
  const drag = 0.997;
  const margin = 20;
  for (const p of particleStates) {
    if (Math.random() < nudgeChance) {
      const angle = Math.random() * Math.PI * 2;
      p.vx += Math.cos(angle) * nudgeStrength;
      p.vy += Math.sin(angle) * nudgeStrength;
    }
    p.vx += (Math.random() - 0.5) * drift;
    p.vy += (Math.random() - 0.5) * drift;
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < margin) {
      p.vx += 0.01;
    } else if (p.x > containerRect.width - margin) {
      p.vx -= 0.01;
    }
    if (p.y < margin) {
      p.vy += 0.01;
    } else if (p.y > containerRect.height - margin) {
      p.vy -= 0.01;
    }
    p.x = Math.max(0, Math.min(containerRect.width, p.x));
    p.y = Math.max(0, Math.min(containerRect.height, p.y));
    p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }
  animationFrameId = requestAnimationFrame(animateParticles);
}
function startParticles(container) {
  if (prefersReducedMotion())
    return;
  const particleCount = 40;
  particleStates = [];
  const rect = container.getBoundingClientRect();
  const width = Math.max(rect.width, window.innerWidth * 0.9);
  const height = Math.max(rect.height, window.innerHeight * 0.8);
  containerRect = { width, height };
  const cols = 8;
  const rows = 5;
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  for (let i = 0;i < particleCount; i++) {
    const particle = createElement("div", { className: "durational-particle" });
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jitterX = (Math.random() - 0.5) * cellWidth * 0.8;
    const jitterY = (Math.random() - 0.5) * cellHeight * 0.8;
    const x = (col + 0.5) * cellWidth + jitterX;
    const y = (row + 0.5) * cellHeight + jitterY;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.1 + Math.random() * 0.15;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    particle.style.left = "0";
    particle.style.top = "0";
    particle.style.transform = `translate(${x}px, ${y}px)`;
    const size = 3 + Math.random() * 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.opacity = `${0.5 + Math.random() * 0.4}`;
    container.appendChild(particle);
    particleStates.push({ el: particle, x, y, vx, vy });
  }
  animationFrameId = requestAnimationFrame(animateParticles);
}
function stopParticles() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  particleStates.forEach((p) => p.el.remove());
  particleStates = [];
  containerRect = null;
}
function formatSubtype(subtype) {
  if (!subtype)
    return "durational";
  return subtype.replace("-", " ");
}
var durationalRenderer = {
  async render(nodeId, cardEl) {
    clearContainerContent(cardEl);
    let data;
    try {
      data = await loadJSON(`content/durational/${nodeId}.json`);
    } catch (e) {
      console.error("Failed to load durational data:", e);
      return;
    }
    const container = createElement("div", { className: "durational-content" });
    activeContentEl = container;
    container.style.setProperty("--durational-intensity", saturationCurve(0).toFixed(3));
    const particleBg = createElement("div", { className: "durational-particles" });
    container.appendChild(particleBg);
    const playerWrapper = createElement("div", { className: "durational-player" });
    const embed = createEmbed(data.media);
    playerWrapper.appendChild(embed);
    container.appendChild(playerWrapper);
    if (data.media.source === "soundcloud") {
      wireSoundCloudCurve(embed);
    }
    const descriptionText = data.description || data.commentary || "";
    if (descriptionText) {
      const description = createElement("div", { className: "durational-description" });
      description.textContent = descriptionText;
      container.appendChild(description);
    }
    updateContainerHeader(cardEl, {
      eyebrow: formatSubtype(data.subtype),
      title: data.title,
      lede: ""
    });
    cardEl.appendChild(container);
    startParticles(particleBg);
  },
  cleanup() {
    stopParticles();
    if (scWidget) {
      try {
        const SC = window.SC;
        if (SC?.Widget?.Events) {
          scWidget.unbind(SC.Widget.Events.PLAY_PROGRESS);
          scWidget.unbind(SC.Widget.Events.FINISH);
        }
      } catch {}
      scWidget = null;
    }
    activeContentEl = null;
  }
};
registerRenderer("durational", durationalRenderer);
registerRenderer("dj-mix", durationalRenderer);
registerRenderer("talk", durationalRenderer);
registerRenderer("podcast", durationalRenderer);

// src/landing.ts
var webEl = getById("landing-web");
var overlayEl = getById("overlay-essay");
var cardEl = overlayEl ? query(".container-card", overlayEl) : null;
var closeBtnEl = overlayEl ? query(".container-close", overlayEl) : null;
var curiosityCentralById = new Map;
var isAnimatingContainer = false;
var refreshCuriosityLines = null;
var originatingNodeEl = null;
var NODE_ROUTE_PREFIX = "#/node/";
function getNodeIdFromUrl() {
  const hash = window.location.hash;
  if (hash.startsWith(NODE_ROUTE_PREFIX)) {
    return hash.slice(NODE_ROUTE_PREFIX.length);
  }
  return null;
}
function updateUrlForNode(nodeId) {
  if (nodeId) {
    const newUrl = `${NODE_ROUTE_PREFIX}${nodeId}`;
    if (window.location.hash !== newUrl) {
      history.pushState({ nodeId }, "", newUrl);
    }
  } else {
    if (window.location.hash) {
      history.pushState({}, "", window.location.pathname);
    }
  }
}
function handlePopState() {
  const nodeId = getNodeIdFromUrl();
  const isContainerMode = get("isContainerMode");
  const activeNodeId = get("activeNodeId");
  if (nodeId && !isContainerMode) {
    focusEssay(nodeId);
  } else if (!nodeId && isContainerMode && activeNodeId) {
    requestCloseContainer();
  } else if (nodeId && isContainerMode && nodeId !== activeNodeId) {
    set("pendingNodeId", nodeId);
    set("isNodeSwitching", true);
    hidePhrase();
    animateCardToNodeAndClose(activeNodeId);
  }
}
async function setOverlayContent(nodeId) {
  const nodes = get("nodes");
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !overlayEl || !cardEl)
    return;
  const eyebrow = query(".eyebrow", overlayEl);
  const titleEl = query("h2", overlayEl);
  const ledeEl = query(".lede", overlayEl);
  if (eyebrow)
    eyebrow.textContent = node.type ? `Container: ${node.type}` : "Container";
  if (titleEl)
    titleEl.textContent = node.title || node.id;
  setContainerType(overlayEl, node);
  const renderer = getRendererForNode(node);
  if (renderer) {
    await renderer.render(nodeId, cardEl);
    if (node.type === "curiosity") {
      const { getRefreshCallback } = await import("./curiosity-4rfym7d9.js");
      refreshCuriosityLines = getRefreshCallback();
    }
  } else {
    clearContainerContent(cardEl);
    if (ledeEl) {
      ledeEl.textContent = "This is a stub for the container. Hook nodes or nav to enter here.";
    }
  }
}
function animateCardFromNode(nodeId) {
  if (!cardEl)
    return;
  if (prefersReducedMotion()) {
    cardEl.style.transition = "none";
    cardEl.style.transform = "";
    cardEl.style.borderRadius = "";
    isAnimatingContainer = false;
    if (typeof refreshCuriosityLines === "function")
      refreshCuriosityLines();
    return;
  }
  const dotElements2 = getDotElements();
  const dot = dotElements2.get(nodeId);
  if (!dot)
    return;
  const from = dot.getBoundingClientRect();
  const to = cardEl.getBoundingClientRect();
  isAnimatingContainer = true;
  cardEl.style.transformOrigin = "top left";
  cardEl.style.transition = "none";
  cardEl.style.borderRadius = "999px";
  cardEl.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${Math.max(0.01, from.width / to.width)}, ${Math.max(0.01, from.height / to.height)})`;
  cardEl.getBoundingClientRect();
  requestAnimationFrame(() => {
    if (!cardEl)
      return;
    cardEl.style.transition = "transform 420ms ease, border-radius 420ms ease";
    cardEl.style.borderRadius = "var(--radius)";
    cardEl.style.transform = "translate(0px, 0px) scale(1, 1)";
  });
  const onEnd = (e) => {
    if (e.propertyName !== "transform" || !cardEl)
      return;
    cardEl.removeEventListener("transitionend", onEnd);
    isAnimatingContainer = false;
    if (typeof refreshCuriosityLines === "function") {
      refreshCuriosityLines();
    }
  };
  cardEl.addEventListener("transitionend", onEnd);
}
function animateCardToNodeAndClose(nodeId) {
  if (!cardEl) {
    closeEssay();
    return;
  }
  if (prefersReducedMotion()) {
    isAnimatingContainer = false;
    closeEssay();
    const isNodeSwitching = get("isNodeSwitching");
    const pendingNodeId = get("pendingNodeId");
    if (isNodeSwitching && pendingNodeId) {
      const targetId = pendingNodeId;
      set("pendingNodeId", null);
      set("isNodeSwitching", false);
      window.setTimeout(() => focusEssay(targetId), 60);
    } else {
      showPhraseSlow();
    }
    cardEl.style.transition = "none";
    cardEl.style.transform = "";
    cardEl.style.borderRadius = "";
    return;
  }
  const dotElements2 = getDotElements();
  const dot = dotElements2.get(nodeId);
  if (!dot) {
    closeEssay();
    return;
  }
  const to = dot.getBoundingClientRect();
  const from = cardEl.getBoundingClientRect();
  isAnimatingContainer = true;
  cardEl.style.transformOrigin = "top left";
  cardEl.style.transition = "transform 420ms ease, border-radius 420ms ease";
  cardEl.style.borderRadius = "999px";
  cardEl.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${Math.max(0.01, to.width / from.width)}, ${Math.max(0.01, to.height / from.height)})`;
  const onEnd = (e) => {
    if (e.propertyName !== "transform" || !cardEl)
      return;
    cardEl.removeEventListener("transitionend", onEnd);
    isAnimatingContainer = false;
    closeEssay();
    const isNodeSwitching = get("isNodeSwitching");
    const pendingNodeId = get("pendingNodeId");
    if (isNodeSwitching && pendingNodeId) {
      const targetId = pendingNodeId;
      set("pendingNodeId", null);
      window.setTimeout(() => {
        set("isNodeSwitching", false);
        focusEssay(targetId);
      }, 420);
    } else {
      showPhraseSlow();
    }
    window.setTimeout(() => {
      if (!cardEl)
        return;
      cardEl.style.transition = "none";
      cardEl.style.transform = "";
      cardEl.style.borderRadius = "";
      cardEl.style.transition = "";
    }, 260);
  };
  cardEl.addEventListener("transitionend", onEnd);
}
function requestCloseContainer() {
  const isContainerMode = get("isContainerMode");
  if (!isContainerMode || isAnimatingContainer)
    return;
  const activeNodeId = get("activeNodeId");
  if (!activeNodeId) {
    closeEssay();
    return;
  }
  animateCardToNodeAndClose(activeNodeId);
}
function applyContainerModeLayout(nodeId) {
  if (!webEl)
    return;
  pauseAllMotion();
  const rect = webEl.getBoundingClientRect();
  const pad = 18;
  const xLeft = pad;
  const xRight = Math.max(pad, rect.width - pad - DOT_SIZE);
  const nodesPx = getCurrentNodesPx();
  const dotElements2 = getDotElements();
  const otherIds = nodesPx.map((n) => n.id).filter((id) => id !== nodeId);
  const availableH = Math.max(1, rect.height - pad * 2);
  const midX = rect.width / 2;
  const leftIds = [];
  const rightIds = [];
  otherIds.forEach((id) => {
    const n = nodesPx.find((p) => p.id === id);
    const x = n?.center?.x ?? midX;
    if (x <= midX)
      leftIds.push(id);
    else
      rightIds.push(id);
  });
  function layoutSide(ids, xTarget) {
    ids.sort((a, b) => {
      const na = nodesPx.find((n) => n.id === a);
      const nb = nodesPx.find((n) => n.id === b);
      return (na?.center?.y ?? 0) - (nb?.center?.y ?? 0);
    }).forEach((id, idx) => {
      const dot = dotElements2.get(id);
      if (!dot)
        return;
      const count = ids.length;
      const t = count <= 1 ? 0.5 : idx / (count - 1);
      const y = pad + t * availableH;
      setDotContainerMode(dot, "nav");
      dot.style.left = `${xTarget}px`;
      dot.style.top = `${Math.max(pad, Math.min(rect.height - pad, y))}px`;
      dot.style.zIndex = "35";
    });
  }
  layoutSide(leftIds, xLeft);
  layoutSide(rightIds, xRight);
  const activeDot = dotElements2.get(nodeId);
  if (activeDot) {
    setDotContainerMode(activeDot, "active-hidden");
    activeDot.style.zIndex = "36";
  }
}
function checkScrollIndicator() {
  if (!cardEl || !overlayEl)
    return;
  const hasScroll = cardEl.scrollHeight > cardEl.clientHeight;
  const isNearBottom = cardEl.scrollHeight - cardEl.scrollTop - cardEl.clientHeight < 50;
  if (hasScroll && !isNearBottom) {
    overlayEl.classList.add("has-scroll");
  } else {
    overlayEl.classList.remove("has-scroll");
  }
}
async function enterContainerMode(nodeId) {
  if (!nodeId)
    return;
  set("isContainerMode", true);
  set("activeNodeId", nodeId);
  updateUrlForNode(nodeId);
  originatingNodeEl = getDotElements().get(nodeId) || null;
  hidePhrase();
  await setOverlayContent(nodeId);
  applyContainerModeLayout(nodeId);
  animateCardFromNode(nodeId);
  window.setTimeout(() => {
    (closeBtnEl || cardEl)?.focus?.();
  }, 60);
  setTimeout(() => {
    checkScrollIndicator();
    if (cardEl) {
      cardEl.addEventListener("scroll", checkScrollIndicator);
    }
  }, 500);
}
function exitContainerMode() {
  set("isContainerMode", false);
  set("activeNodeId", null);
  updateUrlForNode(null);
  if (cardEl) {
    cardEl.removeEventListener("scroll", checkScrollIndicator);
  }
  if (overlayEl) {
    overlayEl.classList.remove("has-scroll");
  }
  resetDotPositions();
  resumeAllMotion();
  refreshCuriosityLines = null;
  const returnTo = originatingNodeEl;
  originatingNodeEl = null;
  if (returnTo) {
    window.setTimeout(() => returnTo.focus?.(), 60);
  }
}
function handleNodeClick(node) {
  if (isAnimatingContainer)
    return;
  const isContainerMode = get("isContainerMode");
  const activeNodeId = get("activeNodeId");
  if (isContainerMode) {
    if (node.id === activeNodeId) {
      requestCloseContainer();
      return;
    }
    set("pendingNodeId", node.id);
    set("isNodeSwitching", true);
    hidePhrase();
    animateCardToNodeAndClose(activeNodeId);
    return;
  }
  focusEssay(node.id);
}
function handleNodeHoverEnter(node) {
  if (!webEl)
    return;
  const nodesPx = getCurrentNodesPx();
  const threadElements2 = getThreadElements();
  const dotElements2 = getDotElements();
  pauseMotion(node.id);
  startParticleStreams(node.id, nodesPx, threadElements2, webEl, dotElements2);
  if (node.type === "curiosity") {
    const cached = curiosityCentralById.get(node.id);
    const dot = getDotElements().get(node.id);
    if (cached && dot) {
      dot.title = cached;
    } else {
      loadJSON(`content/curiosities/${node.id}.json`).then((data) => {
        const central = data?.central || node.id;
        curiosityCentralById.set(node.id, central);
        if (dot)
          dot.title = central;
      }).catch(() => {
        curiosityCentralById.set(node.id, node.id);
        if (dot)
          dot.title = node.id;
      });
    }
  }
}
function handleNodeHoverLeave(node) {
  stopParticleStreams(node.id);
  resumeMotion(node.id);
}
async function initBioSignature() {
  const el = getById("bio-signature");
  if (!el)
    return;
  try {
    const bio = await loadJSON("content/nodes/bio.json");
    const raw = (bio?.bioText || "").trim();
    if (!raw)
      return;
    const text = raw.replace(/\s*\n+\s*/g, " ").replace(/\s+/g, " ").trim();
    el.textContent = text;
    el.classList.add("is-visible");
  } catch {
    el.textContent = "In short, I'm Qa'id: a father, designer, DJ, tinkerer. Always in motion between places and questions.";
    el.classList.add("is-visible");
  }
}
async function initLanding() {
  try {
    const [phrasesData, nodesData, threadsData] = await Promise.all([
      loadJSON("content/phrases.json"),
      loadJSON("content/nodes/landing-nodes.json"),
      loadJSON("content/connections.json")
    ]);
    set("phrases", phrasesData);
    set("nodes", nodesData);
    set("threads", threadsData);
    initPhrase();
    rotatePhrase(phrasesData);
    initBioSignature();
    renderWeb(webEl, {
      onClick: handleNodeClick,
      onHoverEnter: handleNodeHoverEnter,
      onHoverLeave: handleNodeHoverLeave
    });
    const initialNodeId = getNodeIdFromUrl();
    if (initialNodeId) {
      const nodeExists = nodesData.some((n) => n.id === initialNodeId);
      if (nodeExists) {
        setTimeout(() => focusEssay(initialNodeId), 100);
      }
    }
  } catch (err) {
    console.error("Landing init failed", err);
  }
}
initLanding();
if (closeBtnEl) {
  closeBtnEl.addEventListener("click", (e) => {
    e.preventDefault();
    requestCloseContainer();
  });
}
document.addEventListener("pointerdown", (e) => {
  const isContainerMode = get("isContainerMode");
  if (!isContainerMode)
    return;
  if (isAnimatingContainer)
    return;
  const target = e.target;
  if (cardEl && cardEl.contains(target))
    return;
  if (target?.closest?.(".node-dot"))
    return;
  if (target?.closest?.(".theme-toggle"))
    return;
  if (target?.closest?.(".site-header"))
    return;
  requestCloseContainer();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape")
    return;
  if (!get("isContainerMode"))
    return;
  requestCloseContainer();
});
window.addEventListener("container:open", (e) => {
  const nodeId = e?.detail?.nodeId;
  if (!nodeId)
    return;
  enterContainerMode(nodeId);
});
window.addEventListener("container:close", () => {
  exitContainerMode();
});
window.addEventListener("popstate", handlePopState);
