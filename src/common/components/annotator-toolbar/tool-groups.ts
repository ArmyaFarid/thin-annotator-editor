import type React from "react";
import type {Tool} from "@/app/types.ts";
import SamGroupIcon from "@/assets/icons/sam-group.svg?react";
import SlicBboxIcon from "@/assets/icons/slic-bbox.svg?react";
import type {TranslationKey} from "@/i18n/index.ts";

// Presentation-only clustering. This file says how the toolbar DISPLAYS tools,
// never which tools exist or what they do — TOOLS (AppConfig) stays the source
// of truth, and ToolManager and the shortcuts are untouched by anything here.
//
// To add a group, append one entry: its name and icon travel with it, and every
// layout mode picks them up automatically. Tools left out of every group render
// on their own, exactly as they do today.
export interface ToolGroup {
    id: string;
    labelKey: TranslationKey;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    tools: Tool[];
}

export const TOOL_GROUPS: ToolGroup[] = [
    {
        id: "sam",
        labelKey: "groupSam",
        icon: SamGroupIcon,
        tools: ["select-add", "select-remove", "bounding-box"],
    },
    {
        id: "slic",
        labelKey: "groupSlic",
        icon: SlicBboxIcon,
        tools: ["slic-bbox"],
    },
];

// Tool → its group. A tool with no entry here is an ungrouped, standalone
// button; the toolbar renders each group once, at the position of its first
// member in TOOLS, so the existing tool order is preserved.
export const GROUP_BY_TOOL = new Map<Tool, ToolGroup>(
    TOOL_GROUPS.flatMap((g) => g.tools.map((tool) => [tool, g] as const)),
);
