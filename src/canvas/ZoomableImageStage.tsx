import React, {useCallback, useEffect, useRef, useState} from "react";
import {
    DEFAULT_ZOOM_LIMITS,
    drawPixelGrid,
    screenToImage,
    zoomAt,
    type View,
    type ZoomLimits,
} from "@/canvas/zoomPan.ts";

export interface StagePointer {
    /** Image intrinsic pixels. */
    x: number;
    y: number;
    event: React.MouseEvent;
}

export interface ZoomableImageStageProps {
    imageUrl: string;
    imageW: number;
    imageH: number;
    view: View;
    onViewChange: (next: View) => void;
    zoomLimits?: ZoomLimits;
    showPixelGrid?: boolean;
    cursor?: string;
    /** Runs with the view transform applied; geometry is in image pixels. */
    drawDocument?: (ctx: CanvasRenderingContext2D, view: View) => void;
    /** Runs in CSS pixels, after the document pass. */
    drawOverlay?: (ctx: CanvasRenderingContext2D, view: View) => void;
    onStageMouseDown?: (p: StagePointer) => void;
    onStageMouseMove?: (p: StagePointer) => void;
    onStageMouseUp?: (p: StagePointer) => void;
    onStageMouseLeave?: () => void;
    onContainerResize?: (w: number, h: number) => void;
    /** Fires when a pan drag starts and ends. Consumers drawing a pointer
     *  cue clear it while panning, since the stage stops reporting moves. */
    onPanChange?: (panning: boolean) => void;
    /** Fires once the image has decoded — consumers that sample its pixels. */
    onImageLoad?: (img: HTMLImageElement) => void;
    style?: React.CSSProperties;
}

interface PanDrag {
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
}

/**
 * The viewport-sized-canvas layout: the image sits at its natural size inside a
 * CSS-transformed div, and the canvas is a sibling covering the whole
 * container, re-rasterized at screen resolution on every view change. Sizing
 * the canvas to the image and letting CSS stretch it instead — what the SLIC
 * and refine modals used to do — caps the usable zoom at the image's display
 * scale and makes a screen-space pixel grid impossible.
 */
export const ZoomableImageStage: React.FC<ZoomableImageStageProps> = ({
    imageUrl,
    imageW,
    imageH,
    view,
    onViewChange,
    zoomLimits = DEFAULT_ZOOM_LIMITS,
    showPixelGrid = true,
    cursor,
    drawDocument,
    drawOverlay,
    onStageMouseDown,
    onStageMouseMove,
    onStageMouseUp,
    onStageMouseLeave,
    onContainerResize,
    onImageLoad,
    onPanChange,
    style,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const viewRef = useRef(view);
    const panDragRef = useRef<PanDrag | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [size, setSize] = useState({w: 0, h: 0});

    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    // A cached image can already be complete before the load event would fire.
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0) {
            onImageLoad?.(img);
        }
    }, [imageUrl, onImageLoad]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const {width, height} = entries[0].contentRect;
            setSize({w: width, h: height});
            onContainerResize?.(width, height);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [onContainerResize]);

    // Backing store follows the container, never the zoom.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || size.w === 0 || size.h === 0) {
            return;
        }
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(size.w * dpr));
        canvas.height = Math.max(1, Math.round(size.h * dpr));
    }, [size]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || size.w === 0 || size.h === 0) {
            return;
        }
        const ctx = canvas.getContext("2d")!;
        const dpr = window.devicePixelRatio || 1;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.setTransform(
            view.zoom * dpr,
            0,
            0,
            view.zoom * dpr,
            view.panX * dpr,
            view.panY * dpr,
        );
        // Upscaled masks and label maps should read as exact pixels, not blur.
        ctx.imageSmoothingEnabled = false;
        drawDocument?.(ctx, view);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawOverlay?.(ctx, view);

        if (showPixelGrid) {
            drawPixelGrid(ctx, view, dpr, canvas.width, canvas.height);
        }
    }, [view, size, drawDocument, drawOverlay, showPixelGrid]);

    // Native listener: React attaches wheel as passive, forbidding preventDefault.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
            onViewChange(
                zoomAt(
                    viewRef.current,
                    e.clientX - rect.left,
                    e.clientY - rect.top,
                    factor,
                    zoomLimits,
                ),
            );
        };
        container.addEventListener("wheel", onWheel, {passive: false});
        return () => container.removeEventListener("wheel", onWheel);
    }, [onViewChange, zoomLimits]);

    const pointerAt = useCallback((e: React.MouseEvent): StagePointer => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const p = screenToImage(
            viewRef.current,
            e.clientX - rect.left,
            e.clientY - rect.top,
        );
        return {x: p.x, y: p.y, event: e};
    }, []);

    // Middle button or Alt-drag pans, so a trackpad without a middle button can
    // still move around while the left button stays free for the tool.
    function handleMouseDown(e: React.MouseEvent) {
        if (e.button === 1 || e.altKey) {
            e.preventDefault();
            panDragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                startPanX: viewRef.current.panX,
                startPanY: viewRef.current.panY,
            };
            setIsPanning(true);
            onPanChange?.(true);
            return;
        }
        onStageMouseDown?.(pointerAt(e));
    }

    function handleMouseMove(e: React.MouseEvent) {
        const drag = panDragRef.current;
        if (drag) {
            onViewChange({
                ...viewRef.current,
                panX: drag.startPanX + (e.clientX - drag.startX),
                panY: drag.startPanY + (e.clientY - drag.startY),
            });
            return;
        }
        onStageMouseMove?.(pointerAt(e));
    }

    function handleMouseUp(e: React.MouseEvent) {
        if (panDragRef.current) {
            panDragRef.current = null;
            setIsPanning(false);
            onPanChange?.(false);
            return;
        }
        onStageMouseUp?.(pointerAt(e));
    }

    function handleMouseLeave() {
        if (panDragRef.current) {
            panDragRef.current = null;
            onPanChange?.(false);
        }
        setIsPanning(false);
        onStageMouseLeave?.();
    }

    const transform = `matrix(${view.zoom},0,0,${view.zoom},${view.panX},${view.panY})`;

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                overflow: "hidden",
                width: "100%",
                height: "100%",
                ...style,
            }}>
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    display: "inline-block",
                    lineHeight: 0,
                    transform,
                    transformOrigin: "0 0",
                    pointerEvents: "none",
                }}>
                {/* Natural size and maxWidth:none are load-bearing — Tailwind's
                    preflight max-width:100% would silently rescale the image and
                    break every coordinate below. */}
                <img
                    ref={imgRef}
                    src={imageUrl}
                    draggable={false}
                    onLoad={(e) => onImageLoad?.(e.currentTarget)}
                    style={{
                        display: "block",
                        userSelect: "none",
                        maxWidth: "none",
                        width: imageW,
                        height: imageH,
                    }}
                    alt=""
                />
            </div>
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    cursor: isPanning ? "grabbing" : cursor,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            />
        </div>
    );
};
