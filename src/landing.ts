/**
 * Landing page orchestration
 * Coordinates all components: web, particles, phrases, containers
 */

import type { Node, NodePx, Thread, Phrase } from './types';
import { closeEssay, focusEssay } from './main';
import { loadJSON } from './utils/data';
import { getById, query } from './utils/dom';
import { prefersReducedMotion } from './utils/env';
import { get, set, DOT_SIZE } from './state/store';
import {
  initPhrase,
  hidePhrase,
  showPhraseSlow,
  rotatePhrase,
  showCustomPhrase,
  restorePhrase,
} from './components/phrase';
import {
  renderWeb,
  getDotElements,
  getCurrentNodesPx,
  setDotContainerMode,
  resetDotPositions,
} from './components/web';
import { startParticleStreams, stopParticleStreams } from './components/particles';
import { pauseMotion, resumeMotion, pauseAllMotion, resumeAllMotion } from './components/brownian';
import { getRendererForNode, clearContainerContent, setContainerType } from './containers/base';

// Import container renderers to register them
import './containers/essay';
import './containers/curiosity';
import './containers/durational';
import './containers/artifacts';

// DOM elements
const webEl = getById('landing-web');
const overlayEl = getById('overlay-essay');
const cardEl = overlayEl ? query<HTMLElement>('.container-card', overlayEl) : null;
const closeBtnEl = overlayEl ? query<HTMLButtonElement>('.container-close', overlayEl) : null;

// Curiosity central label cache
const curiosityCentralById = new Map<string, string>();

// Animation and state flags
let isAnimatingContainer = false;
let refreshCuriosityLines: (() => void) | null = null;
// The node element that opened the current container — focus returns here on
// close (accessibility: focus management).
let originatingNodeEl: HTMLElement | null = null;

// URL routing
const NODE_ROUTE_PREFIX = '#/node/';

/**
 * Get node ID from current URL hash
 */
function getNodeIdFromUrl(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith(NODE_ROUTE_PREFIX)) {
    return hash.slice(NODE_ROUTE_PREFIX.length);
  }
  return null;
}

/**
 * Update URL to reflect open node
 */
function updateUrlForNode(nodeId: string | null): void {
  if (nodeId) {
    const newUrl = `${NODE_ROUTE_PREFIX}${nodeId}`;
    if (window.location.hash !== newUrl) {
      history.pushState({ nodeId }, '', newUrl);
    }
  } else {
    if (window.location.hash) {
      history.pushState({}, '', window.location.pathname);
    }
  }
}

/**
 * Handle browser back/forward navigation
 */
function handlePopState(): void {
  const nodeId = getNodeIdFromUrl();
  const isContainerMode = get('isContainerMode');
  const activeNodeId = get('activeNodeId');

  if (nodeId && !isContainerMode) {
    // URL has node but container is closed - open it
    focusEssay(nodeId);
  } else if (!nodeId && isContainerMode && activeNodeId) {
    // URL has no node but container is open - close it
    requestCloseContainer();
  } else if (nodeId && isContainerMode && nodeId !== activeNodeId) {
    // Different node in URL - switch to it
    set('pendingNodeId', nodeId);
    set('isNodeSwitching', true);
    hidePhrase();
    animateCardToNodeAndClose(activeNodeId!);
  }
}

/**
 * Set overlay content based on node type
 */
async function setOverlayContent(nodeId: string): Promise<void> {
  const nodes = get('nodes');
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !overlayEl || !cardEl) return;

  // Update eyebrow and title
  const eyebrow = query<HTMLElement>('.eyebrow', overlayEl);
  const titleEl = query<HTMLElement>('h2', overlayEl);
  const ledeEl = query<HTMLElement>('.lede', overlayEl);

  if (eyebrow) eyebrow.textContent = node.type ? `Container: ${node.type}` : 'Container';
  if (titleEl) titleEl.textContent = node.title || node.id;
  document.title = `${node.title || node.id} — Qa'id Jacobs`;

  // Set container type classes
  setContainerType(overlayEl, node);

  // Get renderer and render content
  const renderer = getRendererForNode(node);
  if (renderer) {
    await renderer.render(nodeId, cardEl);

    // Store refresh callback for curiosity
    if (node.type === 'curiosity') {
      const { getRefreshCallback } = await import('./containers/curiosity');
      refreshCuriosityLines = getRefreshCallback();
    }
  } else {
    clearContainerContent(cardEl);
    if (ledeEl) {
      ledeEl.textContent =
        'This is a stub for the container. Hook nodes or nav to enter here.';
    }
  }
}

/**
 * Animate card expanding from a node dot
 */
function animateCardFromNode(nodeId: string): void {
  if (!cardEl) return;

  // Reduced motion: no scale/morph FLIP — the overlay's opacity transition
  // is the whole entrance (a crossfade). Just settle the card and finish.
  if (prefersReducedMotion()) {
    cardEl.style.transition = 'none';
    cardEl.style.transform = '';
    cardEl.style.borderRadius = '';
    isAnimatingContainer = false;
    if (typeof refreshCuriosityLines === 'function') refreshCuriosityLines();
    return;
  }

  const dotElements = getDotElements();
  const dot = dotElements.get(nodeId);
  if (!dot) return;

  const from = dot.getBoundingClientRect();
  const to = cardEl.getBoundingClientRect();

  isAnimatingContainer = true;
  cardEl.style.transformOrigin = 'top left';
  cardEl.style.transition = 'none';
  cardEl.style.borderRadius = '999px';
  cardEl.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${Math.max(0.01, from.width / to.width)}, ${Math.max(0.01, from.height / to.height)})`;

  cardEl.getBoundingClientRect(); // Force reflow

  requestAnimationFrame(() => {
    if (!cardEl) return;
    cardEl.style.transition = 'transform 420ms ease, border-radius 420ms ease';
    cardEl.style.borderRadius = 'var(--radius)';
    cardEl.style.transform = 'translate(0px, 0px) scale(1, 1)';
  });

  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName !== 'transform' || !cardEl) return;
    cardEl.removeEventListener('transitionend', onEnd);
    isAnimatingContainer = false;
    if (typeof refreshCuriosityLines === 'function') {
      refreshCuriosityLines();
    }
  };
  cardEl.addEventListener('transitionend', onEnd);
}

/**
 * Animate card collapsing to a node dot
 */
function animateCardToNodeAndClose(nodeId: string): void {
  if (!cardEl) {
    closeEssay();
    return;
  }

  // Reduced motion: skip the collapse-to-dot FLIP; crossfade out via the
  // overlay opacity transition, then run the same post-close bookkeeping.
  if (prefersReducedMotion()) {
    isAnimatingContainer = false;
    closeEssay();

    const isNodeSwitching = get('isNodeSwitching');
    const pendingNodeId = get('pendingNodeId');
    if (isNodeSwitching && pendingNodeId) {
      const targetId = pendingNodeId;
      set('pendingNodeId', null);
      set('isNodeSwitching', false);
      window.setTimeout(() => focusEssay(targetId), 60);
    } else {
      showPhraseSlow();
    }

    cardEl.style.transition = 'none';
    cardEl.style.transform = '';
    cardEl.style.borderRadius = '';
    return;
  }

  const dotElements = getDotElements();
  const dot = dotElements.get(nodeId);
  if (!dot) {
    closeEssay();
    return;
  }

  const to = dot.getBoundingClientRect();
  const from = cardEl.getBoundingClientRect();

  isAnimatingContainer = true;

  // Timeline:
  //   0ms    : content fades out (.is-closing → children opacity 0, 150ms)
  //   ~120ms : card shell begins scaling + fading toward the origin dot
  //   ~560ms : scale/fade done → tear down (remove classes, reset styles)
  // Fading the content first means nothing smears while the card shrinks; the
  // shell's opacity accompanies its transform so the collapse is one smooth
  // scale+fade, and no classes are removed until the card is fully hidden.
  const CONTENT_FADE = 150;
  const SCALE_DUR = 440;
  const SCALE_DELAY = 120;

  // Kick off the content fade immediately.
  cardEl.classList.add('is-closing');

  const finish = (): void => {
    if (!cardEl) return;
    isAnimatingContainer = false;
    closeEssay();

    const isNodeSwitching = get('isNodeSwitching');
    const pendingNodeId = get('pendingNodeId');

    if (isNodeSwitching && pendingNodeId) {
      const targetId = pendingNodeId;
      set('pendingNodeId', null);
      window.setTimeout(() => {
        set('isNodeSwitching', false);
        focusEssay(targetId);
      }, 60);
    } else {
      showPhraseSlow();
    }

    // Reset all inline animation styles only now that the card is hidden, so no
    // property snaps back into view mid-fade.
    cardEl.style.transition = 'none';
    cardEl.style.transform = '';
    cardEl.style.borderRadius = '';
    cardEl.style.opacity = '';
    cardEl.classList.remove('is-closing');
    // Force the reset to commit before transitions are re-enabled next open.
    cardEl.getBoundingClientRect();
    cardEl.style.transition = '';
  };

  // After the content has begun fading, scale + fade the shell to the dot.
  window.setTimeout(() => {
    if (!cardEl) return;
    cardEl.style.transformOrigin = 'top left';
    cardEl.style.transition =
      `transform ${SCALE_DUR}ms ease, border-radius ${SCALE_DUR}ms ease, opacity ${SCALE_DUR}ms ease`;
    cardEl.style.borderRadius = '999px';
    cardEl.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${Math.max(0.01, to.width / from.width)}, ${Math.max(0.01, to.height / from.height)})`;
    // Shell opacity accompanies the transform: fades as it shrinks so the
    // collapse is one smooth scale+fade rather than a hard cut.
    cardEl.style.opacity = '0';
  }, SCALE_DELAY);

  // Drive teardown off the transform transitionend, with a timeout fallback so
  // a missed event can never strand the overlay open.
  let done = false;
  const onEnd = (e: TransitionEvent): void => {
    if (e.propertyName !== 'transform' || done || !cardEl) return;
    done = true;
    cardEl.removeEventListener('transitionend', onEnd);
    finish();
  };
  cardEl.addEventListener('transitionend', onEnd);
  window.setTimeout(() => {
    if (done || !cardEl) return;
    done = true;
    cardEl.removeEventListener('transitionend', onEnd);
    finish();
  }, CONTENT_FADE + SCALE_DELAY + SCALE_DUR + 80);
}

/**
 * Request closing the container
 */
function requestCloseContainer(): void {
  const isContainerMode = get('isContainerMode');
  if (!isContainerMode || isAnimatingContainer) return;

  const activeNodeId = get('activeNodeId');
  if (!activeNodeId) {
    closeEssay();
    return;
  }
  animateCardToNodeAndClose(activeNodeId);
}

/**
 * Apply container mode layout - position dots along edges
 */
function applyContainerModeLayout(nodeId: string): void {
  if (!webEl) return;

  pauseAllMotion();

  const rect = webEl.getBoundingClientRect();
  const pad = 18;
  const xLeft = pad;
  const xRight = Math.max(pad, rect.width - pad - DOT_SIZE);

  const nodesPx = getCurrentNodesPx();
  const dotElements = getDotElements();

  const otherIds = nodesPx.map((n) => n.id).filter((id) => id !== nodeId);
  const availableH = Math.max(1, rect.height - pad * 2);
  const midX = rect.width / 2;

  const leftIds: string[] = [];
  const rightIds: string[] = [];

  otherIds.forEach((id) => {
    const n = nodesPx.find((p) => p.id === id);
    const x = n?.center?.x ?? midX;
    if (x <= midX) leftIds.push(id);
    else rightIds.push(id);
  });

  function layoutSide(ids: string[], xTarget: number): void {
    ids
      .sort((a, b) => {
        const na = nodesPx.find((n) => n.id === a);
        const nb = nodesPx.find((n) => n.id === b);
        return (na?.center?.y ?? 0) - (nb?.center?.y ?? 0);
      })
      .forEach((id, idx) => {
        const dot = dotElements.get(id);
        if (!dot) return;

        const count = ids.length;
        const t = count <= 1 ? 0.5 : idx / (count - 1);
        const y = pad + t * availableH;

        setDotContainerMode(dot, 'nav');
        dot.style.left = `${xTarget}px`;
        dot.style.top = `${Math.max(pad, Math.min(rect.height - pad, y))}px`;
        dot.style.zIndex = '35';
      });
  }

  layoutSide(leftIds, xLeft);
  layoutSide(rightIds, xRight);

  const activeDot = dotElements.get(nodeId);
  if (activeDot) {
    setDotContainerMode(activeDot, 'active-hidden');
    activeDot.style.zIndex = '36';
  }
}

/**
 * Check if card needs scroll indicator
 */
function checkScrollIndicator(): void {
  if (!cardEl || !overlayEl) return;

  const hasScroll = cardEl.scrollHeight > cardEl.clientHeight;
  const isNearBottom = cardEl.scrollHeight - cardEl.scrollTop - cardEl.clientHeight < 50;

  if (hasScroll && !isNearBottom) {
    overlayEl.classList.add('has-scroll');
  } else {
    overlayEl.classList.remove('has-scroll');
  }
}

/**
 * Enter container mode for a specific node
 */
async function enterContainerMode(nodeId: string): Promise<void> {
  if (!nodeId) return;

  set('isContainerMode', true);
  set('activeNodeId', nodeId);

  // Update URL
  updateUrlForNode(nodeId);

  // Remember which node to return focus to on close.
  originatingNodeEl = getDotElements().get(nodeId) || null;

  hidePhrase();
  await setOverlayContent(nodeId);
  applyContainerModeLayout(nodeId);
  animateCardFromNode(nodeId);

  // Move focus into the opened container (accessibility: focus management).
  // Prefer the close button so Tab order starts at a real control and Esc /
  // Enter behave predictably.
  window.setTimeout(() => {
    (closeBtnEl || cardEl)?.focus?.();
  }, 60);

  // Check scroll indicator after content loads
  setTimeout(() => {
    checkScrollIndicator();
    if (cardEl) {
      cardEl.addEventListener('scroll', checkScrollIndicator);
    }
  }, 500);
}

/**
 * Exit container mode
 */
function exitContainerMode(): void {
  set('isContainerMode', false);
  set('activeNodeId', null);
  document.title = 'Qaid Jacobs';

  // Update URL
  updateUrlForNode(null);

  // Remove scroll listener and indicator class
  if (cardEl) {
    cardEl.removeEventListener('scroll', checkScrollIndicator);
  }
  if (overlayEl) {
    overlayEl.classList.remove('has-scroll');
  }

  // Reset dot positions
  resetDotPositions();
  resumeAllMotion();
  refreshCuriosityLines = null;

  // Return focus to the node that opened the container.
  const returnTo = originatingNodeEl;
  originatingNodeEl = null;
  if (returnTo) {
    // Defer so it lands after the close animation settles.
    window.setTimeout(() => returnTo.focus?.(), 60);
  }
}

/**
 * Handle node dot click
 */
function handleNodeClick(node: NodePx): void {
  if (isAnimatingContainer) return;

  const isContainerMode = get('isContainerMode');
  const activeNodeId = get('activeNodeId');

  if (isContainerMode) {
    if (node.id === activeNodeId) {
      requestCloseContainer();
      return;
    }
    set('pendingNodeId', node.id);
    set('isNodeSwitching', true);
    hidePhrase();
    animateCardToNodeAndClose(activeNodeId!);
    return;
  }
  focusEssay(node.id);
}

/**
 * Handle node dot hover enter
 */
function handleNodeHoverEnter(node: NodePx): void {
  if (!webEl) return;

  // Bio is an inert "About" node: hovering (or focusing) it reveals the bio
  // text in the phrase area instead of running particle streams.
  if (node.type === 'bio') {
    const text = (node.bioText || '').replace(/\s*\n+\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) showCustomPhrase(text);
    return;
  }

  const nodesPx = getCurrentNodesPx();
  const connections = get('threads');
  const dotElements = getDotElements();
  pauseMotion(node.id);
  startParticleStreams(node.id, nodesPx, connections, webEl, dotElements);

  // Load curiosity central label
  if (node.type === 'curiosity') {
    const cached = curiosityCentralById.get(node.id);
    const dot = getDotElements().get(node.id);
    if (cached && dot) {
      dot.title = cached;
    } else {
      loadJSON<{ central?: string }>(`content/curiosities/${node.id}.json`)
        .then((data) => {
          const central = data?.central || node.id;
          curiosityCentralById.set(node.id, central);
          if (dot) dot.title = central;
        })
        .catch(() => {
          curiosityCentralById.set(node.id, node.id);
          if (dot) dot.title = node.id;
        });
    }
  }
}

/**
 * Handle node dot hover leave
 */
function handleNodeHoverLeave(node: NodePx): void {
  if (node.type === 'bio') {
    restorePhrase();
    return;
  }
  stopParticleStreams(node.id);
  resumeMotion(node.id);
}

/**
 * Entrance reveal: hold the web's node labels at full strength while the web
 * fades in, then settle them to their ambient resting opacity after ~2.5s.
 * The bright hold ends early on the first pointer/keyboard interaction, so a
 * visitor who engages immediately isn't fighting a transition. Purely an
 * opacity settle — reduced-motion is respected by the CSS (which collapses
 * the transition to a short crossfade) with no extra motion added here.
 */
function playEntranceReveal(): void {
  if (!webEl) return;
  webEl.classList.add('is-introducing');

  let settled = false;
  const settle = (): void => {
    if (settled) return;
    settled = true;
    webEl.classList.remove('is-introducing');
    window.clearTimeout(timer);
    window.removeEventListener('pointerdown', settle);
    window.removeEventListener('keydown', settle);
  };

  const timer = window.setTimeout(settle, 2500);
  // First interaction settles the web immediately.
  window.addEventListener('pointerdown', settle, { once: true });
  window.addEventListener('keydown', settle, { once: true });
}

/**
 * Initialize landing page
 */
async function initLanding(): Promise<void> {
  try {
    // Load data
    const [phrasesData, nodesData, threadsData] = await Promise.all([
      loadJSON<Phrase[]>('content/phrases.json'),
      loadJSON<Node[]>('content/nodes/landing-nodes.json'),
      loadJSON<Thread[]>('content/connections.json'),
    ]);

    // Store data
    set('phrases', phrasesData);
    set('nodes', nodesData);
    set('threads', threadsData);

    // Initialize phrase component
    initPhrase();
    rotatePhrase(phrasesData);

    // Render web with event handlers
    renderWeb(webEl, {
      onClick: handleNodeClick,
      onHoverEnter: handleNodeHoverEnter,
      onHoverLeave: handleNodeHoverLeave,
    });

    // Entrance reveal: labels render at full strength, then settle to their
    // ambient resting opacity after ~2.5s — so a first-time visitor reads
    // "these are labeled, clickable things" before the landing goes quiet.
    playEntranceReveal();

    // Check URL for initial node to open
    const initialNodeId = getNodeIdFromUrl();
    if (initialNodeId) {
      // Verify node exists
      const nodeExists = nodesData.some((n) => n.id === initialNodeId);
      if (nodeExists) {
        // Small delay to ensure DOM is ready
        setTimeout(() => focusEssay(initialNodeId), 100);
      }
    }
  } catch (err) {
    console.error('Landing init failed', err);
  }
}

// Initialize
initLanding();

// Close button handler
if (closeBtnEl) {
  closeBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    requestCloseContainer();
  });
}

// Click outside to close
document.addEventListener('pointerdown', (e) => {
  const isContainerMode = get('isContainerMode');
  if (!isContainerMode) return;
  if (isAnimatingContainer) return;

  const target = e.target as HTMLElement;
  if (cardEl && cardEl.contains(target)) return;
  if (target?.closest?.('.node-dot')) return;
  if (target?.closest?.('.theme-toggle')) return;
  if (target?.closest?.('.site-header')) return;
  requestCloseContainer();
});

// Esc closes an open container. (The nav overlay stops propagation when it
// is the thing open, so these never collide.)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!get('isContainerMode')) return;
  requestCloseContainer();
});

// Container events
window.addEventListener('container:open', ((e: CustomEvent<{ nodeId?: string }>) => {
  const nodeId = e?.detail?.nodeId;
  if (!nodeId) return;
  enterContainerMode(nodeId);
}) as EventListener);

window.addEventListener('container:close', () => {
  exitContainerMode();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', handlePopState);
