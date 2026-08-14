import type {Tool} from "@/app/types.ts";
import {t} from "@/i18n/index.ts";

export interface ShortcutDef {
    key: string;   // lowercase key character sent by KeyboardEvent.key
    tool: Tool;
    label: string; // short display name
    hint: string;  // one-line description
}

// ─── Edit this array to add / change / remove shortcuts ──────────────────────
export const SHORTCUT_DEFS: ShortcutDef[] = [
    {key: "s", tool: "select-add",    label: t("shortcutSelectAddLabel"),    hint: t("shortcutSelectAddHint")},
    {key: "x", tool: "select-remove", label: t("shortcutSelectRemoveLabel"), hint: t("shortcutSelectRemoveHint")},
    {key: "b", tool: "bounding-box",  label: t("shortcutBboxLabel"),         hint: t("shortcutBboxHint")},
    {key: "p", tool: "polygon-lasso", label: t("shortcutPolygonLabel"),      hint: t("shortcutPolygonHint")},
    {key: "f", tool: "freeform-draw", label: t("shortcutFreeformLabel"),     hint: t("shortcutFreeformHint")},
    {key: "l", tool: "slic-bbox",     label: t("shortcutSlicLabel"),         hint: t("shortcutSlicHint")},
    {key: "g", tool: "grab",          label: t("shortcutGrabLabel"),         hint: t("shortcutGrabHint")},
    {key: "=", tool: "zoom-in",       label: t("shortcutZoomInLabel"),       hint: t("shortcutZoomInHint")},
    {key: "-", tool: "zoom-out",      label: t("shortcutZoomOutLabel"),      hint: t("shortcutZoomOutHint")},
];
// ─────────────────────────────────────────────────────────────────────────────

// O(1) lookup used by the keyboard listener
export const SHORTCUT_MAP = new Map<string, Tool>(
    SHORTCUT_DEFS.map(d => [d.key, d.tool]),
);

// Human-readable key badge
export function keyLabel(key: string): string {
    if (key === "=") return "+";
    if (key === "Escape") return "Esc";
    if (key === "Backspace") return "⌫";
    if (key === "Delete") return "Del";
    return key.toUpperCase();
}

// ─── Non-tool UI shortcuts (shown in the panel, handled separately) ───────────
export interface UiShortcutDef {
    key: string;
    label: string;
    hint: string;
}

export const UI_SHORTCUT_DEFS: UiShortcutDef[] = [
    {key: "m",         label: t("shortcutMinimapLabel"),   hint: t("shortcutMinimapHint")},
    {key: "h",         label: t("shortcutCursorLabel"),    hint: t("shortcutCursorHint")},
    {key: "Ctrl+Z",    label: t("undo"),                   hint: t("shortcutUndoHint")},
    {key: "Ctrl+⇧+Z",  label: t("redo"),                   hint: t("shortcutRedoHint")},
    {key: "?",         label: t("shortcutHelpLabel"),      hint: t("keyboardShortcuts")},
    {key: "Escape",    label: t("shortcutEscapeLabel"),    hint: t("shortcutEscapeHint")},
    {key: "Backspace", label: t("shortcutBackspaceLabel"), hint: t("shortcutBackspaceHint")},
    {key: "Delete",    label: t("shortcutDeleteLabel"),    hint: t("shortcutDeleteHint")},
];
