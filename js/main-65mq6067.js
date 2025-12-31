// src/utils/dom.ts
var elementCache = new Map;
function getById(id) {
  if (!elementCache.has(id)) {
    elementCache.set(id, document.getElementById(id));
  }
  return elementCache.get(id);
}
function query(selector, parent = document, cache = false) {
  if (cache && parent === document) {
    const cacheKey = `qs:${selector}`;
    if (!elementCache.has(cacheKey)) {
      elementCache.set(cacheKey, document.querySelector(selector));
    }
    return elementCache.get(cacheKey);
  }
  return parent.querySelector(selector);
}
function createElement(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") {
        el.className = value;
      } else if (key.startsWith("data-")) {
        el.dataset[key.slice(5)] = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === "string") {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}
function createSVGElement(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

export { getById, query, createElement, createSVGElement };
