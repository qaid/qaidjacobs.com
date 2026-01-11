/**
 * Connections API Routes
 * Handles thread connections management
 */

import type { Thread, ApiResponse } from '../types';
import { readConnections, writeConnections } from '../services/file-service';
import { validateThread } from '../services/validation';
import { commitContentChanges } from '../services/git-service';

/**
 * GET /api/connections - Get all connections
 */
export async function getConnections(): Promise<ApiResponse<Thread[]>> {
  try {
    const connections = await readConnections();
    return {
      success: true,
      data: connections,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get connections';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * PUT /api/connections - Replace entire connections array
 */
export async function updateConnections(connections: Thread[]): Promise<ApiResponse<Thread[]>> {
  try {
    // Validate all connections
    for (let i = 0; i < connections.length; i++) {
      const validation = validateThread(connections[i]);
      if (!validation.valid) {
        return {
          success: false,
          error: `Connection ${i + 1} validation failed: ${validation.errors.join(', ')}`,
        };
      }
    }

    await writeConnections(connections);

    // Commit changes to git
    await commitContentChanges('update', 'connections', `${connections.length} connections`);

    return {
      success: true,
      data: connections,
      message: 'Connections updated successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update connections';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * POST /api/connections - Add single connection
 */
export async function addConnection(connection: Thread): Promise<ApiResponse<Thread[]>> {
  try {
    const validation = validateThread(connection);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    const connections = await readConnections();
    connections.push(connection);
    await writeConnections(connections);

    // Commit changes to git
    const connectionTitle = `${connection.from} → ${connection.to}`;
    await commitContentChanges('create', 'connection', connectionTitle);

    return {
      success: true,
      data: connections,
      message: 'Connection added successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add connection';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * DELETE /api/connections/:index - Delete connection by index
 */
export async function deleteConnection(index: number): Promise<ApiResponse<Thread[]>> {
  try {
    const connections = await readConnections();

    if (index < 0 || index >= connections.length) {
      return {
        success: false,
        error: `Invalid index: ${index}`,
      };
    }

    const deletedConnection = connections[index];
    connections.splice(index, 1);
    await writeConnections(connections);

    // Commit changes to git
    const connectionTitle = `${deletedConnection.from} → ${deletedConnection.to}`;
    await commitContentChanges('delete', 'connection', connectionTitle);

    return {
      success: true,
      data: connections,
      message: 'Connection deleted successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete connection';
    return {
      success: false,
      error: message,
    };
  }
}
