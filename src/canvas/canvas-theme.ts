/**
 * Canvas theme — single source of truth for every visual constant used to
 * render annotations, tool previews, and the editor overlay.
 *
 * UNITS
 * ─────
 * - All sizes (stroke widths, radii, dash lengths, hit thresholds) are in
 *   CSS PIXELS (screen pixels). Consumers that draw under the view transform
 *   convert by dividing by `view.zoom` at the call site.
 * - Colors are CSS color strings.
 * - Alphas are 0–1.
 *
 * NAMING
 * ──────
 * Top-level groups describe *what* is being styled:
 *   bbox, keypoint, polygon, mask, polygonDrawing, bboxDrawing,
 *   freeformDrawing, editor, cursorHud, dimming
 *
 * To tweak the look of the whole annotator, edit this file. No other file
 * should hard-code colors or sizes.
 */

// ── Palette (raw colors — referenced by semantic tokens below) ───────────
const palette = {
    blue: "#4FC3F7",
    blueLight: "#81d4fa",
    amber: "#F59E0B",
    orange: "#f97316",
    red: "#EF4444",
    redDeep: "#ef4444",
    green: "#22c55e",
    white: "#FFFFFF",
} as const;

// ── Semantic tokens ──────────────────────────────────────────────────────
export const theme = {
    /** Committed bounding-box prompts (stored, not in-progress). */
    bbox: {
        stroke: palette.blue,
        strokeHovered: palette.blueLight,
        fill: "rgba(79,195,247,0.15)",
        lineWidth: 2,
        lineWidthHovered: 3,
    },

    /** Committed keypoint prompts (positive/negative SAM points). */
    keypoint: {
        positive: palette.green,
        negative: palette.red,
        positiveFill: "rgba(34,197,94,0.25)",
        negativeFill: "rgba(239,68,68,0.25)",
        radius: 4,
        radiusActive: 5,
        arm: 3,
        lineWidth: 1.5,
    },

    /** Committed polygon annotations (regular fill+stroke render). */
    polygon: {
        strokeHovered: palette.white,
        /** Dot radius = strokeWidth × this factor (legacy ratio). */
        dotRadiusFactor: 2,
        hoverExtraWidth: 1.5,
    },

    /** Committed freeform path annotations. */
    freeform: {
        hoverExtraWidth: 1.5,
    },

    /** Mask (RLE + polygon hybrid) appearance. */
    mask: {
        /** Stroke width for polygon-layer outlines inside masks. */
        strokeWidth: 2.5,
        /** Fill opacity for all mask types (RLE, freeform, polygon). */
        fillAlpha: 0.1,
        /** Mask outline color multiplier (0 = black, 1 = full hue). */
        borderDarken: 1.0,
        /** CSS filter applied to the active mask for emphasis. */
        activeShadow: "drop-shadow(0 0 4px rgba(255,255,255,0.85))",
        /** Skeleton-mode stroke (active mask with only polygon layers). */
        skeletonStrokeWidth: 1.5,
        skeletonHoleStroke: "rgba(255,140,50,0.9)",
        skeletonHoleDash: [5, 3],
    },

    /** Live preview while drawing a polygon (vertices placed but not closed). */
    polygonDrawing: {
        strokeAdd: palette.amber,
        strokeSubtract: palette.red,
        fillAdd: "rgba(245,158,11,0.08)",
        fillSubtract: "rgba(239,68,68,0.08)",
        lineWidth: 1,
        subtractDash: [8, 5],
        /** Vertex dot radius drawn in the overlay pass. */
        vertexDotRadius: 4,
        /** Snap-to-close indicator radius drawn at the first vertex. */
        closeIndicatorRadius: 9,
        closeIndicatorLineWidth: 3,
        /** Distance (CSS px) within which clicking the first vertex closes. */
        closeThresholdPx: 15,
    },

    /** Live preview while drawing a bounding box. */
    bboxDrawing: {
        stroke: palette.blue,
        fill: "rgba(79,195,247,0.1)",
        lineWidth: 2,
        dash: [6, 3],
    },

    /** Live preview while drawing a freeform stroke. */
    freeformDrawing: {
        defaultColor: palette.orange,
        subtractColor: palette.red,
        defaultStrokeWidth: 3,
        subtractDash: [8, 5],
    },

    /** ObjectEditor overlay (vertex handles + delete buttons on active mask). */
    editor: {
        /** Hit radius for vertex drag + delete button. */
        hitPx: 12,
        /** Vertex handle radius. */
        vertexRadius: 5,
        /** Delete button radius. */
        deleteRadius: 9,
        /** Vertex/delete handle stroke widths. */
        vertexStrokeWidth: 1.5,
        deleteStrokeWidth: 1,
        deleteCrossStrokeWidth: 1.5,
        /** Delete button cross arm length. */
        deleteCrossArm: 3.5,
        /** Drag-live polygon outline. */
        dragOutlineWidth: 2,
        dragOutlineColor: "rgba(255,255,255,0.8)",
        /** Vertex handle colors by state. */
        vertexFill: "rgba(255,255,255,0.75)",
        vertexFillHover: palette.white,
        vertexFillDrag: palette.orange,
        vertexStroke: palette.amber,
        /** Delete button colors by state. */
        deleteFill: "rgba(239,68,68,0.8)",
        deleteFillHover: palette.redDeep,
        deleteStroke: "rgba(255,255,255,0.5)",
        deleteCrossStroke: palette.white,
        /** Pixel offset between polygon's max-x vertex and delete button. */
        deleteOffsetFromMaxX: 4,
        /** Inset (from RLE mask's top-right corner) for delete button. */
        rleDeleteInset: 20,
    },

    /** Cursor position HUD (top-left of canvas). */
    cursorHud: {
        bg: "rgba(0, 0, 0, 0.55)",
        bgOutside: "rgba(220, 38, 38, 0.88)",
        text: palette.white,
        font: "11px ui-monospace, monospace",
        padX: 7,
        height: 20,
        marginX: 8,
        marginY: 8,
    },

    /** Inactive (non-current) mask dimming when an active mask exists. */
    dimming: {
        inactiveAlpha: 0.3,
    },
} as const;

// ── Backwards-compat re-exports for the old `mask-style.ts` symbols.
// New code should read from `theme` directly.
export const MASK_FILL_ALPHA = theme.mask.fillAlpha;
export const SLIC_MASK_FILL_ALPHA = 0;
export const MASK_STROKE_WIDTH = theme.mask.strokeWidth;
export const MASK_BORDER_DARKEN = theme.mask.borderDarken;
