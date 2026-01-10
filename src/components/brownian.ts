/**
 * Brownian motion for node dots
 * Creates subtle, organic drift like dust motes in warm afternoon sun
 */

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
const MOTION_CONFIG = {
  STEP_SIZE: 0.005,         // Size of each random step (reduced for smoothness)
  DIRECTION_CHANGE_RATE: 0.995, // Probability of continuing in same direction (0-1)
  BASE_SPEED: 0.08,         // Base movement speed (pixels per frame)
  FOOTER_CLEARANCE: 320,    // Keep dots this many pixels from bottom (footer height)
  EDGE_PADDING: 20,         // Padding from viewport edges (pixels)
};

// Global state
const dotMotions: Map<string, DotMotionState> = new Map();
let rafId: number | null = null;
let globalPaused = false;

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
export function initBrownianMotion(dotElements: Map<string, HTMLElement>): void {
  // Stop existing motion if any
  stopBrownianMotion();

  // Initialize state for each dot
  dotElements.forEach((dotElement, nodeId) => {
    // Get current position from DOM
    const currentLeft = parseFloat(dotElement.style.left || '0');
    const currentTop = parseFloat(dotElement.style.top || '0');

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

  // Start animation loop
  globalPaused = false;
  if (rafId === null) {
    rafId = requestAnimationFrame(updateMotion);
  }
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
