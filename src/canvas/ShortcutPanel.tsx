import React from "react";
import {SHORTCUT_DEFS, UI_SHORTCUT_DEFS, keyLabel} from "@/canvas/shortcuts.ts";
import {t} from "@/i18n/index.ts";

interface ShortcutPanelProps {
    visible: boolean;
    onClose: () => void;
}

const KBD_STYLE: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    height: 20,
    padding: "0 5px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "monospace",
    color: "#4FC3F7",
    lineHeight: 1,
    flexShrink: 0,
};

export const ShortcutPanel: React.FC<ShortcutPanelProps> = ({visible, onClose}) => {
    if (!visible) return null;

    return (
        <div
            style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                background: "rgba(16,16,16,0.96)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "12px 14px",
                zIndex: 20,
                minWidth: 248,
                backdropFilter: "blur(6px)",
                pointerEvents: "auto",
            }}>
            {/* Header */}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10}}>
                <span style={{fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600}}>
                    {t("keyboardShortcuts")}
                </span>
                <button
                    onClick={onClose}
                    style={{background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 16, lineHeight: 1, padding: 0}}>
                    ×
                </button>
            </div>

            {/* Tool shortcuts — auto-generated from SHORTCUT_DEFS */}
            <div style={{display: "flex", flexDirection: "column", gap: 5}}>
                {SHORTCUT_DEFS.map(d => (
                    <div key={d.key} style={{display: "flex", alignItems: "center", gap: 8}}>
                        <kbd style={KBD_STYLE}>{keyLabel(d.key)}</kbd>
                        <span style={{fontSize: 12, color: "rgba(255,255,255,0.78)", flexShrink: 0}}>{d.label}</span>
                        <span style={{fontSize: 11, color: "rgba(255,255,255,0.32)", flexShrink: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{d.hint}</span>
                    </div>
                ))}

                {/* UI shortcuts (minimap, help…) */}
                <div style={{marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 5}}>
                    {UI_SHORTCUT_DEFS.map(d => (
                        <div key={d.key} style={{display: "flex", alignItems: "center", gap: 8}}>
                            <kbd style={KBD_STYLE}>{keyLabel(d.key)}</kbd>
                            <span style={{fontSize: 12, color: "rgba(255,255,255,0.78)", flexShrink: 0}}>{d.label}</span>
                            <span style={{fontSize: 11, color: "rgba(255,255,255,0.32)"}}>{d.hint}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
