/**
 * Nodes API Routes
 * Handles CRUD operations for all node types
 */

import type { Node } from '../types';
import type { CreateNodeRequest, UpdateNodeRequest, ApiResponse } from '../types';
import {
  readNodeFile,
  writeNodeFile,
  deleteNodeFile,
  listNodeFiles,
  readEssayFile,
  writeEssayFile,
  deleteEssayFile,
  writeCuriosityData,
  deleteCuriosityData,
  writeDurationalData,
  deleteDurationalData,
} from '../services/file-service';
import { validateNode } from '../services/validation';
import { regenerateManifest } from '../services/manifest';
import { commitContentChanges } from '../services/git-service';

/**
 * GET /api/nodes - List all nodes
 */
export async function listNodes(): Promise<ApiResponse<Node[]>> {
  try {
    const files = await listNodeFiles();
    const nodes: Node[] = [];

    for (const file of files) {
      const id = file.replace('.json', '');
      try {
        const node = await readNodeFile(id);
        nodes.push(node);
      } catch (error) {
        console.error(`Failed to read node ${id}:`, error);
      }
    }

    return {
      success: true,
      data: nodes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list nodes';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * GET /api/nodes/:id - Get single node
 */
export async function getNode(id: string): Promise<ApiResponse<Node>> {
  try {
    const node = await readNodeFile(id);
    return {
      success: true,
      data: node,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get node';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * POST /api/nodes - Create new node
 */
export async function createNode(request: CreateNodeRequest): Promise<ApiResponse<{ node: Node; manifest: Node[] }>> {
  try {
    const { node: partialNode, essayContent, curiosityData, durationalData } = request;

    // Ensure required fields have defaults
    const node: Node = {
      ...partialNode,
      id: partialNode.id!,
      title: partialNode.title!,
      type: partialNode.type!,
      threads: partialNode.threads || [],
      visible_on_landing: partialNode.visible_on_landing ?? true,
      x: partialNode.x ?? 50,
      y: partialNode.y ?? 50,
    };

    // Validate node
    const validation = validateNode(node);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Write node file
    await writeNodeFile(node.id, node);

    // Write type-specific content files
    if (node.type === 'essay' && essayContent !== undefined) {
      if (!node.essayFile) {
        throw new Error('essayFile is required for essay nodes');
      }
      await writeEssayFile(node.essayFile, essayContent);
    }

    if (node.type === 'curiosity' && curiosityData) {
      await writeCuriosityData(node.id, {
        id: node.id,
        title: node.title,
        central: curiosityData.central || '',
        connected: curiosityData.connected || [],
        threads: node.threads,
        visible_on_landing: node.visible_on_landing,
      });
    }

    if (node.type === 'durational' && durationalData) {
      await writeDurationalData(node.id, {
        id: node.id,
        title: node.title,
        type: 'durational',
        subtype: durationalData.subtype,
        description: durationalData.description,
        media: durationalData.media!,
        commentary: durationalData.commentary,
        created: node.created,
        threads: node.threads,
      });
    }

    // Regenerate manifest
    const manifest = await regenerateManifest();

    // Commit changes to git
    await commitContentChanges('create', node.type, node.title, node.subtype);

    return {
      success: true,
      data: { node, manifest },
      message: `Node "${node.title}" created successfully`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create node';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * PUT /api/nodes/:id - Update node
 */
export async function updateNode(id: string, request: UpdateNodeRequest): Promise<ApiResponse<{ node: Node; manifest: Node[] }>> {
  try {
    const { node: updates, essayContent, curiosityData, durationalData } = request;

    // Read existing node
    const existingNode = await readNodeFile(id);

    // Merge updates
    const node: Node = {
      ...existingNode,
      ...updates,
      id: existingNode.id, // Don't allow ID changes
    };

    // Validate updated node
    const validation = validateNode(node);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Write updated node file
    await writeNodeFile(node.id, node);

    // Update type-specific content files
    if (node.type === 'essay' && essayContent !== undefined) {
      if (!node.essayFile) {
        throw new Error('essayFile is required for essay nodes');
      }
      await writeEssayFile(node.essayFile, essayContent);
    }

    if (node.type === 'curiosity' && curiosityData) {
      await writeCuriosityData(node.id, {
        id: node.id,
        title: node.title,
        central: curiosityData.central || '',
        connected: curiosityData.connected || [],
        threads: node.threads,
        visible_on_landing: node.visible_on_landing,
      });
    }

    if (node.type === 'durational' && durationalData) {
      await writeDurationalData(node.id, {
        id: node.id,
        title: node.title,
        type: 'durational',
        subtype: durationalData.subtype,
        description: durationalData.description,
        media: durationalData.media!,
        commentary: durationalData.commentary,
        created: node.created,
        threads: node.threads,
      });
    }

    // Regenerate manifest
    const manifest = await regenerateManifest();

    // Commit changes to git
    await commitContentChanges('update', node.type, node.title, node.subtype);

    return {
      success: true,
      data: { node, manifest },
      message: `Node "${node.title}" updated successfully`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update node';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * DELETE /api/nodes/:id - Delete node
 */
export async function deleteNode(id: string): Promise<ApiResponse<{ manifest: Node[]; backups: string[] }>> {
  try {
    // Read node to determine what files to delete
    const node = await readNodeFile(id);
    const backupPaths: string[] = [];

    // Delete node file (with backup)
    const nodeBackup = await deleteNodeFile(id);
    backupPaths.push(nodeBackup.backupPath);

    // Delete type-specific content files
    if (node.type === 'essay' && node.essayFile) {
      try {
        const essayBackup = await deleteEssayFile(node.essayFile);
        backupPaths.push(essayBackup.backupPath);
      } catch (error) {
        console.warn(`Failed to delete essay file ${node.essayFile}:`, error);
      }
    }

    if (node.type === 'curiosity') {
      try {
        const curiosityBackup = await deleteCuriosityData(id);
        backupPaths.push(curiosityBackup.backupPath);
      } catch (error) {
        console.warn(`Failed to delete curiosity data ${id}:`, error);
      }
    }

    if (node.type === 'durational') {
      try {
        const durationalBackup = await deleteDurationalData(id);
        backupPaths.push(durationalBackup.backupPath);
      } catch (error) {
        console.warn(`Failed to delete durational data ${id}:`, error);
      }
    }

    // Regenerate manifest
    const manifest = await regenerateManifest();

    // Commit changes to git
    await commitContentChanges('delete', node.type, node.title);

    return {
      success: true,
      data: { manifest, backups: backupPaths },
      message: `Node "${node.title}" deleted successfully (${backupPaths.length} backup(s) created)`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete node';
    return {
      success: false,
      error: message,
    };
  }
}
