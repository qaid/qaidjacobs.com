/**
 * Particle stream system
 * Creates animated particles flowing between connected nodes
 */

import type { NodePx, ThreadType } from '../types';
import { createElement } from '../utils/dom';
import { easeInOutQuad } from '../utils/animation';
import { THREAD_PALETTES } from '../state/store';

// Particle configuration
const PARTICLE_COUNT = 25;
const STREAM_DURATION = 2400;

// Active streams registry
const activeStreams = new Map<string, boolean>();
const streamParticles = new Map<string, HTMLElement[]>();

/**
 * Create a single particle that flows from source to target
 */
function createParticle(
  container: HTMLElement,
  sourceNode: NodePx,
  targetNode: NodePx,
  color: string,
  streamId: string,
  index: number,
  onComplete: () => void
): HTMLElement {
  const particle = createElement('div', { className: 'particle' });
  particle.style.background = color;
  particle.style.boxShadow = `0 0 4px ${color}, 0 0 2px ${color}`;
  particle.style.left = `${sourceNode.center.x}px`;
  particle.style.top = `${sourceNode.center.y}px`;

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

    const startX = sourceNode.center.x;
    const startY = sourceNode.center.y;
    const endX = targetNode.center.x;
    const endY = targetNode.center.y;

    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const perpX = -dy / distance;
    const perpY = dx / distance;

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
  sourceNode: NodePx,
  targetNode: NodePx,
  color: string,
  streamId: string
): HTMLElement[] {
  const particles: HTMLElement[] = [];

  function spawnParticle(index: number) {
    if (!activeStreams.has(streamId)) return;

    const particle = createParticle(
      container,
      sourceNode,
      targetNode,
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
  nodesPx: NodePx[],
  threadElements: HTMLElement[],
  container: HTMLElement
): void {
  // Stop any existing streams for this node
  stopParticleStreams(nodeId);

  // Find threads connected to this node
  const connectedThreads = threadElements.filter(
    (thread) => thread.dataset.from === nodeId || thread.dataset.to === nodeId
  );

  const allParticles: HTMLElement[] = [];

  connectedThreads.forEach((thread, idx) => {
    const fromNode = nodesPx.find((n) => n.id === thread.dataset.from);
    const toNode = nodesPx.find((n) => n.id === thread.dataset.to);
    if (!fromNode || !toNode) return;

    const primaryThread = (thread.dataset.thread || 'questions') as ThreadType;
    const palette = THREAD_PALETTES[primaryThread] || THREAD_PALETTES.questions;
    const color = palette[0];

    // Determine direction (particles flow from hovered node)
    const isFromHovered = thread.dataset.from === nodeId;
    const sourceNode = isFromHovered ? fromNode : toNode;
    const targetNode = isFromHovered ? toNode : fromNode;

    const streamId = `${nodeId}-${idx}`;
    activeStreams.set(streamId, true);

    const particles = createParticleStream(container, sourceNode, targetNode, color, streamId);
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
