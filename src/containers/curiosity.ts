/**
 * Curiosity map container renderer
 */

import type { ContainerRenderer } from './base';
import type { CuriosityData, PlacedItem } from '../types';
import { clearContainerContent, updateContainerHeader, registerRenderer } from './base';
import { loadJSON, hashStringToInt } from '../utils/data';
import { createElement, createSVGElement } from '../utils/dom';
import { THREAD_PALETTES } from '../state/store';

// Viewbox dimensions
const VB_SIZE = 1000;
const VB_CENTER = VB_SIZE / 2;

// Thread palette keys for color assignment
const PALETTE_KEYS = ['music', 'movement', 'questions'] as const;

// Current refresh callback (stored for cleanup)
let refreshCallback: (() => void) | null = null;

/**
 * Calculate endpoint on rectangle edge towards another point
 */
function endpointToRectEdge(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  halfW: number,
  halfH: number
): { x: number; y: number } {
  const vx = toX - fromX;
  const vy = toY - fromY;
  const denom = Math.max(
    1e-6,
    Math.max(Math.abs(vx) / Math.max(1e-6, halfW), Math.abs(vy) / Math.max(1e-6, halfH))
  );
  return {
    x: toX - vx / denom,
    y: toY - vy / denom,
  };
}

/**
 * Recompute connecting lines between center and items
 */
function recomputeLines(
  stage: HTMLElement,
  svg: SVGSVGElement,
  centerPill: HTMLElement,
  placed: PlacedItem[]
): void {
  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) return;

  // Clear existing lines
  while (svg.lastChild) svg.removeChild(svg.lastChild);

  // Get center pill dimensions in viewbox coords
  const centerRect = centerPill.getBoundingClientRect();
  const cW = (centerRect.width / stageRect.width) * VB_SIZE;
  const cH = (centerRect.height / stageRect.height) * VB_SIZE;
  const cHalfW = cW / 2;
  const cHalfH = cH / 2;

  // Draw lines to each placed item
  placed.forEach(({ el, cx: itemCx, cy: itemCy }) => {
    const r = el.getBoundingClientRect();
    const wVb = (r.width / stageRect.width) * VB_SIZE;
    const hVb = (r.height / stageRect.height) * VB_SIZE;
    const halfW = wVb / 2;
    const halfH = hVb / 2;

    const start = endpointToRectEdge(itemCx, itemCy, VB_CENTER, VB_CENTER, cHalfW, cHalfH);
    const end = endpointToRectEdge(VB_CENTER, VB_CENTER, itemCx, itemCy, halfW, halfH);

    const line = createSVGElement('line', {
      x1: String(start.x),
      y1: String(start.y),
      x2: String(end.x),
      y2: String(end.y),
      'stroke-width': '2',
    });
    svg.appendChild(line);
  });
}

/**
 * Curiosity map container renderer
 */
export const curiosityRenderer: ContainerRenderer = {
  async render(nodeId: string, cardEl: HTMLElement): Promise<void> {
    clearContainerContent(cardEl);

    // Load curiosity data
    let data: CuriosityData;
    try {
      data = await loadJSON<CuriosityData>(`content/curiosities/${nodeId}.json`);
    } catch (e) {
      console.error('Failed to load curiosity data:', e);
      return;
    }

    // Create stage container
    const stage = createElement('div', { className: 'curiosity-stage' });

    // Create SVG for lines
    const svg = createSVGElement('svg', {
      class: 'curiosity-lines',
      viewBox: `0 0 ${VB_SIZE} ${VB_SIZE}`,
      preserveAspectRatio: 'none',
    });

    // Create center element
    const center = createElement('div', { className: 'curiosity-center' });
    const centerPill = createElement('div', { className: 'curiosity-center-pill' }, [
      data.central || nodeId,
    ]);
    center.appendChild(centerPill);

    stage.appendChild(svg);
    stage.appendChild(center);

    // Get connected items (max 30)
    const connected = Array.isArray(data.connected) ? data.connected.slice(0, 30) : [];
    const count = connected.length;

    // Calculate radius based on item count
    const radius = count <= 8 ? 310 : 360;

    // Place items in radial layout
    const placed: PlacedItem[] = [];

    connected.forEach((item, idx) => {
      // Calculate angle with jitter for organic feel
      const baseAngle = (idx / Math.max(1, count)) * Math.PI * 2;
      const jitter = ((hashStringToInt(item.label || String(idx)) % 1000) / 1000 - 0.5) * 0.42;
      const angle = baseAngle + jitter;

      // Calculate radius with jitter
      const rJitter = ((hashStringToInt(`${item.label}-r`) % 1000) / 1000 - 0.5) * 60;
      const r = radius + rJitter;

      // Calculate position
      const x = VB_CENTER + Math.cos(angle) * r;
      const y = VB_CENTER + Math.sin(angle) * r;

      // Check if item has a link
      const hasLink = item.linksTo && typeof item.linksTo === 'string';

      // Create button element
      const btn = createElement('button', {
        type: 'button',
        className: hasLink ? 'curiosity-item curiosity-item-linked' : 'curiosity-item',
      }) as HTMLButtonElement;

      // Enable button if it has a link
      if (hasLink) {
        btn.addEventListener('click', () => {
          window.open(item.linksTo!, '_blank', 'noopener,noreferrer');
        });
      } else {
        btn.disabled = true;
      }

      // Assign color from palette
      const paletteKey = PALETTE_KEYS[hashStringToInt(item.label || String(idx)) % PALETTE_KEYS.length];
      const palette = THREAD_PALETTES[paletteKey];
      btn.style.color = palette[0];

      // Create label
      const label = createElement('span', { className: 'curiosity-label' }, [item.label || '']);
      btn.appendChild(label);

      // Position in viewbox coordinates
      btn.style.left = `${(x / VB_SIZE) * 100}%`;
      btn.style.top = `${(y / VB_SIZE) * 100}%`;

      // Add micro-jitter for hand-placed feel
      const jx = (hashStringToInt(`${item.label}-jx`) % 7) - 3;
      const jy = (hashStringToInt(`${item.label}-jy`) % 7) - 3;
      btn.style.setProperty('--jx', `${jx}px`);
      btn.style.setProperty('--jy', `${jy}px`);

      stage.appendChild(btn);
      placed.push({ el: btn, cx: x, cy: y });
    });

    // Update header
    updateContainerHeader(cardEl, {
      title: data.title || nodeId,
      lede: '',
    });

    // Set up line refresh callback
    refreshCallback = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          recomputeLines(stage, svg, centerPill, placed);
        });
      });
    };

    // Initial line computation
    refreshCallback();

    // Append stage to card
    cardEl.appendChild(stage);
  },

  cleanup(): void {
    refreshCallback = null;
  },
};

/**
 * Get the current refresh callback (for external triggering)
 */
export function getRefreshCallback(): (() => void) | null {
  return refreshCallback;
}

// Register the renderer
registerRenderer('curiosity', curiosityRenderer);
