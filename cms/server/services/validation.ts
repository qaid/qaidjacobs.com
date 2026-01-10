/**
 * Validation Service
 * Validates all input data before file operations
 */

import type { Node, CuriosityData, DurationalData, Phrase, Thread } from '../types';
import type { ValidationResult } from '../types';

const ID_PATTERN = /^[a-z0-9-]+$/;
const ESSAY_FILE_PATTERN = /^[a-z0-9-]+\.md$/;

/**
 * Validate node data
 */
export function validateNode(node: Partial<Node>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!node.id || !node.id.trim()) {
    errors.push('ID is required');
  } else if (!ID_PATTERN.test(node.id)) {
    errors.push('ID must be lowercase alphanumeric with hyphens (e.g., my-node-id)');
  }

  if (!node.title || !node.title.trim()) {
    errors.push('Title is required');
  }

  if (!node.type) {
    errors.push('Type is required');
  } else if (!['essay', 'music', 'movement', 'curiosity', 'durational', 'bio'].includes(node.type)) {
    errors.push('Invalid node type');
  }

  if (!node.threads || !Array.isArray(node.threads)) {
    errors.push('Threads must be an array');
  } else if (node.threads.length === 0) {
    errors.push('At least one thread is required');
  } else {
    const validThreads = ['music', 'movement', 'questions'];
    const invalidThreads = node.threads.filter((t) => !validThreads.includes(t));
    if (invalidThreads.length > 0) {
      errors.push(`Invalid threads: ${invalidThreads.join(', ')}`);
    }
  }

  // Coordinates validation
  if (typeof node.x !== 'number') {
    errors.push('X coordinate must be a number');
  } else if (node.x < 0 || node.x > 100) {
    errors.push('X coordinate must be between 0 and 100');
  }

  if (typeof node.y !== 'number') {
    errors.push('Y coordinate must be a number');
  } else if (node.y < 0 || node.y > 100) {
    errors.push('Y coordinate must be between 0 and 100');
  }

  // visible_on_landing validation
  if (node.visible_on_landing !== undefined && typeof node.visible_on_landing !== 'boolean') {
    errors.push('visible_on_landing must be a boolean');
  }

  // Type-specific validation
  if (node.type === 'essay') {
    if (!node.essayFile) {
      errors.push('Essay nodes require essayFile');
    } else if (!ESSAY_FILE_PATTERN.test(node.essayFile)) {
      errors.push('Essay file must end in .md and contain only lowercase alphanumeric with hyphens');
    }
  }

  if (node.type === 'bio' && node.bioText && typeof node.bioText !== 'string') {
    errors.push('bioText must be a string');
  }

  // Created date validation
  if (node.created) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(node.created)) {
      errors.push('created date must be in YYYY-MM-DD format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate curiosity data
 */
export function validateCuriosityData(data: Partial<CuriosityData>): ValidationResult {
  const errors: string[] = [];

  if (!data.id || !data.id.trim()) {
    errors.push('ID is required');
  } else if (!ID_PATTERN.test(data.id)) {
    errors.push('ID must be lowercase alphanumeric with hyphens');
  }

  if (!data.title || !data.title.trim()) {
    errors.push('Title is required');
  }

  if (!data.central || !data.central.trim()) {
    errors.push('Central label is required');
  }

  if (!data.connected || !Array.isArray(data.connected)) {
    errors.push('Connected items must be an array');
  } else {
    data.connected.forEach((item, index) => {
      if (!item.label || !item.label.trim()) {
        errors.push(`Connected item ${index + 1} must have a label`);
      }
      if (item.linksTo !== null && typeof item.linksTo !== 'string') {
        errors.push(`Connected item ${index + 1} linksTo must be a string or null`);
      }
    });
  }

  if (!data.threads || !Array.isArray(data.threads)) {
    errors.push('Threads must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate durational data
 */
export function validateDurationalData(data: Partial<DurationalData>): ValidationResult {
  const errors: string[] = [];

  if (!data.id || !data.id.trim()) {
    errors.push('ID is required');
  } else if (!ID_PATTERN.test(data.id)) {
    errors.push('ID must be lowercase alphanumeric with hyphens');
  }

  if (!data.title || !data.title.trim()) {
    errors.push('Title is required');
  }

  if (data.type !== 'durational') {
    errors.push('Type must be "durational"');
  }

  if (data.subtype && !['dj-mix', 'talk', 'podcast'].includes(data.subtype)) {
    errors.push('Invalid subtype (must be dj-mix, talk, or podcast)');
  }

  if (!data.media) {
    errors.push('Media information is required');
  } else {
    if (!data.media.source) {
      errors.push('Media source is required');
    } else if (!['soundcloud', 'mixcloud', 'youtube', 'vimeo'].includes(data.media.source)) {
      errors.push('Invalid media source');
    }

    if (!data.media.url || !data.media.url.trim()) {
      errors.push('Media URL is required');
    } else {
      try {
        new URL(data.media.url);
      } catch {
        errors.push('Media URL must be a valid URL');
      }
    }
  }

  if (!data.threads || !Array.isArray(data.threads)) {
    errors.push('Threads must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate phrase data
 */
export function validatePhrase(phrase: Partial<Phrase>): ValidationResult {
  const errors: string[] = [];

  if (!phrase.text || !phrase.text.trim()) {
    errors.push('Phrase text is required');
  }

  if (phrase.by !== undefined && typeof phrase.by !== 'string') {
    errors.push('Phrase "by" must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate thread connection data
 */
export function validateThread(thread: Partial<Thread>): ValidationResult {
  const errors: string[] = [];

  if (!thread.from || !thread.from.trim()) {
    errors.push('From node ID is required');
  }

  if (!thread.to || !thread.to.trim()) {
    errors.push('To node ID is required');
  }

  if (thread.from === thread.to) {
    errors.push('From and To must be different nodes');
  }

  if (!thread.threads || !Array.isArray(thread.threads)) {
    errors.push('Threads must be an array');
  } else if (thread.threads.length === 0) {
    errors.push('At least one thread is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
