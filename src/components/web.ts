/**
 * Node web visualization component
 * Renders the constellation of nodes and connecting threads
 */

import type { Node, NodePx } from '../types';
import { createElement } from '../utils/dom';
import { get } from '../state/store';
import { initBrownianMotion } from './brownian';

// Callback types for external event handling
export interface WebCallbacks {
  onClick: (node: NodePx) => void;
  onHoverEnter: (node: NodePx) => void;
  onHoverLeave: (node: NodePx) => void;
}

// Rendered state
let dotElements: Map<string, HTMLElement> = new Map();
let currentNodesPx: NodePx[] = [];

/**
 * Convert percentage coordinates to pixel coordinates
 */
function nodesToPx(nodes: Node[], container: HTMLElement): NodePx[] {
  const rect = container.getBoundingClientRect();
  return nodes.map((n) => ({
    ...n,
    center: {
      x: (n.x / 100) * rect.width,
      y: (n.y / 100) * rect.height,
    },
  }));
}

/**
 * Create a node dot element
 */
// Short, human labels per node type (what kind of thing this is).
const TYPE_LABEL: Record<string, string> = {
  essay: 'Essay',
  durational: 'Listen',
  curiosity: 'Curiosity',
  artifact: 'Scrapbook',
  bio: 'About',
};

function typeKind(node: NodePx): string {
  if (node.subtype === 'dj-mix') return 'Mix';
  if (node.subtype === 'podcast') return 'Podcast';
  if (node.subtype === 'talk' || node.subtype === 'performance') return 'Talk';
  return TYPE_LABEL[node.type] || 'Node';
}

// Nodes sitting on the right half of the canvas get their label to the
// left, so text never runs off-screen. Everyone else labels to the right.
function labelSide(node: NodePx, containerWidth: number): 'left' | 'right' {
  return node.center.x > containerWidth * 0.62 ? 'left' : 'right';
}

/**
 * Accessible name for a node: what kind of thing it is + its title + threads.
 * Answers the vision's flagship test ("a pile of photos is clearly a pile of
 * photos") for a screen-reader user who can't see the glyph.
 */
function accessibleName(node: NodePx): string {
  const kind = typeKind(node);
  const title = node.title || node.id;
  const threads = (node.threads || []).join(', ');
  return threads ? `${kind}: ${title}. Threads: ${threads}.` : `${kind}: ${title}.`;
}

function createNodeDot(
  node: NodePx,
  index: number,
  containerWidth: number,
  callbacks: WebCallbacks
): HTMLElement {
  // A node is a marker (the dot/glyph) plus an always-visible label.
  // Most nodes are real, keyboard-operable controls: role=button + tabindex,
  // activated by click, Enter, or Space, with an accessible name describing
  // their content. The bio node is inert: it's focusable and announces itself,
  // but activating it does nothing (hover/focus just swaps the phrase text).
  const isInert = node.type === 'bio';
  const wrap = createElement('div', {
    className: 'node',
    'data-type': node.type,
    'data-id': node.id,
    role: isInert ? 'img' : 'button',
    tabindex: '0',
    'aria-label': accessibleName(node),
  });

  const side = labelSide(node, containerWidth);
  wrap.dataset.labelSide = side;

  wrap.style.setProperty('--i', String(index));
  // Position the whole node by its center (marker is centered within).
  wrap.style.left = `${node.center.x}px`;
  wrap.style.top = `${node.center.y}px`;

  // The differentiated marker (shape/glyph per type via CSS).
  const marker = createElement('div', { className: 'node-dot brownian' });
  marker.dataset.type = node.type;
  if (node.subtype) marker.dataset.subtype = node.subtype;

  // The label: kind on top, title beneath.
  const label = createElement('div', { className: 'node-label' });
  const kindEl = createElement('span', { className: 'node-label-kind' }, [typeKind(node)]);
  const titleEl = createElement('span', { className: 'node-label-title' }, [
    node.title || node.id,
  ]);
  label.appendChild(kindEl);
  label.appendChild(titleEl);

  wrap.appendChild(marker);
  wrap.appendChild(label);

  // Store original position for container mode restoration
  wrap.dataset.origLeft = wrap.style.left;
  wrap.dataset.origTop = wrap.style.top;
  wrap.title = node.title || node.id;

  wrap.addEventListener('mouseenter', () => callbacks.onHoverEnter(node));
  wrap.addEventListener('mouseleave', () => callbacks.onHoverLeave(node));

  // The bio node is inert: no click activation, and Enter/Space do nothing.
  if (!isInert) {
    wrap.addEventListener('click', () => callbacks.onClick(node));

    // Keyboard: Enter/Space activate (a11y parity with a real button).
    wrap.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        callbacks.onClick(node);
      }
    });
  }
  // Focus surfaces the connected threads too, mirroring hover — but ONLY for
  // keyboard focus. A pointer click also focuses the node; if we ran the
  // hover-enter pause path on every focus, a click would fire focus (pause)
  // while `mouseleave` fires the resume, leaving the paused-on-focus state
  // stranded until the next blur — and for the inert bio node this froze the
  // web on click. `:focus-visible` matches keyboard focus (and never a mouse
  // click), giving a11y parity with hover for keyboard users without letting a
  // pointer click leak a persistent pause.
  wrap.addEventListener('focus', () => {
    if (wrap.matches(':focus-visible')) {
      wrap.dataset.focusActive = 'true';
      callbacks.onHoverEnter(node);
    }
  });
  wrap.addEventListener('blur', () => {
    // Only mirror the leave when a focus-driven enter actually ran. If the node
    // isn't marked focus-active, this blur pairs with a pointer focus that
    // never paused, so resuming here would be a spurious (harmless) no-op —
    // but guarding keeps the enter/leave calls balanced.
    if (wrap.dataset.focusActive === 'true') {
      delete wrap.dataset.focusActive;
      callbacks.onHoverLeave(node);
    }
  });

  return wrap;
}

/**
 * Render the node web visualization
 */
export function renderWeb(
  container: HTMLElement | null,
  callbacks: WebCallbacks
): void {
  if (!container) return;

  // Landing shows only curated nodes; the rest stay reachable via the nav
  // overlay, which loads the full manifest itself.
  const nodes = get('nodes').filter((n) => n.visible_on_landing !== false);

  // Clear existing content
  container.innerHTML = '';
  dotElements = new Map();

  // Convert to pixel coordinates
  const nodesPx = nodesToPx(nodes, container);
  currentNodesPx = nodesPx;

  // Connection lines are no longer drawn — nodes float free. Connections still
  // drive the hover particle streams, which compute their paths from live node
  // positions (see components/particles.ts).

  // Create node markers
  const containerWidth = container.getBoundingClientRect().width;
  nodesPx.forEach((node, idx) => {
    const dot = createNodeDot(node, idx, containerWidth, callbacks);
    container.appendChild(dot);
    dotElements.set(node.id, dot);
  });

  // Initialize Brownian motion (pass the container so drift can compute the
  // phrase exclusion band in the dots' coordinate space).
  initBrownianMotion(dotElements, container);

  // Re-apply container mode if active
  const isContainerMode = get('isContainerMode');
  const activeNodeId = get('activeNodeId');
  if (isContainerMode && activeNodeId) {
    // This will be handled by landing.ts enterContainerMode
  }
}

/**
 * Get dot elements map
 */
export function getDotElements(): Map<string, HTMLElement> {
  return dotElements;
}

/**
 * Get current nodes with pixel coordinates
 */
export function getCurrentNodesPx(): NodePx[] {
  return currentNodesPx;
}

/**
 * Set dot container mode state
 */
export function setDotContainerMode(
  dot: HTMLElement,
  mode: 'nav' | 'active' | 'active-hidden' | 'hidden'
): void {
  dot.classList.remove('container-nav', 'container-active', 'container-hidden');

  switch (mode) {
    case 'nav':
      dot.classList.add('container-nav');
      break;
    case 'active':
      dot.classList.add('container-active');
      break;
    case 'active-hidden':
      dot.classList.add('container-active', 'container-hidden');
      break;
    case 'hidden':
      dot.classList.add('container-hidden');
      break;
  }
}

/**
 * Reset dots to original positions
 */
export function resetDotPositions(): void {
  dotElements.forEach((dot) => {
    dot.classList.remove('container-nav', 'container-active', 'container-hidden');
    dot.style.zIndex = '';

    const origLeft = dot.dataset.origLeft;
    const origTop = dot.dataset.origTop;
    if (origLeft != null) dot.style.left = origLeft;
    if (origTop != null) dot.style.top = origTop;
  });
}
