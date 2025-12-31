/**
 * Essay container renderer
 */

import type { ContainerRenderer } from './base';
import type { EssayNode } from '../types';
import { clearContainerContent, updateContainerHeader, registerRenderer } from './base';
import { loadJSON } from '../utils/data';
import { createElement } from '../utils/dom';

// Dynamic import for marked (loaded on first use)
let markedModule: { marked: { parse: (md: string) => string } } | null = null;

async function getMarked() {
  if (!markedModule) {
    // @ts-expect-error - dynamic import of marked
    markedModule = await import('../../node_modules/marked/lib/marked.esm.js');
  }
  return markedModule!.marked;
}

/**
 * Load essay markdown content
 */
async function loadEssayMarkdown(essayFile: string): Promise<string> {
  const res = await fetch(`content/essays/${essayFile}`);
  if (!res.ok) {
    throw new Error(`Failed to load essay: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Essay container renderer
 */
export const essayRenderer: ContainerRenderer = {
  async render(nodeId: string, cardEl: HTMLElement): Promise<void> {
    clearContainerContent(cardEl);

    // Load node data
    let nodeData: EssayNode;
    try {
      nodeData = await loadJSON<EssayNode>(`content/nodes/${nodeId}.json`);
    } catch (e) {
      console.error('Failed to load node data:', e);
      return;
    }

    if (!nodeData.essayFile) {
      console.error('No essayFile specified in node data');
      return;
    }

    // Load markdown
    let markdownText: string;
    try {
      markdownText = await loadEssayMarkdown(nodeData.essayFile);
    } catch (e) {
      console.error('Failed to load essay markdown:', e);
      return;
    }

    // Parse markdown to HTML
    const marked = await getMarked();
    const htmlContent = marked.parse(markdownText);

    // Create article element
    const article = createElement('article', { className: 'essay-content' });
    article.innerHTML = htmlContent;

    // Hide header elements (essay has its own)
    updateContainerHeader(cardEl, {
      eyebrow: '',
      lede: '',
      hideTitle: true,
    });

    // Append to card
    cardEl.appendChild(article);
  },

  cleanup(): void {
    // No cleanup needed for essays
  },
};

// Register the renderer
registerRenderer('essay', essayRenderer);
