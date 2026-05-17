import React, {useCallback, useEffect, useRef, useState} from "react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {toast} from "sonner";
import {
    activeToolAtom,
    activeImageSizeAtom,
    borderOnlyAtom,
    currentMaskAtom,
    masksAtom,
    promptsAtom,
    subtractModeAtom,
    showShortcutsAtom,
    minimapVisibleAtom,
    type Mask,
    type Prompt,
    type PolygonAnnotation,
    slicPromptsAtom,
} from "@/app/atom.ts";
import {CanvasEngine} from "@/canvas/CanvasEngine.ts";
import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";
import {getDistinctColor} from "@/canvas/color.ts";
import {MASK_FILL_ALPHA} from "@/canvas/mask-style.ts";
import {douglasPeucker} from "@/canvas/utils/polygonUtils.ts";
import usePreserveZoom from "@/canvas/usePreserveZoom.ts";
import {Minimap} from "@/canvas/Minimap.tsx";
import {ShortcutPanel} from "@/canvas/ShortcutPanel.tsx";
import {SHORTCUT_MAP} from "@/canvas/shortcuts.ts";

// ≤100 superpixels — backend: n_segments = w·h/400
const MAX_SLIC_BBOX_AREA = 40_000;

interface CanvasStackProps {
    imageUrl: string | undefined;
}

interface View {
    zoom: number;
    panX: number;
    panY: number;
}

function zoomAt(v: View, cx: number, cy: number, factor: number): View {
    const newZoom = Math.max(0.05, Math.min(20, v.zoom * factor));
    return {
        zoom: newZoom,
        panX: cx - ((cx - v.panX) * newZoom) / v.zoom,
        panY: cy - ((cy - v.panY) * newZoom) / v.zoom,
    };
}

let nextId = Date.now();
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
    const setActiveTool = useSetAtom(activeToolAtom);
    const prompts = useAtomValue(promptsAtom);
    const masks = useAtomValue(masksAtom);

    const [, setPrompts] = useAtom(promptsAtom);
    const [, setSlicPrompts] = useAtom(slicPromptsAtom);
    const setMasks = useSetAtom(masksAtom);
    const currentMask = useAtomValue(currentMaskAtom);
    const setCurrentMask = useSetAtom(currentMaskAtom);
    const subtractMode = useAtomValue(subtractModeAtom);
    const subtractModeRef = useRef(subtractMode);
    useEffect(() => {
        subtractModeRef.current = subtractMode;
    }, [subtractMode]);
    useEffect(() => {
        engineRef.current?.setSubtractMode(subtractMode);
    }, [subtractMode]);
    const imageSize = useAtomValue(activeImageSizeAtom);
    const imageSizeRef = useRef(imageSize);
    useEffect(() => {
        imageSizeRef.current = imageSize;
    }, [imageSize]);
    const [preserveZoom] = usePreserveZoom();
    const preserveZoomRef = useRef(preserveZoom);
    useEffect(() => {
        preserveZoomRef.current = preserveZoom;
    }, [preserveZoom]);

    const borderOnly = useAtomValue(borderOnlyAtom);
    useEffect(() => {
        engineRef.current?.setBorderOnly(borderOnly);
    }, [borderOnly]);

    const [view, setView] = useState<View>({zoom: 1, panX: 0, panY: 0});
    const viewRef = useRef(view);
    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    // Pan drag state (grab tool + zoom tools + middle mouse)
    const panDrag = useRef<{
        startX: number;
        startY: number;
        startPanX: number;
        startPanY: number;
    } | null>(null);
    const [grabbing, setGrabbing] = useState(false);

    // Keep fresh currentMask for stable callbacks
    const currentMaskRef = useRef<number>(currentMask);
    useEffect(() => {
        currentMaskRef.current = currentMask;
    }, [currentMask]);

    // Reset view when image changes — skipped when preserveZoom is on
    useEffect(() => {
        if (!preserveZoomRef.current) {
            setView({zoom: 1, panX: 0, panY: 0});
        }
    }, [imageUrl]);

    const [showShortcuts, setShowShortcuts] = useAtom(showShortcutsAtom);
    const setMinimapVisible = useSetAtom(minimapVisibleAtom);

    // Keyboard shortcuts for all tools + ? + M + Escape/Backspace/Delete
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") {
                return;
            }

            if (e.key === "Escape") {
                engineRef.current?.cancelTool();
                return;
            }

            if (e.key === "Backspace") {
                // Undo last polygon vertex while drawing; otherwise delete selected mask
                if (engineRef.current?.undoVertex()) {
                    return;
                }
                if (currentMaskRef.current !== 0) {
                    setMasks((prev) =>
                        prev.filter((m) => m.id !== currentMaskRef.current),
                    );
                    setCurrentMask(0);
                    setPrompts([]);
                }
                return;
            }

            if (e.key === "Delete" && currentMaskRef.current !== 0) {
                setMasks((prev) =>
                    prev.filter((m) => m.id !== currentMaskRef.current),
                );
                setCurrentMask(0);
                setPrompts([]);
                return;
            }

            if (e.key === "?") {
                setShowShortcuts((v) => !v);
                return;
            }
            if (e.key === "m" || e.key === "M") {
                setMinimapVisible((v) => !v);
                return;
            }
            const tool =
                SHORTCUT_MAP.get(e.key.toLowerCase()) ??
                SHORTCUT_MAP.get(e.key);
            if (tool) {
                setActiveTool(tool);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [
        setActiveTool,
        setMinimapVisible,
        setShowShortcuts,
        setMasks,
        setCurrentMask,
        setPrompts,
    ]);

    const callbacks = useCallback(
        (): EngineCallbacks => ({
            onKeypointAdded(x: number, y: number, label: 0 | 1) {
                const type = label === 1 ? "select-add" : "select-remove";
                setPrompts((prev: Prompt[]) => [
                    ...prev,
                    {
                        id: genId(),
                        type,
                        point_labels: label,
                        point_coords: [x, y] as [number, number],
                    },
                ]);
            },
            onBboxAdded(x: number, y: number, w: number, h: number) {
                setPrompts((prev: Prompt[]) => [
                    ...prev,
                    {
                        id: genId(),
                        type: "bounding-box",
                        point_labels: -1,
                        point_coords: [x + w / 2, y + h / 2] as [
                            number,
                            number,
                        ],
                        bbox: {left: x, top: y, width: w, height: h},
                    },
                ]);
            },
            onSlicBboxAdded(x: number, y: number, w: number, h: number) {
                const size = imageSizeRef.current;
                if (!size) {
                    return;
                }

                if (w * h > MAX_SLIC_BBOX_AREA) {
                    toast.error("Zone SLIC trop grande", {
                        description: "Réduisez la sélection (max 100 superpixels).",
                    });
                    return;
                }

                setSlicPrompts({
                    type: "slic-bounding-box",
                    bbox: {left: x, top: y, width: w, height: h},
                });
            },
            onFreeformPathAdded(points: ImageSpacePoint[]) {
                const activeMaskId = currentMaskRef.current;
                const layerId = genId();
                const shapeId = genId();
                const vertices = douglasPeucker(points, 2);
                if (vertices.length < 3) {
                    return;
                }
                const layerKind = subtractModeRef.current
                    ? ("hole" as const)
                    : ("fill" as const);

                if (activeMaskId !== 0) {
                    setMasks((prev: Mask[]) => {
                        const target = prev.find((m) => m.id === activeMaskId);
                        if (!target) {
                            return prev;
                        }
                        const {r, g, b} = target.color;
                        const canvasShape: PolygonAnnotation = {
                            kind: "polygon",
                            id: shapeId,
                            vertices,
                            fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                            strokeColor: `rgb(${r},${g},${b})`,
                        };
                        return prev.map((m) =>
                            m.id === activeMaskId
                                ? {
                                      ...m,
                                      layers: [
                                          ...m.layers,
                                          {
                                              id: layerId,
                                              canvasShape,
                                              source: "manual" as const,
                                              layerKind,
                                          },
                                      ],
                                  }
                                : m,
                        );
                    });
                } else {
                    const newId = genId();
                    setMasks((prev: Mask[]) => {
                        const maskColor = getDistinctColor(
                            prev.length,
                            MASK_FILL_ALPHA,
                        );
                        const {r, g, b} = maskColor;
                        const canvasShape: PolygonAnnotation = {
                            kind: "polygon",
                            id: shapeId,
                            vertices,
                            fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                            strokeColor: `rgb(${r},${g},${b})`,
                        };
                        return [
                            ...prev,
                            {
                                id: newId,
                                label: `Dessin ${prev.length + 1}`,
                                point_labels: [],
                                point_coords: [],
                                layers: [
                                    {
                                        id: layerId,
                                        canvasShape,
                                        source: "manual" as const,
                                        layerKind,
                                    },
                                ],
                                color: maskColor,
                            },
                        ];
                    });
                    setCurrentMask(newId);
                }
            },
            onPolygonAdded(vertices: ImageSpacePoint[]) {
                const activeMaskId = currentMaskRef.current;
                const layerId = genId();
                const shapeId = genId();
                const layerKind = subtractModeRef.current
                    ? ("hole" as const)
                    : ("fill" as const);

                if (activeMaskId !== 0) {
                    setMasks((prev: Mask[]) => {
                        const target = prev.find((m) => m.id === activeMaskId);
                        if (!target) {
                            return prev;
                        }
                        const {r, g, b} = target.color;
                        const canvasShape = {
                            kind: "polygon" as const,
                            id: shapeId,
                            vertices,
                            fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                            strokeColor: `rgb(${r},${g},${b})`,
                        };
                        return prev.map((m) =>
                            m.id === activeMaskId
                                ? {
                                      ...m,
                                      layers: [
                                          ...m.layers,
                                          {
                                              id: layerId,
                                              canvasShape,
                                              source: "manual" as const,
                                              layerKind,
                                          },
                                      ],
                                  }
                                : m,
                        );
                    });
                } else {
                    const newId = genId();
                    setMasks((prev: Mask[]) => {
                        const maskColor = getDistinctColor(
                            prev.length,
                            MASK_FILL_ALPHA,
                        );
                        const {r, g, b} = maskColor;
                        const canvasShape = {
                            kind: "polygon" as const,
                            id: shapeId,
                            vertices,
                            fillColor: `rgba(${r},${g},${b},${MASK_FILL_ALPHA})`,
                            strokeColor: `rgb(${r},${g},${b})`,
                        };
                        return [
                            ...prev,
                            {
                                id: newId,
                                label: `Polygone ${prev.length + 1}`,
                                point_labels: [],
                                point_coords: [],
                                layers: [
                                    {
                                        id: layerId,
                                        canvasShape,
                                        source: "manual" as const,
                                        layerKind,
                                    },
                                ],
                                color: maskColor,
                            },
                        ];
                    });
                    setCurrentMask(newId);
                }
            },
            onLayerDeleted(objectId: number, layerId: number) {
                setMasks((prev: Mask[]) =>
                    prev.map((m) =>
                        m.id === objectId
                            ? {
                                  ...m,
                                  layers: m.layers.filter(
                                      (l) => l.id !== layerId,
                                  ),
                              }
                            : m,
                    ),
                );
            },
            onPolygonVertexMoved(
                objectId: number,
                layerId: number,
                vertices: ImageSpacePoint[],
            ) {
                setMasks((prev: Mask[]) =>
                    prev.map((m) => {
                        if (m.id !== objectId) {
                            return m;
                        }
                        return {
                            ...m,
                            layers: m.layers.map((l) => {
                                if (
                                    l.id !== layerId ||
                                    l.canvasShape?.kind !== "polygon"
                                ) {
                                    return l;
                                }
                                return {
                                    ...l,
                                    canvasShape: {...l.canvasShape, vertices},
                                };
                            }),
                        };
                    }),
                );
            },
        }),
        [setPrompts, setMasks, setCurrentMask],
    );

    // Mount engine once
    useEffect(() => {
        if (!staticRef.current || !dataRef.current || !dynRef.current) {
            return;
        }
        const engine = new CanvasEngine(
            staticRef.current,
            dataRef.current,
            dynRef.current,
            callbacks(),
        );
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
        if (!engine) {
            return;
        }
        if (currentMask !== 0) {
            const obj = masks.find((m) => m.id === currentMask);
            if (obj) {
                engine.setActiveObject(currentMask, obj.layers);
            }
        } else {
            engine.clearActiveObject();
        }
    }, [currentMask, masks]);

    // First load always fits to container regardless of preserveZoom preference
    const firstLoadRef = useRef(true);

    const handleImageLoad = useCallback(() => {
        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !engineRef.current) {
            return;
        }
        engineRef.current.setImage(img);
        const isFirst = firstLoadRef.current;
        firstLoadRef.current = false;
        if (!preserveZoomRef.current || isFirst) {
            const cw = container?.clientWidth ?? img.naturalWidth;
            const ch = container?.clientHeight ?? img.naturalHeight;
            const fitZoom = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1);
            const panX = (cw - img.naturalWidth * fitZoom) / 2;
            const panY = (ch - img.naturalHeight * fitZoom) / 2;
            setView({zoom: fitZoom, panX, panY});
        }
    }, []);

    // Resize all layers when container changes size
    const [containerSize, setContainerSize] = useState({w: 0, h: 0});
    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const {width, height} = entries[0].contentRect;
            engineRef.current?.onResize(width, height);
            setContainerSize({w: width, h: height});
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
        setView((v) => zoomAt(v, cx, cy, factor));
    }, []);

    // Unified mouse handlers — distinguish pan drag from canvas interactions
    const isZoomTool = activeTool === "zoom-in" || activeTool === "zoom-out";
    const isGrabTool = activeTool === "grab";

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            // Middle mouse, zoom tool, or grab tool: start pan drag
            if (e.button === 1 || isZoomTool || isGrabTool) {
                e.preventDefault();
                panDrag.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startPanX: viewRef.current.panX,
                    startPanY: viewRef.current.panY,
                };
                if (isGrabTool) {
                    setGrabbing(true);
                }
                return;
            }
            engineRef.current?.onMouseDown(e.nativeEvent);
        },
        [isZoomTool, isGrabTool],
    );

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const drag = panDrag.current;
        if (drag) {
            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;
            setView((v) => ({
                ...v,
                panX: drag.startPanX + dx,
                panY: drag.startPanY + dy,
            }));
            return;
        }
        engineRef.current?.onMouseMove(e.nativeEvent);
    }, []);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (panDrag.current) {
            panDrag.current = null;
            setGrabbing(false);
            return;
        }
        engineRef.current?.onMouseUp(e.nativeEvent);
    }, []);

    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
        panDrag.current = null;
        setGrabbing(false);
        engineRef.current?.onMouseLeave(e.nativeEvent);
    }, []);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (panDrag.current) {
                return;
            }

            // Zoom tools: zoom at click point (container-relative)
            if (isZoomTool) {
                const rect = containerRef.current!.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                const factor = activeTool === "zoom-in" ? 1.5 : 1 / 1.5;
                setView((v) => zoomAt(v, cx, cy, factor));
                return;
            }

            // Grab tool: click does nothing
            if (isGrabTool) {
                return;
            }

            engineRef.current?.onClick(e.nativeEvent);
        },
        [isZoomTool, isGrabTool, activeTool],
    );

    const cursor =
        activeTool === "zoom-in"
            ? "zoom-in"
            : activeTool === "zoom-out"
              ? "zoom-out"
              : isGrabTool
                ? grabbing
                    ? "grabbing"
                    : "grab"
                : getCursor(activeTool);

    const transform = `matrix(${view.zoom},0,0,${view.zoom},${view.panX},${view.panY})`;

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                overflow: "hidden",
                width: "100%",
                height: "100%",
            }}
            onWheel={handleWheel}>
            <div
                ref={innerRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
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
                    style={{display: "block", userSelect: "none"}}
                    alt=""
                />
                <canvas
                    ref={staticRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                    }}
                />
                <canvas
                    ref={dataRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                    }}
                />
                <canvas
                    ref={dynRef}
                    style={{position: "absolute", inset: 0, cursor}}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    onDoubleClick={() => engineRef.current?.onDblClick()}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        engineRef.current?.onContextMenu();
                    }}
                />
            </div>
            <Minimap
                imageUrl={imageUrl}
                view={view}
                containerSize={containerSize}
                naturalSize={imageSize}
                onViewChange={setView}
            />
            <ShortcutPanel
                visible={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />
        </div>
    );
};

function getCursor(tool: string): string {
    switch (tool) {
        case "select-add":
        case "select-remove":
        case "bounding-box":
        case "slic-bbox":
        case "polygon-lasso":
            return "crosshair";
        case "freeform-draw":
            return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='4' fill='%23f97316'/%3E%3C/svg%3E\") 8 8, crosshair";
        default:
            return "default";
    }
}
