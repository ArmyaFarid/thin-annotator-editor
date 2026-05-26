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

export interface View {
    zoom: number;
    panX: number;
    panY: number;
}

export interface AnnotationObject {
    readonly id: number;
    readonly kind: string;
    // Annotations are drawn in image space; the canvas context has the view
    // transform applied. `zoom` is passed so stroke widths and screen-pixel
    // dots can be expressed as `pixels / zoom` in image units.
    render(
        ctx: CanvasRenderingContext2D,
        state: RenderState,
        zoom: number,
    ): void;
    hitTest(x: number, y: number): boolean;
    getBounds(): Rect;
}

export type InteractionState =
    | {type: "idle"}
    | {type: "bbox-drawing"; start: ImageSpacePoint; current: ImageSpacePoint}
    | {
          type: "freeform-drawing";
          points: ImageSpacePoint[];
          color: string;
          width: number;
          subtract: boolean;
      }
    | {
          type: "polygon-drawing";
          vertices: ImageSpacePoint[];
          cursor: ImageSpacePoint | null;
          subtract: boolean;
      };

export interface EngineCallbacks {
    onKeypointAdded(x: number, y: number, label: 0 | 1): void;
    onBboxAdded(x: number, y: number, w: number, h: number): void;
    onSlicBboxAdded(x: number, y: number, w: number, h: number): void;
    onFreeformPathAdded(points: ImageSpacePoint[]): void;
    onPolygonAdded(vertices: ImageSpacePoint[]): void;
    onLayerDeleted(objectId: number, layerId: number): void;
    onPolygonVertexMoved(
        objectId: number,
        layerId: number,
        vertices: ImageSpacePoint[],
    ): void;
}
