/**
 * Animation utilities for smooth transitions
 */

export interface TransformOptions {
  /** Element to animate */
  element: HTMLElement;
  /** Starting rect (from getBoundingClientRect) */
  from: DOMRect;
  /** Ending rect (from getBoundingClientRect) */
  to: DOMRect;
  /** Duration in ms */
  duration?: number;
  /** Easing function */
  easing?: string;
  /** Border radius at start */
  startRadius?: string;
  /** Border radius at end */
  endRadius?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Animate an element from one rect to another using transforms
 * Uses FLIP technique (First, Last, Invert, Play)
 */
export function animateTransform({
  element,
  from,
  to,
  duration = 420,
  easing = 'ease',
  startRadius = '999px',
  endRadius = 'var(--radius)',
  onComplete,
}: TransformOptions): void {
  // Calculate scale and translate
  const scaleX = Math.max(0.01, from.width / to.width);
  const scaleY = Math.max(0.01, from.height / to.height);
  const translateX = from.left - to.left;
  const translateY = from.top - to.top;

  // Set initial state (inverted)
  element.style.transformOrigin = 'top left';
  element.style.transition = 'none';
  element.style.borderRadius = startRadius;
  element.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

  // Force reflow
  element.getBoundingClientRect();

  // Play animation
  requestAnimationFrame(() => {
    element.style.transition = `transform ${duration}ms ${easing}, border-radius ${duration}ms ${easing}`;
    element.style.borderRadius = endRadius;
    element.style.transform = 'translate(0px, 0px) scale(1, 1)';
  });

  // Handle completion
  if (onComplete) {
    const handleEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      element.removeEventListener('transitionend', handleEnd);
      onComplete();
    };
    element.addEventListener('transitionend', handleEnd);
  }
}

/**
 * Animate element to a target rect (reverse of animateTransform)
 */
export function animateToRect({
  element,
  from,
  to,
  duration = 420,
  easing = 'ease',
  endRadius = '999px',
  onComplete,
}: TransformOptions): void {
  const scaleX = Math.max(0.01, to.width / from.width);
  const scaleY = Math.max(0.01, to.height / from.height);
  const translateX = to.left - from.left;
  const translateY = to.top - from.top;

  element.style.transformOrigin = 'top left';
  element.style.transition = `transform ${duration}ms ${easing}, border-radius ${duration}ms ${easing}`;
  element.style.borderRadius = endRadius;
  element.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

  if (onComplete) {
    const handleEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      element.removeEventListener('transitionend', handleEnd);
      onComplete();
    };
    element.addEventListener('transitionend', handleEnd);
  }
}

/**
 * Reset element transform styles
 */
export function resetTransform(element: HTMLElement): void {
  element.style.transition = 'none';
  element.style.transform = '';
  element.style.borderRadius = '';
  element.style.transformOrigin = '';
}

/**
 * Easing function for particle animations
 * Quadratic ease-in-out
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Request animation frame with cleanup
 * Returns a cancel function
 */
export function animate(
  callback: (timestamp: number) => boolean
): () => void {
  let id: number;
  let cancelled = false;

  const tick = (timestamp: number) => {
    if (cancelled) return;
    const shouldContinue = callback(timestamp);
    if (shouldContinue && !cancelled) {
      id = requestAnimationFrame(tick);
    }
  };

  id = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(id);
  };
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
