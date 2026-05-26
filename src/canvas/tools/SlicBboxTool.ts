import type {DynamicLayer} from "@/canvas/layers/DynamicLayer.ts";
import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";

const MIN_SIZE_PX = 5;

export class SlicBboxTool {
    private drawing = false;
    private start: ImageSpacePoint = {x: 0, y: 0};

    constructor(
        private readonly dynLayer: DynamicLayer,
        private readonly callbacks: EngineCallbacks,
    ) {}

    onMouseDown(p: ImageSpacePoint): void {
        this.drawing = true;
        this.start = p;
        this.dynLayer.setInteractionState({type: "bbox-drawing", start: p, current: p});
    }

    onMouseMove(p: ImageSpacePoint): void {
        if (!this.drawing) return;
        this.dynLayer.setInteractionState({type: "bbox-drawing", start: this.start, current: p});
    }

    onMouseUp(p: ImageSpacePoint, zoom: number): void {
        if (!this.drawing) return;
        this.drawing = false;
        this.dynLayer.setInteractionState({type: "idle"});

        const x = Math.min(this.start.x, p.x);
        const y = Math.min(this.start.y, p.y);
        const w = Math.abs(p.x - this.start.x);
        const h = Math.abs(p.y - this.start.y);

        if (w * zoom < MIN_SIZE_PX || h * zoom < MIN_SIZE_PX) return;

        this.callbacks.onSlicBboxAdded(x, y, w, h);
    }

    cancel(): void {
        this.drawing = false;
        this.dynLayer.setInteractionState({type: "idle"});
    }
}
