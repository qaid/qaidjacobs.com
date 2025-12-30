import { closeEssay, focusEssay } from './main.js';
import { marked } from '../node_modules/marked/lib/marked.esm.js';

const phraseEl = document.getElementById('landing-phrase');
const phraseTextEl = document.querySelector('.phrase-text');
const phraseByEl = document.getElementById('phrase-by');
const webEl = document.getElementById('landing-web');

let phrases = [];
let nodes = [];
let threads = [];
const DOT_SIZE = 14;
const DOT_RADIUS = DOT_SIZE / 2;
const threadPalettes = {
  music: ['#ff7a9e', '#ff9cc0', '#ffd3e1'],
  movement: ['#4fd1c5', '#7de8dd', '#b1fff4'],
  questions: ['#f6c56c', '#ffd28c', '#ffe7b8'],
};

const curiosityCentralById = new Map();

const activeParticleStreams = new Map();

let dotElementsById = new Map();
let lastNodesPx = [];
let isContainerMode = false;
let activeNodeId = null;
let pendingNodeId = null;
let isNodeSwitching = false;

const overlayEl = document.getElementById('overlay-essay');
const cardEl = overlayEl ? overlayEl.querySelector('.container-card') : null;
const closeBtnEl = overlayEl ? overlayEl.querySelector('.container-close') : null;
let isAnimatingContainer = false;
let refreshCuriosityLines = null;

function hidePhrase() {
  document.body.classList.add('phrase-hidden');
  document.body.classList.remove('phrase-fade-in');
}

function showPhraseSlow() {
  document.body.classList.add('phrase-fade-in');
  document.body.classList.remove('phrase-hidden');
  window.setTimeout(() => {
    document.body.classList.remove('phrase-fade-in');
  }, 1100);
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function hashStringToInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clearDynamicContainerContent() {
  if (!cardEl) return;
  const curiosityStage = cardEl.querySelector('.curiosity-stage');
  if (curiosityStage) curiosityStage.remove();

  const essayContent = cardEl.querySelector('.essay-content');
  if (essayContent) essayContent.remove();

  refreshCuriosityLines = null;
}

async function renderEssay(nodeId) {
  if (!cardEl) return;
  clearDynamicContainerContent();

  let nodeData;
  try {
    nodeData = await loadJSON(`content/nodes/${nodeId}.json`);
  } catch (e) {
    console.error('Failed to load node data:', e);
    return;
  }

  if (!nodeData.essayFile) {
    console.error('No essayFile specified in node data');
    return;
  }

  let markdownText;
  try {
    const res = await fetch(`content/essays/${nodeData.essayFile}`);
    if (!res.ok) throw new Error(`Failed to load essay: ${res.status}`);
    markdownText = await res.text();
  } catch (e) {
    console.error('Failed to load essay markdown:', e);
    return;
  }

  const htmlContent = marked.parse(markdownText);

  const article = document.createElement('article');
  article.className = 'essay-content';
  article.innerHTML = htmlContent;

  const titleEl = cardEl.querySelector('h2');
  if (titleEl) titleEl.style.display = 'none';

  const eyebrow = cardEl.querySelector('.eyebrow');
  if (eyebrow) eyebrow.textContent = '';

  const lede = cardEl.querySelector('.lede');
  if (lede) lede.textContent = '';

  cardEl.appendChild(article);
}

async function renderCuriosity(nodeId) {
  if (!cardEl) return;
  clearDynamicContainerContent();

  let data;
  try {
    data = await loadJSON(`content/curiosities/${nodeId}.json`);
  } catch (e) {
    return;
  }

  const stage = document.createElement('div');
  stage.className = 'curiosity-stage';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'curiosity-lines');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('preserveAspectRatio', 'none');

  const cx = 500;
  const cy = 500;

  const center = document.createElement('div');
  center.className = 'curiosity-center';
  const centerPill = document.createElement('div');
  centerPill.className = 'curiosity-center-pill';
  centerPill.textContent = data.central || nodeId;
  center.appendChild(centerPill);

  stage.appendChild(svg);
  stage.appendChild(center);

  const connected = Array.isArray(data.connected) ? data.connected.slice(0, 30) : [];
  const count = connected.length;

  const palettes = ['music', 'movement', 'questions'];
  const radius = count <= 8 ? 310 : 360;

  const placed = [];

  connected.forEach((item, idx) => {
    const baseAngle = (idx / Math.max(1, count)) * Math.PI * 2;
    const jitter = ((hashStringToInt(item.label || String(idx)) % 1000) / 1000 - 0.5) * 0.42;
    const angle = baseAngle + jitter;

    const rJitter = ((hashStringToInt(`${item.label}-r`) % 1000) / 1000 - 0.5) * 60;
    const r = radius + rJitter;

    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'curiosity-item';
    btn.disabled = true;

    const paletteKey = palettes[hashStringToInt(item.label || String(idx)) % palettes.length];
    const palette = threadPalettes[paletteKey] || threadPalettes.questions;
    btn.style.color = palette[0];

    const label = document.createElement('span');
    label.className = 'curiosity-label';
    label.textContent = item.label || '';

    btn.style.left = `${(x / 1000) * 100}%`;
    btn.style.top = `${(y / 1000) * 100}%`;

    const jx = ((hashStringToInt(`${item.label}-jx`) % 7) - 3);
    const jy = ((hashStringToInt(`${item.label}-jy`) % 7) - 3);
    btn.style.setProperty('--jx', `${jx}px`);
    btn.style.setProperty('--jy', `${jy}px`);

    btn.appendChild(label);
    stage.appendChild(btn);

    placed.push({ el: btn, cx: x, cy: y });
  });

  const titleEl = cardEl.querySelector('h2');
  if (titleEl) titleEl.textContent = data.title || nodeId;

  function endpointToRectEdge(fromX, fromY, toX, toY, halfW, halfH) {
    const vx = toX - fromX;
    const vy = toY - fromY;
    const denom = Math.max(1e-6, Math.max(Math.abs(vx) / Math.max(1e-6, halfW), Math.abs(vy) / Math.max(1e-6, halfH)));
    return {
      x: toX - vx / denom,
      y: toY - vy / denom,
    };
  }

  function recomputeLines() {
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;

    while (svg.lastChild) svg.removeChild(svg.lastChild);

    const centerRect = centerPill.getBoundingClientRect();
    const cW = (centerRect.width / stageRect.width) * 1000;
    const cH = (centerRect.height / stageRect.height) * 1000;
    const cHalfW = cW / 2;
    const cHalfH = cH / 2;

    placed.forEach(({ el, cx: itemCx, cy: itemCy }) => {
      const r = el.getBoundingClientRect();
      const wVb = (r.width / stageRect.width) * 1000;
      const hVb = (r.height / stageRect.height) * 1000;
      const halfW = wVb / 2;
      const halfH = hVb / 2;

      const start = endpointToRectEdge(itemCx, itemCy, cx, cy, cHalfW, cHalfH);
      const end = endpointToRectEdge(cx, cy, itemCx, itemCy, halfW, halfH);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(start.x));
      line.setAttribute('y1', String(start.y));
      line.setAttribute('x2', String(end.x));
      line.setAttribute('y2', String(end.y));
      line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
    });
  }

  refreshCuriosityLines = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recomputeLines();
      });
    });
  };

  refreshCuriosityLines();

  const lede = cardEl.querySelector('.lede');
  if (lede) lede.textContent = '';
  cardEl.appendChild(stage);
}

function rotatePhrase() {
  if (!phrases.length || !phraseTextEl) return;
  const next = phrases[Math.floor(Math.random() * phrases.length)];
  phraseTextEl.textContent = next.text || '';
  if (phraseByEl) {
    phraseByEl.textContent = next.by ? `— ${next.by}` : '';
  }
}

function createParticleStream(fromNode, toNode, threadColor, threadElement, streamId) {
  const particles = [];
  const particleCount = 25;
  const streamDuration = 2400;
  const baseDelay = streamDuration / particleCount;

  function spawnParticle(index, isLoop = false) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.background = threadColor;
    particle.style.boxShadow = `0 0 4px ${threadColor}, 0 0 2px ${threadColor}`;
    
    particle.style.left = `${fromNode.center.x}px`;
    particle.style.top = `${fromNode.center.y}px`;
    
    webEl.appendChild(particle);
    particles.push(particle);

    const randomDelay = isLoop ? baseDelay * index * (0.8 + Math.random() * 0.4) : baseDelay * index * (0.8 + Math.random() * 0.4);
    const randomDuration = streamDuration * (0.9 + Math.random() * 0.2);
    
    const timeoutId = setTimeout(() => {
      particle.style.animation = `particleFlow ${randomDuration}ms ease-in-out`;
      particle.style.opacity = '1';
      
      const startX = fromNode.center.x;
      const startY = fromNode.center.y;
      const endX = toNode.center.x;
      const endY = toNode.center.y;
      
      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.hypot(dx, dy);
      const perpX = -dy / distance;
      const perpY = dx / distance;
      
      const waveAmplitude = 3 + Math.random() * 4;
      const waveFrequency = 2 + Math.random() * 2;
      const randomOffset = (Math.random() - 0.5) * 2;
      
      let startTime = null;
      let animationId;
      
      function animate(timestamp) {
        if (!activeParticleStreams.has(streamId)) {
          particle.remove();
          return;
        }
        
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / randomDuration, 1);
        
        const easeProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const wave = Math.sin(easeProgress * Math.PI * waveFrequency) * waveAmplitude * (1 - easeProgress);
        
        const currentX = startX + dx * easeProgress + perpX * (wave + randomOffset);
        const currentY = startY + dy * easeProgress + perpY * (wave + randomOffset);
        
        particle.style.left = `${currentX}px`;
        particle.style.top = `${currentY}px`;
        
        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          particle.remove();
          if (activeParticleStreams.has(streamId)) {
            spawnParticle(index, true);
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    }, randomDelay);
  }

  for (let i = 0; i < particleCount; i++) {
    spawnParticle(i);
  }

  return particles;
}

function startParticleStreams(nodeId, nodesPx, threadElements) {
  stopParticleStreams(nodeId);
  
  const connectedThreads = threadElements.filter(
    thread => thread.dataset.from === nodeId || thread.dataset.to === nodeId
  );
  
  const streams = [];
  connectedThreads.forEach((thread, idx) => {
    const fromNode = nodesPx.find(n => n.id === thread.dataset.from);
    const toNode = nodesPx.find(n => n.id === thread.dataset.to);
    if (!fromNode || !toNode) return;
    
    const primaryThread = thread.dataset.thread || 'questions';
    const palette = threadPalettes[primaryThread] || threadPalettes.questions;
    const threadColor = palette[0];
    
    const isFromHovered = thread.dataset.from === nodeId;
    const sourceNode = isFromHovered ? fromNode : toNode;
    const targetNode = isFromHovered ? toNode : fromNode;
    
    const streamId = `${nodeId}-${idx}`;
    activeParticleStreams.set(streamId, true);
    
    const particles = createParticleStream(sourceNode, targetNode, threadColor, thread, streamId);
    streams.push(...particles);
  });
  
  activeParticleStreams.set(nodeId, streams);
}

function stopParticleStreams(nodeId) {
  const streams = activeParticleStreams.get(nodeId);
  if (streams) {
    streams.forEach(particle => {
      if (particle.parentNode) {
        particle.remove();
      }
    });
  }
  
  const streamKeys = Array.from(activeParticleStreams.keys());
  streamKeys.forEach(key => {
    if (key.startsWith(`${nodeId}-`)) {
      activeParticleStreams.delete(key);
    }
  });
  
  activeParticleStreams.delete(nodeId);
}

function setOverlayContent(nodeId) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return;
  if (!overlayEl) return;

  const eyebrow = overlayEl.querySelector('.eyebrow');
  const titleEl = overlayEl.querySelector('h2');
  const ledeEl = overlayEl.querySelector('.lede');

  if (eyebrow) eyebrow.textContent = node.type ? `Container: ${node.type}` : 'Container';
  if (titleEl) titleEl.textContent = node.title || node.id;
  if (ledeEl && node.type !== 'curiosity' && node.subtype !== 'essay' && node.type !== 'essay') {
    ledeEl.textContent =
      'This is a stub for the essay container. Hook nodes or nav to enter here; replace with real content and layout per spec.';
  }

  const isEssay = node.subtype === 'essay' || node.type === 'essay';
  overlayEl.classList.toggle('is-essay', isEssay);

  const isCuriosity = node.type === 'curiosity';
  overlayEl.classList.toggle('is-curiosity', isCuriosity);

  if (isCuriosity) {
    if (eyebrow) eyebrow.textContent = '';
    renderCuriosity(nodeId);
  } else if (isEssay) {
    renderEssay(nodeId);
  } else {
    clearDynamicContainerContent();
  }
}

function animateCardFromNode(nodeId) {
  if (!cardEl) return;
  const dot = dotElementsById.get(nodeId);
  if (!dot) return;
  const from = dot.getBoundingClientRect();
  const to = cardEl.getBoundingClientRect();

  isAnimatingContainer = true;
  cardEl.style.transformOrigin = 'top left';
  cardEl.style.transition = 'none';
  cardEl.style.borderRadius = '999px';
  cardEl.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${Math.max(0.01, from.width / to.width)}, ${Math.max(0.01, from.height / to.height)})`;

  cardEl.getBoundingClientRect();

  requestAnimationFrame(() => {
    cardEl.style.transition = 'transform 420ms ease, border-radius 420ms ease';
    cardEl.style.borderRadius = 'var(--radius)';
    cardEl.style.transform = 'translate(0px, 0px) scale(1, 1)';
  });

  const onEnd = (e) => {
    if (e.propertyName !== 'transform') return;
    cardEl.removeEventListener('transitionend', onEnd);
    isAnimatingContainer = false;
    if (typeof refreshCuriosityLines === 'function') {
      refreshCuriosityLines();
    }
  };
  cardEl.addEventListener('transitionend', onEnd);
}

function animateCardToNodeAndClose(nodeId) {
  if (!cardEl) {
    closeEssay();
    return;
  }
  const dot = dotElementsById.get(nodeId);
  if (!dot) {
    closeEssay();
    return;
  }

  const to = dot.getBoundingClientRect();
  const from = cardEl.getBoundingClientRect();
  isAnimatingContainer = true;
  cardEl.style.transformOrigin = 'top left';
  cardEl.style.transition = 'transform 420ms ease, border-radius 420ms ease';
  cardEl.style.borderRadius = '999px';
  cardEl.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${Math.max(0.01, to.width / from.width)}, ${Math.max(0.01, to.height / from.height)})`;

  const onEnd = (e) => {
    if (e.propertyName !== 'transform') return;
    cardEl.removeEventListener('transitionend', onEnd);
    isAnimatingContainer = false;
    closeEssay();
    if (isNodeSwitching && pendingNodeId) {
      const targetId = pendingNodeId;
      pendingNodeId = null;
      window.setTimeout(() => {
        isNodeSwitching = false;
        focusEssay(targetId);
      }, 420);
    } else {
      showPhraseSlow();
    }

    window.setTimeout(() => {
      if (!cardEl) return;
      cardEl.style.transition = 'none';
      cardEl.style.transform = '';
      cardEl.style.borderRadius = '';
      cardEl.style.transition = '';
    }, 260);
  };
  cardEl.addEventListener('transitionend', onEnd);
}

function requestCloseContainer() {
  if (!isContainerMode || isAnimatingContainer) return;
  if (!activeNodeId) {
    closeEssay();
    return;
  }
  animateCardToNodeAndClose(activeNodeId);
}

function applyContainerModeLayout(nodeId) {
  if (!webEl) return;
  const rect = webEl.getBoundingClientRect();
  const pad = 18;
  const xLeft = pad;
  const xRight = Math.max(pad, rect.width - pad - DOT_SIZE);

  const otherIds = lastNodesPx.map((n) => n.id).filter((id) => id !== nodeId);
  const availableH = Math.max(1, rect.height - pad * 2);
  const midX = rect.width / 2;

  const leftIds = [];
  const rightIds = [];

  otherIds.forEach((id) => {
    const n = lastNodesPx.find((p) => p.id === id);
    const x = n?.center?.x ?? midX;
    if (x <= midX) leftIds.push(id);
    else rightIds.push(id);
  });

  function layoutSide(ids, xTarget) {
    ids
      .sort((a, b) => {
        const na = lastNodesPx.find((n) => n.id === a);
        const nb = lastNodesPx.find((n) => n.id === b);
        return (na?.center?.y ?? 0) - (nb?.center?.y ?? 0);
      })
      .forEach((id, idx) => {
        const dot = dotElementsById.get(id);
        if (!dot) return;

        const count = ids.length;
        const t = count <= 1 ? 0.5 : idx / (count - 1);
        const y = pad + t * availableH;

        dot.classList.add('container-nav');
        dot.classList.remove('container-active');
        dot.classList.remove('container-hidden');
        dot.style.left = `${xTarget}px`;
        dot.style.top = `${Math.max(pad, Math.min(rect.height - pad, y))}px`;
        dot.style.zIndex = '35';
      });
  }

  layoutSide(leftIds, xLeft);
  layoutSide(rightIds, xRight);

  const activeDot = dotElementsById.get(nodeId);
  if (activeDot) {
    activeDot.classList.remove('container-nav');
    activeDot.classList.add('container-active');
    activeDot.classList.add('container-hidden');
    activeDot.style.zIndex = '36';
  }
}

function checkScrollIndicator() {
  if (!cardEl || !overlayEl) return;

  const hasScroll = cardEl.scrollHeight > cardEl.clientHeight;
  const isNearBottom = cardEl.scrollHeight - cardEl.scrollTop - cardEl.clientHeight < 50;

  if (hasScroll && !isNearBottom) {
    overlayEl.classList.add('has-scroll');
  } else {
    overlayEl.classList.remove('has-scroll');
  }
}

function enterContainerMode(nodeId) {
  if (!nodeId) return;
  isContainerMode = true;
  activeNodeId = nodeId;

  hidePhrase();
  setOverlayContent(nodeId);
  applyContainerModeLayout(nodeId);
  animateCardFromNode(nodeId);

  // Check scroll indicator after content loads
  setTimeout(() => {
    checkScrollIndicator();
    if (cardEl) {
      cardEl.addEventListener('scroll', checkScrollIndicator);
    }
  }, 500);
}

function exitContainerMode() {
  isContainerMode = false;
  activeNodeId = null;

  // Remove scroll listener and indicator class
  if (cardEl) {
    cardEl.removeEventListener('scroll', checkScrollIndicator);
  }
  if (overlayEl) {
    overlayEl.classList.remove('has-scroll');
  }

  dotElementsById.forEach((dot) => {
    dot.classList.remove('container-nav');
    dot.classList.remove('container-active');
    dot.classList.remove('container-hidden');
    dot.style.zIndex = '';

    const origLeft = dot.dataset.origLeft;
    const origTop = dot.dataset.origTop;
    if (origLeft != null) dot.style.left = origLeft;
    if (origTop != null) dot.style.top = origTop;
  });
}

function renderWeb() {
  if (!webEl) return;
  webEl.innerHTML = '';
  dotElementsById = new Map();

  const rect = webEl.getBoundingClientRect();
  const nodesPx = nodes.map((n) => ({
    ...n,
    center: {
      x: (n.x / 100) * rect.width,
      y: (n.y / 100) * rect.height,
    },
  }));

  lastNodesPx = nodesPx;

  const threadElements = [];
  threads.forEach((t, idx) => {
    const from = nodesPx.find((n) => n.id === t.from);
    const to = nodesPx.find((n) => n.id === t.to);
    if (!from || !to) return;
    const line = document.createElement('div');
    line.className = 'thread';
    const primaryThread = t.threads && t.threads.length ? t.threads[0] : 'questions';
    const palette = threadPalettes[primaryThread] || threadPalettes.questions;
    line.dataset.thread = primaryThread;
    line.dataset.from = t.from;
    line.dataset.to = t.to;
    line.style.setProperty('--i', idx);
    line.style.setProperty('--strand1', palette[0]);
    line.style.setProperty('--strand2', palette[1]);
    line.style.setProperty('--strand3', palette[2]);
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
    line.style.transformOrigin = '0 0';
    line.style.transform = `rotate(${angle}deg)`;
    webEl.appendChild(line);
    threadElements.push(line);
  });

  nodesPx.forEach((node, i) => {
    const dot = document.createElement('div');
    dot.className = 'node-dot floating';
    dot.dataset.type = node.type;
    dot.dataset.id = node.id;
    dot.style.setProperty('--i', i);
    dot.style.left = `${node.center.x - DOT_RADIUS}px`;
    dot.style.top = `${node.center.y - DOT_RADIUS}px`;
    dot.dataset.origLeft = dot.style.left;
    dot.dataset.origTop = dot.style.top;
    dot.title = node.title || node.id;
    dot.addEventListener('click', () => {
      if (isAnimatingContainer) return;
      if (isContainerMode) {
        if (node.id === activeNodeId) {
          requestCloseContainer();
          return;
        }
        pendingNodeId = node.id;
        isNodeSwitching = true;
        hidePhrase();
        animateCardToNodeAndClose(activeNodeId);
        return;
      }
      focusEssay(node.id);
    });
    dot.addEventListener('mouseenter', () => {
      startParticleStreams(node.id, nodesPx, threadElements);
      if (node.type === 'curiosity') {
        const cached = curiosityCentralById.get(node.id);
        if (cached) {
          dot.title = cached;
        } else {
          loadJSON(`content/curiosities/${node.id}.json`)
            .then((data) => {
              const central = data?.central || node.id;
              curiosityCentralById.set(node.id, central);
              dot.title = central;
            })
            .catch(() => {
              curiosityCentralById.set(node.id, node.id);
              dot.title = node.id;
            });
        }
      }
    });
    dot.addEventListener('mouseleave', () => {
      stopParticleStreams(node.id);
    });
    webEl.appendChild(dot);
    dotElementsById.set(node.id, dot);
  });

  if (isContainerMode && activeNodeId) {
    enterContainerMode(activeNodeId);
  }
}

async function initLanding() {
  try {
    const [phrasesData, nodesData, threadsData] = await Promise.all([
      loadJSON('content/phrases.json'),
      loadJSON('content/nodes/sample-nodes.json'),
      loadJSON('content/connections.json'),
    ]);
    phrases = phrasesData;
    nodes = nodesData;
    threads = threadsData;
    rotatePhrase();
    renderWeb();
  } catch (err) {
    console.error('Landing init failed', err);
  }
}

initLanding();

if (closeBtnEl) {
  closeBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    requestCloseContainer();
  });
}

document.addEventListener('pointerdown', (e) => {
  if (!isContainerMode) return;
  if (isAnimatingContainer) return;

  if (cardEl && cardEl.contains(e.target)) return;
  if (e.target?.closest?.('.node-dot')) return;
  if (e.target?.closest?.('.theme-toggle')) return;
  if (e.target?.closest?.('.site-header')) return;
  requestCloseContainer();
});

window.addEventListener('container:open', (e) => {
  const nodeId = e?.detail?.nodeId;
  if (!nodeId) return;
  enterContainerMode(nodeId);
});

window.addEventListener('container:close', () => {
  exitContainerMode();
});
