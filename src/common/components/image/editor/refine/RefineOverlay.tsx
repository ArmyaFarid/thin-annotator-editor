import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtom, useSetAtom} from "jotai";
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
} from "@heroicons/react/24/outline";
import {masksAtom, refineModeAtom} from "@/app/atom.ts";
import {canvasToRLE, mergeToCanvas} from "@/canvas/utils/maskMerge.ts";
import {decode} from "@/jscocotools/mask.ts";
import {commitHistoryAtom, historyScopeAtom} from "@/app/history.ts";
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
import {t} from "@/i18n/index.ts";

interface RLE {
    counts: string;
    size: [number, number];
}

const MAX_REFINE_LOCAL_HISTORY = 20;
// Matches the main canvas, so magnification reaches as far here as it does there.
const REFINE_ZOOM_LIMITS: ZoomLimits = {min: 0.05, max: 20};
// Brush diameter in image pixels.
const BRUSH_MIN = 1;
const BRUSH_MAX = 200;

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

function getWorkingBounds(
    canvas: HTMLCanvasElement,
): {x: number; y: number; w: number; h: number} | null {
    const {width: w, height: h} = canvas;
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
    let minX = w,
        minY = h,
        maxX = -1,
        maxY = -1;
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
    return maxX === -1
        ? null
        : {x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1};
}

export const RefineOverlay: React.FC<RefineOverlayProps> = ({
    imageUrl,
    imageW,
    imageH,
}) => {
    const [refineMode, setRefineMode] = useAtom(refineModeAtom);
    const [masks, setMasks] = useAtom(masksAtom);
    const [tool, setTool] = useState<"erase" | "add">("erase");
    const [brushSize, setBrushSize] = useState(20);
    // Draft of the typed brush size, so the field can be cleared mid-edit
    // without the value snapping back on every keystroke.
    const [brushDraft, setBrushDraft] = useState("20");

    useEffect(() => {
        setBrushDraft(String(brushSize));
    }, [brushSize]);

    function commitBrushDraft(raw: string) {
        const n = Math.round(Number(raw));
        if (raw.trim() === "" || !Number.isFinite(n)) {
            setBrushDraft(String(brushSize));
            return;
        }
        setBrushSize(Math.max(BRUSH_MIN, Math.min(BRUSH_MAX, n)));
    }
    const [view, setView] = useState<View>({zoom: 1, panX: 0, panY: 0});
    const [stageSize, setStageSize] = useState({w: 0, h: 0});
    // Brush centre in image pixels; null when the pointer is off the stage.
    const [cursorPos, setCursorPos] = useState<{x: number; y: number} | null>(
        null,
    );
    // Bumped whenever the composited mask changes, so the stage repaints.
    const [displayRevision, setDisplayRevision] = useState(0);

    const [borderOnly, setBorderOnly] = useState(false);
    const borderOnlyRef = useRef(false);

    const displayRef = useRef<HTMLCanvasElement | null>(null);
    const workingRef = useRef<HTMLCanvasElement | null>(null);
    const colorBufferRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef(false);

    const targetMask = masks.find((m) => m.id === refineMode);

    const setHistoryScope = useSetAtom(historyScopeAtom);
    const commitHistory = useSetAtom(commitHistoryAtom);

    const redrawDisplay = useCallback(() => {
        const display = displayRef.current;
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
            const erosion = 3;
            eCtx.drawImage(working, erosion, 0);
            eCtx.drawImage(working, -erosion, 0);
            eCtx.drawImage(working, 0, erosion);
            eCtx.drawImage(working, 0, -erosion);
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
        setDisplayRevision((r) => r + 1);
    }, [targetMask, imageW, imageH]);

    // ── Local refine undo: per-stroke RLE snapshots of `workingRef`. ──
    const [localPast, setLocalPast] = useState<RLE[]>([]);
    const [localFuture, setLocalFuture] = useState<RLE[]>([]);

    // Snapshot the current working canvas BEFORE a stroke starts.
    const pushLocalHistory = useCallback(() => {
        if (!workingRef.current) return;
        const snapshot = canvasToRLE(workingRef.current);
        setLocalPast((past) => {
            const next = [...past, snapshot];
            return next.length > MAX_REFINE_LOCAL_HISTORY
                ? next.slice(-MAX_REFINE_LOCAL_HISTORY)
                : next;
        });
        setLocalFuture([]);
    }, []);

    const localUndo = useCallback(() => {
        const working = workingRef.current;
        if (localPast.length === 0 || !working) return;
        const previous = localPast[localPast.length - 1];
        setLocalFuture((f) => [...f, canvasToRLE(working)]);
        setLocalPast((p) => p.slice(0, -1));
        applyRleToCanvas(previous, working);
        redrawDisplay();
    }, [localPast, redrawDisplay]);

    const localRedo = useCallback(() => {
        const working = workingRef.current;
        if (localFuture.length === 0 || !working) return;
        const next = localFuture[localFuture.length - 1];
        setLocalPast((p) => [...p, canvasToRLE(working)]);
        setLocalFuture((f) => f.slice(0, -1));
        applyRleToCanvas(next, working);
        redrawDisplay();
    }, [localFuture, redrawDisplay]);

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
                if (e.shiftKey) localRedo();
                else localUndo();
            } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
                e.preventDefault();
                localRedo();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [localUndo, localRedo]);

    // Init working canvas when entering refine mode.
    const fittedRef = useRef(0);
    useEffect(() => {
        if (!targetMask || imageW === 0 || imageH === 0) return;

        const working = mergeToCanvas(targetMask, imageW, imageH);
        workingRef.current = working;

        const colorBuf = document.createElement("canvas");
        colorBuf.width = imageW;
        colorBuf.height = imageH;
        colorBufferRef.current = colorBuf;

        const display = document.createElement("canvas");
        display.width = imageW;
        display.height = imageH;
        displayRef.current = display;

        fittedRef.current = 0;
        setView({zoom: 1, panX: 0, panY: 0});
        redrawDisplay();
    }, [refineMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fit to the mask's own bounds once the stage has been measured.
    useEffect(() => {
        const working = workingRef.current;
        if (
            !working ||
            stageSize.w === 0 ||
            stageSize.h === 0 ||
            fittedRef.current === refineMode
        ) {
            return;
        }
        const bounds = getWorkingBounds(working);
        if (!bounds) return;
        fittedRef.current = refineMode;
        setView(
            fitToBox(bounds, stageSize.w, stageSize.h, 0.3, REFINE_ZOOM_LIMITS),
        );
    }, [refineMode, stageSize]);

    useEffect(() => {
        borderOnlyRef.current = borderOnly;
        redrawDisplay();
    }, [borderOnly, redrawDisplay]);

    function drawBrush(p: StagePointer) {
        const working = workingRef.current;
        if (!working) return;
        const wCtx = working.getContext("2d")!;
        wCtx.save();
        wCtx.globalCompositeOperation =
            tool === "erase" ? "destination-out" : "source-over";
        wCtx.fillStyle = "rgba(255,255,255,1)";
        wCtx.beginPath();
        // Brush size is a diameter in image pixels, so a stroke paints the same
        // amount whatever the current zoom.
        const radius = brushSize / 2;
        if (radius < 1) {
            // A sub-pixel arc antialiases below the alpha > 127 cutoff that
            // canvasToRLE applies, and can end up painting nothing at all, so
            // the finest brush writes one whole pixel.
            wCtx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
        } else {
            wCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            wCtx.fill();
        }
        wCtx.restore();
        redrawDisplay();
    }

    function handleStageMouseDown(p: StagePointer) {
        if (p.event.button !== 0) return;
        pushLocalHistory(); // snapshot pre-stroke state for local undo
        isDrawing.current = true;
        setCursorPos({x: p.x, y: p.y});
        drawBrush(p);
    }

    function handleStageMouseMove(p: StagePointer) {
        setCursorPos({x: p.x, y: p.y});
        if (!isDrawing.current) return;
        drawBrush(p);
    }

    function handleStageMouseUp() {
        isDrawing.current = false;
    }

    function handleStageMouseLeave() {
        isDrawing.current = false;
        setCursorPos(null);
    }

    const handleStageResize = useCallback((w: number, h: number) => {
        setStageSize((prev) => (prev.w === w && prev.h === h ? prev : {w, h}));
    }, []);

    // Composited mask, then the brush outline — both under the view transform,
    // with screen sizes divided by zoom so they stay constant on screen.
    const drawDocument = useCallback(
        (ctx: CanvasRenderingContext2D, v: View) => {
            const display = displayRef.current;
            if (display) ctx.drawImage(display, 0, 0);
            if (!cursorPos) return;
            ctx.save();
            ctx.beginPath();
            const radius = brushSize / 2;
            if (radius < 1) {
                ctx.rect(
                    Math.floor(cursorPos.x),
                    Math.floor(cursorPos.y),
                    1,
                    1,
                );
            } else {
                ctx.arc(cursorPos.x, cursorPos.y, radius, 0, Math.PI * 2);
            }
            if (tool === "erase") {
                ctx.strokeStyle = "rgba(255,80,80,0.9)";
                ctx.fillStyle = "rgba(255,80,80,0.12)";
            } else {
                ctx.strokeStyle = "rgba(80,195,247,0.9)";
                ctx.fillStyle = "rgba(80,195,247,0.12)";
            }
            ctx.lineWidth = 1.5 / v.zoom;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        },
        [cursorPos, brushSize, tool, displayRevision],
    );

    function handleApply() {
        if (!workingRef.current) return;
        const newRle = canvasToRLE(workingRef.current);
        const layerId = Date.now();
        // Whole refine session becomes a single GLOBAL undo step.
        commitHistory({action: "other", payload: {note: "refine apply"}});
        setMasks((prev) =>
            prev.map((m) => {
                if (m.id !== refineMode) return m;
                return {
                    ...m,
                    layers: [
                        {id: layerId, rleMask: newRle, source: "sam" as const},
                    ],
                };
            }),
        );
        setRefineMode(0);
    }

    if (!targetMask) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center gap-4 p-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2 flex-wrap">
                <span className="text-sm font-medium text-white/80">
                    {t("refineTitle")} — {targetMask.label}
                </span>
                <div className="w-px h-5 bg-white/20" />
                <button
                    onClick={() => setTool("erase")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${tool === "erase" ? "bg-[#4FC3F7]/20 text-[#4FC3F7] ring-1 ring-[#4FC3F7]/40" : "text-white/60 hover:text-white"}`}>
                    {t("refineEraser")}
                </button>
                <button
                    onClick={() => setTool("add")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${tool === "add" ? "bg-[#4FC3F7]/20 text-[#4FC3F7] ring-1 ring-[#4FC3F7]/40" : "text-white/60 hover:text-white"}`}>
                    {t("refineAdd")}
                </button>
                <div className="w-px h-5 bg-white/20" />
                <button
                    onClick={localUndo}
                    disabled={localPast.length === 0}
                    title={t("undoLastStrokeTitle")}
                    className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <ArrowUturnLeftIcon className="w-4 h-4" strokeWidth={2.5} />
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
                <span className="text-xs text-white/50">{t("brushLabel")}</span>
                <input
                    type="range"
                    min={BRUSH_MIN}
                    max={BRUSH_MAX}
                    value={brushSize}
                    onChange={(e) => setBrushSize(+e.target.value)}
                    className="w-24"
                />
                <input
                    type="number"
                    min={BRUSH_MIN}
                    max={BRUSH_MAX}
                    value={brushDraft}
                    onChange={(e) => setBrushDraft(e.target.value)}
                    onBlur={(e) => commitBrushDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.currentTarget.blur();
                        }
                    }}
                    className="w-14 bg-white/5 border border-white/15 rounded px-1.5 py-0.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-[#4FC3F7]/50"
                />
                <span className="text-xs text-white/50">px</span>
                <div className="w-px h-5 bg-white/20" />
                <span className="text-xs text-white/50">{t("zoomLabel")}</span>
                <input
                    type="range"
                    min={5}
                    max={2000}
                    value={Math.round(view.zoom * 100)}
                    onChange={(e) =>
                        setView((v) =>
                            zoomAt(
                                v,
                                stageSize.w / 2,
                                stageSize.h / 2,
                                +e.target.value / 100 / v.zoom,
                                REFINE_ZOOM_LIMITS,
                            ),
                        )
                    }
                    className="w-24"
                />
                <span className="text-xs text-white/60 w-12">
                    {Math.round(view.zoom * 100)}%
                </span>
                <div className="w-px h-5 bg-white/20" />
                <button
                    onClick={() => setBorderOnly(!borderOnly)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${borderOnly ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40" : "text-white/60 hover:text-white"}`}>
                    {t("borders")}
                </button>
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
                    imageW={imageW}
                    imageH={imageH}
                    view={view}
                    onViewChange={setView}
                    zoomLimits={REFINE_ZOOM_LIMITS}
                    cursor={tool === "erase" ? "cell" : "crosshair"}
                    drawDocument={drawDocument}
                    onStageMouseDown={handleStageMouseDown}
                    onStageMouseMove={handleStageMouseMove}
                    onStageMouseUp={handleStageMouseUp}
                    onStageMouseLeave={handleStageMouseLeave}
                    onContainerResize={handleStageResize}
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <span className="text-xs text-white/30">
                    {t("refineFooterHint")}
                </span>
                <button
                    onClick={() => setRefineMode(0)}
                    className="px-5 py-2 rounded-lg border border-white/20 text-sm hover:bg-white/10 transition-colors">
                    {t("cancel")}
                </button>
                <button
                    onClick={handleApply}
                    className="px-5 py-2 rounded-lg bg-[#4FC3F7] text-black font-medium text-sm hover:bg-[#4FC3F7]/90 transition-colors">
                    {t("apply")}
                </button>
            </div>
        </div>
    );
};
