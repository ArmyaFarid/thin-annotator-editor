import type {EngineCallbacks, ImageSpacePoint, View} from "@/canvas/types.ts";
import type {MaskLayer} from "@/app/atom.ts";

interface VertexRef { layerId: number; idx: number }

// Screen-pixel constants. Hit tests divide by zoom to convert to image space.
const HIT_PX = 12;
const VERTEX_R = 5;
const DEL_R = 9;

export class ObjectEditor {
    private objectId = 0;
    private layers: MaskLayer[] = [];
    private hoverVertex: VertexRef | null = null;
    private hoverDelete: number | null = null;
    private dragVertex: VertexRef | null = null;
    private tempVertices = new Map<number, ImageSpacePoint[]>();
    private zoom = 1;

    constructor(private readonly callbacks: EngineCallbacks) {}

    setZoom(zoom: number): void {
        this.zoom = zoom;
    }

    setObject(objectId: number, layers: MaskLayer[]): void {
        this.objectId = objectId;
        this.layers = layers;
        this.dragVertex = null;
        this.hoverVertex = null;
        this.hoverDelete = null;
        this.tempVertices.clear();
    }

    clear(): void {
        this.objectId = 0;
        this.layers = [];
        this.dragVertex = null;
        this.hoverVertex = null;
        this.hoverDelete = null;
        this.tempVertices.clear();
    }

    isActive(): boolean { return this.objectId !== 0; }
    isDragging(): boolean { return this.dragVertex !== null; }

    // Image-space hit test. Returns true if the editor consumed the event.
    tryMouseDown(p: ImageSpacePoint): boolean {
        if (!this.objectId) return false;
        const hitR = HIT_PX / this.zoom;

        for (const layer of this.layers) {
            const d = this.delPos(layer);
            if (d && Math.hypot(p.x - d.x, p.y - d.y) < hitR) {
                this.callbacks.onLayerDeleted(this.objectId, layer.id);
                return true;
            }
        }

        for (const layer of this.layers) {
            const verts = this.getVertices(layer);
            if (!verts) continue;
            for (let i = 0; i < verts.length; i++) {
                const v = verts[i];
                if (Math.hypot(p.x - v.x, p.y - v.y) < hitR) {
                    this.dragVertex = {layerId: layer.id, idx: i};
                    return true;
                }
            }
        }

        return false;
    }

    tryMouseMove(p: ImageSpacePoint): void {
        if (!this.objectId) return;
        const hitR = HIT_PX / this.zoom;

        if (this.dragVertex) {
            const {layerId, idx} = this.dragVertex;
            const layer = this.layers.find(l => l.id === layerId);
            if (layer) {
                const base = this.getVertices(layer)!;
                const updated = [...base];
                updated[idx] = p;
                this.tempVertices.set(layerId, updated);
            }
            return;
        }

        this.hoverVertex = null;
        this.hoverDelete = null;

        for (const layer of this.layers) {
            const d = this.delPos(layer);
            if (d && Math.hypot(p.x - d.x, p.y - d.y) < hitR) {
                this.hoverDelete = layer.id;
                return;
            }
        }

        for (const layer of this.layers) {
            const verts = this.getVertices(layer);
            if (!verts) continue;
            for (let i = 0; i < verts.length; i++) {
                const v = verts[i];
                if (Math.hypot(p.x - v.x, p.y - v.y) < hitR) {
                    this.hoverVertex = {layerId: layer.id, idx: i};
                    return;
                }
            }
        }
    }

    tryMouseUp(_p: ImageSpacePoint): boolean {
        if (!this.dragVertex) return false;
        const {layerId} = this.dragVertex;
        const updated = this.tempVertices.get(layerId);
        if (updated) {
            this.callbacks.onPolygonVertexMoved(this.objectId, layerId, updated);
            this.layers = this.layers.map(l => {
                if (l.id !== layerId || !l.canvasShape) return l;
                return {...l, canvasShape: {...l.canvasShape, vertices: updated}};
            });
            this.tempVertices.delete(layerId);
        }
        this.dragVertex = null;
        return true;
    }

    // Document-space pass: drag outline only.
    // Caller must have ctx.setTransform applied for image-space drawing.
    renderDoc(ctx: CanvasRenderingContext2D): void {
        if (!this.objectId) return;
        const z = this.zoom;
        for (const layer of this.layers) {
            const verts = this.getVertices(layer);
            if (!verts || this.dragVertex?.layerId !== layer.id) continue;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let i = 1; i < verts.length; i++) {
                ctx.lineTo(verts[i].x, verts[i].y);
            }
            ctx.closePath();
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 2 / z;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Overlay pass: vertex handles + delete buttons in CSS-pixel sizes.
    // Caller must have ctx.setTransform(dpr, 0, 0, dpr, 0, 0).
    renderOverlay(ctx: CanvasRenderingContext2D, view: View): void {
        if (!this.objectId) return;
        for (const layer of this.layers) {
            this.renderLayerOverlay(ctx, layer, view);
        }
    }

    private renderLayerOverlay(ctx: CanvasRenderingContext2D, layer: MaskLayer, view: View): void {
        const verts = this.getVertices(layer);

        if (verts) {
            for (let i = 0; i < verts.length; i++) {
                const sx = verts[i].x * view.zoom + view.panX;
                const sy = verts[i].y * view.zoom + view.panY;
                const hovered = this.hoverVertex?.layerId === layer.id && this.hoverVertex.idx === i;
                const dragged = this.dragVertex?.layerId === layer.id && this.dragVertex.idx === i;

                ctx.save();
                ctx.beginPath();
                ctx.arc(sx, sy, dragged || hovered ? VERTEX_R + 2 : VERTEX_R, 0, Math.PI * 2);
                ctx.fillStyle = dragged ? "#f97316" : hovered ? "#fff" : "rgba(255,255,255,0.75)";
                ctx.fill();
                ctx.strokeStyle = "#F59E0B";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        const d = this.delPos(layer);
        if (d) {
            const sx = d.x * view.zoom + view.panX;
            const sy = d.y * view.zoom + view.panY;
            const hovered = this.hoverDelete === layer.id;
            const cross = 3.5;
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy, DEL_R, 0, Math.PI * 2);
            ctx.fillStyle = hovered ? "#ef4444" : "rgba(239,68,68,0.8)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(sx - cross, sy - cross);
            ctx.lineTo(sx + cross, sy + cross);
            ctx.moveTo(sx + cross, sy - cross);
            ctx.lineTo(sx - cross, sy + cross);
            ctx.stroke();
            ctx.restore();
        }
    }

    private getVertices(layer: MaskLayer): ImageSpacePoint[] | null {
        const temp = this.tempVertices.get(layer.id);
        if (temp) return temp;
        if (layer.canvasShape?.kind === "polygon") return layer.canvasShape.vertices;
        return null;
    }

    // Delete button position in IMAGE SPACE. Offsets are screen pixels
    // divided by zoom so the button stays a constant on-screen distance
    // from its anchor.
    private delPos(layer: MaskLayer): {x: number; y: number} | null {
        const z = this.zoom;
        if (layer.canvasShape?.kind === "polygon") {
            const verts = this.getVertices(layer) ?? layer.canvasShape.vertices;
            const maxX = Math.max(...verts.map(v => v.x));
            const minY = Math.min(...verts.map(v => v.y));
            return {x: maxX + (DEL_R + 4) / z, y: minY};
        }
        if (layer.rleMask) {
            const maskW = layer.rleMask.size[1];
            return {x: maskW - 20 / z, y: 20 / z};
        }
        return null;
    }
}
