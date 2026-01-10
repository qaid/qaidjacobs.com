/**
 * Durational routes
 * Handle durational content data files
 */

import { join, resolve } from 'path';
import { existsSync } from 'fs';

const PROJECT_ROOT = resolve(process.cwd());
const DURATIONAL_DIR = join(PROJECT_ROOT, 'content/durational');

export async function getDurational(id: string) {
  try {
    const filePath = join(DURATIONAL_DIR, `${id}.json`);

    if (!existsSync(filePath)) {
      return {
        success: false,
        error: 'Durational data file not found',
      };
    }

    const file = Bun.file(filePath);
    const data = await file.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read durational data';
    return {
      success: false,
      error: message,
    };
  }
}
