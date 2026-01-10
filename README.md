# qaidjacobs.com

Static site for Qaid Jacobs. Stack: HTML, CSS, vanilla JS. Package manager: Bun. Deployment target: GitHub Pages.

## Getting started

Requirements: [Bun](https://bun.sh/) >= 1.0

Install dependencies (none yet, but locks engine):

```bash
bun install
```

Build the site:

```bash
bun run build
```

This compiles TypeScript sources and generates the manifest.

Run a local server:

```bash
bun run dev
```

This builds the site and serves it on `http://localhost:3000`.

## Project layout (initial)
- `index.html` — landing scaffold
- `css/` — variables, base styles, landing styles
- `js/` — main init, landing placeholder logic
- `content/` — placeholder for JSON content (nodes, curiosities, connections, phrases)
- `assets/` — images/audio/logos
- `cms/` — local-only CMS (not deployed)

## Local Development with CMS

The CMS is a local-only tool for managing site content. It runs separately from the main site.

### Running the CMS

Start the CMS server:

```bash
bun run cms:dev
```

Access the CMS at `http://localhost:3001/cms.html`

### Running both site and CMS simultaneously

```bash
bun run dev:all
```

This starts:
- Main site on `http://localhost:3000`
- CMS on `http://localhost:3001`

### Making content changes

1. Start the CMS: `bun run cms:dev`
2. Open `http://localhost:3001/cms.html` in your browser
3. Edit content through the UI (nodes, essays, curiosities, phrases, connections)
4. Changes are automatically saved to the `content/` directory
5. Commit and push changes to deploy to GitHub Pages

### Content workflow

```bash
# Edit content via CMS UI
# Then commit and push:
git add content/
git commit -m "Update content"
git push origin main

# GitHub Actions will automatically build and deploy
```

## Deployment

The site deploys automatically to GitHub Pages when you push to the `main` branch.

- **Live site**: https://qaidjacobs.com
- **GitHub Pages**: Configured with custom domain
- **Build process**: GitHub Actions workflow (`.github/workflows/deploy.yml`)
- **Deploy time**: 2-5 minutes after push

## Notes

- The `/cms/` directory is local-only and excluded from public deployment
- All content is stored in JSON files in the `content/` directory
- TypeScript sources are in `src/`, compiled output in `js/`
