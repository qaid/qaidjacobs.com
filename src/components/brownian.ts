/**
 * Brownian motion for node dots
 * Creates subtle, organic drift like dust motes in warm afternoon sun
 */

import { ambientMotionEnabled, onEnvChange } from '../utils/env';

interface DotMotionState {
  nodeId: string;
  dotElement: HTMLElement;
  x: number;                // Absolute X position
  y: number;                // Absolute Y position
  velocityX: number;
  velocityY: number;
  isPaused: boolean;
}

// Motion configuration
// Drift runs at ~40% of the original amplitude: calmer, slower wander.
// (STEP_SIZE and BASE_SPEED were 0.005 / 0.08 before.)
const MOTION_CONFIG = {
  STEP_SIZE: 0.002,         // Size of each random step (thermal noise amplitude)
  DIRECTION_CHANGE_RATE: 0.995, // Probability of continuing in same direction (0-1)
  BASE_SPEED: 0.032,        // Base movement speed (pixels per frame)
  FOOTER_CLEARANCE: 320,    // Keep dots this many pixels from bottom (footer height)
  EDGE_PADDING: 20,         // Padding from viewport edges (pixels)
};

// Global state
const dotMotions: Map<string, DotMotionState> = new Map();
let rafId: number | null = null;
let globalPaused = false;

// The web container dots are positioned within. Used to translate the phrase's
// viewport rect into the same coordinate space as the dots' left/top.
let motionContainer: HTMLElement | null = null;

// Last dot elements passed to initBrownianMotion, kept so an onEnvChange
// restart (e.g. crossing back from mobile width, or reduced-motion turning
// off mid-session) can re-seed drift without a caller re-invoking it.
let lastDotElements: Map<string, HTMLElement> | null = null;

// Horizontal exclusion band covering the phrase/quote area, in the dots'
// coordinate space (same origin as their left/top). Nodes and their labels
// must never drift into this band. Null until measured.
let phraseBand: { top: number; bottom: number } | null = null;

// Extra clearance so a node's label (which sits at the marker's vertical
// center, extending a little above/below) never overlaps the phrase either.
const PHRASE_BAND_MARGIN = 28;

/**
 * Measure the phrase element and record the vertical band it occupies, in the
 * coordinate space of the dots (offsets within the web container). Recomputed
 * on resize so the band tracks the phrase's responsive position.
 */
function measurePhraseBand(): void {
  phraseBand = null;
  if (!motionContainer) return;

  const phraseEl = document.querySelector<HTMLElement>('.phrase');
  if (!phraseEl) return;

  const containerRect = motionContainer.getBoundingClientRect();
  const phraseRect = phraseEl.getBoundingClientRect();
  if (phraseRect.height === 0) return;

  // Translate the phrase's viewport rect into container-local coordinates
  // (dots' left/top share this origin), padded so labels stay clear too.
  const top = phraseRect.top - containerRect.top - PHRASE_BAND_MARGIN;
  const bottom = phraseRect.bottom - containerRect.top + PHRASE_BAND_MARGIN;
  phraseBand = { top, bottom };
}

/**
 * If a Y position lands inside the phrase band, push it out below the band.
 * Nodes are nudged down (not scrambled) so the authored layout is preserved.
 */
function clampYOutOfBand(y: number): number {
  if (!phraseBand) return y;
  if (y >= phraseBand.top && y <= phraseBand.bottom) {
    return phraseBand.bottom;
  }
  return y;
}

/**
 * Generate Gaussian random number using Box-Muller transform
 */
function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Get viewport boundaries for dot movement
 */
function getViewportBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxBottomY = viewportHeight - MOTION_CONFIG.FOOTER_CLEARANCE;

  return {
    minX: MOTION_CONFIG.EDGE_PADDING,
    maxX: viewportWidth - MOTION_CONFIG.EDGE_PADDING,
    minY: MOTION_CONFIG.EDGE_PADDING,
    maxY: maxBottomY - MOTION_CONFIG.EDGE_PADDING,
  };
}

/**
 * Update motion for all active dots
 */
function updateMotion(): void {
  let hasActiveDots = false;
  const bounds = getViewportBounds();

  dotMotions.forEach((state) => {
    // Skip if paused (either individually or globally)
    if (state.isPaused || globalPaused) {
      return;
    }

    hasActiveDots = true;

    // Occasionally change direction (random walk)
    // Most of the time continue in same direction (straight path)
    if (Math.random() > MOTION_CONFIG.DIRECTION_CHANGE_RATE) {
      // Pick a new random direction
      const angle = Math.random() * 2 * Math.PI;
      const speed = MOTION_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.5);
      state.velocityX = Math.cos(angle) * speed;
      state.velocityY = Math.sin(angle) * speed;
    }

    // Add small random perturbation (thermal noise)
    state.velocityX += gaussianRandom() * MOTION_CONFIG.STEP_SIZE;
    state.velocityY += gaussianRandom() * MOTION_CONFIG.STEP_SIZE;

    // Update position
    state.x += state.velocityX;
    state.y += state.velocityY;

    // Check viewport boundaries and reflect
    if (state.x < bounds.minX) {
      state.x = bounds.minX;
      state.velocityX = Math.abs(state.velocityX); // Bounce right
    } else if (state.x > bounds.maxX) {
      state.x = bounds.maxX;
      state.velocityX = -Math.abs(state.velocityX); // Bounce left
    }

    if (state.y < bounds.minY) {
      state.y = bounds.minY;
      state.velocityY = Math.abs(state.velocityY); // Bounce down
    } else if (state.y > bounds.maxY) {
      state.y = bounds.maxY;
      state.velocityY = -Math.abs(state.velocityY); // Bounce up
    }

    // Phrase exclusion band: nodes must never drift over the quote. Reflect
    // off whichever edge of the band the node is closest to, and push it clear.
    if (phraseBand && state.y >= phraseBand.top && state.y <= phraseBand.bottom) {
      const distToTop = state.y - phraseBand.top;
      const distToBottom = phraseBand.bottom - state.y;
      if (distToTop < distToBottom && phraseBand.top >= bounds.minY) {
        state.y = phraseBand.top;
        state.velocityY = -Math.abs(state.velocityY); // Bounce up, above band
      } else {
        state.y = phraseBand.bottom;
        state.velocityY = Math.abs(state.velocityY); // Bounce down, below band
      }
    }

    // Apply to DOM
    state.dotElement.style.left = `${state.x}px`;
    state.dotElement.style.top = `${state.y}px`;
  });

  // Continue animation loop if any dots are active
  if (hasActiveDots || !globalPaused) {
    rafId = requestAnimationFrame(updateMotion);
  } else {
    rafId = null;
  }
}

/**
 * Initialize Brownian motion for all dots
 */
export function initBrownianMotion(
  dotElements: Map<string, HTMLElement>,
  container?: HTMLElement | null
): void {
  // Stop existing motion if any
  stopBrownianMotion();

  motionContainer = container ?? motionContainer;
  lastDotElements = dotElements;
  ensureEnvChangeListener();

  // Respect reduced-motion and mobile: nodes stay exactly where placed.
  if (!ambientMotionEnabled()) return;

  // Measure the phrase exclusion band before seeding positions so initial
  // authored positions can be nudged clear of it.
  measurePhraseBand();

  // Initialize state for each dot
  dotElements.forEach((dotElement, nodeId) => {
    // Get current position from DOM
    const currentLeft = parseFloat(dotElement.style.left || '0');
    let currentTop = parseFloat(dotElement.style.top || '0');

    // Clamp initial authored position out of the phrase band (nudge down).
    currentTop = clampYOutOfBand(currentTop);
    dotElement.style.top = `${currentTop}px`;

    // Start with random direction
    const angle = Math.random() * 2 * Math.PI;
    const speed = MOTION_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.5);

    dotMotions.set(nodeId, {
      nodeId,
      dotElement,
      x: currentLeft,
      y: currentTop,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      isPaused: false,
    });
  });

  // Recompute the band on resize so it tracks the phrase's responsive
  // position. Registered once; guarded so it's a no-op when motion is off.
  ensureResizeListener();

  // Start animation loop
  globalPaused = false;
  if (rafId === null) {
    rafId = requestAnimationFrame(updateMotion);
  }
}

let resizeListenerAttached = false;
let resizeRaf = 0;

function onResize(): void {
  if (resizeRaf) return;
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    measurePhraseBand();
    // Nudge any node currently inside the newly-measured band clear of it.
    dotMotions.forEach((state) => {
      const clamped = clampYOutOfBand(state.y);
      if (clamped !== state.y) {
        state.y = clamped;
        state.dotElement.style.top = `${state.y}px`;
      }
    });
  });
}

function ensureResizeListener(): void {
  if (resizeListenerAttached) return;
  window.addEventListener('resize', onResize, { passive: true });
  resizeListenerAttached = true;
}

// Subscribed once, for the life of the page. Crossing to mobile width or
// enabling OS reduced-motion mid-session stops drift immediately; crossing
// back restarts it (using the dots from the most recent initBrownianMotion
// call), rather than requiring a reload to pick up the change.
let envChangeListenerAttached = false;

function ensureEnvChangeListener(): void {
  if (envChangeListenerAttached) return;
  envChangeListenerAttached = true;
  onEnvChange(() => {
    if (!ambientMotionEnabled()) {
      stopBrownianMotion();
      return;
    }
    if (lastDotElements && lastDotElements.size > 0) {
      initBrownianMotion(lastDotElements, motionContainer);
    }
  });
}

/**
 * Pause motion for a specific dot
 */
export function pauseMotion(nodeId: string): void {
  const state = dotMotions.get(nodeId);
  if (state) {
    state.isPaused = true;
  }
}

/**
 * Resume motion for a specific dot
 */
export function resumeMotion(nodeId: string): void {
  const state = dotMotions.get(nodeId);
  if (state) {
    state.isPaused = false;

    // Restart animation loop if it stopped
    if (rafId === null && !globalPaused) {
      rafId = requestAnimationFrame(updateMotion);
    }
  }
}

/**
 * Pause motion for all dots
 */
export function pauseAllMotion(): void {
  globalPaused = true;
}

/**
 * Resume motion for all dots
 */
export function resumeAllMotion(): void {
  globalPaused = false;

  // Nothing to animate when ambient motion is off, or when there are no
  // registered dots (avoids an idle rAF loop spinning forever).
  if (!ambientMotionEnabled() || dotMotions.size === 0) return;

  // Restart animation loop
  if (rafId === null) {
    rafId = requestAnimationFrame(updateMotion);
  }
}

/**
 * Stop Brownian motion and cleanup
 */
export function stopBrownianMotion(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  dotMotions.clear();
  globalPaused = false;
}
