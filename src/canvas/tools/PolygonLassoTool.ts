import type {DynamicLayer} from "@/canvas/layers/DynamicLayer.ts";
import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";

const CLOSE_THRESHOLD_PX = 15;

export class PolygonLassoTool {
    private vertices: ImageSpacePoint[] = [];
    private subtract = false;

    constructor(
        private readonly dynLayer: DynamicLayer,
        private readonly callbacks: EngineCallbacks,
    ) {}

    setSubtractMode(v: boolean): void {
        this.subtract = v;
        if (this.vertices.length > 0) {
            this.dynLayer.setInteractionState({
                type: "polygon-drawing",
                vertices: this.vertices,
                cursor: null,
                subtract: this.subtract,
            });
        }
    }

    onClick(p: ImageSpacePoint, zoom: number): void {
        if (this.vertices.length === 0) {
            this.vertices = [p];
            this.sync(p);
            return;
        }

        const first = this.vertices[0];
        const dxPx = (p.x - first.x) * zoom;
        const dyPx = (p.y - first.y) * zoom;
        const distPx = Math.hypot(dxPx, dyPx);

        if (this.vertices.length >= 3 && distPx < CLOSE_THRESHOLD_PX) {
            this.close();
            return;
        }

        this.vertices = [...this.vertices, p];
        this.sync(p);
    }

    onDblClick(): void {
        if (this.vertices.length >= 3) {
            this.close();
        }
    }

    onContextMenu(): void {
        this.cancel();
    }

    onMouseMove(p: ImageSpacePoint): void {
        if (this.vertices.length === 0) {
            return;
        }
        this.dynLayer.setInteractionState({
            type: "polygon-drawing",
            vertices: this.vertices,
            cursor: p,
            subtract: this.subtract,
        });
    }

    undoVertex(): boolean {
        if (this.vertices.length === 0) {
            return false;
        }
        this.vertices = this.vertices.slice(0, -1);
        if (this.vertices.length === 0) {
            this.dynLayer.setInteractionState({type: "idle"});
        } else {
            this.sync(this.vertices[this.vertices.length - 1]);
        }
        return true;
    }

    cancel(): void {
        this.vertices = [];
        this.dynLayer.setInteractionState({type: "idle"});
    }

    private close(): void {
        const vertices = this.vertices;
        this.vertices = [];
        this.dynLayer.setInteractionState({type: "idle"});
        this.callbacks.onPolygonAdded(vertices);
    }

    private sync(cursor: ImageSpacePoint): void {
        this.dynLayer.setInteractionState({
            type: "polygon-drawing",
            vertices: this.vertices,
            cursor,
            subtract: this.subtract,
        });
    }
}
