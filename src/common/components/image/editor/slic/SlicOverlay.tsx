import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
    masksAtom,
    slicOverlayAtom,
    currentMaskAtom,
    activeImageSizeAtom,
} from "@/app/atom.ts";
import {canvasToRLE} from "@/canvas/utils/maskMerge.ts";
import {getDistinctColor} from "@/canvas/color.ts";
import {SLIC_MASK_FILL_ALPHA, theme} from "@/canvas/canvas-theme.ts";
import {commitHistoryAtom, historyScopeAtom} from "@/app/history.ts";
import {t} from "@/i18n/index.ts";

const MAX_SLIC_LOCAL_HISTORY = 50;
// Above this many segments changing at once, repainting the whole mesh beats
// walking a dirty rect per segment (reset, or an undo across many clicks).
const MAX_SLIC_DIRTY_SEGMENTS = 12;

interface SlicOverlayProps {
    imageUrl: string;
}

interface SlicTile {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
}

interface PanDrag {
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
}

// Paint the contours of the kept segments into [x0,y0]..[x1,y1] of the mesh
// canvas. A shared boundary is drawn from one side only — the higher label id
// owns it — so the line is one image pixel wide rather than two, and it
// alternates dark/light along its length to stay legible over any field.
function paintMesh(
    mCtx: CanvasRenderingContext2D,
    labels: Uint16Array,
    lw: number,
    lh: number,
    kept: Uint8Array,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): void {
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    if (w <= 0 || h <= 0) {
        return;
    }
    const img = mCtx.createImageData(w, h);
    const d = img.data;
    const {contourDark, contourLight, contourDashPeriod} = theme.slic;

    for (let y = 0; y < h; y++) {
        const gy = y0 + y;
        const grow = gy * lw;
        for (let x = 0; x < w; x++) {
            const gx = x0 + x;
            const a = labels[grow + gx];
            if (a === 0 || kept[a] === 0) {
                continue;
            }
            let edge = gx === 0 || gy === 0 || gx === lw - 1 || gy === lh - 1;
            if (!edge) {
                const l = labels[grow + gx - 1];
                const r = labels[grow + gx + 1];
                const u = labels[grow - lw + gx];
                const b = labels[grow + lw + gx];
                edge =
                    (l !== a && (l === 0 || kept[l] === 0 || a > l)) ||
                    (r !== a && (r === 0 || kept[r] === 0 || a > r)) ||
                    (u !== a && (u === 0 || kept[u] === 0 || a > u)) ||
                    (b !== a && (b === 0 || kept[b] === 0 || a > b));
            }
            if (!edge) {
                continue;
            }
            const c =
                ((gx + gy) / contourDashPeriod) & 1
                    ? contourLight
                    : contourDark;
            const o = (y * w + x) * 4;
            d[o] = c[0];
            d[o + 1] = c[1];
            d[o + 2] = c[2];
            d[o + 3] = c[3];
        }
    }
    // Replaces the region wholesale, so a repaint also clears stale contours.
    mCtx.putImageData(img, x0, y0);
}

export const SlicOverlay: React.FC<SlicOverlayProps> = ({imageUrl}) => {
    const [slicOverlay, setSlicOverlay] = useAtom(slicOverlayAtom);
    const [masks, setMasks] = useAtom(masksAtom);
    const setCurrentMask = useSetAtom(currentMaskAtom);
    const imageSize = useAtomValue(activeImageSizeAtom);
    const commitHistory = useSetAtom(commitHistoryAtom);
    const setHistoryScope = useSetAtom(historyScopeAtom);

    // Local SLIC undo stack — only active while this modal is open.
    // History entries are snapshots of `deleted` (small Set<number>).
    const [localPast, setLocalPast] = useState<Set<number>[]>([]);
    const [localFuture, setLocalFuture] = useState<Set<number>[]>([]);
    // Ref for closure-safe reads from inside callbacks.
    const deletedRef = useRef<Set<number>>(new Set());

    const [deleted, setDeleted] = useState<Set<number>>(new Set());
    useEffect(() => {
        deletedRef.current = deleted;
    }, [deleted]);

    // Snapshot the CURRENT `deleted` set onto the local undo stack and
    // clear the redo branch. Call before any mutation to `deleted`.
    const pushLocalHistory = useCallback(() => {
        setLocalPast((past) => {
            const next = [...past, new Set(deletedRef.current)];
            return next.length > MAX_SLIC_LOCAL_HISTORY
                ? next.slice(-MAX_SLIC_LOCAL_HISTORY)
                : next;
        });
        setLocalFuture([]);
    }, []);

    const localUndo = useCallback(() => {
        setLocalPast((past) => {
            if (past.length === 0) {
                return past;
            }
            const previous = past[past.length - 1];
            setLocalFuture((f) => [...f, new Set(deletedRef.current)]);
            setDeleted(previous);
            return past.slice(0, -1);
        });
    }, []);

    const localRedo = useCallback(() => {
        setLocalFuture((future) => {
            if (future.length === 0) {
                return future;
            }
            const next = future[future.length - 1];
            setLocalPast((p) => [...p, new Set(deletedRef.current)]);
            setDeleted(next);
            return future.slice(0, -1);
        });
    }, []);

    // Claim scope on mount, release on unmount.
    useEffect(() => {
        setHistoryScope("slic");
        return () => setHistoryScope("global");
    }, [setHistoryScope]);

    // Modal-local Ctrl-Z / Ctrl-Shift-Z / Ctrl-Y handler.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") {
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) {
                    localRedo();
                } else {
                    localUndo();
                }
            } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
                e.preventDefault();
                localRedo();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [localUndo, localRedo]);
    const [overlayReady, setOverlayReady] = useState(false);
    const [segmentIds, setSegmentIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    // Only meaningful when targetMaskId !== 0. "add" → kept superpixels
    // become a fill layer on the active mask; "remove" → a hole layer.
    const [applyMode, setApplyMode] = useState<"add" | "remove">("add");
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isPanning, setIsPanning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const meshRef = useRef<HTMLCanvasElement | null>(null);
    const hoverTilesRef = useRef<Map<number, SlicTile>>(new Map());
    const paintedDeletedRef = useRef<Set<number>>(new Set());
    const boundsRef = useRef<{
        minX: Int32Array;
        minY: Int32Array;
        maxX: Int32Array;
        maxY: Int32Array;
        maxId: number;
    } | null>(null);
    const viewRef = useRef({zoom: 1, panX: 0, panY: 0});
    const panDragRef = useRef<PanDrag | null>(null);

    useEffect(() => {
        viewRef.current = {zoom, panX, panY};
    }, [zoom, panX, panY]);

    // Build the contour mesh from the label map. Nothing is tinted: only the
    // boundaries of the kept segments are painted, one image pixel wide, so the
    // pixels the expert is judging stay untouched.
    // rAF defers the work by one frame so the loading overlay paints first.
    useEffect(() => {
        if (!slicOverlay || !imageSize) {
            setOverlayReady(false);
            return;
        }
        setOverlayReady(false);

        const rafId = requestAnimationFrame(() => {
            const {labels, w: lw, h: lh} = slicOverlay.labelMap;

            let maxId = 0;
            for (let i = 0; i < labels.length; i++) {
                if (labels[i] > maxId) {
                    maxId = labels[i];
                }
            }

            const minX = new Int32Array(maxId + 1).fill(lw);
            const minY = new Int32Array(maxId + 1).fill(lh);
            const maxX = new Int32Array(maxId + 1).fill(-1);
            const maxY = new Int32Array(maxId + 1).fill(-1);
            for (let y = 0; y < lh; y++) {
                const row = y * lw;
                for (let x = 0; x < lw; x++) {
                    const id = labels[row + x];
                    if (id === 0) {
                        continue;
                    }
                    if (x < minX[id]) {
                        minX[id] = x;
                    }
                    if (x > maxX[id]) {
                        maxX[id] = x;
                    }
                    if (y < minY[id]) {
                        minY[id] = y;
                    }
                    if (y > maxY[id]) {
                        maxY[id] = y;
                    }
                }
            }

            const ids: number[] = [];
            for (let id = 1; id <= maxId; id++) {
                if (maxX[id] >= 0) {
                    ids.push(id);
                }
            }

            const mesh = document.createElement("canvas");
            mesh.width = lw;
            mesh.height = lh;
            const kept = new Uint8Array(maxId + 1).fill(1);
            paintMesh(
                mesh.getContext("2d")!,
                labels,
                lw,
                lh,
                kept,
                0,
                0,
                lw - 1,
                lh - 1,
            );

            meshRef.current = mesh;
            boundsRef.current = {minX, minY, maxX, maxY, maxId};
            hoverTilesRef.current = new Map();
            paintedDeletedRef.current = new Set();
            setSegmentIds(ids);
            setOverlayReady(true);
        });

        return () => cancelAnimationFrame(rafId);
    }, [slicOverlay, imageSize]);

    // Lazily rasterize the translucent fill for one segment. Only the hovered
    // segment is ever filled, so at most a handful of these get built.
    const getHoverTile = useCallback(
        (id: number): SlicTile | null => {
            const bounds = boundsRef.current;
            if (!slicOverlay || !bounds || id > bounds.maxId) {
                return null;
            }
            const cached = hoverTilesRef.current.get(id);
            if (cached) {
                return cached;
            }
            const {labels, w: lw, x: lx, y: ly} = slicOverlay.labelMap;
            const bx = bounds.minX[id];
            const by = bounds.minY[id];
            const bw = bounds.maxX[id] - bx + 1;
            const bh = bounds.maxY[id] - by + 1;
            if (bw <= 0 || bh <= 0) {
                return null;
            }
            const fill = theme.slic.hoverFill;
            const rgba = new Uint8ClampedArray(bw * bh * 4);
            for (let y = 0; y < bh; y++) {
                const grow = (by + y) * lw;
                for (let x = 0; x < bw; x++) {
                    if (labels[grow + bx + x] !== id) {
                        continue;
                    }
                    const o = (y * bw + x) * 4;
                    rgba[o] = fill[0];
                    rgba[o + 1] = fill[1];
                    rgba[o + 2] = fill[2];
                    rgba[o + 3] = fill[3];
                }
            }
            const canvas = document.createElement("canvas");
            canvas.width = bw;
            canvas.height = bh;
            canvas
                .getContext("2d")!
                .putImageData(new ImageData(rgba, bw, bh), 0, 0);
            const tile: SlicTile = {canvas, x: lx + bx, y: ly + by};
            hoverTilesRef.current.set(id, tile);
            return tile;
        },
        [slicOverlay],
    );

    // Redraw: repaint whatever the last delete invalidated, then composite the
    // hover fill under the contour mesh.
    const redrawOverlay = useCallback(() => {
        const mesh = meshRef.current;
        const bounds = boundsRef.current;
        if (
            !overlayReady ||
            !slicOverlay ||
            !imageSize ||
            !overlayCanvasRef.current ||
            !mesh ||
            !bounds
        ) {
            return;
        }
        const {labels, w: lw, h: lh, x: lx, y: ly} = slicOverlay.labelMap;

        // Only the segments whose kept/deleted state changed since the last
        // paint can alter the mesh, and only within their own bounds ± 1.
        const painted = paintedDeletedRef.current;
        const changed: number[] = [];
        for (const id of deleted) {
            if (!painted.has(id)) {
                changed.push(id);
            }
        }
        for (const id of painted) {
            if (!deleted.has(id)) {
                changed.push(id);
            }
        }
        if (changed.length > 0) {
            const mCtx = mesh.getContext("2d")!;
            const kept = new Uint8Array(bounds.maxId + 1).fill(1);
            for (const id of deleted) {
                if (id <= bounds.maxId) {
                    kept[id] = 0;
                }
            }
            if (changed.length > MAX_SLIC_DIRTY_SEGMENTS) {
                mCtx.clearRect(0, 0, lw, lh);
                paintMesh(mCtx, labels, lw, lh, kept, 0, 0, lw - 1, lh - 1);
            } else {
                for (const id of changed) {
                    if (id > bounds.maxId || bounds.maxX[id] < 0) {
                        continue;
                    }
                    paintMesh(
                        mCtx,
                        labels,
                        lw,
                        lh,
                        kept,
                        Math.max(0, bounds.minX[id] - 1),
                        Math.max(0, bounds.minY[id] - 1),
                        Math.min(lw - 1, bounds.maxX[id] + 1),
                        Math.min(lh - 1, bounds.maxY[id] + 1),
                    );
                }
            }
            paintedDeletedRef.current = new Set(deleted);
        }

        const ctx = overlayCanvasRef.current.getContext("2d")!;
        const {w: iw, h: ih} = imageSize;
        ctx.clearRect(0, 0, iw, ih);
        if (hoveredId !== null && !deleted.has(hoveredId)) {
            const tile = getHoverTile(hoveredId);
            if (tile) {
                ctx.drawImage(tile.canvas, tile.x, tile.y);
            }
        }
        ctx.drawImage(mesh, lx, ly);
    }, [
        slicOverlay,
        imageSize,
        deleted,
        overlayReady,
        hoveredId,
        getHoverTile,
    ]);

    useEffect(() => {
        redrawOverlay();
    }, [redrawOverlay]);

    // Auto-fit zoom once tiles are ready (container is visible at that point)
    useEffect(() => {
        if (!slicOverlay || !imageSize || !overlayReady) {
            return;
        }
        setZoom(1);
        setPanX(0);
        setPanY(0);

        requestAnimationFrame(() => {
            const container = containerRef.current;
            if (!container) {
                return;
            }
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            if (cw === 0 || ch === 0) {
                return;
            }

            const {bbox} = slicOverlay;
            const scaleX = cw / imageSize.w;
            const scaleY = ch / imageSize.h;
            const PADDING = 0.25;
            const paddedW = bbox.w * scaleX * (1 + PADDING * 2);
            const paddedH = bbox.h * scaleY * (1 + PADDING * 2);
            const fitZoom = Math.min(cw / paddedW, ch / paddedH, 20);

            const cx = (bbox.x + bbox.w / 2) * scaleX;
            const cy = (bbox.y + bbox.h / 2) * scaleY;
            setZoom(fitZoom);
            setPanX(cw / 2 - cx * fitZoom);
            setPanY(ch / 2 - cy * fitZoom);
        });
    }, [slicOverlay, overlayReady]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll-to-zoom (native, non-passive)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return;
        }
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            const {zoom: z, panX: px, panY: py} = viewRef.current;
            const newZ = Math.max(0.25, Math.min(20, z * factor));
            setZoom(newZ);
            setPanX(cx - ((cx - px) * newZ) / z);
            setPanY(cy - ((cy - py) * newZ) / z);
        };
        el.addEventListener("wheel", onWheel, {passive: false});
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    function getSuperpixelAt(e: React.MouseEvent): number | null {
        const overlay = overlayCanvasRef.current;
        if (!overlay || !slicOverlay || !imageSize) {
            return null;
        }
        const rect = overlay.getBoundingClientRect();
        const ix = Math.floor(
            (e.clientX - rect.left) * (imageSize.w / rect.width),
        );
        const iy = Math.floor(
            (e.clientY - rect.top) * (imageSize.h / rect.height),
        );
        const {labels, w: lw, h: lh, x: lx, y: ly} = slicOverlay.labelMap;
        const px = ix - lx;
        const py = iy - ly;
        if (px < 0 || py < 0 || px >= lw || py >= lh) {
            return null;
        }
        const id = labels[py * lw + px];
        return id === 0 ? null : id; // 0 = outside the segmented region
    }

    function handleOverlayMouseDown(e: React.MouseEvent) {
        if (e.button === 1) {
            e.preventDefault();
            const {panX: px, panY: py} = viewRef.current;
            panDragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                startPanX: px,
                startPanY: py,
            };
            setIsPanning(true);
            return;
        }
        if (e.button !== 0) {
            return;
        }
        const id = getSuperpixelAt(e);
        if (id === null) {
            return;
        }
        if (deletedRef.current.has(id)) {
            return;
        } // no-op click, no history entry
        pushLocalHistory();
        setDeleted((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }

    function handleOverlayMouseMove(e: React.MouseEvent) {
        if (panDragRef.current) {
            const dx = e.clientX - panDragRef.current.startX;
            const dy = e.clientY - panDragRef.current.startY;
            setPanX(panDragRef.current.startPanX + dx);
            setPanY(panDragRef.current.startPanY + dy);
            return;
        }
        // Nothing is tinted at rest, so the hovered segment is the only cue for
        // what a click would remove.
        const id = getSuperpixelAt(e);
        setHoveredId((prev) => (prev === id ? prev : id));
    }

    function handleOverlayMouseUp() {
        panDragRef.current = null;
        setIsPanning(false);
    }

    function handleOverlayMouseLeave() {
        handleOverlayMouseUp();
        setHoveredId(null);
    }

    function handleApply() {
        if (!slicOverlay || !imageSize) {
            return;
        }
        const kept = segmentIds.filter((id) => !deleted.has(id));
        if (kept.length === 0) {
            return;
        }
        const {targetMaskId} = slicOverlay;
        const {labels, w: lw, h: lh, x: lx, y: ly} = slicOverlay.labelMap;
        const {w: iw, h: ih} = imageSize;

        const mergeCanvas = document.createElement("canvas");
        mergeCanvas.width = iw;
        mergeCanvas.height = ih;
        const mCtx = mergeCanvas.getContext("2d")!;

        // One pass over the label map: every kept segment paints white.
        const merged = mCtx.createImageData(lw, lh);
        for (let i = 0; i < labels.length; i++) {
            const id = labels[i];
            if (id === 0 || deleted.has(id)) {
                continue;
            }
            const o = i * 4;
            merged.data[o] = 255;
            merged.data[o + 1] = 255;
            merged.data[o + 2] = 255;
            merged.data[o + 3] = 255;
        }
        mCtx.putImageData(merged, lx, ly);

        const newRle = canvasToRLE(mergeCanvas);
        const layerId = Date.now();

        commitHistory({
            action: "slic.result",
            payload: {regions: kept.length},
        });

        if (targetMaskId !== 0) {
            const layerKind =
                applyMode === "remove" ? ("hole" as const) : ("fill" as const);
            setMasks((prev) =>
                prev.map((m) => {
                    if (m.id !== targetMaskId) {
                        return m;
                    }
                    return {
                        ...m,
                        layers: [
                            ...m.layers,
                            {
                                id: layerId,
                                rleMask: newRle,
                                source: "manual" as const,
                                layerKind,
                            },
                        ],
                    };
                }),
            );
        } else {
            const newId = Date.now() + 1;
            const color = getDistinctColor(masks.length, SLIC_MASK_FILL_ALPHA);
            setMasks((prev) => [
                ...prev,
                {
                    id: newId,
                    label: `SLIC ${prev.length + 1}`,
                    layers: [
                        {
                            id: layerId,
                            rleMask: newRle,
                            source: "manual" as const,
                            layerKind: "fill" as const,
                        },
                    ],
                    point_coords: [],
                    point_labels: [],
                    color,
                },
            ]);
            setCurrentMask(newId);
        }

        setSlicOverlay(null);
    }

    if (!slicOverlay || !imageSize) {
        return null;
    }

    const {w: iw, h: ih} = imageSize;
    const transform = `matrix(${zoom},0,0,${zoom},${panX},${panY})`;
    const cursor = isPanning ? "grabbing" : "crosshair";

    return (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center gap-4 p-4">
            {!overlayReady ? (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#4FC3F7] animate-spin" />
                    <span className="text-white text-sm">
                        {t("slicPreparing")}
                    </span>
                </div>
            ) : null}
            {/* Toolbar + canvas + actions — hidden while the overlay is building */}
            <div className={overlayReady ? "contents" : "hidden"}>
                <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2 flex-wrap">
                    <span className="text-sm font-medium text-white/80">
                        {t("slicTitle")} — {segmentIds.length - deleted.size} /{" "}
                        {segmentIds.length} {t("slicKept")}
                    </span>
                    {slicOverlay.targetMaskId !== 0 ? (
                        <>
                            <div className="w-px h-5 bg-white/20" />
                            <div className="flex rounded overflow-hidden border border-white/15">
                                <button
                                    onClick={() => setApplyMode("add")}
                                    title={t("slicAddToMaskTooltip")}
                                    className={`px-3 py-1 text-xs font-medium transition-colors ${applyMode === "add" ? "bg-[#4FC3F7]/20 text-[#4FC3F7]" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                                    {t("slicAddToMask")}
                                </button>
                                <div className="w-px bg-white/15" />
                                <button
                                    onClick={() => setApplyMode("remove")}
                                    title={t("slicRemoveFromMaskTooltip")}
                                    className={`px-3 py-1 text-xs font-medium transition-colors ${applyMode === "remove" ? "bg-[#4FC3F7]/20 text-[#4FC3F7]" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                                    {t("slicRemoveFromMask")}
                                </button>
                            </div>
                        </>
                    ) : null}
                    <div className="w-px h-5 bg-white/20" />
                    <button
                        onClick={() => {
                            if (deleted.size === 0) {
                                return;
                            }
                            pushLocalHistory();
                            setDeleted(new Set());
                        }}
                        disabled={deleted.size === 0}
                        className="px-3 py-1 rounded text-sm text-white/60 hover:text-white transition-colors disabled:opacity-30">
                        {t("reset")}
                    </button>
                    <div className="w-px h-5 bg-white/20" />
                    <button
                        onClick={localUndo}
                        disabled={localPast.length === 0}
                        title={t("undoLastActionTitle")}
                        className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ArrowUturnLeftIcon
                            className="w-4 h-4"
                            strokeWidth={2.5}
                        />
                    </button>
                    <button
                        onClick={localRedo}
                        disabled={localFuture.length === 0}
                        title={t("redoTitle")}
                        className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ArrowUturnRightIcon
                            className="w-4 h-4"
                            strokeWidth={2.5}
                        />
                    </button>
                    <div className="w-px h-5 bg-white/20" />
                    <span className="text-xs text-white/50">
                        {t("zoomLabel")}
                    </span>
                    <input
                        type="range"
                        min={25}
                        max={2000}
                        value={Math.round(zoom * 100)}
                        onChange={(e) => {
                            const newZ = +e.target.value / 100;
                            const container = containerRef.current;
                            if (container) {
                                const cx = container.clientWidth / 2;
                                const cy = container.clientHeight / 2;
                                const {
                                    zoom: z,
                                    panX: px,
                                    panY: py,
                                } = viewRef.current;
                                setPanX(cx - ((cx - px) * newZ) / z);
                                setPanY(cy - ((cy - py) * newZ) / z);
                            }
                            setZoom(newZ);
                        }}
                        className="w-24"
                    />
                    <span className="text-xs text-white/60 w-12">
                        {Math.round(zoom * 100)}%
                    </span>
                </div>

                {/* Mode hint — explains what the kept superpixels do */}
                <div className="flex items-center gap-2 text-xs -mt-1">
                    <InformationCircleIcon className="w-4 h-4 shrink-0 text-white/50" />
                    {slicOverlay.targetMaskId === 0 ? (
                        <span className="text-white/60">
                            {t("slicHintNewMask")}
                        </span>
                    ) : applyMode === "add" ? (
                        <span className="text-[#4FC3F7]">
                            {t("slicHintAddPrefix")}{" "}
                            <strong>{t("slicHintAddEmphasis")}</strong>{" "}
                            {t("slicHintAddSuffix")}
                        </span>
                    ) : (
                        <span className="text-rose-400">
                            {t("slicHintRemovePrefix")}{" "}
                            <strong>{t("slicHintRemoveEmphasis")}</strong>{" "}
                            {t("slicHintRemoveSuffix")}
                        </span>
                    )}
                </div>

                {/* Image + overlay canvas */}
                <div
                    ref={containerRef}
                    style={{
                        overflow: "hidden",
                        display: "inline-block",
                        lineHeight: 0,
                        position: "relative",
                        maxHeight: "72vh",
                        maxWidth: "85vw",
                    }}>
                    <div
                        style={{
                            display: "inline-block",
                            lineHeight: 0,
                            transform,
                            transformOrigin: "0 0",
                        }}>
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            draggable={false}
                            style={{
                                maxHeight: "72vh",
                                maxWidth: "85vw",
                                display: "block",
                                userSelect: "none",
                            }}
                            alt=""
                        />
                        <canvas
                            ref={overlayCanvasRef}
                            width={iw}
                            height={ih}
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                cursor,
                            }}
                            onMouseDown={handleOverlayMouseDown}
                            onMouseMove={handleOverlayMouseMove}
                            onMouseUp={handleOverlayMouseUp}
                            onMouseLeave={handleOverlayMouseLeave}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-white/30">
                        {t("slicFooterHint")}
                    </span>
                    <button
                        onClick={() => setSlicOverlay(null)}
                        className="px-5 py-2 rounded-lg border border-white/20 text-sm hover:bg-white/10 transition-colors">
                        {t("cancel")}
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={segmentIds.length - deleted.size === 0}
                        className="px-5 py-2 rounded-lg bg-[#4FC3F7] text-black font-medium text-sm hover:bg-[#4FC3F7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {t("apply")} ({segmentIds.length - deleted.size})
                    </button>
                </div>
            </div>
            {/* end overlayReady wrapper */}
        </div>
    );
};
