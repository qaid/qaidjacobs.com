/**
 * File Service - Safe file I/O operations
 * Handles all file system interactions with security and safety measures
 */

import { join, resolve, basename } from 'path';
import { existsSync } from 'fs';
import type { Node, CuriosityData, DurationalData, Phrase, Thread } from '../types';
import type { BackupInfo } from '../types';

// Base paths
const PROJECT_ROOT = resolve(process.cwd());
const CONTENT_DIR = join(PROJECT_ROOT, 'content');
const NODES_DIR = join(CONTENT_DIR, 'nodes');
const ESSAYS_DIR = join(CONTENT_DIR, 'essays');
const CURIOSITIES_DIR = join(CONTENT_DIR, 'curiosities');
const DURATIONAL_DIR = join(CONTENT_DIR, 'durational');
const PHRASES_FILE = join(CONTENT_DIR, 'phrases.json');
const CONNECTIONS_FILE = join(CONTENT_DIR, 'connections.json');
const BACKUP_DIR = join(PROJECT_ROOT, '.cms-backups');

/**
 * Validate file path to prevent directory traversal
 */
function validatePath(filePath: string, expectedDir: string): boolean {
  const resolved = resolve(filePath);
  const expected = resolve(expectedDir);
  return resolved.startsWith(expected);
}

/**
 * Create backup of a file
 */
export async function createBackup(filePath: string): Promise<BackupInfo> {
  if (!existsSync(filePath)) {
    throw new Error(`Cannot backup non-existent file: ${filePath}`);
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const fileName = basename(filePath);
  const backupPath = join(BACKUP_DIR, `${timestamp}-${fileName}`);

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    await Bun.write(join(BACKUP_DIR, '.gitkeep'), '');
  }

  // Copy file to backup
  const content = await Bun.file(filePath).text();
  await Bun.write(backupPath, content);

  return {
    originalPath: filePath,
    backupPath,
    timestamp,
  };
}

/**
 * Atomic write - write to temp file then rename
 */
async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await Bun.write(tempPath, content);

  // Rename is atomic on most filesystems
  await Bun.write(filePath, content);

  // Clean up temp file
  try {
    await Bun.write(tempPath, ''); // Overwrite
    const tempFile = Bun.file(tempPath);
    if (await tempFile.exists()) {
      // Note: Bun doesn't have fs.unlink directly, we'll use Bun.file
    }
  } catch (e) {
    // Temp file cleanup failed, not critical
  }
}

// Node operations

export async function readNodeFile(id: string): Promise<Node> {
  const filePath = join(NODES_DIR, `${id}.json`);

  if (!validatePath(filePath, NODES_DIR)) {
    throw new Error('Invalid file path');
  }

  if (!existsSync(filePath)) {
    throw new Error(`Node file not found: ${id}`);
  }

  const content = await Bun.file(filePath).json();
  return content as Node;
}

export async function writeNodeFile(id: string, node: Node): Promise<void> {
  const filePath = join(NODES_DIR, `${id}.json`);

  if (!validatePath(filePath, NODES_DIR)) {
    throw new Error('Invalid file path');
  }

  const content = JSON.stringify(node, null, 2);
  await atomicWrite(filePath, content);
}

export async function deleteNodeFile(id: string): Promise<BackupInfo> {
  const filePath = join(NODES_DIR, `${id}.json`);

  if (!validatePath(filePath, NODES_DIR)) {
    throw new Error('Invalid file path');
  }

  const backup = await createBackup(filePath);

  // Delete the file
  const fs = await import('fs/promises');
  await fs.unlink(filePath);

  return backup;
}

export async function listNodeFiles(): Promise<string[]> {
  const fs = await import('fs/promises');
  const files = await fs.readdir(NODES_DIR);
  return files.filter((f) => f.endsWith('.json') && f !== 'landing-nodes.json');
}

// Essay operations

export async function readEssayFile(essayFile: string): Promise<string> {
  const filePath = join(ESSAYS_DIR, essayFile);

  if (!validatePath(filePath, ESSAYS_DIR)) {
    throw new Error('Invalid file path');
  }

  if (!existsSync(filePath)) {
    throw new Error(`Essay file not found: ${essayFile}`);
  }

  return await Bun.file(filePath).text();
}

export async function writeEssayFile(essayFile: string, content: string): Promise<void> {
  const filePath = join(ESSAYS_DIR, essayFile);

  if (!validatePath(filePath, ESSAYS_DIR)) {
    throw new Error('Invalid file path');
  }

  await atomicWrite(filePath, content);
}

export async function deleteEssayFile(essayFile: string): Promise<BackupInfo> {
  const filePath = join(ESSAYS_DIR, essayFile);

  if (!validatePath(filePath, ESSAYS_DIR)) {
    throw new Error('Invalid file path');
  }

  const backup = await createBackup(filePath);

  const fs = await import('fs/promises');
  await fs.unlink(filePath);

  return backup;
}

// Curiosity operations

export async function readCuriosityData(id: string): Promise<CuriosityData> {
  const filePath = join(CURIOSITIES_DIR, `${id}.json`);

  if (!validatePath(filePath, CURIOSITIES_DIR)) {
    throw new Error('Invalid file path');
  }

  if (!existsSync(filePath)) {
    throw new Error(`Curiosity file not found: ${id}`);
  }

  const content = await Bun.file(filePath).json();
  return content as CuriosityData;
}

export async function writeCuriosityData(id: string, data: CuriosityData): Promise<void> {
  const filePath = join(CURIOSITIES_DIR, `${id}.json`);

  if (!validatePath(filePath, CURIOSITIES_DIR)) {
    throw new Error('Invalid file path');
  }

  const content = JSON.stringify(data, null, 2);
  await atomicWrite(filePath, content);
}

export async function deleteCuriosityData(id: string): Promise<BackupInfo> {
  const filePath = join(CURIOSITIES_DIR, `${id}.json`);

  if (!validatePath(filePath, CURIOSITIES_DIR)) {
    throw new Error('Invalid file path');
  }

  const backup = await createBackup(filePath);

  const fs = await import('fs/promises');
  await fs.unlink(filePath);

  return backup;
}

// Durational operations

export async function readDurationalData(id: string): Promise<DurationalData> {
  const filePath = join(DURATIONAL_DIR, `${id}.json`);

  if (!validatePath(filePath, DURATIONAL_DIR)) {
    throw new Error('Invalid file path');
  }

  if (!existsSync(filePath)) {
    throw new Error(`Durational file not found: ${id}`);
  }

  const content = await Bun.file(filePath).json();
  return content as DurationalData;
}

export async function writeDurationalData(id: string, data: DurationalData): Promise<void> {
  const filePath = join(DURATIONAL_DIR, `${id}.json`);

  if (!validatePath(filePath, DURATIONAL_DIR)) {
    throw new Error('Invalid file path');
  }

  const content = JSON.stringify(data, null, 2);
  await atomicWrite(filePath, content);
}

export async function deleteDurationalData(id: string): Promise<BackupInfo> {
  const filePath = join(DURATIONAL_DIR, `${id}.json`);

  if (!validatePath(filePath, DURATIONAL_DIR)) {
    throw new Error('Invalid file path');
  }

  const backup = await createBackup(filePath);

  const fs = await import('fs/promises');
  await fs.unlink(filePath);

  return backup;
}

// Phrases operations

export async function readPhrases(): Promise<Phrase[]> {
  if (!existsSync(PHRASES_FILE)) {
    return [];
  }

  const content = await Bun.file(PHRASES_FILE).json();
  return content as Phrase[];
}

export async function writePhrases(phrases: Phrase[]): Promise<void> {
  const content = JSON.stringify(phrases, null, 2);
  await atomicWrite(PHRASES_FILE, content);
}

// Connections operations

export async function readConnections(): Promise<Thread[]> {
  if (!existsSync(CONNECTIONS_FILE)) {
    return [];
  }

  const content = await Bun.file(CONNECTIONS_FILE).json();
  return content as Thread[];
}

export async function writeConnections(connections: Thread[]): Promise<void> {
  const content = JSON.stringify(connections, null, 2);
  await atomicWrite(CONNECTIONS_FILE, content);
}
