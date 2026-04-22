# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Nuxt dev server (the only command in the README; everything else below is from `package.json`)
- `npm run build` — production build (server + client). This is the deploy target on Vercel because the Notepad needs the `server/api/notepad.*` Nitro routes; `npm run generate` would emit a static-only build with no API.
- `npm run generate` — static site generation. Do not use for production deploys while the Notepad's encrypted-blob backend is in place.
- `npm run preview` — preview the built output

There is no test runner, linter, or formatter configured.

## Architecture

This is a **single-page Nuxt 3 app** that renders a Windows 95-style desktop as a personal portfolio. There is no `pages/` directory — `app.vue` is the entire shell. Routing is replaced by an in-memory window manager.

### The window manager (the core abstraction)

Every "app" on the desktop is a window declared as a data entry in `stores/windows.js` (Pinia store `useWindowsStore`). The store owns:

- `windows[]` — declarative window definitions (id, display name, default position, icon, padding, which shell + content components to use, visibility flags for taskbar/grid)
- `activeWindow` / `activeWindows[]` — focus tracking
- `zIndex` — monotonically incremented; `zIndexIncrement(id)` mutates the live DOM node's `style.zIndex` to bring a window forward
- `setWindowState({ windowState, windowId })` — the only correct way to open/close/minimize. It also handles focus and z-index side effects via queued `setTimeout(..., 0)` calls; preserve that pattern when extending it

`app.vue` reads `windows[]` and renders each entry through a two-level dynamic-component lookup:

1. **Shell** — `windowComponents` array in `app.vue` maps a string (`window` | `ImagePreviewWindow` | `FilesWindow`) to a component in `templates/`. The shell handles the chrome (title bar, drag, resize, min/max/close buttons).
2. **Content** — `slotViews` array maps a string (`bio` | `resume`) to a component in `views/`. The content is injected into the shell's named `<slot name="content">`.

**To add a new window**: add a new object to `windows[]` in the store, and — if it uses a new content component — register that component in `slotViews` in `app.vue`. Both name strings must match exactly.

### Drag, resize, fullscreen

`templates/Window.vue` wires up [interactjs](https://interactjs.io/) on mount:

- Drag handle is `#top-bar`; movement is restricted to the `#screen` container
- Resize edges are left/right/bottom only (top is locked because it's the drag handle); min size is 400×400
- Fullscreen toggle stashes the previous translate in `tempPosition` so restoring returns the window to where the user left it
- Active-window focus is set on `dragmove` (not `dragstart`) so a single click without drag doesn't steal focus from a click handler

### Asset loading

Window icons live in `assets/win95Icons/` and are resolved at build time via `import.meta.glob('../assets/win95Icons/*', { eager: true })` inside both `Window.vue` and `AppGrid.vue`. New icons referenced by name in the store will work without further wiring as long as the filename matches `iconImage`.

### Styling

Two systems coexist intentionally:

- **Tailwind** (configured in `tailwind.config.js` + `nuxt.config.ts` PostCSS) — used inside content views (`views/Bio.vue`, etc.) for typography and layout
- **Hand-written CSS** under `assets/css/windows/` (`app.css`, `window.css`, `appgrid.css`) plus scoped `<style>` blocks in templates — used for the Win95 chrome (bevels, scrollbar styling, fonts)

`vite.build.cssCodeSplit: false` in `nuxt.config.ts` is deliberate so the chrome CSS is in one bundle and the desktop renders without flashes.

The `MS Sans Serif` font is loaded from `assets/fonts/` via `@font-face` in `app.vue`.

### SEO / persona content

The page title, meta description, and Person JSON-LD live in `app.vue` (the JSON-LD is in the legacy `<script>` `data()` block alongside the `<script setup>`). The downloadable résumé (`public/files/Prakash_Chand_Resume.{html,pdf}`) and `person-schema.json` are linked from `views/Bio.vue` and must stay in `public/` to be served at their literal paths.

### Notepad backend

`views/Notepad.vue` persists its content as an encrypted blob in Upstash Redis via two Nitro routes: `server/api/notepad.get.ts` and `server/api/notepad.put.ts`. The server only ever sees ciphertext — AES-GCM encryption and slot-ID derivation both happen in the browser using PBKDF2 over the password (separate salts for the encryption key, the verify challenge, and the storage slot ID). Storage requires the `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars (auto-injected by the Vercel ↔ Upstash Marketplace integration; pull locally with `vercel env pull .env.local`).
