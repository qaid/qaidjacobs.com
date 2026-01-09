/**
 * Brownian motion for node dots
 * Creates subtle, organic drift like dust motes in warm afternoon sun
 */

interface DotMotionState {
  nodeId: string;
  dotElement: HTMLElement;
  originalX: number;
  originalY: number;
  offsetX: number;
  offsetY: number;
  velocityX: number;
  velocityY: number;
  isPaused: boolean;
}

// Motion configuration
const MOTION_CONFIG = {
  MAX_RADIUS: 15,           // Maximum displacement from origin (pixels)
  STEP_SIZE: 0.02,          // Size of each random step
  DIRECTION_CHANGE_RATE: 0.98, // Probability of continuing in same direction (0-1)
  BASE_SPEED: 0.15,         // Base movement speed (pixels per frame)
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
 * Reflect velocity when hitting boundary (elastic collision)
 */
function reflectAtBoundary(
  offsetX: number,
  offsetY: number,
  velocityX: number,
  velocityY: number,
  radius: number
): { vx: number; vy: number } {
  const dist = Math.hypot(offsetX, offsetY);
  if (dist > radius) {
    // Normalize position to boundary
    const nx = offsetX / dist;
    const ny = offsetY / dist;

    // Reflect velocity vector across boundary normal
    const dot = velocityX * nx + velocityY * ny;
    return {
      vx: velocityX - 2 * dot * nx,
      vy: velocityY - 2 * dot * ny,
    };
  }
  return { vx: velocityX, vy: velocityY };
}

/**
 * Update motion for all active dots
 */
function updateMotion(): void {
  let hasActiveDots = false;

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

    // Update position offset
    state.offsetX += state.velocityX;
    state.offsetY += state.velocityY;

    // Check boundary collision and reflect
    const dist = Math.hypot(state.offsetX, state.offsetY);
    if (dist > MOTION_CONFIG.MAX_RADIUS) {
      // Clamp position to boundary
      const scale = MOTION_CONFIG.MAX_RADIUS / dist;
      state.offsetX *= scale;
      state.offsetY *= scale;

      // Reflect velocity
      const reflected = reflectAtBoundary(
        state.offsetX,
        state.offsetY,
        state.velocityX,
        state.velocityY,
        MOTION_CONFIG.MAX_RADIUS
      );
      state.velocityX = reflected.vx;
      state.velocityY = reflected.vy;
    }

    // Apply to DOM
    state.dotElement.style.left = `${state.originalX + state.offsetX}px`;
    state.dotElement.style.top = `${state.originalY + state.offsetY}px`;
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
    const origLeft = parseFloat(dotElement.dataset.origLeft || '0');
    const origTop = parseFloat(dotElement.dataset.origTop || '0');

    // Start with random direction
    const angle = Math.random() * 2 * Math.PI;
    const speed = MOTION_CONFIG.BASE_SPEED * (0.5 + Math.random() * 0.5);

    dotMotions.set(nodeId, {
      nodeId,
      dotElement,
      originalX: origLeft,
      originalY: origTop,
      offsetX: 0,
      offsetY: 0,
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
