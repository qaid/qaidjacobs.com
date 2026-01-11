/**
 * Phrases API Routes
 * Handles phrase array management
 */

import type { Phrase, ApiResponse } from '../types';
import { readPhrases, writePhrases } from '../services/file-service';
import { validatePhrase } from '../services/validation';
import { commitContentChanges } from '../services/git-service';

/**
 * GET /api/phrases - Get all phrases
 */
export async function getPhrases(): Promise<ApiResponse<Phrase[]>> {
  try {
    const phrases = await readPhrases();
    return {
      success: true,
      data: phrases,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get phrases';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * PUT /api/phrases - Replace entire phrases array
 */
export async function updatePhrases(phrases: Phrase[]): Promise<ApiResponse<Phrase[]>> {
  try {
    // Validate all phrases
    for (let i = 0; i < phrases.length; i++) {
      const validation = validatePhrase(phrases[i]);
      if (!validation.valid) {
        return {
          success: false,
          error: `Phrase ${i + 1} validation failed: ${validation.errors.join(', ')}`,
        };
      }
    }

    await writePhrases(phrases);

    // Commit changes to git
    await commitContentChanges('update', 'phrases', `${phrases.length} phrases`);

    return {
      success: true,
      data: phrases,
      message: 'Phrases updated successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update phrases';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * POST /api/phrases - Add single phrase
 */
export async function addPhrase(phrase: Phrase): Promise<ApiResponse<Phrase[]>> {
  try {
    const validation = validatePhrase(phrase);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    const phrases = await readPhrases();
    phrases.push(phrase);
    await writePhrases(phrases);

    // Commit changes to git
    const phraseText = phrase.text.substring(0, 50) + (phrase.text.length > 50 ? '...' : '');
    await commitContentChanges('create', 'phrase', phraseText);

    return {
      success: true,
      data: phrases,
      message: 'Phrase added successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add phrase';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * DELETE /api/phrases/:index - Delete phrase by index
 */
export async function deletePhrase(index: number): Promise<ApiResponse<Phrase[]>> {
  try {
    const phrases = await readPhrases();

    if (index < 0 || index >= phrases.length) {
      return {
        success: false,
        error: `Invalid index: ${index}`,
      };
    }

    const deletedPhrase = phrases[index];
    phrases.splice(index, 1);
    await writePhrases(phrases);

    // Commit changes to git
    const phraseText = deletedPhrase.text.substring(0, 50) + (deletedPhrase.text.length > 50 ? '...' : '');
    await commitContentChanges('delete', 'phrase', phraseText);

    return {
      success: true,
      data: phrases,
      message: 'Phrase deleted successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete phrase';
    return {
      success: false,
      error: message,
    };
  }
}
