/**
 * Environment / preference helpers.
 *
 * Two runtime gates the interaction layer respects everywhere:
 *  - reduced motion  → kill ambient drift, particle streams
 *  - mobile          → simpler containers, no edge-hover, ambient motion off
 *
 * Both are live: they re-evaluate on the underlying media query so a user
 * flipping the OS setting or rotating a tablet is honored without a reload.
 */

const reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileMq = window.matchMedia('(max-width: 768px)');

/** True when the user asked the system to minimize non-essential motion. */
export function prefersReducedMotion(): boolean {
  return reducedMotionMq.matches;
}

/** True below the responsive breakpoint (spec: ~768px). */
export function isMobile(): boolean {
  return mobileMq.matches;
}

/**
 * Ambient motion (Brownian drift, hover particle streams, durational
 * particles) runs only when motion is allowed AND we're on a pointer-first
 * desktop. Mobile disables it for battery; reduced-motion disables it for
 * comfort.
 */
export function ambientMotionEnabled(): boolean {
  return !prefersReducedMotion() && !isMobile();
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

// A modern addEventListener exists on all target browsers.
reducedMotionMq.addEventListener('change', notify);
mobileMq.addEventListener('change', notify);

/**
 * Subscribe to changes in either preference. Returns an unsubscribe fn.
 * Callers re-read isMobile()/prefersReducedMotion() inside the callback.
 */
export function onEnvChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
