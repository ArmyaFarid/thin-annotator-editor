import React from "react";

// Set to false to hide the minimap entirely
const MINIMAP_ENABLED = true;

const MAX_W = 180;
const MAX_H = 120;

interface MinimapProps {
    imageUrl: string | undefined;
    view: {zoom: number; panX: number; panY: number};
    containerSize: {w: number; h: number};
    naturalSize: {w: number; h: number} | null;
}

export const Minimap: React.FC<MinimapProps> = ({imageUrl, view, containerSize, naturalSize}) => {
    if (!MINIMAP_ENABLED || !imageUrl || !naturalSize || containerSize.w === 0) return null;

    const scale = Math.min(MAX_W / naturalSize.w, MAX_H / naturalSize.h);
    const mmW = Math.round(naturalSize.w * scale);
    const mmH = Math.round(naturalSize.h * scale);

    // Viewport rectangle in image space
    const vpX = -view.panX / view.zoom;
    const vpY = -view.panY / view.zoom;
    const vpW = containerSize.w / view.zoom;
    const vpH = containerSize.h / view.zoom;

    // Map to minimap pixel space, clamp to minimap bounds
    const left = Math.max(0, vpX * scale);
    const top = Math.max(0, vpY * scale);
    const right = Math.min(mmW, (vpX + vpW) * scale);
    const bottom = Math.min(mmH, (vpY + vpH) * scale);
    const rW = Math.max(2, right - left);
    const rH = Math.max(2, bottom - top);

    return (
        <div
            style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                width: mmW,
                height: mmH,
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "#000",
                pointerEvents: "none",
                zIndex: 10,
                opacity: 0.85,
            }}>
            <img
                src={imageUrl}
                draggable={false}
                style={{width: "100%", height: "100%", display: "block"}}
                alt=""
            />
            <div
                style={{
                    position: "absolute",
                    left,
                    top,
                    width: rW,
                    height: rH,
                    border: "1.5px solid #4FC3F7",
                    background: "rgba(79,195,247,0.15)",
                    boxSizing: "border-box",
                }}
            />
        </div>
    );
};
