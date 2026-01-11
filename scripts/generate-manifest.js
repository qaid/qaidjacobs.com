#!/usr/bin/env node

/**
 * Generate nodes manifest from individual node JSON files
 * This script scans content/nodes/ for all .json files (except landing-nodes.json)
 * and generates a consolidated landing-nodes.json manifest
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const NODES_DIR = 'content/nodes';
const NODES_FILE = 'content/nodes/landing-nodes.json';

async function generateManifest() {
  console.log('📦 Generating nodes manifest...');

  try {
    // Read all files in nodes directory
    const files = await readdir(NODES_DIR);
    const nodes = [];

    // Filter for JSON files (excluding the output manifest itself)
    const nodeFiles = files.filter(
      file => file.endsWith('.json') && file !== 'landing-nodes.json'
    );

    console.log(`   Found ${nodeFiles.length} node file(s)`);

    // Load and parse each node file
    for (const file of nodeFiles) {
      const filePath = join(NODES_DIR, file);
      try {
        const content = await readFile(filePath, 'utf-8');
        const node = JSON.parse(content);

        // Validate required fields
        if (!node.id) {
          console.warn(`   ⚠️  ${file}: Missing 'id' field, skipping`);
          continue;
        }

        if (!node.type) {
          console.warn(`   ⚠️  ${file}: Missing 'type' field, skipping`);
          continue;
        }

        // Auto-assign position if not specified
        if (typeof node.x !== 'number' || typeof node.y !== 'number') {
          // Simple distribution: use hash of ID to generate consistent positions
          const hash = node.id.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
          }, 0);

          node.x = ((hash * 37) % 70) + 15; // 15-85 range
          node.y = ((hash * 73) % 60) + 20; // 20-80 range

          console.log(`   ℹ️  ${file}: Auto-assigned position (${node.x}, ${node.y})`);
        }

        // Ensure visible_on_landing defaults to true
        if (typeof node.visible_on_landing !== 'boolean') {
          node.visible_on_landing = true;
        }

        nodes.push(node);
        console.log(`   ✓ ${file}: Loaded "${node.title || node.id}"`);
      } catch (error) {
        console.error(`   ✗ ${file}: Failed to parse - ${error.message}`);
      }
    }

    // Sort nodes by creation date (newest first) or by ID
    nodes.sort((a, b) => {
      if (a.created && b.created) {
        return new Date(b.created) - new Date(a.created);
      }
      return a.id.localeCompare(b.id);
    });

    // Write consolidated manifest
    await writeFile(NODES_FILE, JSON.stringify(nodes, null, 2) + '\n');

    console.log(`✅ Generated manifest with ${nodes.length} node(s)`);
    console.log(`   Output: ${NODES_FILE}`);

  } catch (error) {
    console.error('❌ Failed to generate manifest:', error.message);
    process.exit(1);
  }
}

generateManifest();
