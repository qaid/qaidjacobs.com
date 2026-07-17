/**
 * Particle stream system
 * Creates animated particles flowing between connected nodes
 */

import type { NodePx, Thread, ThreadType } from '../types';
import { createElement } from '../utils/dom';
import { easeInOutQuad } from '../utils/animation';
import { THREAD_PALETTES } from '../state/store';
import { ambientMotionEnabled, onEnvChange } from '../utils/env';

// Resolve the ordered list of thread hues a connection carries.
// Streams draw their own paths from node positions, so a connection is just
// its data (from/to/threads) — no DOM line element required.
function threadColors(threads?: ThreadType[]): string[] {
  const list = threads && threads.length ? threads : (['questions'] as ThreadType[]);
  return list.map((t) => (THREAD_PALETTES[t] || THREAD_PALETTES.questions)[0]);
}

// Particle configuration
const PARTICLE_COUNT = 25;
const STREAM_DURATION = 2400;

// Active streams registry
const activeStreams = new Map<string, boolean>();
const streamParticles = new Map<string, HTMLElement[]>();

/**
 * Get current center position of a node dot from DOM
 */
function getCurrentDotPosition(dotElement: HTMLElement): { x: number; y: number } {
  // The node wrapper is positioned by its center (left/top === center point).
  const left = parseFloat(dotElement.style.left || '0');
  const top = parseFloat(dotElement.style.top || '0');
  return { x: left, y: top };
}

/**
 * Create a single particle that flows from source to target
 */
function createParticle(
  container: HTMLElement,
  sourceDot: HTMLElement,
  targetDot: HTMLElement,
  color: string,
  streamId: string,
  index: number,
  onComplete: () => void
): HTMLElement {
  const particle = createElement('div', { className: 'particle' });
  particle.style.background = color;
  particle.style.boxShadow = `0 0 4px ${color}, 0 0 2px ${color}`;

  const sourcePos = getCurrentDotPosition(sourceDot);
  particle.style.left = `${sourcePos.x}px`;
  particle.style.top = `${sourcePos.y}px`;

  container.appendChild(particle);

  const baseDelay = STREAM_DURATION / PARTICLE_COUNT;
  const randomDelay = baseDelay * index * (0.8 + Math.random() * 0.4);
  const randomDuration = STREAM_DURATION * (0.9 + Math.random() * 0.2);

  setTimeout(() => {
    if (!activeStreams.has(streamId)) {
      particle.remove();
      return;
    }

    particle.style.opacity = '1';

    // Get initial positions from current dot locations
    const startPos = getCurrentDotPosition(sourceDot);
    const endPos = getCurrentDotPosition(targetDot);
    let startX = startPos.x;
    let startY = startPos.y;
    let endX = endPos.x;
    let endY = endPos.y;

    let dx = endX - startX;
    let dy = endY - startY;
    let distance = Math.hypot(dx, dy);
    let perpX = -dy / distance;
    let perpY = dx / distance;

    const waveAmplitude = 3 + Math.random() * 4;
    const waveFrequency = 2 + Math.random() * 2;
    const randomOffset = (Math.random() - 0.5) * 2;

    let startTime: number | null = null;

    function animate(timestamp: number) {
      if (!activeStreams.has(streamId)) {
        particle.remove();
        return;
      }

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / randomDuration, 1);

      // Update target position from moving dots every frame
      const currentStartPos = getCurrentDotPosition(sourceDot);
      const currentEndPos = getCurrentDotPosition(targetDot);
      startX = currentStartPos.x;
      startY = currentStartPos.y;
      endX = currentEndPos.x;
      endY = currentEndPos.y;

      dx = endX - startX;
      dy = endY - startY;
      distance = Math.hypot(dx, dy);
      perpX = -dy / distance;
      perpY = dx / distance;

      const easeProgress = easeInOutQuad(progress);
      const wave = Math.sin(easeProgress * Math.PI * waveFrequency) * waveAmplitude * (1 - easeProgress);

      const currentX = startX + dx * easeProgress + perpX * (wave + randomOffset);
      const currentY = startY + dy * easeProgress + perpY * (wave + randomOffset);

      particle.style.left = `${currentX}px`;
      particle.style.top = `${currentY}px`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
        onComplete();
      }
    }

    requestAnimationFrame(animate);
  }, randomDelay);

  return particle;
}

/**
 * Create a continuous particle stream between two nodes
 */
function createParticleStream(
  container: HTMLElement,
  sourceDot: HTMLElement,
  targetDot: HTMLElement,
  colors: string[],
  streamId: string
): HTMLElement[] {
  const particles: HTMLElement[] = [];

  function spawnParticle(index: number) {
    if (!activeStreams.has(streamId)) return;

    // Cycle through the connection's thread hues so a blended thread
    // sends particles of every color it carries.
    const color = colors[index % colors.length];

    const particle = createParticle(
      container,
      sourceDot,
      targetDot,
      color,
      streamId,
      index,
      () => {
        // Respawn particle when complete
        if (activeStreams.has(streamId)) {
          spawnParticle(index);
        }
      }
    );
    particles.push(particle);
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    spawnParticle(i);
  }

  return particles;
}

/**
 * Start particle streams for a hovered node
 */
export function startParticleStreams(
  nodeId: string,
  _nodesPx: NodePx[],
  connections: Thread[],
  container: HTMLElement,
  dotElements: Map<string, HTMLElement>
): void {
  // Stop any existing streams for this node
  stopParticleStreams(nodeId);

  // No particle streams under reduced-motion or on mobile.
  if (!ambientMotionEnabled()) return;

  // Find connections touching this node. Streams compute their paths from the
  // live node positions, so no thread line element is needed.
  const connectedThreads = connections.filter(
    (conn) => conn.from === nodeId || conn.to === nodeId
  );

  const allParticles: HTMLElement[] = [];

  connectedThreads.forEach((conn, idx) => {
    const fromNodeId = conn.from;
    const toNodeId = conn.to;
    if (!fromNodeId || !toNodeId) return;

    const fromDot = dotElements.get(fromNodeId);
    const toDot = dotElements.get(toNodeId);
    if (!fromDot || !toDot) return;

    const colors = threadColors(conn.threads as ThreadType[] | undefined);

    // Determine direction (particles flow from hovered node)
    const isFromHovered = fromNodeId === nodeId;
    const sourceDot = isFromHovered ? fromDot : toDot;
    const targetDot = isFromHovered ? toDot : fromDot;

    const streamId = `${nodeId}-${idx}`;
    activeStreams.set(streamId, true);

    const particles = createParticleStream(
      container,
      sourceDot,
      targetDot,
      colors,
      streamId
    );
    allParticles.push(...particles);
  });

  streamParticles.set(nodeId, allParticles);
}

/**
 * Stop particle streams for a node
 */
export function stopParticleStreams(nodeId: string): void {
  // Remove particles
  const particles = streamParticles.get(nodeId);
  if (particles) {
    particles.forEach((particle) => {
      if (particle.parentNode) {
        particle.remove();
      }
    });
    streamParticles.delete(nodeId);
  }

  // Clear stream flags
  const streamKeys = Array.from(activeStreams.keys());
  streamKeys.forEach((key) => {
    if (key === nodeId || key.startsWith(`${nodeId}-`)) {
      activeStreams.delete(key);
    }
  });
}

/**
 * Stop all active particle streams
 */
export function stopAllParticleStreams(): void {
  streamParticles.forEach((particles) => {
    particles.forEach((particle) => {
      if (particle.parentNode) {
        particle.remove();
      }
    });
  });
  streamParticles.clear();
  activeStreams.clear();
}

// Crossing to mobile width or enabling OS reduced-motion mid-session should
// kill any in-flight hover streams immediately, not just block new ones.
// (Re-enabling doesn't need to restart anything: streams are hover-triggered,
// not persistent, so the next hover just works.)
onEnvChange(() => {
  if (!ambientMotionEnabled()) stopAllParticleStreams();
});
