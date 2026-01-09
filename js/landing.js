import {
  closeEssay,
  focusEssay
} from "./main.js";
import {
  DOT_RADIUS,
  DOT_SIZE,
  THREAD_PALETTES,
  clearContainerContent,
  get,
  getRendererForNode,
  loadJSON,
  registerRenderer,
  set,
  setContainerType,
  updateContainerHeader
} from "./curiosity-4vn8p1s8.js";
import {
  createElement,
  getById,
  query
} from "./main-65mq6067.js";
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
function showCustomPhrase(text, attribution) {
  if (!phraseTextEl)
    return;
  phraseTextEl.textContent = text;
  if (phraseByEl) {
    phraseByEl.textContent = attribution ? `— ${attribution}` : "";
  }
}
function restorePhrase() {
  if (!phraseTextEl)
    return;
  phraseTextEl.textContent = currentPhraseText;
  if (phraseByEl) {
    phraseByEl.textContent = currentPhraseBy;
  }
}

// src/components/brownian.ts
var MOTION_CONFIG = {
  MAX_RADIUS: 15,
  STEP_SIZE: 0.02,
  DIRECTION_CHANGE_RATE: 0.98,
  BASE_SPEED: 0.15
};
var dotMotions = new Map;
var rafId = null;
var globalPaused = false;
function gaussianRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function reflectAtBoundary(offsetX, offsetY, velocityX, velocityY, radius) {
  const dist = Math.hypot(offsetX, offsetY);
  if (dist > radius) {
    const nx = offsetX / dist;
    const ny = offsetY / dist;
    const dot = velocityX * nx + velocityY * ny;
    return {
      vx: velocityX - 2 * dot * nx,
      vy: velocityY - 2 * dot * ny
    };
  }
  return { vx: velocityX, vy: velocityY };
}
function updateMotion() {
  let hasActiveDots = false;
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
    state.offsetX += state.velocityX;
    state.offsetY += state.velocityY;
    const dist = Math.hypot(state.offsetX, state.offsetY);
    if (dist > MOTION_CONFIG.MAX_RADIUS) {
      const scale = MOTION_CONFIG.MAX_RADIUS / dist;
      state.offsetX *= scale;
      state.offsetY *= scale;
      const reflected = reflectAtBoundary(state.offsetX, state.offsetY, state.velocityX, state.velocityY, MOTION_CONFIG.MAX_RADIUS);
      state.velocityX = reflected.vx;
      state.velocityY = reflected.vy;
    }
    state.dotElement.style.left = `${state.originalX + state.offsetX}px`;
    state.dotElement.style.top = `${state.originalY + state.offsetY}px`;
  });
  if (hasActiveDots || !globalPaused) {
    rafId = requestAnimationFrame(updateMotion);
  } else {
    rafId = null;
  }
}
function initBrownianMotion(dotElements) {
  stopBrownianMotion();
  dotElements.forEach((dotElement, nodeId) => {
    const origLeft = parseFloat(dotElement.dataset.origLeft || "0");
    const origTop = parseFloat(dotElement.dataset.origTop || "0");
    const angle = Math.random() * 2 * Math.PI;
    const speed = MOTION_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.5);
    dotMotions.set(nodeId, {
      nodeId,
      dotElement,
      originalX: origLeft,
      originalY: origTop,
      offsetX: 0,
      offsetY: 0,
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
  const primaryThread = thread.threads?.[0] || "questions";
  const palette = THREAD_PALETTES[primaryThread] || THREAD_PALETTES.questions;
  line.dataset.thread = primaryThread;
  line.dataset.from = thread.from;
  line.dataset.to = thread.to;
  line.style.setProperty("--i", String(index));
  line.style.setProperty("--strand1", palette[0]);
  line.style.setProperty("--strand2", palette[1]);
  line.style.setProperty("--strand3", palette[2]);
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
function createNodeDot(node, index, callbacks) {
  const dot = createElement("div", {
    className: "node-dot brownian",
    "data-type": node.type,
    "data-id": node.id
  });
  dot.style.setProperty("--i", String(index));
  dot.style.left = `${node.center.x - DOT_RADIUS}px`;
  dot.style.top = `${node.center.y - DOT_RADIUS}px`;
  dot.dataset.origLeft = dot.style.left;
  dot.dataset.origTop = dot.style.top;
  dot.title = node.title || node.id;
  dot.addEventListener("click", () => {
    callbacks.onClick(node);
  });
  dot.addEventListener("mouseenter", () => {
    callbacks.onHoverEnter(node);
  });
  dot.addEventListener("mouseleave", () => {
    callbacks.onHoverLeave(node);
  });
  return dot;
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
  nodesPx.forEach((node, idx) => {
    const dot = createNodeDot(node, idx, callbacks);
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
var PARTICLE_COUNT = 25;
var STREAM_DURATION = 2400;
var activeStreams = new Map;
var streamParticles = new Map;
function createParticle(container, sourceNode, targetNode, color, streamId, index, onComplete) {
  const particle = createElement("div", { className: "particle" });
  particle.style.background = color;
  particle.style.boxShadow = `0 0 4px ${color}, 0 0 2px ${color}`;
  particle.style.left = `${sourceNode.center.x}px`;
  particle.style.top = `${sourceNode.center.y}px`;
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
    const startX = sourceNode.center.x;
    const startY = sourceNode.center.y;
    const endX = targetNode.center.x;
    const endY = targetNode.center.y;
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const perpX = -dy / distance;
    const perpY = dx / distance;
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
function createParticleStream(container, sourceNode, targetNode, color, streamId) {
  const particles = [];
  function spawnParticle(index) {
    if (!activeStreams.has(streamId))
      return;
    const particle = createParticle(container, sourceNode, targetNode, color, streamId, index, () => {
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
function startParticleStreams(nodeId, nodesPx, threadElements2, container) {
  stopParticleStreams(nodeId);
  const connectedThreads = threadElements2.filter((thread) => thread.dataset.from === nodeId || thread.dataset.to === nodeId);
  const allParticles = [];
  connectedThreads.forEach((thread, idx) => {
    const fromNode = nodesPx.find((n) => n.id === thread.dataset.from);
    const toNode = nodesPx.find((n) => n.id === thread.dataset.to);
    if (!fromNode || !toNode)
      return;
    const primaryThread = thread.dataset.thread || "questions";
    const palette = THREAD_PALETTES[primaryThread] || THREAD_PALETTES.questions;
    const color = palette[0];
    const isFromHovered = thread.dataset.from === nodeId;
    const sourceNode = isFromHovered ? fromNode : toNode;
    const targetNode = isFromHovered ? toNode : fromNode;
    const streamId = `${nodeId}-${idx}`;
    activeStreams.set(streamId, true);
    const particles = createParticleStream(container, sourceNode, targetNode, color, streamId);
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
function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match?.[1] || "";
}
function extractVimeoId(url) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || "";
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
    const particleBg = createElement("div", { className: "durational-particles" });
    container.appendChild(particleBg);
    const playerWrapper = createElement("div", { className: "durational-player" });
    playerWrapper.appendChild(createEmbed(data.media));
    container.appendChild(playerWrapper);
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
      const { getRefreshCallback } = await import("./curiosity-4vn8p1s8.js");
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
  hidePhrase();
  await setOverlayContent(nodeId);
  applyContainerModeLayout(nodeId);
  animateCardFromNode(nodeId);
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
}
function handleNodeClick(node) {
  if (isAnimatingContainer)
    return;
  if (node.type === "bio") {
    return;
  }
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
  pauseMotion(node.id);
  startParticleStreams(node.id, nodesPx, threadElements2, webEl);
  if (node.type === "bio") {
    console.log("Bio hover:", node.id, "bioText:", node.bioText);
    if (node.bioText) {
      showCustomPhrase(node.bioText);
    }
    return;
  }
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
  if (node.type === "bio") {
    restorePhrase();
  }
}
async function initLanding() {
  try {
    const [phrasesData, nodesData, threadsData] = await Promise.all([
      loadJSON("content/phrases.json"),
      loadJSON("content/nodes/sample-nodes.json"),
      loadJSON("content/connections.json")
    ]);
    set("phrases", phrasesData);
    set("nodes", nodesData);
    set("threads", threadsData);
    initPhrase();
    rotatePhrase(phrasesData);
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
