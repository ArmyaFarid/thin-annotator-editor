import React from "react";
import {useAtom} from "jotai";
import {showShortcutsAtom} from "@/app/atom.ts";
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

function toolTitle(tool: Tool): string {
    const k = KEY_BADGE.get(tool);
    return k ? `${TOOL_BASE_LABELS[tool]} (${k})` : TOOL_BASE_LABELS[tool];
}

interface ToolbarProps {}

export const Toolbar: React.FC<ToolbarProps> = () => {
    const [activeTool, setActiveTool] = useAnnotatorToolbar();
    const [showShortcuts, setShowShortcuts] = useAtom(showShortcutsAtom);

    return (
        <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-secondary w-12">
            {TOOLS.map(tool => {
                const active = activeTool === tool;
                const Icon = TOOL_ICONS[tool];

                return (
                    <button
                        key={tool}
                        title={toolTitle(tool)}
                        onClick={() => setActiveTool(tool)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${active ? "bg-[#2F2F2F] ring-1 ring-[#4FC3F7]/40" : "bg-transparent hover:bg-[#2F2F2F]/60"}`}>
                        {Icon ? (
                            <Icon className={`w-4 h-4 transition-colors ${active ? "text-[#4FC3F7]" : "text-[#B8B8B8]"}`} />
                        ) : (
                            <FallbackSquare active={active} />
                        )}
                    </button>
                );
            })}
            <FilterGammaToolbarPanel />
            <div className="w-6 h-px bg-white/10 my-0.5" />
            <button
                title="Raccourcis clavier (?)"
                onClick={() => setShowShortcuts(v => !v)}
                className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors ${showShortcuts ? "bg-[#2F2F2F] text-[#4FC3F7] ring-1 ring-[#4FC3F7]/40" : "bg-transparent text-[#B8B8B8] hover:bg-[#2F2F2F]/60"}`}>
                ?
            </button>
        </div>
    );
};

const FallbackSquare: React.FC<{active: boolean}> = ({active}) => (
    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${active ? "fill-[#4FC3F7]" : "fill-[#B8B8B8]"}`}>
        <rect x="2" y="2" width="16" height="16" rx="3" />
    </svg>
);
