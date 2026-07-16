/**
 * Navigation layer — "summon the map to you".
 *
 * The navigation overlay is a single state that can be summoned three ways:
 *   1. Desktop edge-hover — nudging the pointer within 48px of the left,
 *      right, or bottom edge (never the top; the phrase lives there).
 *   2. The Braille Q logo (header on desktop, bottom-corner on mobile).
 *   3. (dismiss only) Esc, click-through on the backdrop, or — for
 *      edge-hover summons — moving the pointer back out of the zone.
 *
 * When summoned it fades in the full node web (every node, prominent) plus
 * the constellation.design link. Selecting a node steps into its container.
 *
 * This module owns ONLY the overlay + its triggers. Container open/close
 * lives in landing.ts; we reuse focusEssay() to step into a node.
 */

import type { Node, Thread, ThreadType } from './types';
import { focusEssay } from './main';
import { loadJSON } from './utils/data';
import { getById, queryAll, createElement } from './utils/dom';
import { THREAD_COLORS } from './state/store';
import { isMobile, onEnvChange } from './utils/env';

// Edge-hover activation band (spec: 48px from left/right/bottom).
const EDGE = 48;

const overlay = getById('nav-overlay');
const overlayWeb = getById('nav-overlay-web');
const triggers = Array.from(
  queryAll<HTMLButtonElement>('.nav-trigger')
);

let isOpen = false;
// The element focus should return to when the overlay closes.
let lastTrigger: HTMLElement | null = null;
// True when the overlay was summoned by edge-hover: leaving the zone (or the
// web area) auto-dismisses. Logo-summoned overlays stay until an explicit
// dismiss, so touch users aren't fighting a self-closing panel.
let summonedByHover = false;
let nodesLoaded = false;

/* ----------------------------------------------------------------------
 * Building the overlay web
 * -------------------------------------------------------------------- */

const TYPE_LABEL: Record<string, string> = {
  essay: 'Essay',
  durational: 'Listen',
  curiosity: 'Curiosity',
  artifact: 'Scrapbook',
  bio: 'About',
};

function typeKind(node: Node): string {
  if (node.subtype === 'dj-mix') return 'Mix';
  if (node.subtype === 'podcast') return 'Podcast';
  if (node.subtype === 'talk' || node.subtype === 'performance') return 'Talk';
  return TYPE_LABEL[node.type] || 'Node';
}

/**
 * Give a node an accessible name that answers "what kind of thing is this?"
 * — e.g. "Mix: Mortgage Music. Threads: music."
 */
function accessibleName(node: Node): string {
  const kind = typeKind(node);
  const title = node.title || node.id;
  const threads = (node.threads || []).join(', ');
  return threads ? `${kind}: ${title}. Threads: ${threads}.` : `${kind}: ${title}.`;
}

function threadAccent(node: Node): string {
  const t = (node.threads && node.threads[0]) as ThreadType | undefined;
  return t ? THREAD_COLORS[t] || THREAD_COLORS.questions : THREAD_COLORS.questions;
}

/**
 * Render the full web into the overlay as an accessible, conventional list
 * of nodes. The landing web is spatial and hard for a screen reader to
 * narrate; the nav overlay is where we make the whole collection legible —
 * one real <button> per node, keyboard-operable, thread-accented.
 */
async function buildOverlayWeb(): Promise<void> {
  if (!overlayWeb || nodesLoaded) return;

  let nodes: Node[] = [];
  try {
    [nodes] = await Promise.all([
      loadJSON<Node[]>('content/nodes/landing-nodes.json'),
      // connections loaded for parity/future edge rendering; not required
      // for the accessible list.
      loadJSON<Thread[]>('content/connections.json').catch(() => [] as Thread[]),
    ]);
  } catch {
    nodes = [];
  }

  const list = createElement('ul', { className: 'nav-web-list' });

  nodes.forEach((node) => {
    const li = createElement('li', { className: 'nav-web-item' });

    const btn = createElement('button', {
      className: 'nav-web-node',
      type: 'button',
      'data-type': node.type,
      'data-id': node.id,
    }) as HTMLButtonElement;
    btn.setAttribute('aria-label', accessibleName(node));
    btn.style.setProperty('--accent', threadAccent(node));

    const glyph = createElement('span', { className: 'nav-web-glyph' });
    glyph.dataset.type = node.type;
    if (node.subtype) glyph.dataset.subtype = node.subtype;
    glyph.setAttribute('aria-hidden', 'true');

    const text = createElement('span', { className: 'nav-web-text' });
    const kind = createElement('span', { className: 'nav-web-kind' }, [typeKind(node)]);
    const title = createElement('span', { className: 'nav-web-title' }, [
      node.title || node.id,
    ]);
    text.appendChild(kind);
    text.appendChild(title);

    btn.appendChild(glyph);
    btn.appendChild(text);

    btn.addEventListener('click', () => {
      close();
      // Let the overlay's fade-out begin before stepping into the node.
      window.setTimeout(() => focusEssay(node.id), 60);
    });

    li.appendChild(btn);
    list.appendChild(li);
  });

  overlayWeb.innerHTML = '';
  overlayWeb.appendChild(list);
  nodesLoaded = true;
}

/* ----------------------------------------------------------------------
 * Open / close
 * -------------------------------------------------------------------- */

function setTriggerState(pressed: boolean): void {
  triggers.forEach((t) => {
    t.setAttribute('aria-pressed', String(pressed));
    t.setAttribute('aria-label', pressed ? 'Close navigation' : 'Open navigation');
    t.classList.toggle('is-active', pressed);
  });
}

async function open(viaHover: boolean, originator?: HTMLElement): Promise<void> {
  if (!overlay || isOpen) {
    // Already open: a logo press upgrades a hover-summon to a sticky one.
    if (isOpen && !viaHover) summonedByHover = false;
    return;
  }
  isOpen = true;
  summonedByHover = viaHover;
  lastTrigger = originator || triggers[0] || null;

  await buildOverlayWeb();

  overlay.hidden = false;
  // Next frame so the fade-in transition runs from the hidden state.
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  document.body.classList.add('nav-open');
  setTriggerState(true);

  // Move focus into the overlay for keyboard + screen-reader users.
  if (!viaHover) {
    const firstNode = overlay.querySelector<HTMLElement>('.nav-web-node');
    (firstNode || overlay).focus?.();
  }
}

function close(): void {
  if (!overlay || !isOpen) return;
  isOpen = false;
  summonedByHover = false;

  overlay.classList.remove('is-open');
  document.body.classList.remove('nav-open');
  setTriggerState(false);

  // Wait out the fade before hiding so the transition is visible.
  const onDone = () => {
    if (!isOpen && overlay) overlay.hidden = true;
    overlay?.removeEventListener('transitionend', onDone);
  };
  overlay.addEventListener('transitionend', onDone);
  // Fallback in case the transition doesn't fire (e.g. reduced motion).
  window.setTimeout(() => {
    if (!isOpen && overlay && !overlay.classList.contains('is-open')) {
      overlay.hidden = true;
    }
  }, 320);

  // Return focus to whatever summoned the overlay.
  lastTrigger?.focus?.();
  lastTrigger = null;
}

function toggle(originator?: HTMLElement): void {
  if (isOpen) close();
  else open(false, originator);
}

/* ----------------------------------------------------------------------
 * Edge-hover detection (desktop only, throttled via rAF)
 * -------------------------------------------------------------------- */

let pointerRaf = 0;
let pendingX = 0;
let pendingY = 0;

function inEdgeZone(x: number, y: number): boolean {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Left, right, bottom — never top (phrase lives there).
  return x <= EDGE || x >= w - EDGE || y >= h - EDGE;
}

function processPointer(): void {
  pointerRaf = 0;
  if (isMobile()) return;

  const inZone = inEdgeZone(pendingX, pendingY);

  if (inZone && !isOpen) {
    open(true);
  } else if (!inZone && isOpen && summonedByHover) {
    // Leaving the summoning band dismisses a hover-summoned map — but keep it
    // alive while the pointer is over the overlay's interactive content (the
    // node list or the constellation link). The backdrop is NOT a keep-alive
    // zone; otherwise a full-screen overlay could never auto-dismiss.
    const overEl = document.elementFromPoint(pendingX, pendingY);
    const overContent = !!overEl?.closest(
      '.nav-overlay-web, .nav-overlay-constellation'
    );
    if (!overContent) close();
  }
}

function onPointerMove(e: PointerEvent): void {
  if (e.pointerType === 'touch') return; // touch has no hover
  pendingX = e.clientX;
  pendingY = e.clientY;
  if (!pointerRaf) pointerRaf = requestAnimationFrame(processPointer);
}

/* ----------------------------------------------------------------------
 * Wiring
 * -------------------------------------------------------------------- */

function initNavigation(): void {
  if (!overlay) return;

  triggers.forEach((t) => {
    t.addEventListener('click', (e) => {
      e.preventDefault();
      toggle(t);
    });
  });

  // Explicit close control (primary dismiss on touch, where there's no hover).
  const closeBtn = getById('nav-overlay-close');
  closeBtn?.addEventListener('click', () => close());

  // Click-through on the backdrop dismisses (but not clicks on the web/list
  // or the constellation link).
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close();
  });

  // Esc closes the overlay. Containers handle their own Esc in landing.ts;
  // guard so we only act when the nav overlay is the thing that's open.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      close();
    }
  });

  // Desktop edge-hover.
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // If the viewport crosses the mobile breakpoint while open via hover,
  // don't leave a hover-only affordance stranded.
  onEnvChange(() => {
    if (isMobile() && isOpen && summonedByHover) close();
  });
}

initNavigation();

export { open as openNav, close as closeNav, toggle as toggleNav };
