import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtom} from "jotai";
import {masksAtom, refineModeAtom} from "@/app/atom.ts";
import {canvasToRLE, mergeToCanvas} from "@/canvas/utils/maskMerge.ts";

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

    const redrawDisplay = useCallback(() => {
        const display = displayCanvasRef.current;
        const working = workingRef.current;
        const colorBuf = colorBufferRef.current;
        if (!display || !working || !colorBuf || !targetMask) return;

        const cCtx = colorBuf.getContext("2d")!;
        cCtx.clearRect(0, 0, imageW, imageH);
        cCtx.drawImage(working, 0, 0);
        cCtx.globalCompositeOperation = "source-in";
        const {r, g, b} = targetMask.color;
        cCtx.fillStyle = `rgba(${r},${g},${b},0.6)`;
        cCtx.fillRect(0, 0, imageW, imageH);
        cCtx.globalCompositeOperation = "source-over";

        const ctx = display.getContext("2d")!;
        ctx.clearRect(0, 0, imageW, imageH);
        ctx.drawImage(colorBuf, 0, 0);
    }, [targetMask, imageW, imageH]);

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
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center gap-4 p-4">
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
