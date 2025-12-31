/**
 * Base container module - shared lifecycle and interface
 */

import type { Node } from '../types';
import { query } from '../utils/dom';

// Container renderer interface
export interface ContainerRenderer {
  /** Render content into the container card */
  render(nodeId: string, cardEl: HTMLElement): Promise<void>;
  /** Clean up when container closes */
  cleanup?(): void;
}

// Registry of container renderers by type
const renderers = new Map<string, ContainerRenderer>();

/**
 * Register a container renderer for a node type
 */
export function registerRenderer(type: string, renderer: ContainerRenderer): void {
  renderers.set(type, renderer);
}

/**
 * Get renderer for a node type
 */
export function getRenderer(type: string): ContainerRenderer | undefined {
  return renderers.get(type);
}

/**
 * Clear dynamic content from container card
 */
export function clearContainerContent(cardEl: HTMLElement): void {
  // Remove curiosity stage
  const curiosityStage = query('.curiosity-stage', cardEl);
  if (curiosityStage) curiosityStage.remove();

  // Remove essay content
  const essayContent = query('.essay-content', cardEl);
  if (essayContent) essayContent.remove();

  // Remove durational content
  const durationalContent = query('.durational-content', cardEl);
  if (durationalContent) durationalContent.remove();
}

/**
 * Update container card header elements
 */
export function updateContainerHeader(
  cardEl: HTMLElement,
  options: {
    eyebrow?: string;
    title?: string;
    lede?: string;
    hideTitle?: boolean;
  }
): void {
  const eyebrowEl = query('.eyebrow', cardEl);
  const titleEl = query('h2', cardEl);
  const ledeEl = query('.lede', cardEl);

  if (eyebrowEl && options.eyebrow !== undefined) {
    eyebrowEl.textContent = options.eyebrow;
  }

  if (titleEl) {
    if (options.hideTitle) {
      titleEl.style.display = 'none';
    } else {
      titleEl.style.display = '';
      if (options.title !== undefined) {
        titleEl.textContent = options.title;
      }
    }
  }

  if (ledeEl && options.lede !== undefined) {
    ledeEl.textContent = options.lede;
  }
}

/**
 * Set overlay container type class
 */
export function setContainerType(
  overlayEl: HTMLElement,
  node: Node
): void {
  const isEssay = node.subtype === 'essay' || node.type === 'essay';
  const isCuriosity = node.type === 'curiosity';
  const isDurational =
    node.type === 'durational' ||
    node.subtype === 'dj-mix' ||
    node.subtype === 'talk' ||
    node.subtype === 'podcast';

  overlayEl.classList.toggle('is-essay', isEssay);
  overlayEl.classList.toggle('is-curiosity', isCuriosity);
  overlayEl.classList.toggle('is-durational', isDurational);
}

/**
 * Get the appropriate renderer for a node
 */
export function getRendererForNode(node: Node): ContainerRenderer | undefined {
  // Check subtype first, then type
  if (node.subtype && renderers.has(node.subtype)) {
    return renderers.get(node.subtype);
  }
  return renderers.get(node.type);
}
