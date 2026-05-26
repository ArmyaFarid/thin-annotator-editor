import {DataLayer} from "@/canvas/layers/DataLayer.ts";
import {DynamicLayer} from "@/canvas/layers/DynamicLayer.ts";
import {ToolManager} from "@/canvas/ToolManager.ts";
import {ObjectEditor} from "@/canvas/ObjectEditor.ts";
import type {EngineCallbacks, ImageSpacePoint, View} from "@/canvas/types.ts";
import type {Prompt, Mask, MaskLayer} from "@/app/atom.ts";
import type {Tool} from "@/app/types.ts";

export class CanvasEngine {
    private readonly dataLayer: DataLayer;
    private readonly dynLayer: DynamicLayer;
    private readonly toolManager: ToolManager;
    private readonly editor: ObjectEditor;

    private view: View = {zoom: 1, panX: 0, panY: 0};
    private dpr: number =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    private naturalSize: {w: number; h: number} | null = null;

    private editorConsumed = false;

    constructor(
        dataCanvas: HTMLCanvasElement,
        private readonly dynCanvas: HTMLCanvasElement,
        callbacks: EngineCallbacks,
    ) {
        this.dataLayer = new DataLayer(dataCanvas);
        this.dynLayer = new DynamicLayer(dynCanvas);
        this.editor = new ObjectEditor(callbacks);
        this.dynLayer.setEditor(this.editor);
        this.toolManager = new ToolManager(this.dynLayer, callbacks);
        this.dynLayer.startLoop();
    }

    setImage(img: HTMLImageElement): void {
        const size = {w: img.naturalWidth, h: img.naturalHeight};
        this.naturalSize = size;
        this.dataLayer.setNaturalSize(size);
        this.dynLayer.setNaturalSize(size);
    }

    onResize(cssW: number, cssH: number): void {
        this.dpr =
            typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        this.dataLayer.resize(cssW, cssH, this.dpr);
        this.dynLayer.resize(cssW, cssH, this.dpr);
    }

    setView(view: View): void {
        this.view = view;
        this.dataLayer.setView(view);
        this.dynLayer.setView(view);
        this.editor.setZoom(view.zoom);
    }

    setActiveTool(tool: Tool): void {
        this.toolManager.setActiveTool(tool);
    }

    cancelTool(): void {
        this.toolManager.cancel();
    }

    undoVertex(): boolean {
        return this.toolManager.undoVertex();
    }

    setSubtractMode(v: boolean): void {
        this.toolManager.setSubtractMode(v);
    }

    setBorderOnly(b: boolean): void {
        this.dataLayer.setBorderOnly(b);
    }

    setHudVisible(visible: boolean): void {
        this.dynLayer.setHudVisible(visible);
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
        // First chance: editor (vertex drag, delete button) anywhere on the canvas.
        this.editorConsumed = this.editor.tryMouseDown(p);
        if (this.editorConsumed) return;
        // Tool starts (bbox/freeform/slic): only if click started inside image.
        if (!this.isInsideImage(p)) return;
        this.toolManager.onMouseDown(p);
    }

    onMouseMove(e: MouseEvent): void {
        const p = this.toImageSpace(e);
        // Editor hover/drag uses raw coord (handles can be near image edge).
        this.editor.tryMouseMove(p);
        if (this.editor.isDragging()) return;
        // Drawing previews follow the cursor but never leave the image.
        this.toolManager.onMouseMove(this.clampToImage(p));
    }

    onMouseUp(e: MouseEvent): void {
        const p = this.toImageSpace(e);
        this.editor.tryMouseUp(p);
        // Finalize draw — clamp so the committed shape lives in image bounds.
        this.toolManager.onMouseUp(this.clampToImage(p), this.view.zoom);
    }

    onMouseLeave(e: MouseEvent): void {
        const p = this.toImageSpace(e);
        this.editor.tryMouseUp(p);
        this.toolManager.onMouseUp(this.clampToImage(p), this.view.zoom);
    }

    onClick(e: MouseEvent): void {
        if (this.editorConsumed) {
            this.editorConsumed = false;
            return;
        }
        const p = this.toImageSpace(e);
        // Keypoint / polygon-vertex placement: drop clicks outside the image.
        if (!this.isInsideImage(p)) return;
        this.toolManager.onClick(p, this.view.zoom);
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

    // True if the image-space point is within the natural image bounds.
    // Returns true when natural size is unknown (image not loaded yet) so
    // events aren't silently swallowed before setImage runs.
    private isInsideImage(p: ImageSpacePoint): boolean {
        if (!this.naturalSize) return true;
        return (
            p.x >= 0 &&
            p.y >= 0 &&
            p.x <= this.naturalSize.w &&
            p.y <= this.naturalSize.h
        );
    }

    // Clamp an image-space point to the natural image bounds.
    private clampToImage(p: ImageSpacePoint): ImageSpacePoint {
        if (!this.naturalSize) return p;
        return {
            x: Math.max(0, Math.min(this.naturalSize.w, p.x)),
            y: Math.max(0, Math.min(this.naturalSize.h, p.y)),
        };
    }

    // Mouse client coords → image space, using the current view.
    // The canvas is now sized to the container (not the image) and is no
    // longer inside the CSS transform, so rect.{width,height} reflect the
    // container in CSS pixels.
    private toImageSpace(e: MouseEvent): ImageSpacePoint {
        const rect = this.dynCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const img = {
            x: (sx - this.view.panX) / this.view.zoom,
            y: (sy - this.view.panY) / this.view.zoom,
        };
        // TEMP DEBUG — remove after diagnosing coord issue
        // eslint-disable-next-line no-console
        // console.log("[click→image]", {
        //     client: {x: e.clientX, y: e.clientY},
        //     rect: {left: rect.left.toFixed(1), top: rect.top.toFixed(1), w: rect.width.toFixed(1), h: rect.height.toFixed(1)},
        //     sx: sx.toFixed(1), sy: sy.toFixed(1),
        //     view: this.view,
        //     img: {x: img.x.toFixed(1), y: img.y.toFixed(1)},
        // });
        return img;
    }
}
