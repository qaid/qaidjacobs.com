# qaidjacobs.com

Static site for Qaid Jacobs. Stack: HTML, CSS, vanilla JS. Package manager: Bun. Deployment target: GitHub Pages.

## Getting started

Requirements: [Bun](https://bun.sh/) >= 1.0

Install dependencies (none yet, but locks engine):

```bash
bun install
```

Run a local server:

```bash
bun run dev
```

This uses `bunx serve . --listen 3000` to serve the static files.

## Project layout (initial)
- `index.html` — landing scaffold
- `css/` — variables, base styles, landing styles
- `js/` — main init, landing placeholder logic
- `content/` — placeholder for JSON content (nodes, curiosities, connections, phrases)
- `assets/` — images/audio/logos
- `cms/` — local-only CMS (not deployed)

## Notes
- Keep `/cms/` local-only; exclude from deploys.
- Future steps: implement web layout, navigation overlay, data-driven nodes/threads, CMS API if needed.
