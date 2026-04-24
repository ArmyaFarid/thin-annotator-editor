import type {DynamicLayer} from "@/canvas/layers/DynamicLayer.ts";
import {KeypointTool} from "@/canvas/tools/KeypointTool.ts";
import {BoundingBoxTool} from "@/canvas/tools/BoundingBoxTool.ts";
import {SlicBboxTool} from "@/canvas/tools/SlicBboxTool.ts";
import {FreeformDrawTool} from "@/canvas/tools/FreeformDrawTool.ts";
import {PolygonLassoTool} from "@/canvas/tools/PolygonLassoTool.ts";
import type {EngineCallbacks, ImageSpacePoint} from "@/canvas/types.ts";
import type {Tool} from "@/app/types.ts";

export class ToolManager {
    private activeTool: Tool = "select-add";

    private readonly selectAdd: KeypointTool;
    private readonly selectRemove: KeypointTool;
    private readonly bbox: BoundingBoxTool;
    private readonly slicBbox: SlicBboxTool;
    private readonly freeform: FreeformDrawTool;
    private readonly polygon: PolygonLassoTool;

    constructor(dynLayer: DynamicLayer, callbacks: EngineCallbacks) {
        this.selectAdd = new KeypointTool(1, callbacks);
        this.selectRemove = new KeypointTool(0, callbacks);
        this.bbox = new BoundingBoxTool(dynLayer, callbacks);
        this.slicBbox = new SlicBboxTool(dynLayer, callbacks);
        this.freeform = new FreeformDrawTool(dynLayer, callbacks);
        this.polygon = new PolygonLassoTool(dynLayer, callbacks);
    }

    setActiveTool(tool: Tool): void {
        if (tool !== this.activeTool) {
            this.cancelCurrent();
        }
        this.activeTool = tool;
    }

    setSubtractMode(v: boolean): void {
        this.freeform.setSubtractMode(v);
        this.polygon.setSubtractMode(v);
    }

    onMouseDown(p: ImageSpacePoint): void {
        if (this.activeTool === "bounding-box") this.bbox.onMouseDown(p);
        if (this.activeTool === "slic-bbox") this.slicBbox.onMouseDown(p);
        if (this.activeTool === "freeform-draw") this.freeform.onMouseDown(p);
    }

    onMouseMove(p: ImageSpacePoint): void {
        if (this.activeTool === "bounding-box") this.bbox.onMouseMove(p);
        if (this.activeTool === "slic-bbox") this.slicBbox.onMouseMove(p);
        if (this.activeTool === "freeform-draw") this.freeform.onMouseMove(p);
        if (this.activeTool === "polygon-lasso") this.polygon.onMouseMove(p);
    }

    onMouseUp(p: ImageSpacePoint, scale: {x: number; y: number}): void {
        if (this.activeTool === "bounding-box") this.bbox.onMouseUp(p, scale);
        if (this.activeTool === "slic-bbox") this.slicBbox.onMouseUp(p, scale);
        if (this.activeTool === "freeform-draw") this.freeform.onMouseUp();
    }

    onClick(p: ImageSpacePoint, scale: {x: number; y: number}): void {
        if (this.activeTool === "select-add") this.selectAdd.onClick(p);
        if (this.activeTool === "select-remove") this.selectRemove.onClick(p);
        if (this.activeTool === "polygon-lasso") this.polygon.onClick(p, scale);
    }

    onDblClick(): void {
        if (this.activeTool === "polygon-lasso") this.polygon.onDblClick();
    }

    onContextMenu(): void {
        if (this.activeTool === "polygon-lasso") this.polygon.onContextMenu();
    }

    // Undo the last polygon vertex. Returns true if consumed.
    undoVertex(): boolean {
        if (this.activeTool === "polygon-lasso") return this.polygon.undoVertex();
        return false;
    }

    cancel(): void {
        this.bbox.cancel();
        this.slicBbox.cancel();
        this.freeform.cancel();
        this.polygon.cancel();
    }

    private cancelCurrent(): void {
        this.cancel();
    }
}
