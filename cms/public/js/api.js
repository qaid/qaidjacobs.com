/**
 * API Client
 * Centralized HTTP client for all backend communication
 */

const API_BASE = 'http://localhost:3001/api';

/**
 * Generic request handler
 */
async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

/**
 * API methods
 */
export const API = {
  // Nodes
  async getNodes() {
    return request('GET', '/nodes');
  },

  async getNode(id) {
    return request('GET', `/nodes/${id}`);
  },

  async createNode(data) {
    return request('POST', '/nodes', data);
  },

  async updateNode(id, data) {
    return request('PUT', `/nodes/${id}`, data);
  },

  async deleteNode(id) {
    return request('DELETE', `/nodes/${id}`);
  },

  // Essays
  async getEssay(file) {
    return request('GET', `/essays/${file}`);
  },

  async updateEssay(file, content) {
    return request('PUT', `/essays/${file}`, { content });
  },

  // Phrases
  async getPhrases() {
    return request('GET', '/phrases');
  },

  async updatePhrases(phrases) {
    return request('PUT', '/phrases', { phrases });
  },

  async addPhrase(phrase) {
    return request('POST', '/phrases', phrase);
  },

  async deletePhrase(index) {
    return request('DELETE', `/phrases/${index}`);
  },

  // Connections
  async getConnections() {
    return request('GET', '/connections');
  },

  async updateConnections(connections) {
    return request('PUT', '/connections', { connections });
  },

  async addConnection(connection) {
    return request('POST', '/connections', connection);
  },

  async deleteConnection(index) {
    return request('DELETE', `/connections/${index}`);
  },

  // Manifest
  async regenerateManifest() {
    return request('POST', '/manifest/regenerate');
  },
};
