/**
 * Manifest Service
 * Generates consolidated landing-nodes.json from individual node files
 * Ported from scripts/generate-manifest.js
 */

import { join, resolve } from 'path';
import type { Node } from '../types';
import { listNodeFiles, readNodeFile } from './file-service';

const PROJECT_ROOT = resolve(process.cwd());
const OUTPUT_FILE = join(PROJECT_ROOT, 'content/nodes/landing-nodes.json');

/**
 * Generate hash from string for consistent positioning
 */
function hashString(str: string): number {
  return str.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
}

/**
 * Auto-assign position based on node ID hash
 */
function autoAssignPosition(node: Node): Node {
  if (typeof node.x === 'number' && typeof node.y === 'number') {
    return node; // Already has position
  }

  const hash = hashString(node.id);
  const x = ((hash * 37) % 70) + 15; // 15-85 range
  const y = ((hash * 73) % 60) + 20; // 20-80 range

  return {
    ...node,
    x,
    y,
  };
}

/**
 * Regenerate manifest from all individual node files
 */
export async function regenerateManifest(): Promise<Node[]> {
  console.log('[Manifest] Regenerating nodes manifest...');

  try {
    // Get all node files
    const files = await listNodeFiles();
    console.log(`[Manifest] Found ${files.length} node file(s)`);

    const nodes: Node[] = [];

    // Load each node file
    for (const file of files) {
      try {
        const id = file.replace('.json', '');
        const node = await readNodeFile(id);

        // Validate required fields
        if (!node.id) {
          console.warn(`[Manifest] ${file}: Missing 'id' field, skipping`);
          continue;
        }

        if (!node.type) {
          console.warn(`[Manifest] ${file}: Missing 'type' field, skipping`);
          continue;
        }

        // Auto-assign position if needed
        const nodeWithPosition = autoAssignPosition(node);

        // Ensure visible_on_landing defaults to true
        if (typeof nodeWithPosition.visible_on_landing !== 'boolean') {
          nodeWithPosition.visible_on_landing = true;
        }

        nodes.push(nodeWithPosition);
        console.log(`[Manifest] ✓ ${file}: Loaded "${node.title || node.id}"`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Manifest] ✗ ${file}: Failed to load - ${message}`);
      }
    }

    // Sort nodes by creation date (newest first) or by ID
    nodes.sort((a, b) => {
      if (a.created && b.created) {
        const dateA = new Date(a.created).getTime();
        const dateB = new Date(b.created).getTime();
        return dateB - dateA;
      }
      return a.id.localeCompare(b.id);
    });

    // Write consolidated manifest
    const content = JSON.stringify(nodes, null, 2) + '\n';
    await Bun.write(OUTPUT_FILE, content);

    console.log(`[Manifest] ✅ Generated manifest with ${nodes.length} node(s)`);

    return nodes;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Manifest] ❌ Failed to generate manifest: ${message}`);
    throw error;
  }
}
