/**
 * Durational container renderer
 * For long-form media: DJ mixes, talks, podcasts
 */

import type { ContainerRenderer } from './base';
import type { DurationalData, DurationalMedia } from '../types';
import { clearContainerContent, updateContainerHeader, registerRenderer } from './base';
import { loadJSON } from '../utils/data';
import { createElement } from '../utils/dom';
import { prefersReducedMotion } from '../utils/env';

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

// The container element whose saturation/accent we modulate over playback.
let activeContentEl: HTMLElement | null = null;
// SoundCloud Widget handle (when the API is available).
let scWidget: SoundCloudWidget | null = null;

// --- SoundCloud Widget API (progressive enhancement) ---
const SC_API_SRC = 'https://w.soundcloud.com/player/api.js';

interface SoundCloudWidget {
  bind(event: string, handler: (e: { relativePosition?: number }) => void): void;
  unbind(event: string): void;
}
interface SoundCloudWidgetAPI {
  Widget: {
    (iframe: HTMLIFrameElement): SoundCloudWidget;
    Events: { PLAY_PROGRESS: string; FINISH: string };
  };
}

let scApiPromise: Promise<SoundCloudWidgetAPI | null> | null = null;

/**
 * Load the SoundCloud Widget API once. Resolves to null when unavailable
 * (offline / blocked), so callers degrade gracefully.
 */
function loadSoundCloudApi(): Promise<SoundCloudWidgetAPI | null> {
  if (scApiPromise) return scApiPromise;

  scApiPromise = new Promise((resolve) => {
    const w = window as unknown as { SC?: SoundCloudWidgetAPI };
    if (w.SC?.Widget) {
      resolve(w.SC);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SC_API_SRC}"]`);
    const onReady = () => resolve((window as unknown as { SC?: SoundCloudWidgetAPI }).SC || null);
    if (existing) {
      existing.addEventListener('load', onReady);
      existing.addEventListener('error', () => resolve(null));
      return;
    }
    const script = document.createElement('script');
    script.src = SC_API_SRC;
    script.async = true;
    script.addEventListener('load', onReady);
    script.addEventListener('error', () => resolve(null));
    document.head.appendChild(script);
  });

  return scApiPromise;
}

/**
 * Saturation curve: lowest at the start, peaks at the middle, lowest at
 * the end (discovery.md). progress is a 0..1 playback fraction.
 */
function saturationCurve(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  // sin(pi * p): 0 → 1 → 0. Keep a calm floor so it never fully deadens.
  return 0.25 + 0.75 * Math.sin(Math.PI * p);
}

/**
 * Apply the current intensity to the container: drives particle saturation
 * and opacity plus the container accent via a CSS custom property.
 */
function applyIntensity(intensity: number): void {
  if (!activeContentEl) return;
  activeContentEl.style.setProperty('--durational-intensity', intensity.toFixed(3));
}

/**
 * Wire the SoundCloud widget's PLAY_PROGRESS to the saturation curve.
 * No-op (with a calm default) when the API is unavailable.
 */
async function wireSoundCloudCurve(iframe: HTMLIFrameElement): Promise<void> {
  applyIntensity(saturationCurve(0));

  const SC = await loadSoundCloudApi();
  if (!SC?.Widget) return; // Offline / blocked → keep the calm default.

  try {
    scWidget = SC.Widget(iframe);
    scWidget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
      applyIntensity(saturationCurve(e.relativePosition ?? 0));
    });
    scWidget.bind(SC.Widget.Events.FINISH, () => applyIntensity(saturationCurve(1)));
  } catch {
    scWidget = null;
  }
}

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
  // Brownian particle background is atmosphere, not information — skip it
  // entirely when the user asked for reduced motion.
  if (prefersReducedMotion()) return;

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

    // Larger, more visible particles — sized so they read over the warm card
    // even at the resting intensity.
    const size = 4 + Math.random() * 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    // Higher opacity for better visibility at rest.
    particle.style.opacity = `${0.65 + Math.random() * 0.35}`;

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
    activeContentEl = container;
    // Start calm; the playback curve modulates this if the widget wires up.
    container.style.setProperty('--durational-intensity', saturationCurve(0).toFixed(3));

    // Create particle background
    const particleBg = createElement('div', { className: 'durational-particles' });
    container.appendChild(particleBg);

    // Create media player wrapper
    const playerWrapper = createElement('div', { className: 'durational-player' });
    const embed = createEmbed(data.media) as HTMLIFrameElement;
    playerWrapper.appendChild(embed);
    container.appendChild(playerWrapper);

    // Modulate saturation over playback (SoundCloud only; graceful otherwise).
    if (data.media.source === 'soundcloud') {
      wireSoundCloudCurve(embed);
    }

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
    if (scWidget) {
      try {
        const SC = (window as unknown as { SC?: SoundCloudWidgetAPI }).SC;
        if (SC?.Widget?.Events) {
          scWidget.unbind(SC.Widget.Events.PLAY_PROGRESS);
          scWidget.unbind(SC.Widget.Events.FINISH);
        }
      } catch {
        /* ignore */
      }
      scWidget = null;
    }
    activeContentEl = null;
  },
};

// Register for 'durational' type and subtypes
registerRenderer('durational', durationalRenderer);
registerRenderer('dj-mix', durationalRenderer);
registerRenderer('talk', durationalRenderer);
registerRenderer('podcast', durationalRenderer);
