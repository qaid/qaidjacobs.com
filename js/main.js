import {
  getById,
  query
} from "./main-65mq6067.js";
import"./main-3hqyeswk.js";

// src/main.ts
var themeToggle = getById("theme-toggle");
var yearEl = getById("year");
var navTrigger = query(".nav-trigger");
var navOverlay = getById("nav-overlay");
var webEl = getById("landing-web");
var overlayEssay = getById("overlay-essay");
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const currentTheme = savedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", currentTheme);
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const theme = document.documentElement.getAttribute("data-theme");
      const newTheme = theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  }
}
function initNav() {
  if (!navTrigger || !navOverlay)
    return;
  navTrigger.addEventListener("click", () => {
    const isOpen = !navOverlay.hasAttribute("hidden");
    if (isOpen) {
      navOverlay.setAttribute("hidden", "");
      navTrigger.setAttribute("aria-expanded", "false");
    } else {
      navOverlay.removeAttribute("hidden");
      navTrigger.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", (e) => {
    if (!navOverlay || navOverlay.hasAttribute("hidden"))
      return;
    const target = e.target;
    if (navOverlay.contains(target) || navTrigger.contains(target))
      return;
    navOverlay.setAttribute("hidden", "");
    navTrigger.setAttribute("aria-expanded", "false");
  });
}
function enterContainer(detail = {}) {
  if (webEl)
    webEl.classList.add("dim");
  if (overlayEssay) {
    overlayEssay.classList.add("active");
    overlayEssay.classList.add("container-mode");
    overlayEssay.setAttribute("aria-hidden", "false");
  }
  document.body.classList.add("container-mode");
  window.dispatchEvent(new CustomEvent("container:open", { detail }));
}
function exitContainer() {
  if (webEl)
    webEl.classList.remove("dim");
  if (overlayEssay) {
    overlayEssay.classList.remove("active");
    overlayEssay.classList.remove("container-mode");
    overlayEssay.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("container-mode");
  window.dispatchEvent(new CustomEvent("container:close"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function focusEssay(nodeId) {
  enterContainer({ nodeId });
  if (overlayEssay) {
    overlayEssay.focus?.();
  }
}
function closeEssay() {
  exitContainer();
}
var fadeAnimationId = null;
var fadeStartTime = null;
var fadeStartOpacity = 0;
var isLogoHovered = false;
var isHeaderHovered = false;
var FADE_DURATION = 1e4;
var CLICKABLE_THRESHOLD = 0.01;
function updatePointerEvents(link, opacity) {
  link.style.pointerEvents = opacity > CLICKABLE_THRESHOLD ? "auto" : "none";
}
function animateLogoFade(link, startOpacity) {
  fadeStartTime = performance.now();
  fadeStartOpacity = startOpacity;
  function animate(currentTime) {
    if (!fadeStartTime)
      return;
    if (isLogoHovered || isHeaderHovered) {
      fadeAnimationId = null;
      return;
    }
    const elapsed = currentTime - fadeStartTime;
    const progress = Math.min(elapsed / FADE_DURATION, 1);
    const currentOpacity = fadeStartOpacity * (1 - progress);
    link.style.opacity = String(currentOpacity);
    updatePointerEvents(link, currentOpacity);
    if (progress < 1) {
      fadeAnimationId = requestAnimationFrame(animate);
    } else {
      fadeAnimationId = null;
      link.style.pointerEvents = "none";
    }
  }
  if (fadeAnimationId !== null) {
    cancelAnimationFrame(fadeAnimationId);
  }
  fadeAnimationId = requestAnimationFrame(animate);
}
function getCurrentOpacity(element) {
  const opacity = window.getComputedStyle(element).opacity;
  return parseFloat(opacity) || 0;
}
function initConstellationLogo() {
  const header = document.querySelector(".site-header");
  const constellationLink = getById("constellation-link");
  if (!header || !constellationLink)
    return;
  header.addEventListener("mouseenter", () => {
    isHeaderHovered = true;
    if (fadeAnimationId !== null) {
      cancelAnimationFrame(fadeAnimationId);
      fadeAnimationId = null;
    }
    constellationLink.style.opacity = "1";
    constellationLink.style.pointerEvents = "auto";
  });
  header.addEventListener("mouseleave", () => {
    isHeaderHovered = false;
    if (isLogoHovered)
      return;
    const currentOpacity = getCurrentOpacity(constellationLink);
    animateLogoFade(constellationLink, currentOpacity);
  });
  constellationLink.addEventListener("mouseenter", (e) => {
    const currentOpacity = getCurrentOpacity(constellationLink);
    if (currentOpacity < CLICKABLE_THRESHOLD)
      return;
    isLogoHovered = true;
    if (fadeAnimationId !== null) {
      cancelAnimationFrame(fadeAnimationId);
      fadeAnimationId = null;
    }
    constellationLink.style.opacity = "1";
    constellationLink.style.pointerEvents = "auto";
  });
  constellationLink.addEventListener("mouseleave", () => {
    isLogoHovered = false;
    if (isHeaderHovered)
      return;
    animateLogoFade(constellationLink, 1);
  });
}
initTheme();
initNav();
initConstellationLogo();
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
export {
  focusEssay,
  closeEssay
};

