/**
 * Durational container renderer
 * For long-form media: DJ mixes, talks, podcasts
 */

import type { ContainerRenderer } from './base';
import type { DurationalData, DurationalMedia } from '../types';
import { clearContainerContent, updateContainerHeader, registerRenderer } from './base';
import { loadJSON } from '../utils/data';
import { createElement } from '../utils/dom';

// Particle state
interface ParticleState {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

let particleStates: ParticleState[] = [];
let animationFrameId: number | null = null;
let containerRect: { width: number; height: number } | null = null;

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match?.[1] || '';
}

/**
 * Extract Vimeo video ID from URL
 */
function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || '';
}

/**
 * Extract Spotify ID from URL (track, album, playlist, episode, show)
 */
function extractSpotifyId(url: string): string {
  const match = url.match(/spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  return match ? `${match[1]}/${match[2]}` : '';
}

/**
 * Create appropriate embed iframe based on media source
 */
function createEmbed(media: DurationalMedia): HTMLElement {
  const iframe = createElement('iframe', {
    className: 'durational-embed',
  }) as HTMLIFrameElement;

  iframe.setAttribute('allow', 'autoplay');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allowfullscreen', '');

  switch (media.source) {
    case 'soundcloud':
      iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(media.url)}&color=%23c4956a&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;
      break;
    case 'mixcloud':
      iframe.src = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(media.url)}`;
      break;
    case 'youtube':
      const ytId = extractYouTubeId(media.url);
      iframe.src = `https://www.youtube.com/embed/${ytId}?rel=0`;
      break;
    case 'vimeo':
      const vimeoId = extractVimeoId(media.url);
      iframe.src = `https://player.vimeo.com/video/${vimeoId}`;
      break;
    case 'spotify':
      const spotifyId = extractSpotifyId(media.url);
      iframe.src = `https://open.spotify.com/embed/${spotifyId}`;
      break;
  }

  return iframe;
}

/**
 * Animate particles with lazy drifting motion
 */
function animateParticles(): void {
  if (!containerRect) return;

  const nudgeChance = 0.005; // Rare chance of direction change
  const nudgeStrength = 0.08; // Gentle nudge when it happens
  const drift = 0.002; // Tiny continuous drift variation
  const drag = 0.997; // Very slow decay - particles coast for a long time
  const margin = 20; // Boundary margin in pixels

  for (const p of particleStates) {
    // Occasional gentle nudge to change direction (like a distant breeze)
    if (Math.random() < nudgeChance) {
      const angle = Math.random() * Math.PI * 2;
      p.vx += Math.cos(angle) * nudgeStrength;
      p.vy += Math.sin(angle) * nudgeStrength;
    }

    // Very subtle continuous drift variation
    p.vx += (Math.random() - 0.5) * drift;
    p.vy += (Math.random() - 0.5) * drift;

    // Apply drag (slow deceleration)
    p.vx *= drag;
    p.vy *= drag;

    // Update position
    p.x += p.vx;
    p.y += p.vy;

    // Soft boundary - gently redirect when approaching edges
    if (p.x < margin) {
      p.vx += 0.01;
    } else if (p.x > containerRect.width - margin) {
      p.vx -= 0.01;
    }

    if (p.y < margin) {
      p.vy += 0.01;
    } else if (p.y > containerRect.height - margin) {
      p.vy -= 0.01;
    }

    // Hard clamp to prevent escape
    p.x = Math.max(0, Math.min(containerRect.width, p.x));
    p.y = Math.max(0, Math.min(containerRect.height, p.y));

    // Apply position
    p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }

  animationFrameId = requestAnimationFrame(animateParticles);
}

/**
 * Start lazy drifting particles with even distribution
 */
function startParticles(container: HTMLElement): void {
  const particleCount = 40;
  particleStates = [];

  // Use viewport-relative dimensions to ensure particles are visible
  const rect = container.getBoundingClientRect();
  const width = Math.max(rect.width, window.innerWidth * 0.9);
  const height = Math.max(rect.height, window.innerHeight * 0.8);
  containerRect = { width, height };

  // Create grid for even distribution with jitter
  const cols = 8;
  const rows = 5;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  for (let i = 0; i < particleCount; i++) {
    const particle = createElement('div', { className: 'durational-particle' });

    // Grid position with random jitter for organic distribution
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jitterX = (Math.random() - 0.5) * cellWidth * 0.8;
    const jitterY = (Math.random() - 0.5) * cellHeight * 0.8;
    const x = (col + 0.5) * cellWidth + jitterX;
    const y = (row + 0.5) * cellHeight + jitterY;

    // Lazy initial velocity - pick a random direction and drift slowly
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.1 + Math.random() * 0.15; // Very slow
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Position via transform (more performant than left/top)
    particle.style.left = '0';
    particle.style.top = '0';
    particle.style.transform = `translate(${x}px, ${y}px)`;

    // Larger, more visible particles
    const size = 3 + Math.random() * 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    // Higher opacity for better visibility
    particle.style.opacity = `${0.5 + Math.random() * 0.4}`;

    container.appendChild(particle);
    particleStates.push({ el: particle, x, y, vx, vy });
  }

  // Start animation loop
  animationFrameId = requestAnimationFrame(animateParticles);
}

/**
 * Stop and clean up particles
 */
function stopParticles(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  particleStates.forEach((p) => p.el.remove());
  particleStates = [];
  containerRect = null;
}

/**
 * Format subtype for display
 */
function formatSubtype(subtype?: string): string {
  if (!subtype) return 'durational';
  return subtype.replace('-', ' ');
}

export const durationalRenderer: ContainerRenderer = {
  async render(nodeId: string, cardEl: HTMLElement): Promise<void> {
    clearContainerContent(cardEl);

    // Load durational data
    let data: DurationalData;
    try {
      data = await loadJSON<DurationalData>(`content/durational/${nodeId}.json`);
    } catch (e) {
      console.error('Failed to load durational data:', e);
      return;
    }

    // Create main container
    const container = createElement('div', { className: 'durational-content' });

    // Create particle background
    const particleBg = createElement('div', { className: 'durational-particles' });
    container.appendChild(particleBg);

    // Create media player wrapper
    const playerWrapper = createElement('div', { className: 'durational-player' });
    playerWrapper.appendChild(createEmbed(data.media));
    container.appendChild(playerWrapper);

    // Create description section below player (single content area)
    const descriptionText = data.description || data.commentary || '';
    if (descriptionText) {
      const description = createElement('div', { className: 'durational-description' });
      description.textContent = descriptionText;
      container.appendChild(description);
    }

    // Update header (hide lede since description is below player)
    updateContainerHeader(cardEl, {
      eyebrow: formatSubtype(data.subtype),
      title: data.title,
      lede: '',
    });

    cardEl.appendChild(container);

    // Start particle animation
    startParticles(particleBg);
  },

  cleanup(): void {
    stopParticles();
  },
};

// Register for 'durational' type and subtypes
registerRenderer('durational', durationalRenderer);
registerRenderer('dj-mix', durationalRenderer);
registerRenderer('talk', durationalRenderer);
registerRenderer('podcast', durationalRenderer);
