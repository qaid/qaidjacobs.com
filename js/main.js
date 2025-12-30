// Theme management
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

initTheme();

// Global init
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Navigation trigger (placeholder)
const navTrigger = document.querySelector('.nav-trigger');
const navOverlay = document.getElementById('nav-overlay');
const webEl = document.getElementById('landing-web');
const overlayEssay = document.getElementById('overlay-essay');
const backBtn = document.querySelector('.container-close');

if (navTrigger && navOverlay) {
  navTrigger.addEventListener('click', () => {
    const isOpen = navOverlay.hasAttribute('hidden') ? false : true;
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
    if (navOverlay.contains(e.target) || navTrigger.contains(e.target)) return;
    navOverlay.setAttribute('hidden', '');
    navTrigger.setAttribute('aria-expanded', 'false');
  });
}

function enterContainer(detail = {}) {
  if (webEl) webEl.classList.add('dim');
  if (overlayEssay) {
    overlayEssay.classList.add('active');
    overlayEssay.classList.add('container-mode');
    overlayEssay.setAttribute('aria-hidden', 'false');
  }
  document.body.classList.add('container-mode');
  window.dispatchEvent(new CustomEvent('container:open', { detail }));
}

function exitContainer() {
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

export function focusEssay(nodeId) {
  enterContainer({ nodeId });
  if (overlayEssay) {
    overlayEssay.focus?.();
  }
}

export function closeEssay() {
  exitContainer();
}
