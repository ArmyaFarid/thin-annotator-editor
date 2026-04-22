import React from "react";
import {useAtom} from "jotai";
import useMineralList from "@/common/components/annotation-panel/useMineralList.ts";
import {
    activeImageSizeAtom,
    currentMaskAtom,
    editorOnAtom,
    masksAtom,
    promptsAtom,
    sessionIdAtom,
    subtractModeAtom,
} from "@/app/atom.ts";
import {mergeToCanvas, canvasToRLE} from "@/canvas/utils/maskMerge.ts";
import {MaskEditTools} from "@/common/components/annotation-panel/MaskEditTools.tsx";
import {MineralAnnotationForm} from "@/common/components/annotation-panel/MineralAnnotationForm.tsx";

export const AnnotationPanel: React.FC = () => {
    const [masks, setMasks] = useAtom(masksAtom);
    const [prompts, setPrompts] = useAtom(promptsAtom);
    const [currentMask, setCurrentMask] = useAtom(currentMaskAtom);
    const [, setEditorOn] = useAtom(editorOnAtom);
    const [sessionId, setSessionId] = useAtom(sessionIdAtom);
    const [, setSubtractMode] = useAtom(subtractModeAtom);
    const [imageSize] = useAtom(activeImageSizeAtom);

    const activeMask = currentMask !== 0 ? masks.find((m) => m.id === currentMask) : null;
    const minerals = useMineralList();
    function mineralName(id: string | null) {
        return id ? (minerals.find((m) => m.id === id)?.name ?? id) : null;
    }

    function handleMaskClick(maskId: number) {
        if (!masks.find((m) => m.id === maskId)) return;
        setPrompts([]);
        setCurrentMask(maskId);
        setEditorOn(true);
    }

    function handleSave() {
        if (activeMask && imageSize) {
            const merged = mergeToCanvas(activeMask, imageSize.w, imageSize.h);
            const rle = canvasToRLE(merged);
            const layerId = Date.now();
            setMasks((prev) =>
                prev.map((m) =>
                    m.id === activeMask.id
                        ? {...m, layers: [{id: layerId, rleMask: rle, source: "manual" as const}]}
                        : m,
                ),
            );
        }
        setSubtractMode(false);
        setPrompts([]);
        setCurrentMask(0);
        setEditorOn(false);
    }

    function handleExport() {
        if (!imageSize) return;
        const exported = masks.map((m) => {
            const canvas = mergeToCanvas(m, imageSize.w, imageSize.h);
            const rle = canvasToRLE(canvas);
            return {id: m.id, label: m.label, color: m.color, annotation: m.annotation, rle};
        });
        const blob = new Blob([JSON.stringify(exported, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "annotations.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="h-full w-full flex flex-col bg-secondary border border-white/20 rounded-md overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/10 shrink-0">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Panneau d'annotation
                </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2 min-h-0">
                {/* Session start */}
                {!sessionId ? (
                    <button
                        onClick={() => { setSessionId("START_SESSION"); setEditorOn(true); }}
                        className="w-full rounded-md border border-white/20 py-2 text-sm hover:bg-[#2F2F2F] transition">
                        Commencer la session
                    </button>
                ) : null}

                {/* ===== EDIT MODE ===== */}
                {currentMask !== 0 && activeMask ? (
                    <>
                        {/* Mask label + color */}
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded shrink-0"
                                style={{backgroundColor: `rgba(${activeMask.color.r},${activeMask.color.g},${activeMask.color.b},${activeMask.color.a})`}}
                            />
                            <input
                                className="flex-1 bg-transparent border border-white/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-white/40"
                                placeholder="Nom de la région"
                                value={activeMask.label}
                                onChange={(e) =>
                                    setMasks((prev) =>
                                        prev.map((m) => m.id === activeMask.id ? {...m, label: e.target.value} : m),
                                    )
                                }
                            />
                        </div>

                        {/* Drawing tools */}
                        <MaskEditTools />

                        {/* SAM prompt list */}
                        {prompts.length > 0 ? (
                            <div className="border border-white/10 rounded p-1.5 flex flex-col gap-0.5">
                                <span className="text-[10px] text-white/40 uppercase tracking-wide px-0.5 mb-0.5">Points SAM</span>
                                {prompts.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between gap-1 text-xs">
                                        <span className="text-white/50 shrink-0 w-5 text-center">
                                            {p.bbox ? "□" : p.point_labels === 1 ? "+" : "−"}
                                        </span>
                                        <span className="flex-1 text-white/40 tabular-nums">
                                            {Math.round(p.point_coords[0])}, {Math.round(p.point_coords[1])}
                                        </span>
                                        <button
                                            className="text-white/30 hover:text-red-400 leading-none px-1"
                                            onClick={() => setPrompts((prev) => prev.filter((x) => x.id !== p.id))}>
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {/* Mineral annotation form */}
                        <MineralAnnotationForm maskId={activeMask.id} />

                        {/* Save */}
                        {(() => {
                            const ids = activeMask.annotation?.mineralIds;
                            const ready = ids?.every((id) => id !== null) ?? false;
                            return (
                                <button
                                    disabled={!ready}
                                    className="shrink-0 bg-[#2F2F2F] hover:bg-[#3A3A3A] disabled:opacity-40 disabled:cursor-not-allowed text-sm py-2 rounded transition-colors"
                                    onClick={handleSave}>
                                    Enregistrer
                                </button>
                            );
                        })()}
                    </>
                ) : null}

                {/* ===== LIST MODE ===== */}
                {currentMask === 0 ? (
                    <>
                        {masks.length === 0 ? (
                            <p className="text-xs text-white/30 text-center py-4">Aucune annotation</p>
                        ) : (
                            <div className="flex flex-col gap-0.5">
                                {masks.map((mask) => (
                                    <button
                                        key={mask.id}
                                        className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-[#2F2F2F] text-left transition-colors"
                                        onClick={() => handleMaskClick(mask.id)}>
                                        <div
                                            className="w-3 h-3 rounded shrink-0"
                                            style={{backgroundColor: `rgba(${mask.color.r},${mask.color.g},${mask.color.b},${mask.color.a})`}}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{mask.label || "Sans nom"}</p>
                                            {mask.annotation?.mineralIds.some((id) => id) ? (
                                                <p className="text-[10px] text-white/40 truncate">
                                                    {mask.annotation.mineralIds
                                                        .map((id) => mineralName(id))
                                                        .filter(Boolean)
                                                        .join(" › ")}
                                                </p>
                                            ) : null}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            className="border border-white/20 text-sm py-1.5 rounded hover:bg-[#2F2F2F] transition-colors"
                            onClick={() => setEditorOn(true)}>
                            + Ajouter une région
                        </button>

                        {masks.length > 0 ? (
                            <button
                                className="border border-white/20 text-xs py-1.5 rounded hover:bg-[#2F2F2F] text-white/50 transition-colors"
                                onClick={handleExport}>
                                Exporter JSON
                            </button>
                        ) : null}
                    </>
                ) : null}
            </div>
        </div>
    );
};
