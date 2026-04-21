export type RenderState = "idle" | "hovered" | "active" | "drawing";

export interface ImageSpacePoint {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Scale {
    x: number;
    y: number;
}

export interface AnnotationObject {
    readonly id: number;
    readonly kind: string;
    render(ctx: CanvasRenderingContext2D, state: RenderState, scale: Scale): void;
    hitTest(x: number, y: number): boolean;
    getBounds(): Rect;
}

export type InteractionState =
    | {type: 'idle'}
    | {type: 'bbox-drawing'; start: ImageSpacePoint; current: ImageSpacePoint}
    | {type: 'freeform-drawing'; points: ImageSpacePoint[]; color: string; width: number}
    | {type: 'polygon-drawing'; vertices: ImageSpacePoint[]; cursor: ImageSpacePoint | null};

export interface EngineCallbacks {
    onKeypointAdded(x: number, y: number, label: 0 | 1): void;
    onBboxAdded(x: number, y: number, w: number, h: number): void;
    onFreeformPathAdded(points: ImageSpacePoint[]): void;
    onPolygonAdded(vertices: ImageSpacePoint[]): void;
    onLayerDeleted(objectId: number, layerId: number): void;
    onPolygonVertexMoved(objectId: number, layerId: number, vertices: ImageSpacePoint[]): void;
}
