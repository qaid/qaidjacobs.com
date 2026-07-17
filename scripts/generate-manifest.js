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
const CONNECTIONS_FILE = 'content/connections.json';

/**
 * Validate that every connection references a node that exists.
 * A dangling reference means the web silently drops a thread at runtime,
 * so this fails the build loudly rather than shipping a broken web.
 */
async function validateConnections(nodeIds) {
  let raw;
  try {
    raw = await readFile(CONNECTIONS_FILE, 'utf-8');
  } catch {
    console.warn(`   ⚠️  No ${CONNECTIONS_FILE} found — skipping connection validation`);
    return;
  }

  let connections;
  try {
    connections = JSON.parse(raw);
  } catch (error) {
    console.error(`\n❌ ${CONNECTIONS_FILE} is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  const known = new Set(nodeIds);
  const problems = [];

  connections.forEach((conn, i) => {
    for (const end of ['from', 'to']) {
      if (!known.has(conn[end])) {
        problems.push(`   ✗ connection #${i} references unknown node "${conn[end]}" (${conn.from} → ${conn.to})`);
      }
    }
  });

  if (problems.length > 0) {
    console.error('\n❌❌❌ BROKEN CONNECTIONS — the web will not render ❌❌❌');
    problems.forEach((p) => console.error(p));
    console.error(`\n   ${problems.length} bad reference(s). Fix ${CONNECTIONS_FILE} to point at real node IDs:`);
    console.error(`   Known node IDs: ${[...known].sort().join(', ')}\n`);
    process.exit(1);
  }

  console.log(`   ✓ connections.json: ${connections.length} connection(s), all references valid`);
}

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

        // Preserve authored positions for a stable, thread-balanced layout.
        // Only randomize when a node ships without coordinates.
        if (typeof node.x !== 'number' || typeof node.y !== 'number') {
          node.x = Math.floor(Math.random() * 80) + 10; // 10-90 range
          node.y = Math.floor(Math.random() * 60) + 15; // 15-75 range
          console.log(`   🎲 ${file}: No position authored, randomized (${node.x}, ${node.y})`);
        } else {
          console.log(`   📍 ${file}: Position (${node.x}, ${node.y})`);
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

    // Validate connections against the nodes that will actually render.
    await validateConnections(nodes.map((n) => n.id));

  } catch (error) {
    console.error('❌ Failed to generate manifest:', error.message);
    process.exit(1);
  }
}

generateManifest();
