# CLAUDE.md — Web Image Annotation Tool

## Project overview

A web-based image annotation tool for Computer Vision workflows, specifically
for polarized-light microscopy images (thin section petrology). Supports
Bounding Boxes, Keypoints, Masks (from AI segmentation), Freeform Drawing, and
Polygon Lasso selection on high-resolution images.

Built with **Vite + React + TypeScript**. Backend runs a SAM2-based image
segmentation model accessible via GraphQL.

---

## Architecture — Layered Canvas Stack

All annotation rendering lives on a stack of three canvas layers, **not in the
DOM**. The `<img>` element is the reference image; everything drawn on top of
it is canvas.

### Layer 1 — Static Layer (background)
- Renders the reference image once on load (or on image change)
- Re-renders only when the image source changes
- Does not participate in the render loop

### Layer 2 — Persistent Data Layer
- Renders all committed annotation objects: Masks (from AI), BoundingBoxes,
  Keypoints, FreeformPaths, Polygons
- Redraws when the annotation state array changes
- Source: the `annotations` state array

### Layer 3 — Dynamic Interaction Layer (60 FPS)
- Runs a `requestAnimationFrame` loop
- Renders in-progress drawing previews (live bbox drag, polygon vertex
  placement, freeform stroke)
- Renders UI widgets: hover highlights, delete handles, vertex drag handles
- Cleared and redrawn every frame from transient interaction state

---

## Core design principles

- **No DOM elements for annotations.** Every annotation — boxes, points,
  masks, freeform paths, polygons — is drawn on canvas. Zero `<div>` overlays.
- **Annotation objects are classes.** Each class owns its geometry (in image
  coordinate space), its rendering logic (idle / hovered / active states), and
  its hit-testing logic (math to detect mouse intersection).
- **Coordinate system:** All geometry is stored in **image intrinsic space**
  (natural pixel coordinates). Display-space mouse events are always converted
  to image space before any logic runs.
- **Render loop:** `requestAnimationFrame` for the Dynamic Layer. State array
  is the source of truth. Render = read state → clear → draw.
- **Action priority:** Before creating a new annotation, always check if the
  mouse is over an existing one (hover → select → delete/edit).

---

## Annotation object class interface

Every annotation type implements this interface:

```ts
interface AnnotationObject {
  id: number;
  type: AnnotationType;

  // Render to a canvas context. State = idle | hovered | active.
  render(ctx: CanvasRenderingContext2D, state: RenderState): void;

  // Returns true if the point (image-space) intersects this object.
  hitTest(x: number, y: number): boolean;

  // Bounding rect in image space, used for spatial queries.
  getBounds(): Rect;
}
```

### Annotation types to implement

| Class | What it represents |
|---|---|
| `BoundingBox` | Rectangle defined by `{x, y, w, h}` in image space |
| `Keypoint` | Single `{x, y}` point with positive/negative label |
| `Mask` | RLE-encoded AI segmentation result rendered as pixel overlay |
| `FreeformPath` | Sequence of `{x, y}` points captured from mouse drag |
| `Polygon` | Closed polygon with draggable vertices |

---

## Tool types

### Existing tools (migrate from DIV to canvas)
- **SelectAdd** — places a positive-label Keypoint prompt; triggers
  `addPointsImage` mutation
- **SelectRemove** — places a negative-label Keypoint prompt
- **BoundingBox** — drag to define a BoundingBox prompt; triggers
  `addPointsImage` mutation with `bboxes`

### New tools to add
- **FreeformDraw**
  - Captures mouse path as a stream of points on `mousemove`
  - Renders live stroke on the Dynamic Layer using bezier curves
  - On `mouseup`, commits path as a `FreeformPath` annotation object
  - Configurable stroke color and width
  - Hit-testing: point-on-stroke distance check

- **PolygonLasso**
  - Click to place vertices one by one
  - Live preview line from last vertex to cursor on Dynamic Layer
  - Close indicator appears when cursor is within threshold of first vertex
  - Double-click or click on first vertex to close
  - Committed polygon becomes a `Polygon` annotation object
  - Supports: semi-transparent fill, edge hover highlight, per-vertex drag
  - Hit-testing: point-in-polygon (ray casting), point-on-edge, point-near-vertex

### Interaction states (all tools)
| State | Appearance |
|---|---|
| Idle | Default stroke/fill, no handles |
| Hovered | Highlighted stroke or nearest edge/vertex |
| Active/Selected | Full handles visible, drag and edit allowed |
| Drawing | Live preview on Dynamic Layer only |
| Deleting | X delete handle appears on hover |

---

## Tool Manager

A plain TypeScript class (no React) that:
- Tracks the active tool
- Delegates `mousedown`, `mousemove`, `mouseup`, `click`, `dblclick`
  events from the canvas to the correct tool handler
- Owns the `hit-test loop`: on every mouse event, iterates the annotation
  array to find the first object under the cursor before dispatching to tools

```ts
class ToolManager {
  setActiveTool(tool: ToolType): void;
  onMouseDown(e: ImageSpaceMouseEvent): void;
  onMouseMove(e: ImageSpaceMouseEvent): void;
  onMouseUp(e: ImageSpaceMouseEvent): void;
  onClick(e: ImageSpaceMouseEvent): void;
  onDblClick(e: ImageSpaceMouseEvent): void;
}
```

---

## Coordinate conversion

All mouse events arrive in viewport/DOM space and must be converted before
any geometry logic:

```ts
function toImageSpace(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  displayWidth: number,
  displayHeight: number,
): { x: number; y: number }
```

Zoom and pan are applied as a transform on the canvas context, not by
changing stored coordinates. Stored coordinates always remain in image space.

---

## Separation of concerns

| Layer | Technology | Responsibility |
|---|---|---|
| Canvas engine | Pure TS classes | Rendering, hit-testing, coordinate math |
| Tool handlers | Pure TS classes | Interaction logic per tool type |
| React components | React + JSX | Toolbar, sidebars, modals, labels |
| State | Jotai atoms | Source of truth for annotation array |
| API | GraphQL/Relay | Backend calls (unchanged) |

React components **do not** contain any canvas drawing code. Canvas classes
**do not** contain any React or JSX.

---

## State shape

The central annotation array in Jotai:

```ts
// In src/app/atom.ts
export const annotationsAtom = atom<AnnotationObject[]>([]);
```

The existing atoms (`promptsAtom`, `masksAtom`, `currentMaskAtom`) are kept
during the migration and removed once their canvas replacements are live.

---

## What NOT to touch

- All GraphQL mutations and queries — do not rename, restructure, or move them
- The `src/jscocotools/mask.ts` RLE decoder — do not modify
- The `src/graphql/` infrastructure (RelayEnvironment, fetchGraphQL)
- The `src/settings/` context and modal
- The `src/common/components/filter-gamma-selector/` component
- All `__generated__/` directories — these are Relay compiler output
- The `hslToRgb` + `getDistinctColor` color utilities (move, don't rewrite)

If a canvas feature needs data that doesn't exist in the backend yet, fake it
with mock data and mark with a comment: `// MOCK — replace with real API call`

---

## What to delete

- `src/common/codecs/` — MP4 video decode/encode
- `src/common/components/video/` — entire video component tree
- `src/common/tracker/` — SAM2 video tracker
- `src/common/utils/MultipartStream.ts` — streaming response parser (video only)
- `src/common/utils/ShaderUtils.ts` — WebGL shader utils (video effects only)
- `src/demo/` — video demo app and atoms
- `src/routes/DemoPage.tsx`, `DemoPageWrapper.tsx`, `MaskOverlayDemo.tsx`
- `src/layouts/DemoPageLayout.tsx`
- `src/types/mp4box/`
- Stale import of `VideoData` in `AnnotatorPage.tsx`
- npm packages: `mp4box`, `react-pts-canvas`, `pts`

---

## Language and stack

- All new code, components, types, file names: **English**
- Keep existing UI-facing strings (French labels) as-is
- Vite + React + TypeScript
- Tailwind CSS + `cn()` for styling
- Jotai for state
- Relay for GraphQL
- Favor native Canvas 2D API over annotation libraries

---

## Future extensions — do not build now

The architecture must allow adding these later without structural changes:
- Polygon with holes (donut mask / compound path)
- Spline / bezier curve tool
- Smart lasso (snap to edges using image pixel data)

Design the `AnnotationObject` interface and `Polygon` class to accommodate
holes (array of ring arrays) without building the feature now.

---

## File naming conventions

| Content | Convention |
|---|---|
| React components | `kebab-case.tsx` |
| TS classes (canvas engine) | `PascalCase.ts` (e.g. `BoundingBox.ts`) |
| Jotai atoms | `atoms.ts` co-located with feature |
| Tool handlers | `<ToolName>Tool.ts` (e.g. `BoundingBoxTool.ts`) |
| Canvas layer wrappers | `<Name>Layer.ts` |

Canvas engine classes live in `src/canvas/` (new directory):
```
src/canvas/
  annotations/        ← annotation classes (BoundingBox.ts, Keypoint.ts, …)
  tools/              ← tool handlers (BoundingBoxTool.ts, FreeformDrawTool.ts, …)
  layers/             ← layer managers (StaticLayer.ts, DataLayer.ts, DynamicLayer.ts)
  CanvasEngine.ts     ← coordinates all layers + ToolManager
  ToolManager.ts
  types.ts            ← shared canvas types (RenderState, Rect, ImageSpaceMouseEvent, …)
  coordinates.ts      ← toImageSpace, toDisplaySpace helpers
```
