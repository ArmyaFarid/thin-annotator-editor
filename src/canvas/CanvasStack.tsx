import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtomValue, useSetAtom} from "jotai";
import {
    activeToolAtom,
    currentMaskAtom,
    masksAtom,
    promptsAtom,
    type Mask,
    type Prompt,
    type PolygonAnnotation,
} from "@/app/atom.ts";
import {CanvasEngine} from "@/canvas/CanvasEngine.ts";
import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";
import {getDistinctColor} from "@/canvas/color.ts";
import {MASK_FILL_ALPHA} from "@/canvas/mask-style.ts";
import {douglasPeucker} from "@/canvas/utils/polygonUtils.ts";
import {useAtom} from "jotai";

interface CanvasStackProps {
    imageUrl: string | undefined;
}

interface View { zoom: number; panX: number; panY: number }

function zoomAt(v: View, cx: number, cy: number, factor: number): View {
    const newZoom = Math.max(0.25, Math.min(8, v.zoom * factor));
    return {
        zoom: newZoom,
        panX: cx - (cx - v.panX) * newZoom / v.zoom,
        panY: cy - (cy - v.panY) * newZoom / v.zoom,
    };
}

let nextId = 1;
const genId = () => nextId++;

export const CanvasStack: React.FC<CanvasStackProps> = ({imageUrl}) => {
    const staticRef = useRef<HTMLCanvasElement>(null);
    const dataRef = useRef<HTMLCanvasElement>(null);
    const dynRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<CanvasEngine | null>(null);

    const activeTool = useAtomValue(activeToolAtom);
    const prompts = useAtomValue(promptsAtom);
    const masks = useAtomValue(masksAtom);

    const [, setPrompts] = useAtom(promptsAtom);
    const setMasks = useSetAtom(masksAtom);
    const currentMask = useAtomValue(currentMaskAtom);
    const setCurrentMask = useSetAtom(currentMaskAtom);

    const [view, setView] = useState<View>({zoom: 1, panX: 0, panY: 0});
    const viewRef = useRef(view);
    useEffect(() => { viewRef.current = view; }, [view]);

    // Pan drag state (zoom tools + middle mouse)
    const panDrag = useRef<{startX: number; startY: number; startPanX: number; startPanY: number} | null>(null);

    // Keep fresh currentMask for stable callbacks
    const currentMaskRef = useRef<number>(currentMask);
    useEffect(() => { currentMaskRef.current = currentMask; }, [currentMask]);

    // Reset view when image changes
    useEffect(() => {
        setView({zoom: 1, panX: 0, panY: 0});
    }, [imageUrl]);

    const callbacks = useCallback((): EngineCallbacks => ({
        onKeypointAdded(x: number, y: number, label: 0 | 1) {
            const type = label === 1 ? "select-add" : "select-remove";
            setPrompts((prev: Prompt[]) => [
                ...prev,
                {id: genId(), type, point_labels: label, point_coords: [x, y] as [number, number]},
            ]);
        },
        onBboxAdded(x: number, y: number, w: number, h: number) {
            setPrompts((prev: Prompt[]) => [
                ...prev,
                {
                    id: genId(),
                    type: "bounding-box",
                    point_labels: -1,
                    point_coords: [x + w / 2, y + h / 2] as [number, number],
                    bbox: {left: x, top: y, width: w, height: h},
                },
            ]);
        },
        onFreeformPathAdded(points: ImageSpacePoint[]) {
            const activeMaskId = currentMaskRef.current;
            const layerId = genId();
            const shapeId = genId();
            const vertices = douglasPeucker(points, 2);
            if (vertices.length < 3) return;

            if (activeMaskId !== 0) {
                setMasks((prev: Mask[]) => {
                    const target = prev.find(m => m.id === activeMaskId);
                    if (!target) return prev;
                    const {r, g, b} = target.color;
                    const canvasShape: PolygonAnnotation = {
                        kind: "polygon", id: shapeId, vertices,
                        fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                        strokeColor: `rgb(${r},${g},${b})`,
                    };
                    return prev.map(m =>
                        m.id === activeMaskId
                            ? {...m, layers: [...m.layers, {id: layerId, canvasShape, source: "manual" as const}]}
                            : m
                    );
                });
            } else {
                const newId = genId();
                setMasks((prev: Mask[]) => {
                    const maskColor = getDistinctColor(prev.length, MASK_FILL_ALPHA);
                    const {r, g, b} = maskColor;
                    const canvasShape: PolygonAnnotation = {
                        kind: "polygon", id: shapeId, vertices,
                        fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                        strokeColor: `rgb(${r},${g},${b})`,
                    };
                    return [...prev, {
                        id: newId,
                        label: `Dessin ${prev.length + 1}`,
                        point_labels: [],
                        point_coords: [],
                        layers: [{id: layerId, canvasShape, source: "manual" as const}],
                        color: maskColor,
                    }];
                });
                setCurrentMask(newId);
            }
        },
        onPolygonAdded(vertices: ImageSpacePoint[]) {
            const activeMaskId = currentMaskRef.current;
            const layerId = genId();
            const shapeId = genId();

            if (activeMaskId !== 0) {
                setMasks((prev: Mask[]) => {
                    const target = prev.find(m => m.id === activeMaskId);
                    if (!target) return prev;
                    const {r, g, b} = target.color;
                    const canvasShape = {
                        kind: "polygon" as const, id: shapeId, vertices,
                        fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                        strokeColor: `rgb(${r},${g},${b})`,
                    };
                    return prev.map(m =>
                        m.id === activeMaskId
                            ? {...m, layers: [...m.layers, {id: layerId, canvasShape, source: "manual" as const}]}
                            : m
                    );
                });
            } else {
                const newId = genId();
                setMasks((prev: Mask[]) => {
                    const maskColor = getDistinctColor(prev.length, MASK_FILL_ALPHA);
                    const {r, g, b} = maskColor;
                    const canvasShape = {
                        kind: "polygon" as const, id: shapeId, vertices,
                        fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                        strokeColor: `rgb(${r},${g},${b})`,
                    };
                    return [...prev, {
                        id: newId,
                        label: `Polygone ${prev.length + 1}`,
                        point_labels: [],
                        point_coords: [],
                        layers: [{id: layerId, canvasShape, source: "manual" as const}],
                        color: maskColor,
                    }];
                });
                setCurrentMask(newId);
            }
        },
        onLayerDeleted(objectId: number, layerId: number) {
            setMasks((prev: Mask[]) =>
                prev.map(m =>
                    m.id === objectId
                        ? {...m, layers: m.layers.filter(l => l.id !== layerId)}
                        : m
                )
            );
        },
        onPolygonVertexMoved(objectId: number, layerId: number, vertices: ImageSpacePoint[]) {
            setMasks((prev: Mask[]) =>
                prev.map(m => {
                    if (m.id !== objectId) return m;
                    return {
                        ...m,
                        layers: m.layers.map(l => {
                            if (l.id !== layerId || l.canvasShape?.kind !== "polygon") return l;
                            return {...l, canvasShape: {...l.canvasShape, vertices}};
                        }),
                    };
                })
            );
        },
    }), [setPrompts, setMasks, setCurrentMask]);

    // Mount engine once
    useEffect(() => {
        if (!staticRef.current || !dataRef.current || !dynRef.current) return;
        const engine = new CanvasEngine(staticRef.current, dataRef.current, dynRef.current, callbacks());
        engineRef.current = engine;
        return () => engine.destroy();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync active tool
    useEffect(() => {
        engineRef.current?.setActiveTool(activeTool);
    }, [activeTool]);

    // Sync prompts → DataLayer
    useEffect(() => {
        engineRef.current?.setPrompts(prompts);
    }, [prompts]);

    // Sync masks → DataLayer
    useEffect(() => {
        engineRef.current?.setMasks(masks);
    }, [masks]);

    // Sync active object → editor + DataLayer dimming
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        if (currentMask !== 0) {
            const obj = masks.find(m => m.id === currentMask);
            if (obj) engine.setActiveObject(currentMask, obj.layers);
        } else {
            engine.clearActiveObject();
        }
    }, [currentMask, masks]);

    // Sync zoom to engine for coordinate conversion
    useEffect(() => {
        engineRef.current?.setViewZoom(view.zoom);
    }, [view.zoom]);

    // Load image into StaticLayer when URL changes
    const handleImageLoad = useCallback(() => {
        const img = imgRef.current;
        if (!img || !engineRef.current) return;
        engineRef.current.setImage(img);
    }, []);

    // Resize all layers when container changes size
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(entries => {
            const {width, height} = entries[0].contentRect;
            engineRef.current?.onResize(width, height);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Scroll-to-zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const rect = containerRef.current!.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        setView(v => zoomAt(v, cx, cy, factor));
    }, []);

    // Unified mouse handlers — distinguish pan drag from canvas interactions
    const isZoomTool = activeTool === "zoom-in" || activeTool === "zoom-out";

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Middle mouse or zoom tool: start pan drag
        if (e.button === 1 || isZoomTool) {
            e.preventDefault();
            panDrag.current = {
                startX: e.clientX,
                startY: e.clientY,
                startPanX: viewRef.current.panX,
                startPanY: viewRef.current.panY,
            };
            return;
        }
        engineRef.current?.onMouseDown(e.nativeEvent);
    }, [isZoomTool]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (panDrag.current) {
            const dx = e.clientX - panDrag.current.startX;
            const dy = e.clientY - panDrag.current.startY;
            setView(v => ({
                ...v,
                panX: panDrag.current!.startPanX + dx,
                panY: panDrag.current!.startPanY + dy,
            }));
            return;
        }
        engineRef.current?.onMouseMove(e.nativeEvent);
    }, []);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (panDrag.current) {
            panDrag.current = null;
            return;
        }
        engineRef.current?.onMouseUp(e.nativeEvent);
    }, []);

    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
        panDrag.current = null;
        engineRef.current?.onMouseLeave(e.nativeEvent);
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (panDrag.current) return;

        // Zoom tools: zoom at click point (container-relative)
        if (isZoomTool) {
            const rect = containerRef.current!.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const factor = activeTool === "zoom-in" ? 1.5 : 1 / 1.5;
            setView(v => zoomAt(v, cx, cy, factor));
            return;
        }

        engineRef.current?.onClick(e.nativeEvent);
    }, [isZoomTool, activeTool]);

    const cursor = isZoomTool
        ? (activeTool === "zoom-in" ? "zoom-in" : "zoom-out")
        : getCursor(activeTool);

    const transform = `matrix(${view.zoom},0,0,${view.zoom},${view.panX},${view.panY})`;

    return (
        <div
            ref={containerRef}
            style={{position: "relative", overflow: "hidden", display: "inline-block", lineHeight: 0}}
            onWheel={handleWheel}>
            <div
                ref={innerRef}
                style={{
                    position: "relative",
                    display: "inline-block",
                    lineHeight: 0,
                    transform,
                    transformOrigin: "0 0",
                }}>
                <img
                    ref={imgRef}
                    src={imageUrl}
                    onLoad={handleImageLoad}
                    draggable={false}
                    style={{display: "block", maxHeight: "700px", width: "auto", userSelect: "none"}}
                    alt=""
                />
                <canvas ref={staticRef} style={{position: "absolute", inset: 0, pointerEvents: "none"}} />
                <canvas ref={dataRef}   style={{position: "absolute", inset: 0, pointerEvents: "none"}} />
                <canvas
                    ref={dynRef}
                    style={{position: "absolute", inset: 0, cursor}}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    onDoubleClick={() => engineRef.current?.onDblClick()}
                    onContextMenu={e => { e.preventDefault(); engineRef.current?.onContextMenu(); }}
                />
            </div>
        </div>
    );
};

function getCursor(tool: string): string {
    switch (tool) {
        case "select-add":
        case "select-remove":
        case "bounding-box":
        case "polygon-lasso":
            return "crosshair";
        case "freeform-draw":
            return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='4' fill='%23f97316'/%3E%3C/svg%3E\") 8 8, crosshair";
        default:
            return "default";
    }
}
