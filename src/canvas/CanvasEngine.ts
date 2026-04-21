import {StaticLayer} from "@/canvas/layers/StaticLayer.ts";
import {DataLayer} from "@/canvas/layers/DataLayer.ts";
import {DynamicLayer} from "@/canvas/layers/DynamicLayer.ts";
import {ToolManager} from "@/canvas/ToolManager.ts";
import {ObjectEditor} from "@/canvas/ObjectEditor.ts";
import type {EngineCallbacks, ImageSpacePoint, Scale} from "@/canvas/types.ts";
import type {Prompt, Mask, MaskLayer} from "@/app/atom.ts";
import type {Tool} from "@/app/types.ts";

export class CanvasEngine {
    private readonly staticLayer: StaticLayer;
    private readonly dataLayer: DataLayer;
    private readonly dynLayer: DynamicLayer;
    private readonly toolManager: ToolManager;
    private readonly editor: ObjectEditor;

    private naturalSize: {w: number; h: number} = {w: 1, h: 1};
    private displaySize: {w: number; h: number} = {w: 1, h: 1};
    private viewZoom = 1;

    // Set to true when editor consumes a mouseDown so the resulting click is suppressed.
    private editorConsumed = false;

    constructor(
        staticCanvas: HTMLCanvasElement,
        dataCanvas: HTMLCanvasElement,
        private readonly dynCanvas: HTMLCanvasElement,
        callbacks: EngineCallbacks,
    ) {
        this.staticLayer = new StaticLayer(staticCanvas);
        this.dataLayer = new DataLayer(dataCanvas);
        this.dynLayer = new DynamicLayer(dynCanvas);
        this.editor = new ObjectEditor(callbacks);
        this.dynLayer.setEditor(this.editor);
        this.toolManager = new ToolManager(this.dynLayer, callbacks);
        this.dynLayer.startLoop();
    }

    setImage(img: HTMLImageElement): void {
        this.naturalSize = {w: img.naturalWidth, h: img.naturalHeight};
        const dispW = img.clientWidth;
        const dispH = img.clientHeight;
        this.displaySize = {w: dispW, h: dispH};
        this.resizeAll(dispW, dispH);
        this.staticLayer.setImage(img);
    }

    onResize(dispW: number, dispH: number): void {
        this.displaySize = {w: dispW, h: dispH};
        this.resizeAll(dispW, dispH);
        this.staticLayer.redraw();
        this.dataLayer.render();
    }

    setActiveTool(tool: Tool): void {
        this.toolManager.setActiveTool(tool);
    }

    setPrompts(prompts: Prompt[]): void {
        this.dataLayer.setPrompts(prompts);
    }

    setMasks(masks: Mask[]): void {
        this.dataLayer.setMasks(masks);
    }

    setViewZoom(zoom: number): void {
        this.viewZoom = zoom;
    }

    setActiveObject(objectId: number, layers: MaskLayer[]): void {
        this.editor.setObject(objectId, layers);
        this.dataLayer.setCurrentMaskId(objectId);
    }

    clearActiveObject(): void {
        this.editor.clear();
        this.dataLayer.setCurrentMaskId(0);
    }

    onMouseDown(e: MouseEvent): void {
        const p = this.toImageSpace(e);
        const scale = this.getScale();
        this.editorConsumed = this.editor.tryMouseDown(p, scale);
        if (!this.editorConsumed) {
            this.toolManager.onMouseDown(p);
        }
    }

    onMouseMove(e: MouseEvent): void {
        const p = this.toImageSpace(e);
        const scale = this.getScale();
        this.editor.tryMouseMove(p, scale);
        if (!this.editor.isDragging()) {
            this.toolManager.onMouseMove(p);
        }
    }

    onMouseUp(e: MouseEvent): void {
        const p = this.toImageSpace(e);
        const scale = this.getScale();
        this.editor.tryMouseUp(p);
        this.toolManager.onMouseUp(p, scale);
    }

    // Flush any in-progress draw (freeform/bbox) when cursor leaves the canvas.
    onMouseLeave(e: MouseEvent): void {
        const p = this.toImageSpace(e);
        const scale = this.getScale();
        this.editor.tryMouseUp(p);
        this.toolManager.onMouseUp(p, scale);
    }

    onClick(e: MouseEvent): void {
        // Suppress click when editor consumed the preceding mouseDown (vertex drag or delete).
        if (this.editorConsumed) {
            this.editorConsumed = false;
            return;
        }
        this.toolManager.onClick(this.toImageSpace(e), this.getScale());
    }

    onDblClick(): void {
        this.toolManager.onDblClick();
    }

    onContextMenu(): void {
        this.toolManager.onContextMenu();
    }

    destroy(): void {
        this.dynLayer.stopLoop();
    }

    private resizeAll(w: number, h: number): void {
        const scale = this.getScale();
        this.staticLayer.resize(w, h);
        this.dataLayer.resize(w, h);
        this.dataLayer.setScale(scale);
        this.dynLayer.resize(w, h);
        this.dynLayer.setScale(scale);
    }

    private getScale(): Scale {
        return {
            x: this.displaySize.w / this.naturalSize.w,
            y: this.displaySize.h / this.naturalSize.h,
        };
    }

    private toImageSpace(e: MouseEvent): ImageSpacePoint {
        const rect = this.dynCanvas.getBoundingClientRect();
        const scale = this.getScale();
        return {
            x: (e.clientX - rect.left) / this.viewZoom / scale.x,
            y: (e.clientY - rect.top) / this.viewZoom / scale.y,
        };
    }
}
