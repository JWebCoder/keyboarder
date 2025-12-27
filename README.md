# Keyboarder

Local-first desktop app (React + Tauri) for designing printable keycap labels and cut sheets for macro pads / programmable keyboards.

## Features
- Paper-accurate canvas with A4/Letter/A3/Tabloid, margins, DPI preview and zoom.
- Keys defined in mm with padding, radius, background color, and stacked elements (text/image/shape) with z-order.
- Templates: quick 3x3/4x4/5x4 grids, row presets, ANSI/ISO 60%, ANSI 104, ISO 105; add/remove keys manually; snap-to-grid and dragging.
- Save/load project JSON created by the app (includes embedded images).
- Drag & drop images onto a selected key (embedded as data URLs for portability).
- Multi-select, batch edits, keyboard shortcuts (undo/redo, delete, arrow nudge).
- Export to scale-accurate PDF (mm -> pt) with optional 50mm test ruler; export SVG for further editing.
- Autosave to local storage; save/load project JSON files.

## Getting started
Requirements: Node 18+, Rust toolchain (for Tauri bundling), and a package manager (npm).

```bash
# install dependencies
npm install

# run the desktop app (Tauri)
npm run dev

# run web-only dev server
npm run dev:web

# production desktop bundle
npm run build

# production web bundle (optional)
npm run build:web
```

> Network is not used at runtime; all assets stay local. Images are embedded into the project JSON as base64.

## Using the editor
- Left sidebar: paper settings, templates, add/clear layout.
- Top bar: save/load project, export PDF/SVG, cut-sheet toggle, theme toggle.
- Canvas: drag keys to position; shift/ctrl-click to multi-select; drag & drop an image onto a selected key to embed it.
- Inspector: tweak size, padding, radius, background; add/edit text or shapes.
- Shortcuts: Delete/Backspace to remove keys, arrows to nudge 1mm, Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for undo/redo.
- Snap toggle + grid size live in the canvas toolbar next to the zoom slider.
- View toggle: switch between the layout view and the cut-sheet view (keys lined in rows to make cutting easier after printing).

## Loading projects
- Use the "Load project" button to open a JSON file created by this app.
- Project files include embedded images so they remain portable across machines.

## Exporting / printing
- PDF export uses true physical dimensions (mm → points). Turn on the 50mm test bar to verify printer scaling; measure after printing—if it’s off, adjust your printer scaling (disable “fit to page”).
- SVG export preserves embedded images and text, so you can refine in a vector editor.
- Cut sheets: export SVG and slice by key in your editor of choice (per-key cut sheet is easy to add if you prefer cells per key).

## Sample projects
- `samples/sample-project.json` – small 2x2 macro pad demo.
- `samples/sample-miryoku.json` – Miryoku layout sample.

## Notes / roadmap ideas
- More alignment guides and rulers on the canvas.
- Per-key cut-sheet mode with crop marks.
- Font picker that lists installed fonts.
- More layout presets and print/cut helpers.
