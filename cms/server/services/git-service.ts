/**
 * Git Service
 * Handles automatic git commits for CMS content changes
 */

import { resolve } from 'path';
import { spawn } from 'bun';

const PROJECT_ROOT = resolve(process.cwd());

/**
 * Execute a git command
 */
async function execGit(args: string[]): Promise<{ success: boolean; output: string }> {
  try {
    const proc = spawn({
      cmd: ['git', ...args],
      cwd: PROJECT_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const error = await new Response(proc.stderr).text();
    await proc.exited;

    const success = proc.exitCode === 0;
    return { success, output: output || error };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, output: message };
  }
}

/**
 * Check if git is available
 */
export async function isGitAvailable(): Promise<boolean> {
  const result = await execGit(['--version']);
  return result.success;
}

/**
 * Check if there are uncommitted changes in the content directory
 */
export async function hasUncommittedChanges(): Promise<boolean> {
  const result = await execGit(['diff', '--quiet', 'content/']);
  // git diff --quiet returns exit code 1 if there are changes
  return !result.success;
}

/**
 * Generate a commit message based on operation type
 */
function generateCommitMessage(
  operation: 'create' | 'update' | 'delete',
  contentType: string,
  title: string
): string {
  const action = operation === 'create' ? 'Add' : operation === 'update' ? 'Update' : 'Delete';
  return `${action} ${contentType}: ${title}`;
}

/**
 * Get readable content type name
 */
function getReadableContentType(type: string, subtype?: string): string {
  // For durational content, use subtype if available
  if (type === 'durational' && subtype) {
    return subtype === 'dj-mix' ? 'mix' : subtype;
  }
  return type;
}

/**
 * Commit content changes to git
 *
 * @param operation - The type of operation (create, update, delete)
 * @param contentType - The type of content (essay, podcast, etc.)
 * @param title - The title or identifier of the content
 * @param subtype - Optional subtype for durational content
 */
export async function commitContentChanges(
  operation: 'create' | 'update' | 'delete',
  contentType: string,
  title: string,
  subtype?: string
): Promise<void> {
  try {
    // Check if git is available
    const gitAvailable = await isGitAvailable();
    if (!gitAvailable) {
      console.log('[Git] Git not available, skipping commit');
      return;
    }

    // Check if there are changes to commit
    const hasChanges = await hasUncommittedChanges();
    if (!hasChanges) {
      console.log('[Git] No changes detected, skipping commit');
      return;
    }

    // Stage content changes
    const addResult = await execGit(['add', 'content/']);
    if (!addResult.success) {
      console.error('[Git] Failed to stage changes:', addResult.output);
      return;
    }

    // Generate commit message
    const readableType = getReadableContentType(contentType, subtype);
    const message = generateCommitMessage(operation, readableType, title);

    // Commit changes
    const commitResult = await execGit(['commit', '-m', message]);
    if (!commitResult.success) {
      console.error('[Git] Failed to commit changes:', commitResult.output);
      return;
    }

    console.log(`[Git] ✓ Committed: ${message}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Git] Error during commit:', message);
    // Don't throw - allow content save to succeed even if git commit fails
  }
}
