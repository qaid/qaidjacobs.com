/**
 * Node web visualization component
 * Renders the constellation of nodes and connecting threads
 */

import type { Node, NodePx, Thread, ThreadType } from '../types';
import { createElement } from '../utils/dom';
import { get, THREAD_COLORS } from '../state/store';
import { initBrownianMotion } from './brownian';

// Callback types for external event handling
export interface WebCallbacks {
  onClick: (node: NodePx) => void;
  onHoverEnter: (node: NodePx) => void;
  onHoverLeave: (node: NodePx) => void;
}

// Rendered state
let threadElements: HTMLElement[] = [];
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
 * Create a thread line between two nodes
 */
function createThreadLine(
  from: NodePx,
  to: NodePx,
  thread: Thread,
  index: number
): HTMLElement {
  const line = createElement('div', { className: 'thread' });

  // Resolve the thread hues. A connection may carry 1..n threads;
  // we render it as a blend across all of them (general, not per-pair).
  const threadTypes = (thread.threads?.length ? thread.threads : ['questions']) as ThreadType[];
  const colors = threadTypes.map((t) => THREAD_COLORS[t] || THREAD_COLORS.questions);

  const primaryThread = threadTypes[0];
  line.dataset.thread = primaryThread;
  line.dataset.threads = threadTypes.join(' ');
  line.dataset.from = thread.from;
  line.dataset.to = thread.to;

  // Build an evenly-spaced gradient across every thread color.
  // Single-thread lines collapse to a solid line of one hue.
  const stops =
    colors.length === 1
      ? `${colors[0]}, ${colors[0]}`
      : colors
          .map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`)
          .join(', ');
  line.style.setProperty('--blend', stops);

  line.style.setProperty('--i', String(index));

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

  return line;
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
  // It's a real, keyboard-operable control: role=button + tabindex, activated
  // by click, Enter, or Space, with an accessible name describing its content.
  const wrap = createElement('div', {
    className: 'node',
    'data-type': node.type,
    'data-id': node.id,
    role: 'button',
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

  wrap.addEventListener('click', () => callbacks.onClick(node));
  wrap.addEventListener('mouseenter', () => callbacks.onHoverEnter(node));
  wrap.addEventListener('mouseleave', () => callbacks.onHoverLeave(node));

  // Keyboard: Enter/Space activate (a11y parity with a real button).
  wrap.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      callbacks.onClick(node);
    }
  });
  // Focus surfaces the connected threads too, mirroring hover.
  wrap.addEventListener('focus', () => callbacks.onHoverEnter(node));
  wrap.addEventListener('blur', () => callbacks.onHoverLeave(node));

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
  const threads = get('threads');

  // Clear existing content
  container.innerHTML = '';
  threadElements = [];
  dotElements = new Map();

  // Convert to pixel coordinates
  const nodesPx = nodesToPx(nodes, container);
  currentNodesPx = nodesPx;

  // Create thread lines
  threads.forEach((thread, idx) => {
    const from = nodesPx.find((n) => n.id === thread.from);
    const to = nodesPx.find((n) => n.id === thread.to);
    if (!from || !to) return;

    const line = createThreadLine(from, to, thread, idx);
    container.appendChild(line);
    threadElements.push(line);
  });

  // Create node markers
  const containerWidth = container.getBoundingClientRect().width;
  nodesPx.forEach((node, idx) => {
    const dot = createNodeDot(node, idx, containerWidth, callbacks);
    container.appendChild(dot);
    dotElements.set(node.id, dot);
  });

  // Initialize Brownian motion
  initBrownianMotion(dotElements);

  // Re-apply container mode if active
  const isContainerMode = get('isContainerMode');
  const activeNodeId = get('activeNodeId');
  if (isContainerMode && activeNodeId) {
    // This will be handled by landing.ts enterContainerMode
  }
}

/**
 * Get thread elements for particle streams
 */
export function getThreadElements(): HTMLElement[] {
  return threadElements;
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
