# Plan: Host Observer Tool on GitHub Gist

## Context

The Observer Tool is a React+Vite web app (~1,364 LoC across 6 source files) that stress-tests problem/solution framing through 4 adversarial lenses. The user wants to host it as a GitHub Gist — a single shareable URL that anyone can open and use.

**Challenge**: The app currently requires `npm install` + `vite dev` with a server-side API proxy. GitHub Gist serves raw files, not runnable apps. We need to convert everything into a **single `index.html`** file that works when opened directly.

## Approach: Single-file HTML with Babel Standalone

Create one `index.html` file that:
- Loads React 18 + Babel Standalone from CDN (so JSX works without a build step)
- Inlines all CSS from `src/index.css`
- Consolidates all 6 source files into one `<script type="text/babel">` block
- Replaces the Vite API proxy with direct browser calls to `api.anthropic.com`
- Adds a simple API key input (stored in localStorage) since there's no server

### Files to create
- **`/home/user/observer-tool/index.gist.html`** — the single-file gist version

### Source files to consolidate (in dependency order)
1. `src/index.css` (93 lines) → inlined into `<style>`
2. `src/quadrants.js` (151 lines) → `QDEFS`, `buildPrompt`, `parseResponse`, `buildRefinementUserContent`
3. `src/api.js` (26 lines) → rewritten for direct browser API calls
4. `src/DepthControls.jsx` (100 lines) → `DepthPicker`, `DepthDiagram`, `DepthControls`
5. `src/QuadrantCard.jsx` (690 lines) → all sub-components + `QuadrantCard`
6. `src/App.jsx` (299 lines) → `ConvergenceBar`, `App` (+ new `ApiKeySettings` integration)
7. `src/main.jsx` (10 lines) → `ReactDOM.createRoot(...).render(...)`

### Key changes

**1. HTML shell**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Observer Tool — 4-Direction Analysis</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>/* all index.css inlined */</style>
</head>
<body>
  <div id="root">Loading…</div>
  <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <script type="text/babel">
    const { useState, useEffect } = React
    // ... all app code ...
  </script>
</body>
</html>
```

**2. API client rewrite** (`callClaude`)
- URL: `https://api.anthropic.com/v1/messages` (direct, no proxy)
- Headers: add `x-api-key` from localStorage, `anthropic-dangerous-direct-browser-access: true`
- Read key via `localStorage.getItem('observer_api_key')`

**3. API Key Settings component** (new, ~40 lines)
- Modal overlay shown when no key in localStorage
- Text input + Save button
- Gear icon in header to reopen settings
- Note: "Key stored only in this browser's localStorage"

**4. Strip all imports/exports**
- Remove all `import` and `export` statements
- Functions are declared sequentially in one scope — order matters (helpers before consumers)
- Destructure hooks once at top: `const { useState, useEffect } = React`

## Serving the Gist

GitHub Gist raw URLs serve with `text/plain` MIME type, so browsers won't render HTML directly. Options:
- **https://gist.githack.com** — paste gist URL, get rendered HTML link
- **bl.ocks.org** — classic gist renderer
- Or just download and open locally

Document this in a comment at the top of the HTML file.

## Trade-offs
- Babel Standalone adds ~800KB load (one-time), but API call latency dwarfs this
- Users must enter their own Anthropic API key (no server to hide it behind)
- JSX stays readable in the gist (vs pre-compiling to createElement)

## Verification

1. Open `index.gist.html` directly in a browser (file://)
2. Enter an Anthropic API key in the settings modal
3. Type a problem + solution, click Analyze
4. Verify all 4 lenses load and render with the graph visualization
5. Test node expansion, feedback, correction input, and refinement loop
6. Test dark mode (system preference)
7. Verify key persists across page reload
8. Create a GitHub Gist and test via gist.githack.com
