# ThinAnnotator

A web tool for annotating **thin-section petrology images** — the polarized-light micrographs
geologists use to identify minerals in rock samples.

Drawing mineral grain boundaries by hand is slow and tedious. ThinAnnotator lets you click a
grain and have [Meta's Segment Anything 2](https://github.com/facebookresearch/segment-anything-2)
outline it for you, then correct the result with familiar drawing tools and record what the
mineral actually is.

> **Status:** research software, used in an active petrology workflow. Expect rough edges.

<!--
  Add a screenshot here before publishing:
  ![ThinAnnotator](docs/screenshot.png)
-->

---

## What it does

**Segment with help from a model**
- Click a point on a grain and SAM proposes an outline; click again to add or subtract regions
- Drag a box around a grain as an alternative prompt
- Select **SLIC superpixels** — the image is pre-segmented into small patches you click to keep
  or drop, which works well on grains with fuzzy edges

**Correct it by hand**
- Freeform brush and polygon lasso, either adding to a region or cutting holes in it
- A refine mode with a brush and eraser for pixel-level touch-ups
- Anchor mode turns a finished outline into draggable vertices

**Record the geology, not just the pixels**
- Three ranked mineral hypotheses per region, from a configurable mineral list
- Optical properties: relief, birefringence, cleavage, pleochroism, crystal system,
  extinction angle, observed colour, free-text notes

**Work comfortably on large images**
- Zoom, pan, and a minimap for navigating high-resolution scans
- Switch between lighting modalities (PPL, XPL, …) and gamma variants of the same field of view
  while your annotations stay in place
- Undo/redo across everything, autosaved drafts, French and English interfaces

---

## How a session goes

One **task** is one field of view: the folder of lighting variants for it, the regions you draw,
and the mineral data you record. You open a task, work on it, and finish it.

1. **Prepare a folder** of images for one field of view (see the layout below)
2. **Open it** — the app lists the lighting variants it found
3. **Annotate** — one region per mineral grain, naming each one and filling in its properties
4. **Export** — a JSON file with RLE mask segmentations plus your mineral data

Work is saved as you go: **Save draft** keeps a task to resume later, **Export** writes the final
annotation for the current image.

### Expected folder layout

Point the app at the **FOV folder**. Its parent folder is treated as the thin-section name.

```
<thin-section>/
└── <FOV>/
    ├── sample01_mod-PPL_comp-na_rot-45.png
    ├── sample01_mod-XPL_comp-na_rot-45.png
    └── sample01_mod-XPL_comp-add_rot-45.png
```

File names follow `<prefix>_mod-<MOD>_comp-<COMP>_rot-<deg>.<ext>`:

| Part | Meaning |
|---|---|
| `mod` | `PPL` plane polarized · `XPL` cross polarized · `RL` reflected · `FL` fluorescence · `TR` transmitted |
| `comp` | `add` (+λ) · `sous` (−λ) · `na` (no compensator) |
| `rot` | stage rotation in degrees |
| `prefix` | free text, ignored by the importer |

Accepted formats: `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`, `.bmp`.
Keep the rotation value consistent across all images in one FOV folder.

---

## Running it

### You will need

- **Node 18+** (the Docker image uses 22.9) and **Yarn**
- **The companion backend** — a Python service that runs SAM 2 and SLIC and serves the image
  files. The frontend expects it at `http://localhost:7263`.

### Install and start

```bash
yarn install
yarn relay      # generate Relay artifacts from the GraphQL schema
yarn dev        # start the dev server
```

Then open the URL Vite prints, and click **Open folder**.

Other commands:

```bash
yarn build      # typecheck + production build
yarn lint       # eslint
yarn preview    # serve the production build
```

Re-run `yarn relay` whenever you add or change a GraphQL query or mutation.

### Configuration

Backend URLs live in `src/app/AppConfig.tsx`. All three currently point at the same service:

```ts
export const IMAGE_API_ENDPOINT = 'http://localhost:7263';
```

The mineral list and optical-property options are data, not code — see
`src/data/annotation-options.json`. The backend can override them at runtime via
`GET /api/annotation-options`, so you can adapt the vocabulary to your own petrology
without touching the source.

Language (French/English) is chosen in the app, under the gear icon at the bottom of the
toolbar, and remembered between sessions.

### Docker

`frontend.Dockerfile` builds the bundle and serves it with nginx. You still need the backend
running separately.

---

## Keyboard shortcuts

Press <kbd>?</kbd> in the app for this list at any time.

| Key | Action |
|---|---|
| <kbd>V</kbd> | Pointer — click without drawing |
| <kbd>S</kbd> / <kbd>X</kbd> | SAM positive / negative point |
| <kbd>B</kbd> | SAM bounding box |
| <kbd>P</kbd> / <kbd>F</kbd> | Polygon lasso / freeform draw |
| <kbd>L</kbd> | SLIC superpixels |
| <kbd>G</kbd> | Pan (or hold the middle mouse button) |
| <kbd>+</kbd> / <kbd>−</kbd> | Zoom in / out |
| <kbd>M</kbd> / <kbd>H</kbd> | Toggle minimap / cursor position |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>Z</kbd> | Undo / redo |
| <kbd>Esc</kbd> | Cancel the drawing in progress |
| <kbd>Backspace</kbd> | Remove the last polygon vertex |
| <kbd>Delete</kbd> | Delete the selected object |

---

## Export format

Exporting the current image produces COCO-flavoured JSON:

```jsonc
{
  "metadata": { "lightning_modality": "XPL", "gamma": "na", "rotation": 45 },
  "license":  { "name": "Attribution-NonCommercial", "url": "…" },
  "image":    { "file_name": "sample01_mod-XPL…png", "width": 4096, "height": 3072 },
  "annotations": [
    {
      "id": 1723650000000,
      "segmentation": { "counts": "…", "size": [3072, 4096] },  // RLE
      "mineralIds": ["quartz", "feldspath", "calcite"],          // ranked hypotheses
      "relief": "low", "birefringence": "high", "…": "…"
    }
  ]
}
```

Work in progress is also autosaved to browser storage, so a reload offers to restore it.

---

## Project layout

```
src/
├── canvas/       annotation engine — plain TypeScript, no React
├── common/       React UI: toolbar, annotation panel, overlays, modals
├── app/          Jotai state, undo/redo history, config
├── lib/services/ REST access: one folder per resource (dto → mappers → service → hooks)
├── i18n/         translation dictionary (fr / en)
├── graphql/      Relay environment and fetching (GraphQL only)
└── pages/        home (folder picker) and annotator routes
```

All annotation rendering happens on `<canvas>` — there are no DOM elements per annotation.
See [CLAUDE.md](CLAUDE.md) for the architecture in depth.

---

## Contributing

Contributions are welcome. Before opening a PR:

```bash
yarn build && yarn lint
```

[CLAUDE.md](CLAUDE.md) documents the architecture, conventions, and the handful of invariants
that are easy to break by accident — worth reading before a first change. It's written for both
human contributors and AI coding assistants.

UI strings are always added to `src/i18n/index.ts` in both languages, never hardcoded.

---

## Credits and licensing

Built on top of Meta's [Segment Anything 2](https://github.com/facebookresearch/segment-anything-2)
demo application; parts of this codebase are derived from it and carry Meta's Apache 2.0
copyright headers. SLIC superpixels come from
[scikit-image](https://scikit-image.org/docs/stable/api/skimage.segmentation.html#skimage.segmentation.slic).

> **Before publishing:** this repository has no `LICENSE` file yet. Given the Apache-2.0 headers
> inherited from the SAM 2 demo, adding `LICENSE` (Apache-2.0) plus a `NOTICE` crediting Meta is
> the straightforward path. Worth confirming with your institution first.

Developed for petrology research at UQAC.
