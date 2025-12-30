# Adding Content to qaidjacobs.com

This guide explains how to add new content to the site. The site supports multiple content types: essays, music, movement pieces, and curiosity maps.

## Quick Start

All content follows the same workflow:
1. Create a node metadata JSON file in `/content/nodes/`
2. (For essays) Create a markdown file in `/content/essays/`
3. Run `npm run dev` - the manifest auto-generates
4. Your content appears on the landing page

## Adding an Essay

### Step 1: Create the Essay Markdown File

Create a new file in `/content/essays/` with your essay content:

**Location:** `/content/essays/your-essay-name.md`

```markdown
# Your Essay Title

Your essay content goes here. Use standard markdown formatting:

- **Bold text**
- *Italic text*
- Lists
- Links
- Blockquotes

## Section Headings

More content...
```

### Step 2: Create the Node Metadata File

Create a JSON file in `/content/nodes/` with metadata about your essay:

**Location:** `/content/nodes/your-essay-id.json`

```json
{
  "id": "your-essay-id",
  "title": "Title shown in navigation tooltip",
  "type": "essay",
  "subtype": "essay",
  "description": "Brief description",
  "threads": ["questions"],
  "essayFile": "your-essay-name.md",
  "created": "2025-12-30",
  "visible_on_landing": true,
  "x": 45,
  "y": 60
}
```

**Field Reference:**

- `id` (required): Unique identifier, should match the filename
- `title` (required): Display name for the essay
- `type` (required): Content type - `"essay"`, `"music"`, `"movement"`, or `"curiosity"`
- `subtype` (required): More specific type
- `threads` (optional): Array of thread types this content belongs to
  - Available threads: `"questions"`, `"movement"`, `"music"`, `"curiosity"`
- `essayFile` (required for essays): The markdown filename
- `created` (optional): Creation date in YYYY-MM-DD format
- `visible_on_landing` (optional): Whether to show on landing page (defaults to `true`)
- `x`, `y` (optional): Position on landing web (0-100). If omitted, auto-generated

### Step 3: Generate the Manifest

Run the build script to generate the consolidated manifest:

```bash
npm run generate-manifest
```

Or simply start the dev server (which auto-runs the script):

```bash
npm run dev
```

### Step 4: Verify

Open the site in your browser and you should see your new essay node on the landing page. Click it to view the essay.

## Auto-Generated Positions

If you don't specify `x` and `y` coordinates, the manifest generator will automatically assign a position based on the content ID. This ensures:

- Consistent positioning (same ID always gets same position)
- No manual coordinate calculation needed
- Reasonable distribution across the landing web

To customize the exact position, simply add `x` and `y` fields (0-100 range) to your node JSON file.

## Thread Types and Colors

Each thread type has an associated color:

- **questions**: Warm yellow/gold
- **movement**: Teal/cyan
- **music**: Pink/rose
- **curiosity**: Blue

Nodes can belong to multiple threads by including multiple values in the `threads` array.

## Adding Other Content Types

The same workflow applies to all content types. Only the node metadata differs.

### Music Content

**Example:** `/content/nodes/my-mix.json`
```json
{
  "id": "my-mix",
  "title": "Summer Vibes 2025",
  "type": "music",
  "subtype": "mix",
  "threads": ["music"],
  "visible_on_landing": true,
  "x": 25,
  "y": 35
}
```

**Subtypes:** `"mix"`, `"sketch"`, `"composition"`

### Movement Content

**Example:** `/content/nodes/my-piece.json`
```json
{
  "id": "my-piece",
  "title": "Durational Work",
  "type": "movement",
  "subtype": "piece",
  "threads": ["movement"],
  "visible_on_landing": true,
  "x": 50,
  "y": 70
}
```

**Subtypes:** `"piece"`, `"study"`, `"improvisation"`

### Curiosity Maps

**Example:** `/content/nodes/my-topic.json`
```json
{
  "id": "my-topic",
  "title": "Topic Exploration",
  "type": "curiosity",
  "subtype": "map",
  "threads": ["questions", "curiosity"],
  "visible_on_landing": true,
  "x": 75,
  "y": 50,
  "is_hub": true
}
```

**Subtypes:** `"map"`, `"thread"`

Set `"is_hub": true` for central topic nodes that branch to multiple related concepts.

## Development Workflow

1. Create node JSON file in `/content/nodes/` (required for all content types)
2. Create content file if needed:
   - Essays: markdown file in `/content/essays/`
   - Music/Movement/Curiosity: containers handle display dynamically
3. Run `npm run dev` (auto-generates manifest)
4. View your content in the browser

The manifest generation happens automatically before the dev server starts, so you never need to manually edit `sample-nodes.json`.

**The system treats all content types equally** - essays, music, movement, and curiosity nodes all appear on the landing page and are discovered automatically.

## Production Build

When deploying to production (GitHub Pages), run:

```bash
npm run build
```

This ensures the manifest is up-to-date before deployment.
