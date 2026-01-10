/**
 * Curiosity API Routes
 * Handles retrieval of curiosity data files
 */

import type { ApiResponse } from '../types';
import { readCuriosityData } from '../services/file-service';

/**
 * GET /api/curiosity/:id - Get curiosity data
 */
export async function getCuriosity(id: string): Promise<ApiResponse<any>> {
  try {
    const curiosityData = await readCuriosityData(id);
    return {
      success: true,
      data: curiosityData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get curiosity data';
    return {
      success: false,
      error: message,
    };
  }
}
