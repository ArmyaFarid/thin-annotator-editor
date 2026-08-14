import React, {useEffect, useMemo, useRef, useState} from "react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
    borderOnlyAtom,
    customizeOpenAtom,
    showShortcutsAtom,
    type ToolbarLayout,
} from "@/app/atom.ts";
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
import PointerIcon from "@/assets/icons/pointer.svg?react";
import {Tool} from "@/app/types.ts";
import useAnnotatorToolbar from "@/common/components/annotator-toolbar/useAnnotatorToolbar.ts";
import {TOOLS} from "@/app/AppConfig.tsx";
import FilterGammaToolbarPanel from "@/common/components/annotator-toolbar/FilterGammaToolbarPanel.tsx";
import {SHORTCUT_DEFS, keyLabel} from "@/canvas/shortcuts.ts";
import {Tooltip} from "@/common/components/ui/Tooltip.tsx";
import {t, type TranslationKey} from "@/i18n/index.ts";
import {GROUP_BY_TOOL, type ToolGroup} from "@/common/components/annotator-toolbar/tool-groups.ts";
import useToolbarLayout from "@/common/components/annotator-toolbar/useToolbarLayout.ts";
import {CustomizeModal} from "@/common/components/customize/CustomizeModal.tsx";

const TOOL_ICONS: Record<Tool, React.FC<React.SVGProps<SVGSVGElement>>> = {
    "idle": PointerIcon,
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

const TOOL_LABEL_KEYS: Record<Tool, TranslationKey> = {
    "idle": "toolIdle",
    "select-add": "toolSelectAdd",
    "select-remove": "toolSelectRemove",
    "bounding-box": "toolBoundingBox",
    "freeform-draw": "toolFreeformDraw",
    "polygon-lasso": "toolPolygonLasso",
    "slic-bbox": "toolSlicBbox",
    "zoom-in": "toolZoomIn",
    "zoom-out": "toolZoomOut",
    "grab": "toolGrab",
};

const KEY_BADGE = new Map<Tool, string>(
    SHORTCUT_DEFS.map(d => [d.tool, keyLabel(d.key)]),
);

// One slot in the rail: either a standalone tool or a whole group. Groups take
// the slot of their first member so the TOOLS order still drives the layout.
type RailItem = {kind: "tool"; tool: Tool} | {kind: "group"; group: ToolGroup};

function buildRail(): RailItem[] {
    const seen = new Set<string>();
    const items: RailItem[] = [];
    for (const tool of TOOLS) {
        const group = GROUP_BY_TOOL.get(tool);
        if (!group) {
            items.push({kind: "tool", tool});
            continue;
        }
        if (seen.has(group.id)) continue;
        seen.add(group.id);
        items.push({kind: "group", group});
    }
    return items;
}

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
        ? t("undoModalActive")
        : canUndo
        ? `${t("undo")} : ${labelToFrench(history.past[history.past.length - 1].label)}`
        : t("undoEmpty");
    const redoLabel = modalActive
        ? t("redoModalActive")
        : canRedo
        ? `${t("redo")} : ${labelToFrench(history.future[history.future.length - 1].label)}`
        : t("redoEmpty");
    const undoDisabled = modalActive || !canUndo;
    const redoDisabled = modalActive || !canRedo;

    const [layout] = useToolbarLayout();
    const setCustomizeOpen = useSetAtom(customizeOpenAtom);
    const rail = useMemo(buildRail, []);

    return (
        <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-secondary w-12 h-full">
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

            {rail.map((item, i) => {
                // In "separators" mode a hairline marks every group boundary.
                const prev = rail[i - 1];
                const divider =
                    layout === "separators" &&
                    prev != null &&
                    (prev.kind === "group" || item.kind === "group");

                return (
                    <React.Fragment key={item.kind === "tool" ? item.tool : item.group.id}>
                        {divider ? <div className="w-6 h-px bg-white/10 my-0.5" /> : null}
                        {item.kind === "tool" ? (
                            <ToolButton
                                tool={item.tool}
                                active={activeTool === item.tool}
                                onSelect={setActiveTool}
                            />
                        ) : (
                            <ToolGroupBlock
                                group={item.group}
                                layout={layout}
                                activeTool={activeTool}
                                onSelect={setActiveTool}
                            />
                        )}
                    </React.Fragment>
                );
            })}
            <FilterGammaToolbarPanel />
            <div className="w-6 h-px bg-white/10 my-0.5" />
            <Tooltip
                content={borderOnly ? t("showFill") : t("showBordersOnly")}
                side="right">
                <button
                    aria-label={borderOnly ? t("showFill") : t("showBordersOnly")}
                    onClick={() => setBorderOnly(v => !v)}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${borderOnly ? "bg-[#2F2F2F] ring-1 ring-emerald-500/50" : "bg-transparent hover:bg-[#2F2F2F]/60"}`}>
                    <BorderOnlyIcon active={borderOnly} />
                </button>
            </Tooltip>
            <Tooltip content={t("keyboardShortcuts")} shortcut="?" side="right">
                <button
                    aria-label={t("keyboardShortcuts")}
                    onClick={() => setShowShortcuts(v => !v)}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors ${showShortcuts ? "bg-[#2F2F2F] text-[#4FC3F7] ring-1 ring-[#4FC3F7]/40" : "bg-transparent text-[#B8B8B8] hover:bg-[#2F2F2F]/60"}`}>
                    ?
                </button>
            </Tooltip>

            {/* Customize — pinned to the bottom of the rail, under the tools. */}
            <div className="mt-auto pt-1">
                <Tooltip content={t("customize")} side="right">
                    <button
                        aria-label={t("customize")}
                        onClick={() => setCustomizeOpen(true)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-[#B8B8B8] hover:bg-[#2F2F2F]/60 hover:text-white transition-colors">
                        <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
            <CustomizeModal />
        </div>
    );
};

interface ToolButtonProps {
    tool: Tool;
    active: boolean;
    onSelect: (tool: Tool) => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({tool, active, onSelect}) => {
    const Icon = TOOL_ICONS[tool];
    const label = t(TOOL_LABEL_KEYS[tool]);

    return (
        <Tooltip content={label} shortcut={KEY_BADGE.get(tool)} side="right">
            <button
                aria-label={label}
                onClick={() => onSelect(tool)}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${active ? "bg-[#2F2F2F] ring-1 ring-[#4FC3F7]/40" : "bg-transparent hover:bg-[#2F2F2F]/60"}`}>
                {Icon ? (
                    <Icon className={`w-4 h-4 transition-colors ${active ? "text-[#4FC3F7]" : "text-[#B8B8B8]"}`} />
                ) : (
                    <FallbackSquare active={active} />
                )}
            </button>
        </Tooltip>
    );
};

interface ToolGroupBlockProps {
    group: ToolGroup;
    layout: ToolbarLayout;
    activeTool: Tool;
    onSelect: (tool: Tool) => void;
}

// A group's own icon and name are shown by the layouts that have room for them
// ("pods", "flyout"); "separators" just clusters the buttons between hairlines.
const ToolGroupBlock: React.FC<ToolGroupBlockProps> = ({group, layout, activeTool, onSelect}) => {
    // `open` = visible. `pinned` = opened by a click, so it survives the mouse
    // leaving; only selecting a tool, clicking the trigger again, clicking
    // outside, or Escape closes it.
    const [open, setOpen] = useState(false);
    const [pinned, setPinned] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    function close() {
        setOpen(false);
        setPinned(false);
    }

    useEffect(() => {
        if (!pinned) return;

        function onPointerDown(e: MouseEvent) {
            if (!wrapRef.current?.contains(e.target as Node)) close();
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== "Escape") return;
            close();
            triggerRef.current?.focus();
        }

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [pinned]);

    const buttons = group.tools.map(tool => (
        <ToolButton
            key={tool}
            tool={tool}
            active={activeTool === tool}
            onSelect={onSelect}
        />
    ));

    // Collapsed: one button for the whole group, opened on hover or click. A
    // single-tool group has nothing to collapse, so it stays a plain button.
    if (layout === "flyout" && group.tools.length > 1) {
        const activeInGroup = group.tools.find(tool => tool === activeTool);
        const TriggerIcon = activeInGroup ? TOOL_ICONS[activeInGroup] : group.icon;

        return (
            <div
                ref={wrapRef}
                className="relative"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => {
                    if (!pinned) setOpen(false);
                }}>
                <button
                    ref={triggerRef}
                    aria-label={t(group.labelKey)}
                    aria-haspopup="true"
                    aria-expanded={open}
                    onClick={() => {
                        if (pinned) {
                            close();
                            return;
                        }
                        setPinned(true);
                        setOpen(true);
                    }}
                    className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${activeInGroup ? "bg-[#2F2F2F] ring-1 ring-[#4FC3F7]/40" : "bg-transparent hover:bg-[#2F2F2F]/60"}`}>
                    <TriggerIcon
                        className={`w-4 h-4 transition-colors ${activeInGroup ? "text-[#4FC3F7]" : "text-[#B8B8B8]"}`}
                    />
                    {/* Corner notch marking the group as expandable. */}
                    <span className="absolute bottom-0.5 right-0.5 w-0 h-0 border-l-[3px] border-l-transparent border-b-[3px] border-b-white/40" />
                </button>
                {open ? (
                    <div
                        role="group"
                        aria-label={t(group.labelKey)}
                        className="absolute left-full top-0 ml-1 z-30 flex flex-row gap-0.5 p-1 rounded-lg bg-secondary border border-white/10 shadow-xl">
                        {group.tools.map(tool => (
                            <ToolButton
                                key={tool}
                                tool={tool}
                                active={activeTool === tool}
                                onSelect={(t) => {
                                    onSelect(t);
                                    close();
                                }}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }

    if (layout !== "pods") {
        return <>{buttons}</>;
    }

    const GroupIcon = group.icon;
    return (
        <div className="flex flex-col items-center gap-0.5 w-full rounded-lg bg-black/25 py-1 my-0.5">
            <Tooltip content={t(group.labelKey)} side="right">
                <div
                    aria-label={t(group.labelKey)}
                    className="flex items-center justify-center w-8 h-4 text-white/30">
                    <GroupIcon className="w-3 h-3" />
                </div>
            </Tooltip>
            {buttons}
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
