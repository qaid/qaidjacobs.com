/**
 * Main entry point - theme management and global container controls
 */

import { getById, query } from './utils/dom';

// DOM elements
const themeToggle = getById('theme-toggle');
const yearEl = getById('year');
const navTrigger = query<HTMLButtonElement>('.nav-trigger');
const navOverlay = getById('nav-overlay');
const webEl = getById('landing-web');
const overlayEssay = getById('overlay-essay');

/**
 * Initialize theme based on saved preference or system preference
 */
function initTheme(): void {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const theme = document.documentElement.getAttribute('data-theme');
      const newTheme = theme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

/**
 * Initialize navigation menu
 */
function initNav(): void {
  if (!navTrigger || !navOverlay) return;

  navTrigger.addEventListener('click', () => {
    const isOpen = !navOverlay.hasAttribute('hidden');
    if (isOpen) {
      navOverlay.setAttribute('hidden', '');
      navTrigger.setAttribute('aria-expanded', 'false');
    } else {
      navOverlay.removeAttribute('hidden');
      navTrigger.setAttribute('aria-expanded', 'true');
    }
  });

  document.addEventListener('click', (e) => {
    if (!navOverlay || navOverlay.hasAttribute('hidden')) return;
    const target = e.target as Node;
    if (navOverlay.contains(target) || navTrigger.contains(target)) return;
    navOverlay.setAttribute('hidden', '');
    navTrigger.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Enter container mode
 */
function enterContainer(detail: { nodeId?: string } = {}): void {
  if (webEl) webEl.classList.add('dim');
  if (overlayEssay) {
    overlayEssay.classList.add('active');
    overlayEssay.classList.add('container-mode');
    overlayEssay.setAttribute('aria-hidden', 'false');
  }
  document.body.classList.add('container-mode');
  window.dispatchEvent(new CustomEvent('container:open', { detail }));
}

/**
 * Exit container mode
 */
function exitContainer(): void {
  if (webEl) webEl.classList.remove('dim');
  if (overlayEssay) {
    overlayEssay.classList.remove('active');
    overlayEssay.classList.remove('container-mode');
    overlayEssay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('container-mode');
  window.dispatchEvent(new CustomEvent('container:close'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Focus on a specific node/essay
 */
function focusEssay(nodeId: string): void {
  enterContainer({ nodeId });
  if (overlayEssay) {
    overlayEssay.focus?.();
  }
}

/**
 * Close the current essay/container
 */
function closeEssay(): void {
  exitContainer();
}

// Constellation logo fade management
let fadeAnimationId: number | null = null;
let fadeStartTime: number | null = null;
let fadeStartOpacity: number = 0;
let isLogoHovered = false;
let isHeaderHovered = false;

const FADE_DURATION = 10000; // 10 seconds
const CLICKABLE_THRESHOLD = 0.01; // Minimum opacity for clickability

/**
 * Update pointer events based on opacity
 */
function updatePointerEvents(link: HTMLElement, opacity: number): void {
  link.style.pointerEvents = opacity > CLICKABLE_THRESHOLD ? 'auto' : 'none';
}

/**
 * Animate logo fade using RAF
 */
function animateLogoFade(link: HTMLElement, startOpacity: number): void {
  fadeStartTime = performance.now();
  fadeStartOpacity = startOpacity;

  function animate(currentTime: number): void {
    if (!fadeStartTime) return;

    // Stop if hovered
    if (isLogoHovered || isHeaderHovered) {
      fadeAnimationId = null;
      return;
    }

    const elapsed = currentTime - fadeStartTime;
    const progress = Math.min(elapsed / FADE_DURATION, 1);

    // Linear fade from start opacity to 0
    const currentOpacity = fadeStartOpacity * (1 - progress);
    link.style.opacity = String(currentOpacity);
    updatePointerEvents(link, currentOpacity);

    if (progress < 1) {
      fadeAnimationId = requestAnimationFrame(animate);
    } else {
      fadeAnimationId = null;
      link.style.pointerEvents = 'none';
    }
  }

  if (fadeAnimationId !== null) {
    cancelAnimationFrame(fadeAnimationId);
  }
  fadeAnimationId = requestAnimationFrame(animate);
}

/**
 * Get current computed opacity
 */
function getCurrentOpacity(element: HTMLElement): number {
  const opacity = window.getComputedStyle(element).opacity;
  return parseFloat(opacity) || 0;
}

/**
 * Initialize constellation logo fade behavior
 */
function initConstellationLogo(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const constellationLink = getById('constellation-link');

  if (!header || !constellationLink) return;

  // On header hover enter - show logo and cancel fade
  header.addEventListener('mouseenter', () => {
    isHeaderHovered = true;

    // Cancel ongoing fade
    if (fadeAnimationId !== null) {
      cancelAnimationFrame(fadeAnimationId);
      fadeAnimationId = null;
    }

    // Show logo
    constellationLink.style.opacity = '1';
    constellationLink.style.pointerEvents = 'auto';
  });

  // On header hover leave - start fade (unless logo is hovered)
  header.addEventListener('mouseleave', () => {
    isHeaderHovered = false;

    // Don't start fade if logo is currently hovered
    if (isLogoHovered) return;

    // Start fade from current opacity
    const currentOpacity = getCurrentOpacity(constellationLink);
    animateLogoFade(constellationLink, currentOpacity);
  });

  // On logo hover enter - stop fade and show at full opacity
  constellationLink.addEventListener('mouseenter', (e) => {
    // Only respond if link is actually clickable
    const currentOpacity = getCurrentOpacity(constellationLink);
    if (currentOpacity < CLICKABLE_THRESHOLD) return;

    isLogoHovered = true;

    // Cancel ongoing fade
    if (fadeAnimationId !== null) {
      cancelAnimationFrame(fadeAnimationId);
      fadeAnimationId = null;
    }

    // Force full opacity
    constellationLink.style.opacity = '1';
    constellationLink.style.pointerEvents = 'auto';
  });

  // On logo hover leave - resume fade from current opacity
  constellationLink.addEventListener('mouseleave', () => {
    isLogoHovered = false;

    // Don't start fade if header is currently hovered
    if (isHeaderHovered) return;

    // Start fade from opacity 1 (since we were just hovering at full opacity)
    animateLogoFade(constellationLink, 1);
  });
}

// Export public API
export { focusEssay, closeEssay };

// Initialize on load
initTheme();
initNav();
initConstellationLogo();

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
