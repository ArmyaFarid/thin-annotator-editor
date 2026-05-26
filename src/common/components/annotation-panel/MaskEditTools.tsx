import React from "react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    activeToolAtom,
    activeImageSizeAtom,
    currentMaskAtom,
    masksAtom,
    refineModeAtom,
    subtractModeAtom,
    type MaskLayer,
} from "@/app/atom.ts";
import {commitHistoryAtom} from "@/app/history.ts";
import {mergeToCanvas, canvasToRLE} from "@/canvas/utils/maskMerge.ts";
import {rleToEditableContours} from "@/canvas/utils/contourExtract.ts";
import {MASK_FILL_ALPHA} from "@/canvas/canvas-theme.ts";
import {t} from "@/i18n/index.ts";

export const MaskEditTools: React.FC = () => {
    const [masks, setMasks] = useAtom(masksAtom);
    const [currentMask] = useAtom(currentMaskAtom);
    const [, setRefineMode] = useAtom(refineModeAtom);
    const [subtractMode, setSubtractMode] = useAtom(subtractModeAtom);
    const [activeTool, setActiveTool] = useAtom(activeToolAtom);
    const imageSize = useAtomValue(activeImageSizeAtom);
    const commitHistory = useSetAtom(commitHistoryAtom);

    const activeMask = currentMask !== 0 ? masks.find((m) => m.id === currentMask) : null;
    const isAnchorMode = activeMask
        ? activeMask.layers.length > 0 && activeMask.layers.every((l) => !l.rleMask)
        : false;

    function handleActivateAnchors() {
        if (!activeMask || !imageSize) return;
        const merged = mergeToCanvas(activeMask, imageSize.w, imageSize.h);
        const rle = canvasToRLE(merged);
        const contours = rleToEditableContours(rle);
        const {r, g, b} = activeMask.color;
        const base = Date.now();
        const newLayers: MaskLayer[] = contours.map((c, i) => ({
            id: base + i,
            source: "manual" as const,
            layerKind: c.kind,
            canvasShape: {
                kind: "polygon" as const,
                id: base + i + 100000,
                vertices: c.vertices,
                fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                strokeColor: `rgb(${r},${g},${b})`,
            },
        }));
        commitHistory({action: "mask.extract-contours", payload: {maskId: activeMask.id}});
        setMasks((prev) => prev.map((m) => m.id === activeMask.id ? {...m, layers: newLayers} : m));
        setActiveTool("polygon-lasso");
    }

    function handleDeactivateAnchors() {
        if (!activeMask || !imageSize) return;
        const merged = mergeToCanvas(activeMask, imageSize.w, imageSize.h);
        const rle = canvasToRLE(merged);
        const newLayer: MaskLayer = {
            id: Date.now(),
            source: "manual" as const,
            layerKind: "fill" as const,
            rleMask: rle,
        };
        commitHistory({action: "mask.merge", payload: {maskId: activeMask.id}});
        setMasks((prev) => prev.map((m) => m.id === activeMask.id ? {...m, layers: [newLayer]} : m));
        setActiveTool("select-add");
    }

    return (
        <div className="flex flex-col gap-1.5">
            {/* Add / Subtract toggle */}
            <div className="flex rounded overflow-hidden border border-white/15">
                <button
                    onClick={() => setSubtractMode(false)}
                    className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${!subtractMode ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                    {t("add")}
                </button>
                <div className="w-px bg-white/15" />
                <button
                    onClick={() => setSubtractMode(true)}
                    className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${subtractMode ? "bg-red-500/20 text-red-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                    {t("subtract")}
                </button>
            </div>

            {/* Hole drawing tools — only in subtract mode */}
            {subtractMode ? (
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTool("freeform-draw")}
                        className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${activeTool === "freeform-draw" ? "border-orange-400 text-orange-400 bg-orange-400/10" : "border-white/20 text-white/40 hover:text-white"}`}>
                        {t("freeform")}
                    </button>
                    <button
                        onClick={() => setActiveTool("polygon-lasso")}
                        className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${activeTool === "polygon-lasso" ? "border-orange-400 text-orange-400 bg-orange-400/10" : "border-white/20 text-white/40 hover:text-white"}`}>
                        {t("polygon")}
                    </button>
                </div>
            ) : null}

            {/* Refine + Anchors row */}
            <div className="flex gap-1.5">
                <button
                    onClick={() => setRefineMode(currentMask)}
                    className="flex-1 px-2 py-1 rounded text-xs border border-[#4FC3F7]/40 text-[#4FC3F7] hover:bg-[#4FC3F7]/10 transition-colors">
                    {t("refine")}
                </button>
                <div className="flex flex-1 rounded overflow-hidden border border-white/15">
                    <button
                        onClick={handleActivateAnchors}
                        disabled={isAnchorMode || !imageSize}
                        className={`flex-1 px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isAnchorMode ? "bg-emerald-500/20 text-emerald-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                        {t("anchors")}
                    </button>
                    <div className="w-px bg-white/15" />
                    <button
                        onClick={handleDeactivateAnchors}
                        disabled={!isAnchorMode || !imageSize}
                        className={`flex-1 px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!isAnchorMode ? "bg-white/10 text-white/60" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                        {t("normal")}
                    </button>
                </div>
            </div>
        </div>
    );
};
