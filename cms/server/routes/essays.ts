/**
 * Essays API Routes
 * Handles essay markdown content operations
 */

import type { ApiResponse } from '../types';
import { readEssayFile, writeEssayFile } from '../services/file-service';

/**
 * GET /api/essays/:file - Get essay content
 */
export async function getEssay(essayFile: string): Promise<ApiResponse<string>> {
  try {
    const content = await readEssayFile(essayFile);
    return {
      success: true,
      data: content,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get essay';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * PUT /api/essays/:file - Update essay content
 */
export async function updateEssay(essayFile: string, content: string): Promise<ApiResponse<null>> {
  try {
    await writeEssayFile(essayFile, content);
    return {
      success: true,
      message: 'Essay updated successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update essay';
    return {
      success: false,
      error: message,
    };
  }
}
