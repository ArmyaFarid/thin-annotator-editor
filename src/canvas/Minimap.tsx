import React, {useRef, useState} from "react";
import {useAtomValue} from "jotai";
import {minimapVisibleAtom} from "@/app/atom.ts";

const MAX_W = 180;
const MAX_H = 120;

interface View {zoom: number; panX: number; panY: number}

interface MinimapProps {
    imageUrl: string | undefined;
    view: View;
    containerSize: {w: number; h: number};
    naturalSize: {w: number; h: number} | null;
    onViewChange: (v: View) => void;
}

export const Minimap: React.FC<MinimapProps> = ({imageUrl, view, containerSize, naturalSize, onViewChange}) => {
    const visible = useAtomValue(minimapVisibleAtom);
    const [dragging, setDragging] = useState(false);

    // Stable ref so event handlers always see fresh values without re-registering
    const dragRef = useRef<{startMx: number; startMy: number; startView: View} | null>(null);
    const liveRef = useRef({view, scale: 1, containerSize, onViewChange});

    if (!visible || !imageUrl || !naturalSize || containerSize.w === 0) return null;

    const scale = Math.min(MAX_W / naturalSize.w, MAX_H / naturalSize.h);
    liveRef.current = {view, scale, containerSize, onViewChange};

    const mmW = Math.round(naturalSize.w * scale);
    const mmH = Math.round(naturalSize.h * scale);

    // Viewport rectangle in minimap space
    const vpX = -view.panX / view.zoom;
    const vpY = -view.panY / view.zoom;
    const vpW = containerSize.w / view.zoom;
    const vpH = containerSize.h / view.zoom;
    const left  = Math.max(0, vpX * scale);
    const top   = Math.max(0, vpY * scale);
    const right  = Math.min(mmW, (vpX + vpW) * scale);
    const bottom = Math.min(mmH, (vpY + vpH) * scale);
    const rW = Math.max(2, right - left);
    const rH = Math.max(2, bottom - top);

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();

        const {view: v, scale: s, containerSize: cs, onViewChange: ovc} = liveRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Click to center viewport on clicked image point
        const centeredView: View = {
            zoom: v.zoom,
            panX: cs.w / 2 - (mx / s) * v.zoom,
            panY: cs.h / 2 - (my / s) * v.zoom,
        };
        ovc(centeredView);
        dragRef.current = {startMx: e.clientX, startMy: e.clientY, startView: centeredView};
        setDragging(true);

        function onMove(ev: MouseEvent) {
            if (!dragRef.current) return;
            const {startMx, startMy, startView} = dragRef.current;
            const {scale: sc, onViewChange: ovc2} = liveRef.current;
            ovc2({
                zoom: startView.zoom,
                panX: startView.panX - (ev.clientX - startMx) * startView.zoom / sc,
                panY: startView.panY - (ev.clientY - startMy) * startView.zoom / sc,
            });
        }

        function onUp() {
            dragRef.current = null;
            setDragging(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }

    return (
        <div
            onMouseDown={handleMouseDown}
            onWheel={e => e.stopPropagation()}
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
                cursor: dragging ? "grabbing" : "crosshair",
                zIndex: 10,
                opacity: 0.85,
                userSelect: "none",
            }}>
            <img
                src={imageUrl}
                draggable={false}
                style={{width: "100%", height: "100%", display: "block", pointerEvents: "none"}}
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
                    pointerEvents: "none",
                }}
            />
        </div>
    );
};
