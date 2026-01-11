/**
 * Landing page orchestration
 * Coordinates all components: web, particles, phrases, containers
 */

import type { Node, NodePx, Thread, Phrase } from './types';
import { closeEssay, focusEssay } from './main';
import { loadJSON } from './utils/data';
import { getById, query } from './utils/dom';
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
  getThreadElements,
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

  const dotElements = getDotElements();
  const dot = dotElements.get(nodeId);
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

  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName !== 'transform' || !cardEl) return;
    cardEl.removeEventListener('transitionend', onEnd);
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

  hidePhrase();
  await setOverlayContent(nodeId);
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

/**
 * Exit container mode
 */
function exitContainerMode(): void {
  set('isContainerMode', false);
  set('activeNodeId', null);

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
}

/**
 * Handle node dot click
 */
function handleNodeClick(node: NodePx): void {
  if (isAnimatingContainer) return;

  // Bio node doesn't open a container
  if (node.type === 'bio') {
    return;
  }

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
  const nodesPx = getCurrentNodesPx();
  const threadElements = getThreadElements();
  const dotElements = getDotElements();
  pauseMotion(node.id);
  startParticleStreams(node.id, nodesPx, threadElements, webEl, dotElements);

  // Bio node: show bio text in phrase area
  if (node.type === 'bio') {
    console.log('Bio hover:', node.id, 'bioText:', node.bioText);
    if (node.bioText) {
      showCustomPhrase(node.bioText);
    }
    return;
  }

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
  stopParticleStreams(node.id);
  resumeMotion(node.id);

  // Bio node: restore original phrase
  if (node.type === 'bio') {
    restorePhrase();
  }
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
