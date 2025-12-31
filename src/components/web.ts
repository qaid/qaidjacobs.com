/**
 * Node web visualization component
 * Renders the constellation of nodes and connecting threads
 */

import type { Node, NodePx, Thread, ThreadType } from '../types';
import { createElement } from '../utils/dom';
import { get, DOT_RADIUS, THREAD_PALETTES } from '../state/store';

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

  const primaryThread = (thread.threads?.[0] || 'questions') as ThreadType;
  const palette = THREAD_PALETTES[primaryThread] || THREAD_PALETTES.questions;

  line.dataset.thread = primaryThread;
  line.dataset.from = thread.from;
  line.dataset.to = thread.to;

  line.style.setProperty('--i', String(index));
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

  return line;
}

/**
 * Create a node dot element
 */
function createNodeDot(
  node: NodePx,
  index: number,
  callbacks: WebCallbacks
): HTMLElement {
  const dot = createElement('div', {
    className: 'node-dot floating',
    'data-type': node.type,
    'data-id': node.id,
  });

  dot.style.setProperty('--i', String(index));
  dot.style.left = `${node.center.x - DOT_RADIUS}px`;
  dot.style.top = `${node.center.y - DOT_RADIUS}px`;

  // Store original position for container mode restoration
  dot.dataset.origLeft = dot.style.left;
  dot.dataset.origTop = dot.style.top;
  dot.title = node.title || node.id;

  // Click handler
  dot.addEventListener('click', () => {
    callbacks.onClick(node);
  });

  // Hover handlers
  dot.addEventListener('mouseenter', () => {
    callbacks.onHoverEnter(node);
  });

  dot.addEventListener('mouseleave', () => {
    callbacks.onHoverLeave(node);
  });

  return dot;
}

/**
 * Render the node web visualization
 */
export function renderWeb(
  container: HTMLElement | null,
  callbacks: WebCallbacks
): void {
  if (!container) return;

  const nodes = get('nodes');
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

  // Create node dots
  nodesPx.forEach((node, idx) => {
    const dot = createNodeDot(node, idx, callbacks);
    container.appendChild(dot);
    dotElements.set(node.id, dot);
  });

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
