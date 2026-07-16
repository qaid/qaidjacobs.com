/**
 * Creative Artifacts (scrapbook) container renderer
 *
 * A moodboard of things Qa'id made: photo stacks, short audio (beats,
 * micro-mixes), sketches and paintings. Items are placed, not gridded,
 * with slight rotations and offsets so the space feels accumulated by hand.
 */

import type { ContainerRenderer } from './base';
import type { ArtifactData, ArtifactItem } from '../types';
import { clearContainerContent, updateContainerHeader, registerRenderer } from './base';
import { loadJSON, hashStringToInt } from '../utils/data';
import { createElement } from '../utils/dom';

/**
 * Deterministic pseudo-random in [-1, 1] from a seed string.
 */
function seededUnit(seed: string): number {
  return (hashStringToInt(seed) % 1000) / 500 - 1;
}

/**
 * Resolve a rotation angle for an item: explicit `angle` wins, otherwise a
 * small deterministic tilt derived from the item's identity.
 */
function resolveAngle(item: ArtifactItem, seed: string): number {
  if (typeof item.angle === 'number') return item.angle;
  return seededUnit(seed) * 4.5; // roughly -4.5deg..4.5deg
}

/**
 * Build a handwritten note element placed near an item.
 */
function createNote(text: string, seed: string): HTMLElement {
  const note = createElement('p', { className: 'artifact-note' }, [text]);
  note.style.setProperty('--note-angle', `${seededUnit(`${seed}-note`) * 3}deg`);
  return note;
}

/**
 * Photo stack: layered images, click/Enter/Space cycles which is on top.
 */
function createPhotoStack(item: ArtifactItem, seed: string): HTMLElement {
  const srcs = (item.srcs && item.srcs.length ? item.srcs : item.src ? [item.src] : []).slice(0, 8);

  const stack = createElement('button', {
    type: 'button',
    className: 'artifact-photo-stack',
    'aria-label': `${item.label || 'Photo stack'} — ${srcs.length} photos, activate to shuffle`,
  }) as HTMLButtonElement;

  // Order tracks which layer is on top (last entry = top-most).
  let order = srcs.map((_, i) => i);

  const layers: HTMLImageElement[] = srcs.map((src, i) => {
    const img = createElement('img', {
      className: 'artifact-photo',
      src,
      alt: item.alt || item.label || `Photo ${i + 1}`,
      loading: 'lazy',
      draggable: 'false',
    }) as HTMLImageElement;
    // Per-layer resting tilt so the pile looks shuffled, not aligned.
    img.style.setProperty('--layer-angle', `${seededUnit(`${seed}-${i}`) * 6}deg`);
    img.style.setProperty('--layer-x', `${seededUnit(`${seed}-x${i}`) * 10}px`);
    img.style.setProperty('--layer-y', `${seededUnit(`${seed}-y${i}`) * 10}px`);
    return img;
  });

  function paint(): void {
    order.forEach((layerIdx, depth) => {
      const img = layers[layerIdx];
      img.style.zIndex = String(depth);
      // Top layer sits flat and fully opaque; lower layers recede slightly.
      const isTop = depth === order.length - 1;
      img.style.opacity = isTop ? '1' : String(0.82 - (order.length - 1 - depth) * 0.06);
      img.classList.toggle('is-top', isTop);
    });
  }

  function shuffle(): void {
    if (order.length < 2) return;
    // Move current top to the bottom, revealing the next photo.
    const top = order[order.length - 1];
    order = [top, ...order.slice(0, order.length - 1)];
    layers[top].classList.add('is-flipping');
    window.setTimeout(() => layers[top].classList.remove('is-flipping'), 260);
    paint();
  }

  layers.forEach((img) => stack.appendChild(img));
  paint();

  if (srcs.length > 1) {
    stack.addEventListener('click', shuffle);
  } else {
    stack.classList.add('is-single');
  }

  // Count badge hints there is more than one photo underneath.
  if (srcs.length > 1) {
    const badge = createElement('span', { className: 'artifact-stack-count', 'aria-hidden': 'true' }, [
      String(srcs.length),
    ]);
    stack.appendChild(badge);
  }

  return stack;
}

/**
 * Single image (sketch, painting, standalone photo).
 */
function createImage(item: ArtifactItem, seed: string): HTMLElement {
  const frame = createElement('div', { className: 'artifact-image' });
  const img = createElement('img', {
    className: 'artifact-photo is-top',
    src: item.src || '',
    alt: item.alt || item.label || 'Artifact',
    loading: 'lazy',
    draggable: 'false',
  }) as HTMLImageElement;
  img.style.setProperty('--layer-angle', '0deg');
  img.style.setProperty('--layer-x', '0px');
  img.style.setProperty('--layer-y', '0px');
  frame.appendChild(img);
  void seed;
  return frame;
}

/**
 * Short audio (beats, micro-mixes) — native controls, no custom player.
 */
function createAudio(item: ArtifactItem): HTMLElement {
  const wrap = createElement('div', { className: 'artifact-audio' });
  if (item.label) {
    wrap.appendChild(createElement('span', { className: 'artifact-audio-label' }, [item.label]));
  }
  const audio = createElement('audio', {
    className: 'artifact-audio-el',
    controls: '',
    preload: 'none',
    src: item.audio || '',
  });
  wrap.appendChild(audio);
  return wrap;
}

/**
 * Build one placed scrapbook item (media + optional note), tilted in place.
 */
function createItem(item: ArtifactItem, idx: number): HTMLElement {
  const seed = `${item.label || item.src || item.audio || 'item'}-${idx}`;

  const cell = createElement('div', { className: `artifact-item is-${item.kind}` });
  cell.style.setProperty('--tilt', `${resolveAngle(item, seed)}deg`);

  let media: HTMLElement;
  switch (item.kind) {
    case 'photo-stack':
      media = createPhotoStack(item, seed);
      break;
    case 'audio':
      media = createAudio(item);
      break;
    case 'image':
    default:
      media = createImage(item, seed);
      break;
  }
  cell.appendChild(media);

  if (item.note) {
    cell.appendChild(createNote(item.note, seed));
  }

  return cell;
}

export const artifactsRenderer: ContainerRenderer = {
  async render(nodeId: string, cardEl: HTMLElement): Promise<void> {
    clearContainerContent(cardEl);

    let data: ArtifactData;
    try {
      data = await loadJSON<ArtifactData>(`content/artifacts/${nodeId}.json`);
    } catch (e) {
      console.error('Failed to load artifact data:', e);
      return;
    }

    const content = createElement('div', { className: 'artifacts-content' });

    if (data.intro) {
      content.appendChild(createElement('p', { className: 'artifacts-intro' }, [data.intro]));
    }

    const board = createElement('div', { className: 'artifacts-board' });
    const items = Array.isArray(data.items) ? data.items : [];
    items.forEach((item, idx) => board.appendChild(createItem(item, idx)));
    content.appendChild(board);

    updateContainerHeader(cardEl, {
      eyebrow: data.subtype || 'scrapbook',
      title: data.title || nodeId,
      lede: '',
    });

    cardEl.appendChild(content);
  },

  cleanup(): void {
    // Native audio + DOM only; nothing to tear down.
  },
};

// Register for the artifact node type.
registerRenderer('artifact', artifactsRenderer);
