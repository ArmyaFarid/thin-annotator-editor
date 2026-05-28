import React from "react";
import {useAtom, useAtomValue} from "jotai";
import {
    activeToolAtom,
    activeImageSizeAtom,
    currentMaskAtom,
    masksAtom,
    refineModeAtom,
    subtractModeAtom,
    type MaskLayer,
} from "@/app/atom.ts";
import {mergeToCanvas, canvasToRLE} from "@/canvas/utils/maskMerge.ts";
import {rleToEditableContours} from "@/canvas/utils/contourExtract.ts";
import {MASK_FILL_ALPHA} from "@/canvas/canvas-theme.ts";
import {t} from "@/i18n/index.ts";
import {Tooltip} from "@/common/components/ui/Tooltip.tsx";

export const MaskEditTools: React.FC = () => {
    const [masks, setMasks] = useAtom(masksAtom);
    const [currentMask] = useAtom(currentMaskAtom);
    const [, setRefineMode] = useAtom(refineModeAtom);
    const [subtractMode, setSubtractMode] = useAtom(subtractModeAtom);
    const [activeTool, setActiveTool] = useAtom(activeToolAtom);
    const imageSize = useAtomValue(activeImageSizeAtom);

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
        setMasks((prev) => prev.map((m) => m.id === activeMask.id ? {...m, layers: [newLayer]} : m));
        setActiveTool("select-add");
    }

    return (
        <div className="flex flex-col gap-1.5">
            {/* Add / Subtract toggle */}
            <div className="flex rounded overflow-hidden border border-white/15">
                <Tooltip content="Mode ajout : les tracés deviennent des zones de la région">
                    <button
                        onClick={() => setSubtractMode(false)}
                        className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${!subtractMode ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                        {t("add")}
                    </button>
                </Tooltip>
                <div className="w-px bg-white/15" />
                <Tooltip content="Mode soustraction : les tracés creusent des trous dans la région">
                    <button
                        onClick={() => setSubtractMode(true)}
                        className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${subtractMode ? "bg-red-500/20 text-red-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                        {t("subtract")}
                    </button>
                </Tooltip>
            </div>

            {/* Hole drawing tools — only in subtract mode */}
            {subtractMode ? (
                <div className="flex gap-1">
                    <Tooltip content="Tracé libre à main levée">
                        <button
                            onClick={() => setActiveTool("freeform-draw")}
                            className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${activeTool === "freeform-draw" ? "border-orange-400 text-orange-400 bg-orange-400/10" : "border-white/20 text-white/40 hover:text-white"}`}>
                            {t("freeform")}
                        </button>
                    </Tooltip>
                    <Tooltip content="Polygone : cliquez pour placer chaque sommet">
                        <button
                            onClick={() => setActiveTool("polygon-lasso")}
                            className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${activeTool === "polygon-lasso" ? "border-orange-400 text-orange-400 bg-orange-400/10" : "border-white/20 text-white/40 hover:text-white"}`}>
                            {t("polygon")}
                        </button>
                    </Tooltip>
                </div>
            ) : null}

            {/* Refine + Anchors row */}
            <div className="flex gap-1.5">
                <Tooltip content="Ouvrir l'outil de raffinement (gomme/pinceau)">
                    <button
                        onClick={() => setRefineMode(currentMask)}
                        className="flex-1 px-2 py-1 rounded text-xs border border-[#4FC3F7]/40 text-[#4FC3F7] hover:bg-[#4FC3F7]/10 transition-colors">
                        {t("refine")}
                    </button>
                </Tooltip>
                <div className="flex flex-1 rounded overflow-hidden border border-white/15">
                    <Tooltip content="Convertir le contour en sommets éditables (points d'ancrage)">
                        <button
                            onClick={handleActivateAnchors}
                            disabled={isAnchorMode || !imageSize}
                            className={`flex-1 px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isAnchorMode ? "bg-emerald-500/20 text-emerald-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                            {t("anchors")}
                        </button>
                    </Tooltip>
                    <div className="w-px bg-white/15" />
                    <Tooltip content="Revenir au mode normal (fusionner les sommets en masque)">
                        <button
                            onClick={handleDeactivateAnchors}
                            disabled={!isAnchorMode || !imageSize}
                            className={`flex-1 px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!isAnchorMode ? "bg-white/10 text-white/60" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                            {t("normal")}
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};
