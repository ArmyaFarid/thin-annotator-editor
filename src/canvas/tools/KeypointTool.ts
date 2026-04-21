import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";

export class KeypointTool {
    constructor(
        private readonly label: 0 | 1,
        private readonly callbacks: EngineCallbacks,
    ) {}

    onClick(p: ImageSpacePoint): void {
        this.callbacks.onKeypointAdded(p.x, p.y, this.label);
    }
}
