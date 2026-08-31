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
    type SlicOverlayState,
    currentMaskAtom,
    activeImageSizeAtom,
} from "@/app/atom.ts";
import {canvasToRLE} from "@/canvas/utils/maskMerge.ts";
import {labelMapToCrackPath} from "@/canvas/utils/labelCracks.ts";
import {getDistinctColor} from "@/canvas/color.ts";
import {SLIC_MASK_FILL_ALPHA, theme} from "@/canvas/canvas-theme.ts";
import {
    ZoomableImageStage,
    type StagePointer,
} from "@/canvas/ZoomableImageStage.tsx";
import {
    fitToBox,
    zoomAt,
    type View,
    type ZoomLimits,
} from "@/canvas/zoomPan.ts";
import {commitHistoryAtom, historyScopeAtom} from "@/app/history.ts";
import {t} from "@/i18n/index.ts";

const MAX_SLIC_LOCAL_HISTORY = 50;
// Matches the main canvas, so magnification in the modal reaches as far.
const SLIC_ZOOM_LIMITS: ZoomLimits = {min: 0.05, max: 20};

interface SlicOverlayProps {
    imageUrl: string;
}

interface SlicTile {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
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
    // Bumped when the traced path changes, so the stage redraws.
    const [contourRevision, setContourRevision] = useState(0);
    // Only meaningful when targetMaskId !== 0. "add" → kept superpixels
    // become a fill layer on the active mask; "remove" → a hole layer.
    const [applyMode, setApplyMode] = useState<"add" | "remove">("add");
    const [view, setView] = useState<View>({zoom: 1, panX: 0, panY: 0});
    const [stageSize, setStageSize] = useState({w: 0, h: 0});

    const contourPathRef = useRef<Path2D | null>(null);
    const hoverTilesRef = useRef<Map<number, SlicTile>>(new Map());
    const boundsRef = useRef<{
        minX: Int32Array;
        minY: Int32Array;
        maxX: Int32Array;
        maxY: Int32Array;
        maxId: number;
    } | null>(null);

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

            const {x: lx, y: ly} = slicOverlay.labelMap;
            const kept = new Uint8Array(maxId + 1).fill(1);
            contourPathRef.current = labelMapToCrackPath(
                labels,
                lw,
                lh,
                kept,
                lx,
                ly,
            );

            boundsRef.current = {minX, minY, maxX, maxY, maxId};
            hoverTilesRef.current = new Map();
            setSegmentIds(ids);
            setOverlayReady(true);
        });

        return () => cancelAnimationFrame(rafId);
    }, [slicOverlay, imageSize]);

    // The outline of the kept region changes wholesale when a segment is
    // removed, so the path is retraced rather than patched.
    useEffect(() => {
        const bounds = boundsRef.current;
        if (!slicOverlay || !overlayReady || !bounds) {
            return;
        }
        const {labels, w: lw, h: lh, x: lx, y: ly} = slicOverlay.labelMap;
        const kept = new Uint8Array(bounds.maxId + 1).fill(1);
        for (const id of deleted) {
            if (id <= bounds.maxId) {
                kept[id] = 0;
            }
        }
        contourPathRef.current = labelMapToCrackPath(
            labels,
            lw,
            lh,
            kept,
            lx,
            ly,
        );
        setContourRevision((r) => r + 1);
    }, [deleted, slicOverlay, overlayReady]);

    // Stable identity: the stage re-attaches its ResizeObserver on change.
    const handleStageResize = useCallback((w: number, h: number) => {
        setStageSize((prev) => (prev.w === w && prev.h === h ? prev : {w, h}));
    }, []);

    // Lazily rasterize the faint hover wash for one segment. Only the hovered
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
    const drawDocument = useCallback(
        (ctx: CanvasRenderingContext2D, v: View) => {
            const path = contourPathRef.current;
            if (!overlayReady || !slicOverlay || !path) {
                return;
            }

            if (hoveredId !== null && !deleted.has(hoveredId)) {
                const tile = getHoverTile(hoveredId);
                if (tile) {
                    ctx.drawImage(tile.canvas, tile.x, tile.y);
                }
            }

            const {
                contourWidth,
                contourColor,
                contourCasing,
                contourCasingWidth,
            } = theme.slic;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.strokeStyle = contourCasing;
            ctx.lineWidth = (contourWidth + contourCasingWidth * 2) / v.zoom;
            ctx.stroke(path);
            ctx.strokeStyle = contourColor;
            ctx.lineWidth = contourWidth / v.zoom;
            ctx.stroke(path);
        },
        [
            slicOverlay,
            deleted,
            overlayReady,
            hoveredId,
            getHoverTile,
            contourRevision,
        ],
    );

    // Auto-fit once the mesh is built and the stage has a measured size.
    const fittedRef = useRef<SlicOverlayState | null>(null);
    useEffect(() => {
        if (
            !slicOverlay ||
            !overlayReady ||
            stageSize.w === 0 ||
            stageSize.h === 0 ||
            fittedRef.current === slicOverlay
        ) {
            return;
        }
        fittedRef.current = slicOverlay;
        setView(
            fitToBox(
                slicOverlay.bbox,
                stageSize.w,
                stageSize.h,
                0.25,
                SLIC_ZOOM_LIMITS,
            ),
        );
    }, [slicOverlay, overlayReady, stageSize]);

    function getSuperpixelAt(p: StagePointer): number | null {
        if (!slicOverlay) {
            return null;
        }
        const {labels, w: lw, h: lh, x: lx, y: ly} = slicOverlay.labelMap;
        const px = Math.floor(p.x) - lx;
        const py = Math.floor(p.y) - ly;
        if (px < 0 || py < 0 || px >= lw || py >= lh) {
            return null;
        }
        const id = labels[py * lw + px];
        return id === 0 ? null : id; // 0 = outside the segmented region
    }

    function handleStageMouseDown(p: StagePointer) {
        if (p.event.button !== 0) {
            return;
        }
        const id = getSuperpixelAt(p);
        if (id === null || deletedRef.current.has(id)) {
            return; // no-op click, no history entry
        }
        pushLocalHistory();
        setDeleted((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }

    function handleStageMouseMove(p: StagePointer) {
        // Nothing is tinted at rest, so the hovered segment is the only cue for
        // what a click would remove.
        const id = getSuperpixelAt(p);
        setHoveredId((prev) => (prev === id ? prev : id));
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
        const mCtx = mergeCanvas.getContext("2d", {
            willReadFrequently: true,
        })!;

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
                        min={5}
                        max={2000}
                        value={Math.round(view.zoom * 100)}
                        onChange={(e) => {
                            const factor = +e.target.value / 100 / view.zoom;
                            setView((v) =>
                                zoomAt(
                                    v,
                                    stageSize.w / 2,
                                    stageSize.h / 2,
                                    factor,
                                    SLIC_ZOOM_LIMITS,
                                ),
                            );
                        }}
                        className="w-24"
                    />
                    <span className="text-xs text-white/60 w-12">
                        {Math.round(view.zoom * 100)}%
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

                {/* Image + overlay stage */}
                <div
                    style={{
                        position: "relative",
                        width: "85vw",
                        height: "72vh",
                        overflow: "hidden",
                    }}>
                    <ZoomableImageStage
                        imageUrl={imageUrl}
                        imageW={imageSize.w}
                        imageH={imageSize.h}
                        view={view}
                        onViewChange={setView}
                        zoomLimits={SLIC_ZOOM_LIMITS}
                        cursor="crosshair"
                        drawDocument={drawDocument}
                        onStageMouseDown={handleStageMouseDown}
                        onStageMouseMove={handleStageMouseMove}
                        onStageMouseLeave={() => setHoveredId(null)}
                        onContainerResize={handleStageResize}
                        onPanChange={(panning) => {
                            if (panning) {
                                setHoveredId(null);
                            }
                        }}
                    />
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
