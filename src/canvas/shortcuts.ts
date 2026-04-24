import type {Tool} from "@/app/types.ts";

export interface ShortcutDef {
    key: string;   // lowercase key character sent by KeyboardEvent.key
    tool: Tool;
    label: string; // short display name
    hint: string;  // one-line French description
}

// ─── Edit this array to add / change / remove shortcuts ──────────────────────
export const SHORTCUT_DEFS: ShortcutDef[] = [
    {key: "s", tool: "select-add",    label: "Select +",  hint: "Point positif SAM"},
    {key: "x", tool: "select-remove", label: "Select −",  hint: "Point négatif SAM"},
    {key: "b", tool: "bounding-box",  label: "Bbox SAM",  hint: "Boîte englobante"},
    {key: "p", tool: "polygon-lasso", label: "Polygone",  hint: "Lasso polygonal"},
    {key: "f", tool: "freeform-draw", label: "Dessin",    hint: "Tracé libre"},
    {key: "l", tool: "slic-bbox",     label: "SLIC",      hint: "Superpixels SLIC"},
    {key: "g", tool: "grab",          label: "Déplacer",  hint: "Panoramique (clic molette)"},
    {key: "=", tool: "zoom-in",       label: "Zoom +",    hint: "Zoom avant"},
    {key: "-", tool: "zoom-out",      label: "Zoom −",    hint: "Zoom arrière"},
];
// ─────────────────────────────────────────────────────────────────────────────

// O(1) lookup used by the keyboard listener
export const SHORTCUT_MAP = new Map<string, Tool>(
    SHORTCUT_DEFS.map(d => [d.key, d.tool]),
);

// Human-readable key badge (= is labelled + because it shares the key)
export function keyLabel(key: string): string {
    return key === "=" ? "+" : key.toUpperCase();
}

// ─── Non-tool UI shortcuts (shown in the panel, handled separately) ───────────
export interface UiShortcutDef {
    key: string;
    label: string;
    hint: string;
}

export const UI_SHORTCUT_DEFS: UiShortcutDef[] = [
    {key: "m", label: "Minimap", hint: "Afficher / masquer"},
    {key: "?", label: "Aide",    hint: "Raccourcis clavier"},
];
