import React from "react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {ArrowUturnLeftIcon, ArrowUturnRightIcon} from "@heroicons/react/24/outline";
import {borderOnlyAtom, showShortcutsAtom} from "@/app/atom.ts";
import {
    historyAtom,
    canUndoAtom,
    canRedoAtom,
    undoAtom,
    redoAtom,
    historyScopeAtom,
    labelToFrench,
} from "@/app/history.ts";
import SelectAddIcon from "@/assets/icons/select-add.svg?react";
import SelectRemoveIcon from "@/assets/icons/select-remove.svg?react";
import BoundingBoxIcon from "@/assets/icons/bounding-box.svg?react";
import ZoomInIcon from "@/assets/icons/zoom-in.svg?react";
import ZoomOutIcon from "@/assets/icons/zoom-out.svg?react";
import FreeformDrawIcon from "@/assets/icons/freeform-draw.svg?react";
import PolygonLassoIcon from "@/assets/icons/polygon-lasso.svg?react";
import GrabIcon from "@/assets/icons/grab.svg?react";
import SlicBboxIcon from "@/assets/icons/slic-bbox.svg?react";
import {Tool} from "@/app/types.ts";
import useAnnotatorToolbar from "@/common/components/annotator-toolbar/useAnnotatorToolbar.ts";
import {TOOLS} from "@/app/AppConfig.tsx";
import FilterGammaToolbarPanel from "@/common/components/annotator-toolbar/FilterGammaToolbarPanel.tsx";
import {SHORTCUT_DEFS, keyLabel} from "@/canvas/shortcuts.ts";
import {Tooltip} from "@/common/components/ui/Tooltip.tsx";

const TOOL_ICONS: Record<Tool, React.FC<React.SVGProps<SVGSVGElement>>> = {
    "select-add": SelectAddIcon,
    "select-remove": SelectRemoveIcon,
    "bounding-box": BoundingBoxIcon,
    "freeform-draw": FreeformDrawIcon,
    "polygon-lasso": PolygonLassoIcon,
    "slic-bbox": SlicBboxIcon,
    "zoom-in": ZoomInIcon,
    "zoom-out": ZoomOutIcon,
    "grab": GrabIcon,
};

const TOOL_BASE_LABELS: Record<Tool, string> = {
    "select-add": "Ajouter un point",
    "select-remove": "Retirer un point",
    "bounding-box": "Boîte englobante",
    "freeform-draw": "Dessin libre",
    "polygon-lasso": "Lasso polygone",
    "slic-bbox": "Superpixels (SLIC)",
    "zoom-in": "Zoom avant",
    "zoom-out": "Zoom arrière",
    "grab": "Déplacer",
};

const KEY_BADGE = new Map<Tool, string>(
    SHORTCUT_DEFS.map(d => [d.tool, keyLabel(d.key)]),
);

interface ToolbarProps {}

export const Toolbar: React.FC<ToolbarProps> = () => {
    const [activeTool, setActiveTool] = useAnnotatorToolbar();
    const [showShortcuts, setShowShortcuts] = useAtom(showShortcutsAtom);
    const [borderOnly, setBorderOnly] = useAtom(borderOnlyAtom);

    const history = useAtomValue(historyAtom);
    const canUndo = useAtomValue(canUndoAtom);
    const canRedo = useAtomValue(canRedoAtom);
    const undo = useSetAtom(undoAtom);
    const redo = useSetAtom(redoAtom);
    const historyScope = useAtomValue(historyScopeAtom);
    // When a modal owns the scope, the global undo/redo doesn't apply —
    // the modal has its own buttons in its own toolbar.
    const modalActive = historyScope !== "global";
    const undoLabel = modalActive
        ? "Annuler (géré par la fenêtre active)"
        : canUndo
        ? `Annuler : ${labelToFrench(history.past[history.past.length - 1].label)}`
        : "Aucune action à annuler";
    const redoLabel = modalActive
        ? "Rétablir (géré par la fenêtre active)"
        : canRedo
        ? `Rétablir : ${labelToFrench(history.future[history.future.length - 1].label)}`
        : "Aucune action à rétablir";
    const undoDisabled = modalActive || !canUndo;
    const redoDisabled = modalActive || !canRedo;

    return (
        <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-secondary w-12">
            {/* Undo / redo — separated from the tool group below. */}
            <button
                title={undoLabel}
                disabled={undoDisabled}
                onClick={undo}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    undoDisabled
                        ? "text-[#5A5A5A] cursor-not-allowed"
                        : "text-[#B8B8B8] hover:bg-[#2F2F2F]/60 hover:text-white"
                }`}>
                <ArrowUturnLeftIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button
                title={redoLabel}
                disabled={redoDisabled}
                onClick={redo}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    redoDisabled
                        ? "text-[#5A5A5A] cursor-not-allowed"
                        : "text-[#B8B8B8] hover:bg-[#2F2F2F]/60 hover:text-white"
                }`}>
                <ArrowUturnRightIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <div className="w-6 h-px bg-white/10 my-1" />

            {TOOLS.map(tool => {
                const active = activeTool === tool;
                const Icon = TOOL_ICONS[tool];
                const label = TOOL_BASE_LABELS[tool];
                const shortcut = KEY_BADGE.get(tool);

                return (
                    <Tooltip key={tool} content={label} shortcut={shortcut} side="right">
                        <button
                            aria-label={label}
                            onClick={() => setActiveTool(tool)}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${active ? "bg-[#2F2F2F] ring-1 ring-[#4FC3F7]/40" : "bg-transparent hover:bg-[#2F2F2F]/60"}`}>
                            {Icon ? (
                                <Icon className={`w-4 h-4 transition-colors ${active ? "text-[#4FC3F7]" : "text-[#B8B8B8]"}`} />
                            ) : (
                                <FallbackSquare active={active} />
                            )}
                        </button>
                    </Tooltip>
                );
            })}
            <FilterGammaToolbarPanel />
            <div className="w-6 h-px bg-white/10 my-0.5" />
            <Tooltip
                content={borderOnly ? "Afficher le remplissage" : "Afficher contours seulement"}
                side="right">
                <button
                    aria-label={borderOnly ? "Afficher le remplissage" : "Afficher contours seulement"}
                    onClick={() => setBorderOnly(v => !v)}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${borderOnly ? "bg-[#2F2F2F] ring-1 ring-emerald-500/50" : "bg-transparent hover:bg-[#2F2F2F]/60"}`}>
                    <BorderOnlyIcon active={borderOnly} />
                </button>
            </Tooltip>
            <Tooltip content="Raccourcis clavier" shortcut="?" side="right">
                <button
                    aria-label="Raccourcis clavier"
                    onClick={() => setShowShortcuts(v => !v)}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors ${showShortcuts ? "bg-[#2F2F2F] text-[#4FC3F7] ring-1 ring-[#4FC3F7]/40" : "bg-transparent text-[#B8B8B8] hover:bg-[#2F2F2F]/60"}`}>
                    ?
                </button>
            </Tooltip>
        </div>
    );
};

const FallbackSquare: React.FC<{active: boolean}> = ({active}) => (
    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${active ? "fill-[#4FC3F7]" : "fill-[#B8B8B8]"}`}>
        <rect x="2" y="2" width="16" height="16" rx="3" />
    </svg>
);

function BorderOnlyIcon({active}: {active: boolean}) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-colors">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke={active ? "#34d399" : "#B8B8B8"} strokeWidth="2" />
            {active ? null : (
                <rect x="5" y="5" width="6" height="6" rx="1" fill="#B8B8B8" opacity="0.4" />
            )}
        </svg>
    );
}
