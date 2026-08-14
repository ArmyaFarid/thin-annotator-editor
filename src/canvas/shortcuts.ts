import type {Tool} from "@/app/types.ts";
import type {TranslationKey} from "@/i18n/index.ts";

export interface ShortcutDef {
    key: string;   // lowercase key character sent by KeyboardEvent.key
    tool: Tool;
    // Keys, not strings: resolved with t() at render so a language change
    // is picked up (module-scope t() calls would freeze the old language).
    labelKey: TranslationKey;
    hintKey: TranslationKey;
}

// ─── Edit this array to add / change / remove shortcuts ──────────────────────
export const SHORTCUT_DEFS: ShortcutDef[] = [
    {key: "s", tool: "select-add",    labelKey: "shortcutSelectAddLabel",    hintKey: "shortcutSelectAddHint"},
    {key: "x", tool: "select-remove", labelKey: "shortcutSelectRemoveLabel", hintKey: "shortcutSelectRemoveHint"},
    {key: "b", tool: "bounding-box",  labelKey: "shortcutBboxLabel",         hintKey: "shortcutBboxHint"},
    {key: "p", tool: "polygon-lasso", labelKey: "shortcutPolygonLabel",      hintKey: "shortcutPolygonHint"},
    {key: "f", tool: "freeform-draw", labelKey: "shortcutFreeformLabel",     hintKey: "shortcutFreeformHint"},
    {key: "l", tool: "slic-bbox",     labelKey: "shortcutSlicLabel",         hintKey: "shortcutSlicHint"},
    {key: "g", tool: "grab",          labelKey: "shortcutGrabLabel",         hintKey: "shortcutGrabHint"},
    {key: "=", tool: "zoom-in",       labelKey: "shortcutZoomInLabel",       hintKey: "shortcutZoomInHint"},
    {key: "-", tool: "zoom-out",      labelKey: "shortcutZoomOutLabel",      hintKey: "shortcutZoomOutHint"},
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
    labelKey: TranslationKey;
    hintKey: TranslationKey;
}

export const UI_SHORTCUT_DEFS: UiShortcutDef[] = [
    {key: "m",         labelKey: "shortcutMinimapLabel",   hintKey: "shortcutMinimapHint"},
    {key: "h",         labelKey: "shortcutCursorLabel",    hintKey: "shortcutCursorHint"},
    {key: "Ctrl+Z",    labelKey: "undo",                   hintKey: "shortcutUndoHint"},
    {key: "Ctrl+⇧+Z",  labelKey: "redo",                   hintKey: "shortcutRedoHint"},
    {key: "?",         labelKey: "shortcutHelpLabel",      hintKey: "keyboardShortcuts"},
    {key: "Escape",    labelKey: "shortcutEscapeLabel",    hintKey: "shortcutEscapeHint"},
    {key: "Backspace", labelKey: "shortcutBackspaceLabel", hintKey: "shortcutBackspaceHint"},
    {key: "Delete",    labelKey: "shortcutDeleteLabel",    hintKey: "shortcutDeleteHint"},
];
