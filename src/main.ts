/**
 * Main entry point - theme management and global container controls
 */

import { getById } from './utils/dom';

// DOM elements
const themeToggle = getById('theme-toggle');
const yearEl = getById('year');
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

/**
 * Initialize constellation logo fade behavior.
 * Fade is handled entirely by CSS transitions (see .constellation-link):
 * toggling .is-shown fades in fast; removing it triggers the slow 10s
 * fade-out. No persistent requestAnimationFrame loop.
 */
function initConstellationLogo(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const constellationLink = getById('constellation-link');

  if (!header || !constellationLink) return;

  const show = () => constellationLink.classList.add('is-shown');
  const hide = () => constellationLink.classList.remove('is-shown');

  header.addEventListener('mouseenter', show);
  header.addEventListener('mouseleave', hide);
  constellationLink.addEventListener('mouseenter', show);
  constellationLink.addEventListener('mouseleave', hide);
}

// Export public API
export { focusEssay, closeEssay };

// Initialize on load
initTheme();
initConstellationLogo();

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
