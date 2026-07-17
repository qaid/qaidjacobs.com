#!/usr/bin/env node

/**
 * Generate crawlable HTML pages and a sitemap from individual node JSON files.
 */

import { mkdir, readFile, readdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';

const NODES_DIR = 'content/nodes';
const ESSAYS_DIR = 'content/essays';
const OUTPUT_DIR = 'node';
const SITEMAP_FILE = 'sitemap.xml';
const SITE_URL = 'https://qaidjacobs.com';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getDescription(node) {
  const description = [node.description, node.commentary].find(
    value => typeof value === 'string' && value.trim()
  );

  return description?.trim()
    || `${node.title || node.id} — part of Qa'id Jacobs' spatial web of essays, DJ mixes, talks, and curiosities.`;
}

async function getBodyContent(node, description) {
  if (node.type !== 'essay') {
    return `<p>${escapeHtml(description)}</p>`;
  }

  if (!node.essayFile) {
    throw new Error(`Essay node "${node.id}" is missing an essayFile`);
  }

  const markdown = await readFile(join(ESSAYS_DIR, node.essayFile), 'utf-8');
  return marked.parse(markdown);
}

function renderPage(node, description, bodyContent) {
  const id = node.id;
  const title = node.title || id;
  const interactiveUrl = `/#/node/${id}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — Qa'id Jacobs</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${SITE_URL}/node/${id}/" />
  <style>
    body { max-width: 48rem; margin: 0 auto; padding: 2rem 1.25rem; color: #242424; font: 1rem/1.65 system-ui, sans-serif; }
    h1, h2, h3 { line-height: 1.2; }
    a { color: #315d8a; }
    .interactive-link { display: inline-block; margin-top: 2rem; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <article>
      ${bodyContent}
    </article>
    <a class="interactive-link" href="${interactiveUrl}">View interactive version</a>
  </main>
  <script>window.location.replace('${interactiveUrl}');</script>
</body>
</html>
`;
}

async function generatePages() {
  console.log('📦 Generating static node pages...');

  try {
    const files = await readdir(NODES_DIR);
    const nodeFiles = files
      .filter(file => file.endsWith('.json') && file !== 'landing-nodes.json')
      .sort();

    console.log(`   Found ${nodeFiles.length} node file(s)`);

    await rm(OUTPUT_DIR, { recursive: true, force: true });
    await mkdir(OUTPUT_DIR, { recursive: true });

    const nodeIds = [];

    for (const file of nodeFiles) {
      const node = JSON.parse(await readFile(join(NODES_DIR, file), 'utf-8'));

      if (!node.id || !/^[a-zA-Z0-9_-]+$/.test(node.id)) {
        throw new Error(`${file}: Missing or invalid 'id' field`);
      }

      // Drafts and bio (a landing hover interaction, not a public container)
      // get no public page or sitemap entry.
      if (node.draft === true || node.type === 'bio') continue;

      const description = getDescription(node);
      const bodyContent = await getBodyContent(node, description);
      const outputDirectory = join(OUTPUT_DIR, node.id);

      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        join(outputDirectory, 'index.html'),
        renderPage(node, description, bodyContent)
      );

      nodeIds.push(node.id);
      console.log(`   ✓ ${file}: Generated ${outputDirectory}/index.html`);
    }

    const urls = ['', ...nodeIds.map(id => `/node/${id}/`)];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(path => `  <url><loc>${SITE_URL}${path || '/'}</loc></url>`).join('\n')}
</urlset>
`;

    await writeFile(SITEMAP_FILE, sitemap);

    console.log(`✅ Generated ${nodeIds.length} page(s) and ${SITEMAP_FILE}`);
  } catch (error) {
    console.error('❌ Failed to generate static pages:', error.message);
    process.exit(1);
  }
}

generatePages();
