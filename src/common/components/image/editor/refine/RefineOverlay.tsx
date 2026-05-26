import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtom, useSetAtom} from "jotai";
import {ArrowUturnLeftIcon, ArrowUturnRightIcon} from "@heroicons/react/24/outline";
import {masksAtom, refineModeAtom} from "@/app/atom.ts";
import {canvasToRLE, mergeToCanvas} from "@/canvas/utils/maskMerge.ts";
import {decode} from "@/jscocotools/mask.ts";
import {commitHistoryAtom, historyScopeAtom} from "@/app/history.ts";

interface RLE {
    counts: string;
    size: [number, number];
}

const MAX_REFINE_LOCAL_HISTORY = 20;

// Paint an RLE-encoded mask onto a working canvas as white pixels with
// alpha 255 where set, transparent elsewhere. Matches the format the brush
// strokes accumulate in workingRef so undo/redo restores byte-for-byte.
function applyRleToCanvas(rle: RLE, target: HTMLCanvasElement): void {
    const decoded = decode([rle]);
    const data = decoded.data as Uint8Array;
    const [maskH, maskW] = rle.size;
    const rgba = new Uint8ClampedArray(maskW * maskH * 4);
    for (let x = 0; x < maskW; x++) {
        for (let y = 0; y < maskH; y++) {
            if (data[x * maskH + y] === 1) {
                const i = (y * maskW + x) * 4;
                rgba[i] = 255;
                rgba[i + 1] = 255;
                rgba[i + 2] = 255;
                rgba[i + 3] = 255;
            }
        }
    }
    const ctx = target.getContext("2d")!;
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.putImageData(new ImageData(rgba, maskW, maskH), 0, 0);
}

interface RefineOverlayProps {
    imageUrl: string;
    imageW: number;
    imageH: number;
}

interface PanDrag { startX: number; startY: number; startPanX: number; startPanY: number }

function getWorkingBounds(canvas: HTMLCanvasElement): {x: number; y: number; w: number; h: number} | null {
    const {width: w, height: h} = canvas;
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (pixels[(y * w + x) * 4 + 3] > 127) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    return maxX === -1 ? null : {x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1};
}

export const RefineOverlay: React.FC<RefineOverlayProps> = ({imageUrl, imageW, imageH}) => {
    const [refineMode, setRefineMode] = useAtom(refineModeAtom);
    const [masks, setMasks] = useAtom(masksAtom);
    const [tool, setTool] = useState<"erase" | "add">("erase");
    const [brushSize, setBrushSize] = useState(20);
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isPanning, setIsPanning] = useState(false);

    const [borderOnly, setBorderOnly] = useState(false);
    const borderOnlyRef = useRef(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const displayCanvasRef = useRef<HTMLCanvasElement>(null);
    const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
    const workingRef = useRef<HTMLCanvasElement | null>(null);
    const colorBufferRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef(false);
    const panDragRef = useRef<PanDrag | null>(null);
    const viewRef = useRef({zoom: 1, panX: 0, panY: 0});

    const targetMask = masks.find(m => m.id === refineMode);

    useEffect(() => { viewRef.current = {zoom, panX, panY}; }, [zoom, panX, panY]);

    const setHistoryScope = useSetAtom(historyScopeAtom);
    const commitHistory = useSetAtom(commitHistoryAtom);

    const redrawDisplay = useCallback(() => {
        const display = displayCanvasRef.current;
        const working = workingRef.current;
        const colorBuf = colorBufferRef.current;
        if (!display || !working || !colorBuf || !targetMask) return;

        const {r, g, b} = targetMask.color;
        const ctx = display.getContext("2d")!;
        ctx.clearRect(0, 0, imageW, imageH);

        if (borderOnlyRef.current) {
            // Build colored full mask
            const cCtx = colorBuf.getContext("2d")!;
            cCtx.clearRect(0, 0, imageW, imageH);
            cCtx.drawImage(working, 0, 0);
            cCtx.globalCompositeOperation = "source-in";
            cCtx.fillStyle = `rgba(${r},${g},${b},0.85)`;
            cCtx.fillRect(0, 0, imageW, imageH);
            cCtx.globalCompositeOperation = "source-over";

            // Compute eroded (interior) mask via 4-direction intersection
            const eroded = document.createElement("canvas");
            eroded.width = imageW;
            eroded.height = imageH;
            const eCtx = eroded.getContext("2d")!;
            eCtx.drawImage(working, 0, 0);
            eCtx.globalCompositeOperation = "destination-in";
            const t = 3;
            eCtx.drawImage(working, t, 0);
            eCtx.drawImage(working, -t, 0);
            eCtx.drawImage(working, 0, t);
            eCtx.drawImage(working, 0, -t);
            eCtx.globalCompositeOperation = "source-over";

            // Draw full mask then subtract interior → only border remains
            ctx.drawImage(colorBuf, 0, 0);
            ctx.globalCompositeOperation = "destination-out";
            ctx.drawImage(eroded, 0, 0);
            ctx.globalCompositeOperation = "source-over";
        } else {
            const cCtx = colorBuf.getContext("2d")!;
            cCtx.clearRect(0, 0, imageW, imageH);
            cCtx.drawImage(working, 0, 0);
            cCtx.globalCompositeOperation = "source-in";
            cCtx.fillStyle = `rgba(${r},${g},${b},0.6)`;
            cCtx.fillRect(0, 0, imageW, imageH);
            cCtx.globalCompositeOperation = "source-over";
            ctx.drawImage(colorBuf, 0, 0);
        }
    }, [targetMask, imageW, imageH]);

    // ── Local refine undo: per-stroke RLE snapshots of `workingRef`. ──
    const [localPast, setLocalPast] = useState<RLE[]>([]);
    const [localFuture, setLocalFuture] = useState<RLE[]>([]);

    // Snapshot the current working canvas BEFORE a stroke starts.
    const pushLocalHistory = useCallback(() => {
        if (!workingRef.current) return;
        const snapshot = canvasToRLE(workingRef.current);
        setLocalPast(past => {
            const next = [...past, snapshot];
            return next.length > MAX_REFINE_LOCAL_HISTORY
                ? next.slice(-MAX_REFINE_LOCAL_HISTORY)
                : next;
        });
        setLocalFuture([]);
    }, []);

    const localUndo = useCallback(() => {
        setLocalPast(past => {
            if (past.length === 0 || !workingRef.current) return past;
            const previous = past[past.length - 1];
            const current = canvasToRLE(workingRef.current);
            setLocalFuture(f => [...f, current]);
            applyRleToCanvas(previous, workingRef.current);
            redrawDisplay();
            return past.slice(0, -1);
        });
    }, [redrawDisplay]);

    const localRedo = useCallback(() => {
        setLocalFuture(future => {
            if (future.length === 0 || !workingRef.current) return future;
            const next = future[future.length - 1];
            const current = canvasToRLE(workingRef.current);
            setLocalPast(p => [...p, current]);
            applyRleToCanvas(next, workingRef.current);
            redrawDisplay();
            return future.slice(0, -1);
        });
    }, [redrawDisplay]);

    // Claim refine scope on mount, release on unmount.
    useEffect(() => {
        setHistoryScope("refine");
        return () => setHistoryScope("global");
    }, [setHistoryScope]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) localRedo(); else localUndo();
            } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
                e.preventDefault();
                localRedo();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [localUndo, localRedo]);

    // Init working canvas + auto-zoom when entering refine mode
    useEffect(() => {
        if (!targetMask || imageW === 0 || imageH === 0) return;

        const working = mergeToCanvas(targetMask, imageW, imageH);
        workingRef.current = working;

        const colorBuf = document.createElement("canvas");
        colorBuf.width = imageW;
        colorBuf.height = imageH;
        colorBufferRef.current = colorBuf;

        redrawDisplay();

        // Reset then auto-fit after layout is painted
        setZoom(1);
        setPanX(0);
        setPanY(0);

        requestAnimationFrame(() => {
            const img = imgRef.current;
            if (!img) return;
            const displayW = img.clientWidth;
            const displayH = img.clientHeight;
            if (displayW === 0 || displayH === 0) return;

            const bounds = getWorkingBounds(working);
            if (!bounds) return;

            const scaleX = displayW / imageW;
            const scaleY = displayH / imageH;
            const PADDING = 0.3;
            const paddedW = bounds.w * scaleX * (1 + PADDING * 2);
            const paddedH = bounds.h * scaleY * (1 + PADDING * 2);
            const fitZoom = Math.min(displayW / paddedW, displayH / paddedH, 20);

            const cx = (bounds.x + bounds.w / 2) * scaleX;
            const cy = (bounds.y + bounds.h / 2) * scaleY;
            const newPanX = displayW / 2 - cx * fitZoom;
            const newPanY = displayH / 2 - cy * fitZoom;

            setZoom(fitZoom);
            setPanX(newPanX);
            setPanY(newPanY);
        });
    }, [refineMode]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        borderOnlyRef.current = borderOnly;
        redrawDisplay();
    }, [borderOnly, redrawDisplay]);

    // Scroll-to-zoom (native, non-passive to allow preventDefault)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            const {zoom: z, panX: px, panY: py} = viewRef.current;
            const newZ = Math.max(0.25, Math.min(20, z * factor));
            setZoom(newZ);
            setPanX(cx - (cx - px) * newZ / z);
            setPanY(cy - (cy - py) * newZ / z);
        };
        el.addEventListener("wheel", onWheel, {passive: false});
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    function drawCursor(e: React.MouseEvent) {
        const cursor = cursorCanvasRef.current;
        const display = displayCanvasRef.current;
        if (!cursor || !display) return;
        const rect = display.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = cursor.getContext("2d")!;
        ctx.clearRect(0, 0, cursor.width, cursor.height);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x * (imageW / rect.width), y * (imageH / rect.height), brushSize * (imageW / rect.width), 0, Math.PI * 2);
        if (tool === "erase") {
            ctx.strokeStyle = "rgba(255,80,80,0.9)";
            ctx.fillStyle = "rgba(255,80,80,0.12)";
        } else {
            ctx.strokeStyle = "rgba(80,195,247,0.9)";
            ctx.fillStyle = "rgba(80,195,247,0.12)";
        }
        ctx.lineWidth = 1.5 * (imageW / rect.width);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function clearCursor() {
        const cursor = cursorCanvasRef.current;
        if (!cursor) return;
        cursor.getContext("2d")!.clearRect(0, 0, cursor.width, cursor.height);
    }

    function drawBrush(e: React.MouseEvent) {
        const display = displayCanvasRef.current;
        const working = workingRef.current;
        if (!display || !working) return;
        const rect = display.getBoundingClientRect();
        const ix = (e.clientX - rect.left) * (imageW / rect.width);
        const iy = (e.clientY - rect.top) * (imageH / rect.height);
        const radius = brushSize * (imageW / rect.width);
        const wCtx = working.getContext("2d")!;
        wCtx.save();
        wCtx.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
        wCtx.fillStyle = "rgba(255,255,255,1)";
        wCtx.beginPath();
        wCtx.arc(ix, iy, radius, 0, Math.PI * 2);
        wCtx.fill();
        wCtx.restore();
        redrawDisplay();
    }

    function handleMouseDown(e: React.MouseEvent) {
        if (e.button === 1) {
            e.preventDefault();
            const {panX: px, panY: py} = viewRef.current;
            panDragRef.current = {startX: e.clientX, startY: e.clientY, startPanX: px, startPanY: py};
            setIsPanning(true);
            return;
        }
        if (e.button !== 0) return;
        pushLocalHistory();   // snapshot pre-stroke state for local undo
        isDrawing.current = true;
        drawBrush(e);
    }

    function handleMouseMove(e: React.MouseEvent) {
        if (panDragRef.current) {
            const dx = e.clientX - panDragRef.current.startX;
            const dy = e.clientY - panDragRef.current.startY;
            setPanX(panDragRef.current.startPanX + dx);
            setPanY(panDragRef.current.startPanY + dy);
            clearCursor();
            return;
        }
        drawCursor(e);
        if (!isDrawing.current) return;
        drawBrush(e);
    }

    function handleMouseUp() {
        panDragRef.current = null;
        setIsPanning(false);
        isDrawing.current = false;
    }

    function handleApply() {
        if (!workingRef.current) return;
        const newRle = canvasToRLE(workingRef.current);
        const layerId = Date.now();
        // Whole refine session becomes a single GLOBAL undo step.
        commitHistory({action: "other", payload: {note: "refine apply"}});
        setMasks(prev =>
            prev.map(m => {
                if (m.id !== refineMode) return m;
                return {...m, layers: [{id: layerId, rleMask: newRle, source: "sam" as const}]};
            }),
        );
        setRefineMode(0);
    }

    if (!targetMask) return null;

    const transform = `matrix(${zoom},0,0,${zoom},${panX},${panY})`;
    const canvasCursor = isPanning ? "grabbing" : (tool === "erase" ? "cell" : "crosshair");

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center gap-4 p-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2 flex-wrap">
                <span className="text-sm font-medium text-white/80">
                    Raffinement — {targetMask.label}
                </span>
                <div className="w-px h-5 bg-white/20" />
                <button
                    onClick={() => setTool("erase")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${tool === "erase" ? "bg-[#4FC3F7]/20 text-[#4FC3F7] ring-1 ring-[#4FC3F7]/40" : "text-white/60 hover:text-white"}`}>
                    Gomme
                </button>
                <button
                    onClick={() => setTool("add")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${tool === "add" ? "bg-[#4FC3F7]/20 text-[#4FC3F7] ring-1 ring-[#4FC3F7]/40" : "text-white/60 hover:text-white"}`}>
                    Ajouter
                </button>
                <div className="w-px h-5 bg-white/20" />
                <button
                    onClick={localUndo}
                    disabled={localPast.length === 0}
                    title="Annuler le dernier trait (Ctrl+Z)"
                    className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <ArrowUturnLeftIcon className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button
                    onClick={localRedo}
                    disabled={localFuture.length === 0}
                    title="Rétablir (Ctrl+Shift+Z)"
                    className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <ArrowUturnRightIcon className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <div className="w-px h-5 bg-white/20" />
                <span className="text-xs text-white/50">Pinceau:</span>
                <input
                    type="range" min={5} max={100} value={brushSize}
                    onChange={e => setBrushSize(+e.target.value)}
                    className="w-24"
                />
                <span className="text-xs text-white/60 w-8">{brushSize}px</span>
                <div className="w-px h-5 bg-white/20" />
                <span className="text-xs text-white/50">Zoom:</span>
                <input
                    type="range" min={25} max={2000} value={Math.round(zoom * 100)}
                    onChange={e => {
                        const newZ = +e.target.value / 100;
                        const img = imgRef.current;
                        if (img) {
                            const cx = img.clientWidth / 2;
                            const cy = img.clientHeight / 2;
                            const {zoom: z, panX: px, panY: py} = viewRef.current;
                            setPanX(cx - (cx - px) * newZ / z);
                            setPanY(cy - (cy - py) * newZ / z);
                        }
                        setZoom(newZ);
                    }}
                    className="w-24"
                />
                <span className="text-xs text-white/60 w-12">{Math.round(zoom * 100)}%</span>
                <div className="w-px h-5 bg-white/20" />
                <button
                    onClick={() => setBorderOnly(!borderOnly)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${borderOnly ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40" : "text-white/60 hover:text-white"}`}>
                    Contours
                </button>
            </div>

            {/* Image + overlay canvas */}
            <div
                ref={containerRef}
                style={{overflow: "hidden", display: "inline-block", lineHeight: 0, position: "relative"}}>
                <div style={{display: "inline-block", lineHeight: 0, transform, transformOrigin: "0 0"}}>
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        draggable={false}
                        style={{maxHeight: "72vh", maxWidth: "85vw", display: "block", userSelect: "none"}}
                        alt=""
                    />
                    <canvas
                        ref={displayCanvasRef}
                        width={imageW}
                        height={imageH}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                        }}
                    />
                    <canvas
                        ref={cursorCanvasRef}
                        width={imageW}
                        height={imageH}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            cursor: canvasCursor,
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => { clearCursor(); handleMouseUp(); }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <span className="text-xs text-white/30">Molette: zoom · Clic molette: déplacer</span>
                <button
                    onClick={() => setRefineMode(0)}
                    className="px-5 py-2 rounded-lg border border-white/20 text-sm hover:bg-white/10 transition-colors">
                    Annuler
                </button>
                <button
                    onClick={handleApply}
                    className="px-5 py-2 rounded-lg bg-[#4FC3F7] text-black font-medium text-sm hover:bg-[#4FC3F7]/90 transition-colors">
                    Appliquer
                </button>
            </div>
        </div>
    );
};
