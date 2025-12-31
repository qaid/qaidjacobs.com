/**
 * DOM utilities with caching and type safety
 */

// Cache for frequently accessed elements
const elementCache = new Map<string, HTMLElement | null>();

/**
 * Get element by ID with caching
 * @param id - Element ID (without #)
 * @returns Element or null
 */
export function getById<T extends HTMLElement = HTMLElement>(
  id: string
): T | null {
  if (!elementCache.has(id)) {
    elementCache.set(id, document.getElementById(id));
  }
  return elementCache.get(id) as T | null;
}

/**
 * Query selector with optional caching
 * @param selector - CSS selector
 * @param parent - Parent element (defaults to document)
 * @param cache - Whether to cache result
 * @returns Element or null
 */
export function query<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document,
  cache = false
): T | null {
  if (cache && parent === document) {
    const cacheKey = `qs:${selector}`;
    if (!elementCache.has(cacheKey)) {
      elementCache.set(cacheKey, document.querySelector(selector) as HTMLElement | null);
    }
    return elementCache.get(cacheKey) as T | null;
  }
  return parent.querySelector(selector) as T | null;
}

/**
 * Query all matching elements
 * @param selector - CSS selector
 * @param parent - Parent element (defaults to document)
 * @returns NodeList of elements
 */
export function queryAll<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document
): NodeListOf<T> {
  return parent.querySelectorAll(selector) as NodeListOf<T>;
}

/**
 * Clear element cache (call on major DOM changes)
 */
export function clearCache(): void {
  elementCache.clear();
}

/**
 * Add/remove classes with condition
 * @param el - Target element
 * @param className - Class name
 * @param condition - Add if true, remove if false
 */
export function toggleClass(
  el: HTMLElement,
  className: string,
  condition: boolean
): void {
  if (condition) {
    el.classList.add(className);
  } else {
    el.classList.remove(className);
  }
}

/**
 * Set multiple CSS properties at once
 * @param el - Target element
 * @param styles - Object of style properties
 */
export function setStyles(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
): void {
  Object.assign(el.style, styles);
}

/**
 * Create element with attributes and children
 * @param tag - HTML tag name
 * @param attrs - Attributes object
 * @param children - Child elements or text
 * @returns Created element
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key.startsWith('data-')) {
        el.dataset[key.slice(5)] = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}

/**
 * Create SVG element
 * @param tag - SVG tag name
 * @param attrs - Attributes object
 * @returns Created SVG element
 */
export function createSVGElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}
