/**
 * Phrase rotation component
 * Displays rotating inspirational phrases on the landing page
 */

import type { Phrase } from '../types';
import { getById } from '../utils/dom';

// Cached DOM elements
let phraseTextEl: HTMLElement | null = null;
let phraseByEl: HTMLElement | null = null;

// Store current phrase for restoration
let currentPhraseText: string = '';
let currentPhraseBy: string = '';

/**
 * Initialize phrase elements
 */
export function initPhrase(): void {
  phraseTextEl = document.querySelector('.phrase-text');
  phraseByEl = getById('phrase-by');
}

/**
 * Hide the phrase with animation
 */
export function hidePhrase(): void {
  document.body.classList.add('phrase-hidden');
  document.body.classList.remove('phrase-fade-in');
}

/**
 * Show the phrase with slow fade-in animation
 */
export function showPhraseSlow(): void {
  document.body.classList.add('phrase-fade-in');
  document.body.classList.remove('phrase-hidden');

  window.setTimeout(() => {
    document.body.classList.remove('phrase-fade-in');
  }, 1100);
}

/**
 * Display a random phrase from the collection
 */
export function rotatePhrase(phrases: Phrase[]): void {
  if (!phrases.length || !phraseTextEl) return;

  const next = phrases[Math.floor(Math.random() * phrases.length)];
  currentPhraseText = next.text || '';
  currentPhraseBy = next.by ? `— ${next.by}` : '';

  phraseTextEl.textContent = currentPhraseText;

  if (phraseByEl) {
    phraseByEl.textContent = currentPhraseBy;
  }
}

/**
 * Temporarily show custom text in the phrase area (e.g., bio text)
 */
export function showCustomPhrase(text: string, attribution?: string): void {
  if (!phraseTextEl) return;

  phraseTextEl.textContent = text;

  if (phraseByEl) {
    phraseByEl.textContent = attribution ? `— ${attribution}` : '';
  }
}

/**
 * Restore the original phrase after showing custom text
 */
export function restorePhrase(): void {
  if (!phraseTextEl) return;

  phraseTextEl.textContent = currentPhraseText;

  if (phraseByEl) {
    phraseByEl.textContent = currentPhraseBy;
  }
}

/**
 * Set up automatic phrase rotation
 * @param phrases - Array of phrases to rotate through
 * @param intervalMs - Rotation interval in milliseconds (default: 30000)
 * @returns Cleanup function to stop rotation
 */
export function startPhraseRotation(
  phrases: Phrase[],
  intervalMs = 30000
): () => void {
  // Show initial phrase
  rotatePhrase(phrases);

  // Set up interval
  const intervalId = setInterval(() => {
    rotatePhrase(phrases);
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}
