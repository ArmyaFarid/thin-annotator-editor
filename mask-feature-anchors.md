# Mask Anchor Points — Feature Spec

## Goal

When a mask enters edit mode, convert its RLE data into editable anchor points
along the boundary. Display as a skeleton outline with draggable nodes instead
of a filled overlay. On save, rasterize the edited polygon back to RLE.

Handles: disconnected fragments, holes, SAM masks, manually drawn masks.

---

## User Flow

1. User clicks a mask in the list → enters edit mode
2. The filled mask overlay is replaced by:
   - Thin colored contour lines (outer boundary + hole boundaries)
   - Draggable anchor points at key positions on each contour
3. User drags anchor points to reshape the mask
4. "Enregistrer" → rasterizes the polygon back to a single merged RLE

---

## Architecture

### New utility — `src/canvas/utils/contourExtract.ts`

#### `findConnectedComponents(data: Uint8Array, w: number, h: number): Uint8Array[]`

- Input: column-major binary array (same layout as RLE decode output)
- Output: one binary array per connected component (same size, only that component set to 1)
- Algorithm: flood-fill (BFS) iterating over foreground pixels, marking visited

#### `extractOuterContour(data: Uint8Array, w: number, h: number): ImageSpacePoint[]`

- Runs `traceBoundary` (already in `polygonUtils.ts`) on a single-component array
- Returns simplified polygon via `douglasPeucker(points, tolerance)`
- Default tolerance: `2.5`

#### `extractHoleContours(data: Uint8Array, w: number, h: number): ImageSpacePoint[][]`

- Finds inner boundaries (pixels that are 0 and surrounded by 1s)
- For each hole region: flood-fill from background → invert → trace contour
- Returns one simplified polygon per hole

#### `rleToEditableContours(rle: RLEMask, tolerance?: number): EditableContour[]`

Top-level function called when entering edit mode.

```ts
interface EditableContour {
    vertices: ImageSpacePoint[];
    kind: "fill" | "hole";
}
```

Steps:
1. `decode([rle])` → column-major binary array
2. Separate foreground and background
3. `findConnectedComponents` on foreground → one outer contour per fragment
4. `findConnectedComponents` on background, excluding the infinite outer background → hole contours
5. Return all contours tagged with `fill` or `hole`

---

### Atom change — `src/app/atom.ts`

No new atoms needed. The contours are stored as `MaskLayer[]` with `canvasShape`
(polygon) and `layerKind: "fill" | "hole"`. This is the existing shape.

---

### Entry into edit mode — `MaskList.tsx` `handleMaskClick`

When clicking an existing mask that has RLE layers:

```ts
import { rleToEditableContours } from "@/canvas/utils/contourExtract.ts";

function handleMaskClick(maskId: number) {
    const mask = masks.find(m => m.id === maskId);
    if (!mask) return;

    // If mask has RLE layers, convert to editable polygon contours
    const hasRle = mask.layers.some(l => l.rleMask);
    if (hasRle && imageSize) {
        // Merge all layers to a single binary canvas first
        const merged = mergeToCanvas(mask, imageSize.w, imageSize.h);
        const rle = canvasToRLE(merged);
        const contours = rleToEditableContours(rle);

        const layerId = Date.now();
        const newLayers: MaskLayer[] = contours.map((c, i) => ({
            id: layerId + i,
            source: "manual" as const,
            layerKind: c.kind,
            canvasShape: {
                kind: "polygon" as const,
                id: layerId + i + 1000,
                vertices: c.vertices,
                fillColor: `rgba(${mask.color.r},${mask.color.g},${mask.color.b},${MASK_FILL_ALPHA})`,
                strokeColor: `rgb(${mask.color.r},${mask.color.g},${mask.color.b})`,
            },
        }));

        setMasks(prev => prev.map(m => m.id === maskId ? { ...m, layers: newLayers } : m));
    }

    setPrompts([]);
    setCurrentMask(maskId);
    setEditorOn(true);
}
```

The mask now lives as polygon layers. `ObjectEditor` handles vertex drag natively.

---

### Rendering change — `src/canvas/annotations/Mask.ts`

Add a skeleton render mode when `state === "active"`:

- **Fill alpha**: reduce to `0.15` (ghost fill so the shape is still visible)
- **Stroke**: draw each polygon contour as a colored line (thickness `1.5px / scale`)
- **Anchor dots**: for each vertex, draw a small circle (`radius 4px / scale`)
  - Idle vertex: white fill, colored stroke
  - Hovered/dragged vertex: colored fill (handled by `ObjectEditor` / `DynamicLayer`)

The fast path (no holes) and hole path both apply the same skeleton style when active.

Implementation: pass `state` to `Polygon.render()` — it already receives it. Add a
branch in `Polygon.render()` for `state === "active"` to draw dots at each vertex.

---

### `ObjectEditor.ts`

No structural change needed. It already:
- Detects vertex hover and drag on polygon layers (`canvasShape.kind === "polygon"`)
- Fires `onPolygonVertexMoved` on drag end → updates `masksAtom`
- Shows delete handle per layer

The new contour polygons are standard polygon layers, so editing works immediately.

---

### Save (already in place)

`mergeToCanvas` + `canvasToRLE` on click "Enregistrer" — rasterizes the edited
polygon contours (with holes via `destination-out`) back to a single RLE layer.
No change needed here.

---

## Edge Cases

| Case | Handling |
|---|---|
| Mask with zero foreground pixels | Skip contour extraction, keep layers empty |
| Single-pixel or tiny fragment (< 3 vertices after DP) | Discard that contour |
| Very complex boundary (> 500 vertices after DP) | Increase DP tolerance until below threshold |
| Mask that is already polygon layers (manual draw) | Skip RLE conversion, use existing polygons directly |
| `imageSize` is null at click time | Fall back to showing existing layers without conversion |

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/canvas/utils/contourExtract.ts` | **Create** — `findConnectedComponents`, `extractOuterContour`, `extractHoleContours`, `rleToEditableContours` |
| `src/canvas/annotations/Polygon.ts` | **Modify** — skeleton vertex dots when `state === "active"` |
| `src/canvas/annotations/Mask.ts` | **Modify** — reduced fill alpha + stroke outline when active |
| `src/common/components/image/editor/maskView/MaskList.tsx` | **Modify** — `handleMaskClick` triggers contour conversion |

Do **not** modify:
- `polygonUtils.ts` — `traceBoundary` and `douglasPeucker` are reused as-is
- `maskMerge.ts` — `mergeToCanvas` / `canvasToRLE` unchanged
- `ObjectEditor.ts` — polygon vertex drag already works
- GraphQL layer — no backend change needed

---

## Douglas-Peucker Tolerance Guide

| Mask type | Suggested tolerance |
|---|---|
| SAM output (smooth) | `2.5` |
| Fine-grained boundary | `1.5` |
| Coarse editing (fewer points) | `5.0` |

Expose as a constant in `contourExtract.ts`: `export const DEFAULT_CONTOUR_TOLERANCE = 2.5`
