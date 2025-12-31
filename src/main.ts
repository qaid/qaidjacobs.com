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

// Export public API
export { focusEssay, closeEssay };

// Initialize on load
initTheme();
initNav();

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
