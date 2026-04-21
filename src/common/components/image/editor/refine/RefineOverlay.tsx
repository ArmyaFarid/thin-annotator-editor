import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtom} from "jotai";
import {masksAtom, refineModeAtom} from "@/app/atom.ts";
import {canvasToRLE, mergeToCanvas} from "@/canvas/utils/maskMerge.ts";

interface RefineOverlayProps {
    imageUrl: string;
    imageW: number;
    imageH: number;
}

export const RefineOverlay: React.FC<RefineOverlayProps> = ({imageUrl, imageW, imageH}) => {
    const [refineMode, setRefineMode] = useAtom(refineModeAtom);
    const [masks, setMasks] = useAtom(masksAtom);
    const [tool, setTool] = useState<"erase" | "add">("erase");
    const [brushSize, setBrushSize] = useState(20);

    const displayCanvasRef = useRef<HTMLCanvasElement>(null);
    const workingRef = useRef<HTMLCanvasElement | null>(null);
    const colorBufferRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef(false);

    const targetMask = masks.find(m => m.id === refineMode);

    const redrawDisplay = useCallback(() => {
        const display = displayCanvasRef.current;
        const working = workingRef.current;
        const colorBuf = colorBufferRef.current;
        if (!display || !working || !colorBuf || !targetMask) return;

        // Build colored representation from white-fg working canvas
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

    // Init working canvas when entering refine mode
    useEffect(() => {
        if (!targetMask || imageW === 0 || imageH === 0) return;

        const working = mergeToCanvas(targetMask, imageW, imageH);
        workingRef.current = working;

        const colorBuf = document.createElement("canvas");
        colorBuf.width = imageW;
        colorBuf.height = imageH;
        colorBufferRef.current = colorBuf;

        redrawDisplay();
    }, [refineMode]); // eslint-disable-line react-hooks/exhaustive-deps

    function getBrushRadiusInImageSpace(): number {
        const display = displayCanvasRef.current;
        if (!display) return brushSize;
        const rect = display.getBoundingClientRect();
        return brushSize * (imageW / rect.width);
    }

    function drawBrush(e: React.MouseEvent) {
        const display = displayCanvasRef.current;
        const working = workingRef.current;
        if (!display || !working) return;

        const rect = display.getBoundingClientRect();
        const scaleX = imageW / rect.width;
        const scaleY = imageH / rect.height;
        const ix = (e.clientX - rect.left) * scaleX;
        const iy = (e.clientY - rect.top) * scaleY;
        const radius = getBrushRadiusInImageSpace();

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
        isDrawing.current = true;
        drawBrush(e);
    }

    function handleMouseMove(e: React.MouseEvent) {
        if (!isDrawing.current) return;
        drawBrush(e);
    }

    function handleMouseUp() {
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

    function handleCancel() {
        setRefineMode(0);
    }

    if (!targetMask) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center gap-4 p-4">
            {/* Header toolbar */}
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2">
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
                <span className="text-xs text-white/50">Taille:</span>
                <input
                    type="range"
                    min={5}
                    max={100}
                    value={brushSize}
                    onChange={e => setBrushSize(+e.target.value)}
                    className="w-24"
                />
                <span className="text-xs text-white/60 w-8">{brushSize}px</span>
            </div>

            {/* Image + overlay canvas */}
            <div className="relative inline-block" style={{lineHeight: 0}}>
                <img
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
                        cursor: tool === "erase" ? "cell" : "crosshair",
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleCancel}
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
