/**
 * Central visual constants for all annotation mask types.
 * Changing these values affects every mask uniformly — RLE, freeform, polygon.
 */

/** Fill area opacity for all mask types (0–1). Keep very low so borders dominate visually. */
export const MASK_FILL_ALPHA = 0.10;

/** Border thickness in natural-image pixels used for RLE edge detection. */
export const MASK_BORDER_THICKNESS = 3;

/**
 * RLE border color multiplier (0 = black, 1 = same hue as fill).
 * At 1.0 the border renders at the object's full color with full opacity.
 */
export const MASK_BORDER_DARKEN = 1.0;

/** Stroke width in display pixels for freeform paths and polygon outlines. */
export const MASK_STROKE_WIDTH = 2.5;
