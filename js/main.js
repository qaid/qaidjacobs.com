import {
  getById
} from "./main-k51qvqm5.js";
import"./main-3hqyeswk.js";

// src/main.ts
var themeToggle = getById("theme-toggle");
var yearEl = getById("year");
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
function initConstellationLogo() {
  const header = document.querySelector(".site-header");
  const constellationLink = getById("constellation-link");
  if (!header || !constellationLink)
    return;
  const show = () => constellationLink.classList.add("is-shown");
  const hide = () => constellationLink.classList.remove("is-shown");
  header.addEventListener("mouseenter", show);
  header.addEventListener("mouseleave", hide);
  constellationLink.addEventListener("mouseenter", show);
  constellationLink.addEventListener("mouseleave", hide);
}
initTheme();
initConstellationLogo();
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
export {
  focusEssay,
  closeEssay
};

