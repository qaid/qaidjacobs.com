/**
 * CMS Backend Server
 * Bun HTTP server providing API and static file serving
 */

import { join, resolve } from 'path';
import { existsSync } from 'fs';

// Import route handlers
import { listNodes, getNode, createNode, updateNode, deleteNode } from './routes/nodes';
import { getEssay, updateEssay } from './routes/essays';
import { getPhrases, updatePhrases, addPhrase, deletePhrase } from './routes/phrases';
import { getConnections, updateConnections, addConnection, deleteConnection } from './routes/connections';
import { getCuriosity } from './routes/curiosities';
import { getDurational } from './routes/durational';
import { regenerateManifest } from './services/manifest';

const PORT = process.env.CMS_PORT ? parseInt(process.env.CMS_PORT) : 3001;
const PROJECT_ROOT = resolve(process.cwd());
const PUBLIC_DIR = join(PROJECT_ROOT, 'cms/public');

/**
 * Serve static files from cms/public
 */
async function serveStaticFile(pathname: string): Promise<Response> {
  // Default to cms.html for root
  if (pathname === '/' || pathname === '') {
    pathname = '/cms.html';
  }

  const filePath = join(PUBLIC_DIR, pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!existsSync(filePath)) {
    return new Response('Not Found', { status: 404 });
  }

  const file = Bun.file(filePath);

  // Determine content type
  let contentType = 'text/plain';
  if (pathname.endsWith('.html')) contentType = 'text/html';
  else if (pathname.endsWith('.css')) contentType = 'text/css';
  else if (pathname.endsWith('.js')) contentType = 'application/javascript';
  else if (pathname.endsWith('.json')) contentType = 'application/json';

  return new Response(file, {
    headers: {
      'Content-Type': contentType,
    },
  });
}

/**
 * Handle API routes
 */
async function handleAPIRoute(req: Request, url: URL): Promise<Response> {
  const { pathname } = url;
  const method = req.method;

  // CORS headers for localhost
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Health check endpoint
    if (pathname === '/api/health' && method === 'GET') {
      const health = {
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
      return new Response(JSON.stringify(health), { headers: corsHeaders });
    }

    // Nodes routes
    if (pathname === '/api/nodes' && method === 'GET') {
      const result = await listNodes();
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/nodes/') && method === 'GET') {
      const id = pathname.replace('/api/nodes/', '');
      const result = await getNode(id);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname === '/api/nodes' && method === 'POST') {
      const body = await req.json();
      const result = await createNode(body);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/nodes/') && method === 'PUT') {
      const id = pathname.replace('/api/nodes/', '');
      const body = await req.json();
      const result = await updateNode(id, body);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/nodes/') && method === 'DELETE') {
      const id = pathname.replace('/api/nodes/', '');
      const result = await deleteNode(id);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Essays routes
    if (pathname.startsWith('/api/essays/') && method === 'GET') {
      const essayFile = pathname.replace('/api/essays/', '');
      const result = await getEssay(essayFile);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/essays/') && method === 'PUT') {
      const essayFile = pathname.replace('/api/essays/', '');
      const body = await req.json();
      const result = await updateEssay(essayFile, body.content);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Curiosity routes
    if (pathname.startsWith('/api/curiosity/') && method === 'GET') {
      const curiosityId = pathname.replace('/api/curiosity/', '');
      const result = await getCuriosity(curiosityId);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Durational routes
    if (pathname.startsWith('/api/durational/') && method === 'GET') {
      const durationalId = pathname.replace('/api/durational/', '');
      const result = await getDurational(durationalId);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Phrases routes
    if (pathname === '/api/phrases' && method === 'GET') {
      const result = await getPhrases();
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname === '/api/phrases' && method === 'PUT') {
      const body = await req.json();
      const result = await updatePhrases(body.phrases);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname === '/api/phrases' && method === 'POST') {
      const body = await req.json();
      const result = await addPhrase(body.phrase);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/phrases/') && method === 'DELETE') {
      const index = parseInt(pathname.replace('/api/phrases/', ''));
      const result = await deletePhrase(index);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Connections routes
    if (pathname === '/api/connections' && method === 'GET') {
      const result = await getConnections();
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname === '/api/connections' && method === 'PUT') {
      const body = await req.json();
      const result = await updateConnections(body.connections);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname === '/api/connections' && method === 'POST') {
      const body = await req.json();
      const result = await addConnection(body.connection);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/connections/') && method === 'DELETE') {
      const index = parseInt(pathname.replace('/api/connections/', ''));
      const result = await deleteConnection(index);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Manifest route
    if (pathname === '/api/manifest/regenerate' && method === 'POST') {
      const manifest = await regenerateManifest();
      return new Response(JSON.stringify({ success: true, data: manifest }), { headers: corsHeaders });
    }

    // Route not found
    return new Response(JSON.stringify({ success: false, error: 'Route not found' }), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * Main request handler
 */
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPIRoute(req, url);
    }

    // Serve static CMS files
    return serveStaticFile(url.pathname);
  },
});

console.log(`\n🚀 CMS Server running on http://localhost:${PORT}`);
console.log(`   Access CMS at: http://localhost:${PORT}/cms.html`);
console.log(`   API available at: http://localhost:${PORT}/api/*\n`);
