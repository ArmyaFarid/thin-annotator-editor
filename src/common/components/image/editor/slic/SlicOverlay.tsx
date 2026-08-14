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
import {decode} from "@/jscocotools/mask.ts";
import {canvasToRLE} from "@/canvas/utils/maskMerge.ts";
import {getDistinctColor} from "@/canvas/color.ts";
import {SLIC_MASK_FILL_ALPHA} from "@/canvas/canvas-theme.ts";
import {commitHistoryAtom, historyScopeAtom} from "@/app/history.ts";
import {t} from "@/i18n/index.ts";

const MAX_SLIC_LOCAL_HISTORY = 50;

interface SlicOverlayProps {
    imageUrl: string;
}

interface PanDrag {
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
}

function hslToRgb(index: number, total: number): [number, number, number] {
    const h = (index / total) * 360;
    const s = 0.8;
    const l = 0.55;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    };
    return [
        Math.round(f(0) * 255),
        Math.round(f(8) * 255),
        Math.round(f(4) * 255),
    ];
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
    const [tilesReady, setTilesReady] = useState(false);
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
    const labelCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const tilesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
    const viewRef = useRef({zoom: 1, panX: 0, panY: 0});
    const panDragRef = useRef<PanDrag | null>(null);

    useEffect(() => {
        viewRef.current = {zoom, panX, panY};
    }, [zoom, panX, panY]);

    // Decode all RLEs once → build label canvas (hit-test) + pre-render tile per superpixel.
    // rAF defers heavy work by one frame so the loading overlay paints first.
    useEffect(() => {
        if (!slicOverlay || !imageSize) {
            setTilesReady(false);
            return;
        }
        setTilesReady(false);

        const rafId = requestAnimationFrame(() => {
            const {superpixels} = slicOverlay;
            const {w: iw, h: ih} = imageSize;

            const label = document.createElement("canvas");
            label.width = iw;
            label.height = ih;
            const lCtx = label.getContext("2d")!;
            const lData = lCtx.createImageData(iw, ih);
            const tiles = new Map<number, HTMLCanvasElement>();

            for (let si = 0; si < superpixels.length; si++) {
                const sp = superpixels[si];
                let decoded: Uint8Array;
                try {
                    const result = decode([sp.rle]);
                    decoded = result.data as Uint8Array;
                } catch {
                    continue;
                }

                const [h, w] = sp.rle.size;
                const storedId = sp.id + 1;
                const rHi = (storedId >> 8) & 0xff;
                const rLo = storedId & 0xff;
                const [cr, cg, cb] = hslToRgb(si, superpixels.length);
                const rgba = new Uint8ClampedArray(w * h * 4);

                for (let x = 0; x < w; x++) {
                    for (let y = 0; y < h; y++) {
                        if (decoded[x * h + y] !== 1) {
                            continue;
                        }

                        const li = (y * iw + x) * 4;
                        lData.data[li] = rHi;
                        lData.data[li + 1] = rLo;
                        lData.data[li + 3] = 255;

                        const isEdge =
                            x === 0 ||
                            y === 0 ||
                            x === w - 1 ||
                            y === h - 1 ||
                            decoded[(x - 1) * h + y] !== 1 ||
                            decoded[(x + 1) * h + y] !== 1 ||
                            decoded[x * h + (y - 1)] !== 1 ||
                            decoded[x * h + (y + 1)] !== 1;
                        const ti = (y * w + x) * 4;
                        rgba[ti] = cr;
                        rgba[ti + 1] = cg;
                        rgba[ti + 2] = cb;
                        rgba[ti + 3] = isEdge ? 210 : 28;
                    }
                }

                const tile = document.createElement("canvas");
                tile.width = w;
                tile.height = h;
                tile.getContext("2d")!.putImageData(
                    new ImageData(rgba, w, h),
                    0,
                    0,
                );
                tiles.set(sp.id, tile);
            }

            lCtx.putImageData(lData, 0, 0);
            labelCanvasRef.current = label;
            tilesRef.current = tiles;
            setTilesReady(true);
        });

        return () => cancelAnimationFrame(rafId);
    }, [slicOverlay, imageSize]);

    // Redraw: just composite pre-rendered tiles — no decoding, no allocation.
    // tilesReady in deps ensures this re-fires once the rAF build completes.
    const redrawOverlay = useCallback(() => {
        if (
            !tilesReady ||
            !slicOverlay ||
            !imageSize ||
            !overlayCanvasRef.current
        ) {
            return;
        }
        const ctx = overlayCanvasRef.current.getContext("2d")!;
        const {w: iw, h: ih} = imageSize;
        ctx.clearRect(0, 0, iw, ih);
        for (const sp of slicOverlay.superpixels) {
            if (deleted.has(sp.id)) {
                continue;
            }
            const tile = tilesRef.current.get(sp.id);
            if (!tile) {
                continue;
            }
            ctx.drawImage(tile, 0, 0, tile.width, tile.height, 0, 0, iw, ih);
        }
    }, [slicOverlay, imageSize, deleted, tilesReady]);

    useEffect(() => {
        redrawOverlay();
    }, [redrawOverlay]);

    // Auto-fit zoom once tiles are ready (container is visible at that point)
    useEffect(() => {
        if (!slicOverlay || !imageSize || !tilesReady) {
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
    }, [slicOverlay, tilesReady]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const label = labelCanvasRef.current;
        const overlay = overlayCanvasRef.current;
        if (!label || !overlay || !imageSize) {
            return null;
        }
        const rect = overlay.getBoundingClientRect();
        const ix = Math.floor(
            (e.clientX - rect.left) * (imageSize.w / rect.width),
        );
        const iy = Math.floor(
            (e.clientY - rect.top) * (imageSize.h / rect.height),
        );
        if (ix < 0 || iy < 0 || ix >= imageSize.w || iy >= imageSize.h) {
            return null;
        }
        const px = label.getContext("2d")!.getImageData(ix, iy, 1, 1).data;
        if (px[3] === 0) {
            return null;
        } // background — no superpixel written here
        const id = ((px[0] << 8) | px[1]) - 1; // undo the +1 offset applied at build time
        return id;
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
        }
    }

    function handleOverlayMouseUp() {
        panDragRef.current = null;
        setIsPanning(false);
    }

    function handleApply() {
        if (!slicOverlay || !imageSize) {
            return;
        }
        const remaining = slicOverlay.superpixels.filter(
            (sp) => !deleted.has(sp.id),
        );
        if (remaining.length === 0) {
            return;
        }
        const {superpixels: _, targetMaskId} = slicOverlay;
        const superpixels = remaining;
        const {w: iw, h: ih} = imageSize;

        const mergeCanvas = document.createElement("canvas");
        mergeCanvas.width = iw;
        mergeCanvas.height = ih;
        const mCtx = mergeCanvas.getContext("2d")!;

        for (const sp of superpixels) {
            let decoded: Uint8Array;
            try {
                const result = decode([sp.rle]);
                decoded = result.data as Uint8Array;
            } catch {
                continue;
            }

            const [h, w] = sp.rle.size;
            const rgba = new Uint8ClampedArray(w * h * 4);
            for (let x = 0; x < w; x++) {
                for (let y = 0; y < h; y++) {
                    if (decoded[x * h + y] === 1) {
                        const i = (y * w + x) * 4;
                        rgba[i] = 255;
                        rgba[i + 1] = 255;
                        rgba[i + 2] = 255;
                        rgba[i + 3] = 255;
                    }
                }
            }
            const tile = document.createElement("canvas");
            tile.width = w;
            tile.height = h;
            tile.getContext("2d")!.putImageData(
                new ImageData(rgba, w, h),
                0,
                0,
            );
            mCtx.drawImage(tile, 0, 0, w, h, 0, 0, iw, ih);
        }

        const newRle = canvasToRLE(mergeCanvas);
        const layerId = Date.now();

        commitHistory({
            action: "slic.result",
            payload: {regions: superpixels.length},
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
            {!tilesReady ? (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#4FC3F7] animate-spin" />
                    <span className="text-white text-sm">
                        {t("slicPreparing")}
                    </span>
                </div>
            ) : null}
            {/* Toolbar + canvas + actions — hidden while tiles are computing */}
            <div className={tilesReady ? "contents" : "hidden"}>
                <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2 flex-wrap">
                    <span className="text-sm font-medium text-white/80">
                        {t("slicTitle")} —{" "}
                        {slicOverlay.superpixels.length - deleted.size} /{" "}
                        {slicOverlay.superpixels.length} {t("slicKept")}
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
                    <span className="text-xs text-white/50">{t("zoomLabel")}</span>
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
                            onMouseLeave={handleOverlayMouseUp}
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
                        disabled={
                            slicOverlay.superpixels.length - deleted.size === 0
                        }
                        className="px-5 py-2 rounded-lg bg-[#4FC3F7] text-black font-medium text-sm hover:bg-[#4FC3F7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {t("apply")} (
                        {slicOverlay.superpixels.length - deleted.size})
                    </button>
                </div>
            </div>
            {/* end tilesReady wrapper */}
        </div>
    );
};
