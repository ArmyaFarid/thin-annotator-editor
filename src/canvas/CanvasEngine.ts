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
    private displaySize: {w: number; h: number} = {w: 0, h: 0};

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
        // Use container size from onResize if available, else fall back to natural size
        const dispW = this.displaySize.w > 0 ? this.displaySize.w : img.naturalWidth;
        const dispH = this.displaySize.h > 0 ? this.displaySize.h : img.naturalHeight;
        this.displaySize = {w: dispW, h: dispH};
        this.resizeAll(dispW, dispH);
        this.staticLayer.setImage(img);
    }

    onResize(dispW: number, dispH: number): void {
        this.displaySize = {w: dispW, h: dispH};
        if (this.naturalSize.w <= 1) return; // image not loaded yet
        // Canvases stay at natural resolution — only update scale/pxRatio for rendering
        const scale = this.getScale();
        const pxRatio = {x: this.naturalSize.w / dispW, y: this.naturalSize.h / dispH};
        this.dataLayer.setScale(scale);
        this.dataLayer.setPxRatio(pxRatio);
        this.dynLayer.setScale(scale);
        this.dynLayer.setPxRatio(pxRatio);
        this.dataLayer.render();
    }

    setActiveTool(tool: Tool): void {
        this.toolManager.setActiveTool(tool);
    }

    setSubtractMode(v: boolean): void {
        this.toolManager.setSubtractMode(v);
    }

    setPrompts(prompts: Prompt[]): void {
        this.dataLayer.setPrompts(prompts);
    }

    setMasks(masks: Mask[]): void {
        this.dataLayer.setMasks(masks);
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

    private resizeAll(dispW: number, dispH: number): void {
        const scale = this.getScale();
        const pxRatio = {x: this.naturalSize.w / dispW, y: this.naturalSize.h / dispH};
        // Canvas physical dimensions = natural image resolution for sharp rendering at any zoom
        this.staticLayer.resize(this.naturalSize.w, this.naturalSize.h);
        this.dataLayer.resize(this.naturalSize.w, this.naturalSize.h, pxRatio);
        this.dataLayer.setScale(scale);
        this.dynLayer.resize(this.naturalSize.w, this.naturalSize.h, pxRatio);
        this.dynLayer.setScale(scale);
    }

    private getScale(): Scale {
        return {
            x: this.displaySize.w / this.naturalSize.w,
            y: this.displaySize.h / this.naturalSize.h,
        };
    }

    private toImageSpace(e: MouseEvent): ImageSpacePoint {
        // getBoundingClientRect already includes the CSS zoom transform, so rect.width
        // = canvas_css_width × viewZoom. Dividing by rect.width * (1/naturalW) converts
        // any screen position to image space without needing to know viewZoom explicitly.
        const rect = this.dynCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * this.naturalSize.w / rect.width,
            y: (e.clientY - rect.top) * this.naturalSize.h / rect.height,
        };
    }
}
