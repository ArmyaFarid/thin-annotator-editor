import {useAtom, useAtomValue} from "jotai";
import {
    activeToolAtom,
    currentMaskAtom,
    editorOnAtom,
    masksAtom,
    type MaskLayer,
    promptsAtom,
    refineModeAtom,
    sessionIdAtom,
    subtractModeAtom,
    activeImageSizeAtom,
} from "@/app/atom.ts";
import {mergeToCanvas, canvasToRLE} from "@/canvas/utils/maskMerge.ts";
import {rleToEditableContours} from "@/canvas/utils/contourExtract.ts";
import {MASK_FILL_ALPHA} from "@/canvas/mask-style.ts";

export default function MaskList() {
    const [masks, setMasks] = useAtom(masksAtom);
    const [prompts, setPrompts] = useAtom(promptsAtom);
    const [currentMask, setCurrentMask] = useAtom(currentMaskAtom);
    const [, setEditorOn] = useAtom(editorOnAtom);
    const [sessionId, setSessionId] = useAtom(sessionIdAtom);
    const [, setRefineMode] = useAtom(refineModeAtom);
    const [subtractMode, setSubtractMode] = useAtom(subtractModeAtom);
    const [activeTool, setActiveTool] = useAtom(activeToolAtom);
    const imageSize = useAtomValue(activeImageSizeAtom);

    function handleMaskClick(maskId: number) {
        const mask = masks.find((m) => m.id === maskId);
        if (!mask) {
            return;
        }
        setPrompts([]);
        setCurrentMask(maskId);
        setEditorOn(true);
    }

    function handleActivateAnchors() {
        if (!activeMask || !imageSize) {
            return;
        }
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
        setMasks((prev) =>
            prev.map((m) =>
                m.id === activeMask.id ? {...m, layers: newLayers} : m,
            ),
        );
        setActiveTool("polygon-lasso");
    }

    function handleDeactivateAnchors() {
        if (!activeMask || !imageSize) {
            return;
        }
        const merged = mergeToCanvas(activeMask, imageSize.w, imageSize.h);
        const rle = canvasToRLE(merged);
        const newLayer: MaskLayer = {
            id: Date.now(),
            source: "manual" as const,
            layerKind: "fill" as const,
            rleMask: rle,
        };
        setMasks((prev) =>
            prev.map((m) =>
                m.id === activeMask.id ? {...m, layers: [newLayer]} : m,
            ),
        );
        setActiveTool("select-add");
    }

    function handleExport() {
        if (!imageSize) {
            return;
        }
        const exported = masks.map((m) => {
            const canvas = mergeToCanvas(m, imageSize.w, imageSize.h);
            const rle = canvasToRLE(canvas);
            return {
                id: m.id,
                label: m.label,
                color: m.color,
                rle,
            };
        });
        const blob = new Blob([JSON.stringify(exported, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "masks.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    const activeMask =
        currentMask !== 0 ? masks.find((m) => m.id === currentMask) : null;
    const isAnchorMode = activeMask
        ? activeMask.layers.length > 0 &&
          activeMask.layers.every((l) => !l.rleMask)
        : false;

    return (
        <div className="h-full w-full flex flex-col bg-secondary border border-white/20 rounded-md p-2 gap-2">
            {!sessionId ? (
                <button
                    onClick={() => {
                        setSessionId("START_SESSION");
                        setEditorOn(true);
                    }}
                    className="
                        w-full mt-3
                        rounded-md
                        border border-white/20
                        py-2
                        text-sm
                        hover:bg-[#2F2F2F]
                        transition
                    ">
                    Commencer la session
                </button>
            ) : null}

            {/* ===== EDIT MODE ===== */}
            {currentMask !== 0 && activeMask ? (
                <>
                    {/* Metadata */}
                    <div className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 rounded"
                            style={{
                                backgroundColor: `rgba(${activeMask.color.r},${activeMask.color.g},${activeMask.color.b},${activeMask.color.a})`,
                            }}
                        />
                        <textarea
                            className="flex-1 bg-transparent border border-white/20 rounded px-2 py-1 text-sm resize-none"
                            placeholder="Nom du minerai"
                            value={activeMask.label}
                            onChange={(e) =>
                                setMasks((prev) =>
                                    prev.map((m) =>
                                        m.id === activeMask.id
                                            ? {...m, label: e.target.value}
                                            : m,
                                    ),
                                )
                            }
                        />
                    </div>

                    {/* Edit tools */}
                    <div className="flex gap-2">
                        <div className="flex flex-1 rounded overflow-hidden border border-white/15">
                            <button
                                onClick={() => setSubtractMode(false)}
                                className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${!subtractMode ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                                + Ajout
                            </button>
                            <div className="w-px bg-white/15" />
                            <button
                                onClick={() => setSubtractMode(true)}
                                className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${subtractMode ? "bg-red-500/20 text-red-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                                − Soustraction
                            </button>
                        </div>
                        <button
                            onClick={() => setRefineMode(currentMask)}
                            className="flex-1 px-2 py-1 rounded text-sm border border-[#4FC3F7]/40 text-[#4FC3F7] hover:bg-[#4FC3F7]/10 transition-colors">
                            Raffiner
                        </button>
                    </div>

                    {/* Anchor mode toggle */}
                    <div className="flex rounded overflow-hidden border border-white/15">
                        <button
                            onClick={handleActivateAnchors}
                            disabled={isAnchorMode || !imageSize}
                            className={`flex-1 px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isAnchorMode ? "bg-emerald-500/20 text-emerald-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                            Ancres
                        </button>
                        <div className="w-px bg-white/15" />
                        <button
                            onClick={handleDeactivateAnchors}
                            disabled={!isAnchorMode || !imageSize}
                            className={`flex-1 px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!isAnchorMode ? "bg-white/10 text-white/60" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                            Pas d'ancres
                        </button>
                    </div>

                    {/* Hole drawing tool selector — shown only in subtract mode */}
                    {subtractMode ? (
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTool("freeform-draw")}
                                className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${activeTool === "freeform-draw" ? "border-orange-400 text-orange-400 bg-orange-400/10" : "border-white/20 text-white/40 hover:text-white"}`}>
                                Forme libre
                            </button>
                            <button
                                onClick={() => setActiveTool("polygon-lasso")}
                                className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${activeTool === "polygon-lasso" ? "border-orange-400 text-orange-400 bg-orange-400/10" : "border-white/20 text-white/40 hover:text-white"}`}>
                                Polygone
                            </button>
                        </div>
                    ) : null}

                    {/* Prompt list */}
                    <div className="flex-1 overflow-auto border border-white/10 rounded p-2 text-sm">
                        {prompts.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center justify-between gap-1 border-b border-white/10 py-1">
                                <span className="text-white/60 shrink-0">
                                    {p.bbox
                                        ? "bbox"
                                        : p.point_labels === 1
                                          ? "+"
                                          : "−"}
                                </span>
                                <span className="flex-1 text-center">
                                    ({Math.round(p.point_coords[0])},{" "}
                                    {Math.round(p.point_coords[1])})
                                </span>
                                <button
                                    className="shrink-0 text-white/40 hover:text-red-400 leading-none"
                                    onClick={() =>
                                        setPrompts((prev) =>
                                            prev.filter((x) => x.id !== p.id),
                                        )
                                    }>
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Save — merges all layers (fills + holes) into one RLE */}
                    <button
                        className="mt-2 bg-[#2F2F2F] hover:bg-[#3A3A3A] text-sm py-2 rounded"
                        onClick={() => {
                            if (activeMask && imageSize) {
                                const merged = mergeToCanvas(
                                    activeMask,
                                    imageSize.w,
                                    imageSize.h,
                                );
                                const rle = canvasToRLE(merged);
                                const layerId = Date.now();
                                setMasks((prev) =>
                                    prev.map((m) =>
                                        m.id === activeMask.id
                                            ? {
                                                  ...m,
                                                  layers: [
                                                      {
                                                          id: layerId,
                                                          rleMask: rle,
                                                          source: "manual" as const,
                                                      },
                                                  ],
                                              }
                                            : m,
                                    ),
                                );
                            }
                            setSubtractMode(false);
                            setPrompts([]);
                            setCurrentMask(0);
                            setEditorOn(false);
                        }}>
                        Enregistrer
                    </button>
                </>
            ) : null}

            {/* ===== LIST MODE ===== */}
            {currentMask === 0 ? (
                <>
                    <div className="flex-1 overflow-auto">
                        {masks.map((mask) => (
                            <button
                                key={mask.id}
                                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-[#2F2F2F]"
                                onClick={() => handleMaskClick(mask.id)}>
                                <div
                                    className="w-3 h-3 rounded"
                                    style={{
                                        backgroundColor: `rgba(${mask.color.r},${mask.color.g},${mask.color.b},${mask.color.a})`,
                                    }}
                                />
                                <span className="text-sm truncate">
                                    {mask.label || "Sans nom"}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Add object */}
                    <button
                        className="mt-2 border border-white/20 text-sm py-2 rounded hover:bg-[#2F2F2F]"
                        onClick={() => setEditorOn(true)}>
                        Ajouter un objet
                    </button>

                    {/* Export */}
                    {masks.length > 0 ? (
                        <button
                            className="border border-white/20 text-sm py-2 rounded hover:bg-[#2F2F2F] text-white/70"
                            onClick={handleExport}>
                            Exporter JSON
                        </button>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
