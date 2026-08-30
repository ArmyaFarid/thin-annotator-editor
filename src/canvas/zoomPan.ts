import {theme} from "@/canvas/canvas-theme.ts";

export interface View {
    zoom: number;
    panX: number;
    panY: number;
}

export interface ZoomLimits {
    min: number;
    max: number;
}

export const DEFAULT_ZOOM_LIMITS: ZoomLimits = {min: 0.05, max: 20};

/** Zoom about a container-relative point, keeping that point under the cursor. */
export function zoomAt(
    v: View,
    cx: number,
    cy: number,
    factor: number,
    limits: ZoomLimits = DEFAULT_ZOOM_LIMITS,
): View {
    const zoom = Math.max(limits.min, Math.min(limits.max, v.zoom * factor));
    return {
        zoom,
        panX: cx - ((cx - v.panX) * zoom) / v.zoom,
        panY: cy - ((cy - v.panY) * zoom) / v.zoom,
    };
}

/** Container-relative screen point → image intrinsic pixels. */
export function screenToImage(
    v: View,
    cx: number,
    cy: number,
): {x: number; y: number} {
    return {x: (cx - v.panX) / v.zoom, y: (cy - v.panY) / v.zoom};
}

/** Centre `box` (image pixels) in a container of `cw`×`ch`, with padding. */
export function fitToBox(
    box: {x: number; y: number; w: number; h: number},
    cw: number,
    ch: number,
    padding: number,
    limits: ZoomLimits = DEFAULT_ZOOM_LIMITS,
): View {
    const paddedW = box.w * (1 + padding * 2);
    const paddedH = box.h * (1 + padding * 2);
    const zoom = Math.max(
        limits.min,
        Math.min(limits.max, Math.min(cw / paddedW, ch / paddedH)),
    );
    return {
        zoom,
        panX: cw / 2 - (box.x + box.w / 2) * zoom,
        panY: ch / 2 - (box.y + box.h / 2) * zoom,
    };
}

/**
 * One line per image pixel, drawn in the overlay pass — sizes are device
 * pixels, so this must run under setTransform(dpr,0,0,dpr,0,0) with the
 * canvas's own backing dimensions.
 */
export function drawPixelGrid(
    ctx: CanvasRenderingContext2D,
    view: View,
    dpr: number,
    canvasW: number,
    canvasH: number,
): void {
    if (view.zoom < theme.grid.minZoom) {
        return;
    }
    const step = view.zoom * dpr;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = theme.grid.stroke;
    ctx.lineWidth = theme.grid.lineWidth;
    ctx.beginPath();
    for (let x = (view.panX * dpr) % step; x < canvasW; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasH);
    }
    for (let y = (view.panY * dpr) % step; y < canvasH; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvasW, y);
    }
    ctx.stroke();
    ctx.restore();
}
