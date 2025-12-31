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
initTheme();
initNav();
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
export {
  focusEssay,
  closeEssay
};

