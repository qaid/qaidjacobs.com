// src/utils/env.ts
var reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
var mobileMq = window.matchMedia("(max-width: 768px)");
function prefersReducedMotion() {
  return reducedMotionMq.matches;
}
function isMobile() {
  return mobileMq.matches;
}
function ambientMotionEnabled() {
  return !prefersReducedMotion() && !isMobile();
}
var listeners = new Set;
function notify() {
  listeners.forEach((fn) => fn());
}
reducedMotionMq.addEventListener("change", notify);
mobileMq.addEventListener("change", notify);
function onEnvChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export { prefersReducedMotion, isMobile, ambientMotionEnabled, onEnvChange };
