# CLAUDE.md — ThinAnnotator

Architecture and conventions for this codebase. Written for contributors and AI assistants.
See [README.md](README.md) for what the tool does and how to run it.

---

## What this is

A Vite + React + TypeScript frontend for annotating thin-section petrology images. A companion
Python service (`http://localhost:7263`) runs SAM 2 and SLIC and serves the image files.

**Image only.** The video pipeline this codebase was forked from has been removed.

## Commands

```bash
yarn dev            # dev server
yarn build          # tsc && vite build — run before every commit
yarn lint           # eslint
yarn relay          # regenerate Relay artifacts after touching a GraphQL operation
```

`yarn build` is the real gate: the codebase leans on `Record<Tool, …>`-style exhaustive types,
so a missed registration point is a compile error rather than a runtime surprise.

---

## The domain model

Three names for overlapping things — worth getting straight before touching anything.

| Concept | Type | Meaning |
|---|---|---|
| **Object** / region | `Mask` (`app/atom.ts`) | One annotated mineral grain. Has an id, label, colour, `layers[]`, and mineral `annotation`. This is what the user creates, names, and exports. |
| **Layer** | `MaskLayer` | A *piece* of an object: either an RLE bitmap (`rleMask`) or a vector `canvasShape`, tagged `layerKind: "fill" \| "hole"`. |
| **Drawable** | `AnnotationObject` (`canvas/types.ts`) | A rendering interface — `render` / `hitTest` / `getBounds`. Implemented by `BoundingBox`, `Keypoint`, `Polygon`, `FreeformPath`, and the canvas-side `Mask`. Not a domain concept. |

An object's final shape is *union of fills − union of holes*, flattened by `mergeToCanvas()`.
While editing, an object accumulates layers; **Save** collapses them into a single RLE layer.

Beware: **two different classes are called `Mask`** — the state interface in `app/atom.ts` and
the renderer in `canvas/annotations/Mask.ts` that draws it.

`objectId` in engine callbacks means *mask id*. `objectId` in GraphQL is SAM 2's own id (hardcoded
to `1` for point prompts, reused as the superpixel index for SLIC). Same word, unrelated meanings.

---

## Canvas architecture

React owns the chrome; the engine is plain TypeScript. **No React or JSX inside `src/canvas/`
engine classes, and no canvas drawing inside React components.**

```
CanvasStack.tsx          React host: refs, event forwarding, atom ↔ engine sync
└── CanvasEngine.ts      coordinates everything below
    ├── DataLayer.ts     committed annotations; repaints on state change
    ├── DynamicLayer.ts  in-progress drawing + overlays; requestAnimationFrame loop
    ├── ToolManager.ts   dispatches input to the active tool
    └── ObjectEditor.ts  vertex dragging, per-layer delete handles
```

### The layout that must not be reverted

Three siblings inside the editor container:

```
<container position:relative overflow:hidden>
  <img>                                ← the image, CSS-transformed
  <canvas dataRef  pointerEvents:none> ← committed annotations
  <canvas dynRef>                      ← previews, handles, mouse events
```

The canvases sit **outside** the image's CSS transform and cover the whole container. Their
backing size is `container.clientSize × DPR`, set by `ResizeObserver` — never on zoom. The view
is applied *inside* the context:

```ts
ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, panX * dpr, panY * dpr);
```

An earlier design sized the canvases to the image's natural resolution and let CSS stretch them,
which made every stroke blurry above 1× zoom. Vector strokes are now re-rasterized per frame at
screen resolution.

### Two render passes in DynamicLayer

- **Document pass** — view transform applied, geometry in image pixels. Sizes are CSS pixels, so
  divide by zoom at the call site: `ctx.lineWidth = theme.bbox.lineWidth / zoom`.
- **Overlay pass** — `setTransform(dpr,0,0,dpr,0,0)`, sizes are literal CSS pixels. Handles, HUD.

### Coordinates

All geometry is stored in **image intrinsic pixels**. Mouse events convert on entry:

```ts
x = (clientX - rect.left - view.panX) / view.zoom
```

This is only correct while the `<img>`'s CSS layout box equals its intrinsic size — hence the
explicit `width` / `height` / `maxWidth: "none"` on that element. Tailwind's preflight sets
`max-width: 100%`, which silently breaks every coordinate in the app. **Do not remove them.**

### Visual constants

`canvas/canvas-theme.ts` is the single source of truth for colours, widths, radii, dashes and
alphas. All values are CSS pixels, with one labelled exception (`mask.borderThickness`, image
pixels, used during RLE rasterization). No file outside it should hardcode a visual constant.

---

## State

Jotai, global store, no `<Provider>`. Atoms live in `src/app/atom.ts`; feature-scoped hooks wrap
them one call deep (`usePreserveZoom`, `useToolbarLayout`, `useLanguage`).

| Atom | Holds |
|---|---|
| `masksAtom` | the annotated objects — the document |
| `currentMaskAtom` | active object id; `0` means "none", which is what puts the panel in list mode |
| `promptsAtom` | pending SAM prompts; writing to it triggers the mutation |
| `slicPromptsAtom` / `slicOverlayAtom` | SLIC request and its returned superpixels |
| `activeToolAtom`, `borderOnlyAtom`, `minimapVisibleAtom`, … | UI state |

Preferences that survive reloads (`preserveZoom`, `toolbarLayout`, `lang`) read `localStorage`
at atom creation and write it in their setter hook. Don't reach for `atomWithStorage`.

`resetTaskStateAtom` wipes task state on returning home; UI preferences deliberately survive.

A **task** is one field of view being annotated. The backend still calls this a *project* — its
endpoints are `/api/project/*` — so the DTOs in `lib/services/api/task/dto.ts` keep that name and
`mappers.ts` is the seam. Everything above the mappers says task.

---

## i18n — the invariant that bites

`t()` reads a **mutable module value**, and the language can change at runtime. Therefore:

> **Never capture a translated string in a module-scope constant.** It freezes the language at
> import time and silently stops updating.

Definitions that need a label carry a `TranslationKey` and resolve it during render — see
`canvas/shortcuts.ts` (`labelKey` / `hintKey`) and `annotator-toolbar/tool-groups.ts`.

`AppWrapper` subscribes to `langAtom`, so switching language re-renders the tree and every `t()`
re-runs. Nothing in the codebase uses `React.memo`; adding it somewhere high up would break this.

All user-facing text goes in `src/i18n/index.ts` in **both** `fr` and `en`. No hardcoded strings.

---

## Undo / redo

Snapshot-based, in `src/app/history.ts`. Before any user-driven mutation, call
`commitHistoryAtom` with a structured label:

```ts
commitHistory({action: "keypoint.add", payload: {x, y, label}});
```

- Snapshots four atoms: `prompts`, `masks`, `currentMask`, `slicPrompts`. Bounded at 50 entries;
  immutable setters mean entries structurally share what didn't change.
- Labels are a discriminated union so tooltips can read "Undo: Add point", and so a future move to
  event sourcing is mechanical (add `apply`/`invert`, stop snapshotting, leave call sites alone).
- **Scopes:** `historyScopeAtom` is `"global" | "slic" | "refine"`. A modal with its own transient
  state sets the scope on mount, keeps a local stack, and calls `commitHistory` **once** on apply
  so the whole session is one global step. Reset the scope on unmount.
- **Reset rules:** switching lighting modality (PPL ↔ XPL) keeps history; switching *sample*
  clears it.

To add an undoable action: add a variant to `HistoryLabel`, a case to `labelToFrench`, and call
`commitHistory` before the setter.

---

## Toolbar and tool groups

- `TOOLS` in `app/AppConfig.tsx` is the source of truth for **which tools exist**.
- `annotator-toolbar/tool-groups.ts` is **presentation only** — which tools cluster visually. It
  carries each group's `id`, `labelKey`, `icon` and `tools`. Adding a group is one entry; tools in
  no group render as standalone buttons. Nothing here affects `ToolManager` or the shortcuts.
- The toolbar renders each group once at the slot of its first member, so `TOOLS` order wins.
- Three layouts (`separators`, `pods`, `flyout`) chosen in the customize modal, persisted.

A tool with no branch in `ToolManager` is inert by construction — that's how the `idle` pointer
tool works, and why adding a no-op tool needs no handler.

---

## Backend integration

**GraphQL (Relay)** — operations are defined inline with `graphql\`\`` next to the component that
uses them; generated types land in a sibling `__generated__/`. Never move operations into the
top-level `graphql/` folder, which is infrastructure only.

- `addPointsImage` — SAM prompts (points + bboxes) → RLE mask
- `computeSlicImage` — bbox → superpixel RLEs
- `getPairs` — the lighting-modality and gamma variants of one field of view

**REST** — `/api/pick-folder`, `/api/project/load`, `/api/project/save`, `/api/annotations/save`,
`/api/annotation-options`.

Bridge pattern: read the result with `useLazyLoadQuery` / `useMutation`, then write it into an
atom in a callback or effect. Relay is transport; Jotai is the source of truth. Never store Relay
results directly in atoms.

---

## Conventions

| Thing | Rule |
|---|---|
| Quotes / indent | double quotes, 4 spaces, trailing commas |
| React components | `kebab-case.tsx`; pages and wrappers as `function`, UI primitives as `const … : React.FC` |
| Canvas classes | `PascalCase.ts` |
| Tools | `<Name>Tool.ts` in `canvas/tools/` |
| Props | `interface ComponentNameProps`, declared above the component |
| Conditionals in JSX | ternaries, not `&&` chains |
| Comments | only where the *why* isn't obvious; no JSDoc |
| Icons | `@heroicons/react`, or an SVG in `assets/icons/` imported with `?react` |

New code, file names, types and comments are in **English**. User-facing strings are translated,
never hardcoded.

---

## Do not touch

- `src/jscocotools/mask.ts` — the RLE codec
- `src/settings/` — inherited SAM 2 endpoint settings modal (the gear in `RootLayout`, separate
  from the customize modal)
- `src/graphql/` infrastructure — `fetchGraphQL`, `RelayEnvironment`, the provider
- every `__generated__/` directory — Relay compiler output
- `src/common/components/filter-gamma-selector/`
- the explicit `<img>` sizing in `CanvasStack` (see Coordinates above)

---

## Known follow-ups

Real, unblocking, and safe to pick up:

- **Stale dependencies.** `mp4box`, `pts` and `react-pts-canvas` survive in `package.json` from
  the deleted video pipeline.
- **`BorderOnlyToggle.tsx`** has no importers — the toolbar button replaced it.
- **`editorOnAtom`** is written by two components and read by none; the panel switches on
  `currentMask !== 0`.
- **`Date.now()` ids** for masks and layers can collide within a millisecond;
  `crypto.randomUUID()` is the fix, across roughly ten files.
- **`hitTest` thresholds** in `Polygon`, `FreeformPath` and `Keypoint` use raw image-pixel
  distances instead of `pixels / zoom`. `ObjectEditor` does it correctly. No impact today because
  only `Mask.hitTest` is called from outside.
- **`labelToFrench`** now returns whatever language is active; the name is a leftover.
