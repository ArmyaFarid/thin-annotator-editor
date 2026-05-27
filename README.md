# Petrology Annotator

A web-based annotation tool for polarized-light microscopy images (thin-section petrology). Supports SAM-assisted segmentation, bounding boxes, keypoints, polygon lasso, freeform drawing, SLIC superpixel selection, and a brush-based refine workflow.

UI is in French. All new code is in English.

## Tech stack

- **Vite + React 18 + TypeScript**
- **Jotai** for state (no Redux, no Zustand)
- **Relay** for GraphQL (`react-relay` + `relay-runtime`)
- **Tailwind CSS** + shadcn-style utilities
- **Canvas 2D** for all annotation rendering (no SVG, no WebGL)
- **`@heroicons/react`** and **`@carbon/icons-react`** for icons
- Backend: separate Python service exposing SAM2 + SLIC via GraphQL

## Running locally

```bash
yarn install
yarn relay      # generate Relay artifacts from schemas/
yarn dev        # vite dev server
yarn build      # tsc && vite build
yarn lint
```

`yarn relay` must run whenever you add or change a GraphQL query/mutation in component source. Generated artifacts live next to the consumer in `__generated__/` directories.

## High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│ React tree (Jotai atoms hold state, Relay handles GraphQL)   │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ Toolbar       — tool selection, undo/redo                 ││
│ │ ImageEditor   — image loading, SAM/SLIC mutations         ││
│ │ ┌─────────────────────────────────────────────────────┐   ││
│ │ │ CanvasStack — host for the annotation canvases      │   ││
│ │ │  ↓ owns                                             │   ││
│ │ │ CanvasEngine — vanilla TS class, NO React/JSX       │   ││
│ │ │   ├── DataLayer    (committed annotations)          │   ││
│ │ │   ├── DynamicLayer (in-progress drawing + overlays) │   ││
│ │ │   ├── ToolManager  (current tool, dispatches input) │   ││
│ │ │   └── ObjectEditor (vertex drag, delete buttons)    │   ││
│ │ └─────────────────────────────────────────────────────┘   ││
│ │ MaskList, MaskEditTools, RefineOverlay, SlicOverlay       ││
│ └───────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**React owns chrome and atoms. The canvas engine is plain TypeScript classes with no React or JSX inside.** Annotations are pure canvas rendering — no DOM overlays per object.

## Source layout

```
src/
├── app/
│   ├── atom.ts          ← all Jotai atoms (prompts, masks, currentMask, view, etc.)
│   ├── history.ts       ← undo/redo (see Undo/redo below)
│   ├── types.ts         ← Tool type and other top-level types
│   └── AppConfig.tsx    ← tool list + global config
│
├── canvas/                 ← annotation rendering engine (vanilla TS)
│   ├── CanvasEngine.ts     ← coordinates layers + tools, handles mouse events
│   ├── CanvasStack.tsx     ← React host that mounts the engine
│   ├── ToolManager.ts      ← routes mouse events to the active tool
│   ├── ObjectEditor.ts     ← editor handles (vertex drag, delete) for active mask
│   ├── canvas-theme.ts     ← SINGLE source of truth for every visual constant
│   ├── Minimap.tsx         ← viewport rectangle on a small image preview
│   ├── ShortcutPanel.tsx   ← `?` overlay listing keybindings
│   ├── shortcuts.ts        ← tool + UI shortcut tables
│   ├── annotations/        ← per-type annotation classes
│   │   ├── BoundingBox.ts
│   │   ├── Keypoint.ts
│   │   ├── Polygon.ts
│   │   ├── FreeformPath.ts
│   │   └── Mask.ts
│   ├── tools/              ← input handlers per tool
│   │   ├── KeypointTool.ts
│   │   ├── BoundingBoxTool.ts
│   │   ├── SlicBboxTool.ts
│   │   ├── PolygonLassoTool.ts
│   │   └── FreeformDrawTool.ts
│   ├── layers/
│   │   ├── DataLayer.ts    ← redraws on state change (masks, prompts)
│   │   └── DynamicLayer.ts ← rAF loop, in-progress previews + overlay HUD
│   └── utils/              ← coord conversion, polygon utils, mask merge, etc.
│
├── common/components/
│   ├── annotator-toolbar/Toolbar.tsx           ← left vertical toolbar
│   ├── image/editor/
│   │   ├── ImageEditor.tsx                     ← top-level editor, SAM/SLIC mutations
│   │   ├── refine/RefineOverlay.tsx            ← brush refine modal
│   │   └── slic/SlicOverlay.tsx                ← SLIC superpixel selection modal
│   └── annotation-panel/MaskEditTools.tsx
│
├── graphql/                ← Relay infrastructure ONLY (no operations)
│   ├── RelayEnvironment.ts
│   ├── RelayEnvironmentProvider.tsx
│   └── fetchGraphQL.ts
│
└── jscocotools/mask.ts     ← RLE decode/encode (DO NOT MODIFY)
```

## Canvas architecture (the load-bearing design)

The annotation canvas uses a **viewport-sized backing store with the view transform applied inside `ctx.setTransform`** — not a CSS-stretched natural-resolution canvas. This is the key decision; do not revert it.

### DOM layout

```
<container position: relative; overflow: hidden>
  <img>                                ← image (CSS transformed for zoom/pan)
  <canvas dataRef pointerEvents:none>  ← annotation background
  <canvas dynRef>                      ← annotation foreground + mouse input
  <Minimap>
  <ShortcutPanel>
</container>
```

Image is inside a CSS `transform: matrix(zoom, 0, 0, zoom, panX, panY)`. The two canvases are siblings of the image, sized to the **container** (not the image), positioned with `inset: 0`.

### Render pipeline (in `DynamicLayer.render`)

Two passes per frame:

```ts
// Document pass — annotations in image-pixel coords
ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, panX * dpr, panY * dpr);
renderDoc(ctx, zoom);

// Overlay pass — handles & HUDs in CSS pixels
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
renderOverlay(ctx);
```

Document-pass sizes are CSS pixels; consumers divide by `zoom` to express them in image-space (e.g. `ctx.lineWidth = theme.bbox.lineWidth / zoom`). Overlay-pass sizes are literal CSS pixels.

### Mouse → image coordinates

```ts
imageX = (clientX - rect.left - panX) / zoom;
imageY = (clientY - rect.top  - panY) / zoom;
```

This is the inverse of the image's CSS transform. **Correct only if the image's CSS layout box equals its intrinsic size.** See *Gotcha: img sizing* below.

### Image-bounds guard

`CanvasEngine` rejects `mousedown` / `click` whose image coord falls outside `[0, naturalW] × [0, naturalH]`. Drag events (`mousemove`, `mouseup`) are clamped to the image edge so committed shapes always live in image bounds.

### Visual constants

`src/canvas/canvas-theme.ts` is the **single source of truth** for every color, stroke width, radius, dash, padding, and animation parameter used in canvas rendering. Semantically grouped (`theme.bbox`, `theme.keypoint`, `theme.polygon`, `theme.mask`, `theme.polygonDrawing`, `theme.bboxDrawing`, `theme.freeformDrawing`, `theme.editor`, `theme.cursorHud`, `theme.dimming`).

Unit convention: **all sizes in CSS pixels**. One labeled exception: `mask.borderThickness` is image pixels (it's a pixel kernel applied during RLE rasterization, not a drawn stroke).

When adding a visual constant, **put it in `canvas-theme.ts`**, never inline.

## Gotcha: `<img>` sizing

The annotator `<img>` MUST be explicitly sized to its intrinsic dimensions with `max-width: none`:

```tsx
<img
    src={imageUrl}
    style={{
        maxWidth: "none",
        width: imageSize.w,   // = img.naturalWidth
        height: imageSize.h,  // = img.naturalHeight
        ...
    }}
/>
```

All three properties are load-bearing.

**Why:** Tailwind preflight CSS includes `img, video { max-width: 100%; height: auto; }`. When the image's intrinsic size exceeds its parent's width, the browser clamps the image's CSS layout box. `img.naturalWidth` still reports the intrinsic value, but the layout box (which `getBoundingClientRect()` reflects) is smaller. The mouse → image coord formula `(sx - panX) / zoom` assumes layout box = natural size; if it doesn't, every click returns coords scaled by `layoutWidth / naturalWidth`. For a 2448-wide image in an 1140-wide container, clicks at the visible right edge would return ~1140 instead of ~2448 — half the expected value. SAM receives garbage, the mask renders in the wrong place.

The three CSS properties together:
- `maxWidth: "none"` removes the inherited ceiling.
- `width: naturalWidth` sets the layout target.
- `height: naturalHeight` keeps aspect locked even if other styles change.

## State management

Jotai atoms only. No Redux, no Zustand. Atoms live in `src/app/atom.ts`.

Convention:
- One atom per concern. Granular atoms, not bundled objects.
- Every atom name ends in `Atom`.
- Atoms are read via thin custom hooks (e.g. `useMasks()`) or directly with `useAtom(masksAtom)` from components.
- Do NOT use `atomWithStorage`, `atomWithQuery`, or other Jotai integrations. Manual `localStorage` via small helpers (see `preserveZoomAtom`) is the pattern when persistence is needed.

Core annotation state lives in four atoms:
- `promptsAtom: Prompt[]` — SAM input points and bboxes
- `masksAtom: Mask[]` — committed segmentation masks (RLE + polygon hybrid)
- `currentMaskAtom: number` — id of the active mask, 0 = none
- `slicPromptsAtom: SlicPrompt | undefined` — SLIC region selection

These four are the boundary that the undo system watches.

## Undo / redo

Snapshot-based history with event-shaped labels for forward compatibility. Lives in `src/app/history.ts`.

### Mechanism

- `historyAtom: {past: HistoryEntry[], future: HistoryEntry[]}`. Bounded `MAX_HISTORY = 50`.
- Each `HistoryEntry` is a snapshot of the four annotation atoms plus a structured `HistoryLabel`.
- `commitHistoryAtom` (write-only) snapshots current state, pushes onto `past`, clears `future`. **Called BEFORE every user-driven mutation.**
- `undoAtom` / `redoAtom` move state between past/future. Bound to `Cmd/Ctrl-Z`, `Cmd/Ctrl-Shift-Z`, `Ctrl-Y`.

Memory: snapshots are references; immutable updates throughout the codebase mean structurally-shared objects. Total cost ≲ 1 MB at 50 entries.

### Reset rules

- **Image change (PPL ↔ XPL within the same sample): does NOT reset.** Annotations persist; history must too.
- **Sample change (`activePairAtom: {pairsCode, sampleId}` changes): resets via `clearHistoryAtom`.**

### Structured labels

```ts
type HistoryLabel =
    | {action: "keypoint.add"; payload: {x, y, label}}
    | {action: "bbox.add"; payload: {x, y, w, h}}
    | {action: "polygon.add"; payload: {maskId?, vertexCount}}
    | ...
    | {action: "other"; payload: {note: string}};
```

Same shape as an event in an event-driven system. Used today for tooltips ("Annuler : Ajout de point" via `labelToFrench`). Future-compatible with migration to event-sourcing — labels become events, add `apply`/`invert` reducers, mutation sites stay identical.

### Modal-scoped undo

`historyScopeAtom: "global" | "slic" | "refine"`. When a modal is open, it claims the scope; the global Ctrl-Z handler short-circuits, and the modal manages a local history stack with its own keydown listener.

- **SLIC modal**: local stack of `Set<number>` snapshots of the `deleted` superpixel set. Tiny.
- **Refine modal**: local stack of RLE-compressed snapshots of the working canvas. Snapshot pushed on `mousedown` (before stroke). ~5 KB per stroke regardless of image size; cap `MAX_REFINE_LOCAL_HISTORY = 20`.

On modal apply/save, a single `commitHistory(...)` call promotes the whole modal session into one global undo step.

### Adding a new undoable action

1. If new type: add a variant to `HistoryLabel` and a case to `labelToFrench`.
2. Before the atom setter, call `commitHistory({action: "your.action", payload: {...}})`.
3. Done. Participates in undo/redo, tooltips, the bounded stack, and global UI.

## UI conventions

- **Icons**: `@heroicons/react/24/outline` is the default. `@carbon/icons-react` and `react-icons/fa6` are acceptable when Heroicons doesn't have what you need. Don't mix multiple icon libraries in one file.
- **Forms**: React Hook Form + Zod, with shadcn-style `<Form>` wrappers. Schema defined above the component.
- **Tables**: TanStack React Table v8.
- **Conditional rendering**: ternaries, not `&&` chains.
- **French UI strings**: keep them as-is. New strings in French. Helper file `src/i18n/index.ts` has a tiny `t()` for translations.

## Keyboard shortcuts

Defined in `src/canvas/shortcuts.ts`. Tool keys map to the `Tool` union. UI keys (M, H, ?, Ctrl+Z, etc.) are listed in `UI_SHORTCUT_DEFS` for the `?` panel.

| Key | Action |
|---|---|
| S | Select+ |
| X | Select− |
| B | Bounding box |
| P | Polygon |
| F | Freeform |
| L | SLIC |
| G | Grab (pan) |
| `=` / `-` | Zoom in / out |
| M | Toggle minimap |
| H | Toggle cursor position HUD |
| ? | Toggle shortcut panel |
| Esc | Cancel current draw |
| Backspace | Undo last polygon vertex / delete selected mask |
| Delete | Delete selected mask |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z | Redo |
| Ctrl + Y | Redo (Windows convention) |

## Backend integration

GraphQL via Relay. Operations are defined INLINE in components using the `graphql` tagged template literal. Generated types go in a `__generated__/` directory next to the component. **Do not put operations in the top-level `graphql/` folder** — that folder is infrastructure only.

Key mutations:
- `addPointsImage` — SAM segmentation from points + bboxes
- `computeSlicImage` — SLIC superpixel computation

Mutations are triggered manually; queries (`useLazyLoadQuery`) fire on mount with React Suspense for loading states.

## Things NOT to touch

- `src/jscocotools/mask.ts` — RLE codec, leave it.
- All `__generated__/` directories — Relay compiler output.
- `src/graphql/` infrastructure (RelayEnvironment, fetchGraphQL).
- The `<img>` sizing rule (see Gotcha above).
- The canvas architecture's transform-inside-context approach.

## Known follow-ups (not blocking)

- Mask rename textarea doesn't push history (would push per keystroke; needs debouncing).
- `Polygon.hitTest`, `FreeformPath.hitTest`, `Keypoint.hitTest` use raw image-pixel thresholds instead of CSS-pixel-divided-by-zoom. Interface-only — not currently called from outside the annotation classes, so no UX impact.
- Entity IDs use `Date.now()` numbers. Migration to `crypto.randomUUID()` strings would be cleaner.
