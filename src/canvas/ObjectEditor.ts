import type {EngineCallbacks, ImageSpacePoint, Scale} from "@/canvas/types.ts";
import type {MaskLayer} from "@/app/atom.ts";

interface VertexRef { layerId: number; idx: number }

// All hit-testing and rendering is done in CANVAS PIXEL space to avoid
// scale-dependent threshold math and to keep the delete button visually consistent.
const HIT_PX = 12;   // canvas-pixel hit radius for vertices and delete buttons
const VERTEX_R = 5;  // canvas-pixel vertex handle radius
const DEL_R = 9;     // canvas-pixel delete button radius

export class ObjectEditor {
    private objectId = 0;
    private layers: MaskLayer[] = [];
    private hoverVertex: VertexRef | null = null;
    private hoverDelete: number | null = null;
    private dragVertex: VertexRef | null = null;
    private tempVertices = new Map<number, ImageSpacePoint[]>();

    constructor(private readonly callbacks: EngineCallbacks) {}

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

    // Returns true if consumed — caller must not pass event to drawing tools.
    tryMouseDown(p: ImageSpacePoint, scale: Scale): boolean {
        if (!this.objectId) return false;
        const px = p.x * scale.x;
        const py = p.y * scale.y;

        // Delete buttons checked first
        for (const layer of this.layers) {
            const d = this.delPos(layer, scale);
            if (d && Math.hypot(px - d.x, py - d.y) < HIT_PX) {
                this.callbacks.onLayerDeleted(this.objectId, layer.id);
                return true;
            }
        }

        // Polygon vertex drag (only for polygon layers)
        for (const layer of this.layers) {
            const verts = this.getVertices(layer);
            if (!verts) continue;
            for (let i = 0; i < verts.length; i++) {
                const vx = verts[i].x * scale.x;
                const vy = verts[i].y * scale.y;
                if (Math.hypot(px - vx, py - vy) < HIT_PX) {
                    this.dragVertex = {layerId: layer.id, idx: i};
                    return true;
                }
            }
        }

        return false;
    }

    tryMouseMove(p: ImageSpacePoint, scale: Scale): void {
        if (!this.objectId) return;
        const px = p.x * scale.x;
        const py = p.y * scale.y;

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
            const d = this.delPos(layer, scale);
            if (d && Math.hypot(px - d.x, py - d.y) < HIT_PX) {
                this.hoverDelete = layer.id;
                return;
            }
        }

        for (const layer of this.layers) {
            const verts = this.getVertices(layer);
            if (!verts) continue;
            for (let i = 0; i < verts.length; i++) {
                const vx = verts[i].x * scale.x;
                const vy = verts[i].y * scale.y;
                if (Math.hypot(px - vx, py - vy) < HIT_PX) {
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

    render(ctx: CanvasRenderingContext2D, scale: Scale): void {
        if (!this.objectId) return;
        for (const layer of this.layers) {
            this.renderLayer(ctx, layer, scale);
        }
    }

    private renderLayer(ctx: CanvasRenderingContext2D, layer: MaskLayer, scale: Scale): void {
        const verts = this.getVertices(layer);

        // Live outline while dragging a vertex
        if (verts && this.dragVertex?.layerId === layer.id) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(verts[0].x * scale.x, verts[0].y * scale.y);
            for (let i = 1; i < verts.length; i++) {
                ctx.lineTo(verts[i].x * scale.x, verts[i].y * scale.y);
            }
            ctx.closePath();
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Vertex handles (polygon layers only)
        if (verts) {
            for (let i = 0; i < verts.length; i++) {
                const vx = verts[i].x * scale.x;
                const vy = verts[i].y * scale.y;
                const hovered = this.hoverVertex?.layerId === layer.id && this.hoverVertex.idx === i;
                const dragged = this.dragVertex?.layerId === layer.id && this.dragVertex.idx === i;

                ctx.save();
                ctx.beginPath();
                ctx.arc(vx, vy, dragged || hovered ? VERTEX_R + 2 : VERTEX_R, 0, Math.PI * 2);
                ctx.fillStyle = dragged ? "#f97316" : hovered ? "#fff" : "rgba(255,255,255,0.75)";
                ctx.fill();
                ctx.strokeStyle = "#F59E0B";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Delete × button (all layer types)
        const d = this.delPos(layer, scale);
        if (d) {
            const hovered = this.hoverDelete === layer.id;
            ctx.save();
            ctx.beginPath();
            ctx.arc(d.x, d.y, DEL_R, 0, Math.PI * 2);
            ctx.fillStyle = hovered ? "#ef4444" : "rgba(239,68,68,0.8)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(d.x - 3.5, d.y - 3.5);
            ctx.lineTo(d.x + 3.5, d.y + 3.5);
            ctx.moveTo(d.x + 3.5, d.y - 3.5);
            ctx.lineTo(d.x - 3.5, d.y + 3.5);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Returns polygon vertices (with live-drag override), or null for RLE layers.
    private getVertices(layer: MaskLayer): ImageSpacePoint[] | null {
        const temp = this.tempVertices.get(layer.id);
        if (temp) return temp;
        if (layer.canvasShape?.kind === "polygon") return layer.canvasShape.vertices;
        return null;
    }

    // Returns delete button position in CANVAS PIXELS, or null if no position can be determined.
    private delPos(layer: MaskLayer, scale: Scale): {x: number; y: number} | null {
        if (layer.canvasShape?.kind === "polygon") {
            const verts = this.getVertices(layer) ?? layer.canvasShape.vertices;
            const maxX = Math.max(...verts.map(v => v.x)) * scale.x;
            const minY = Math.min(...verts.map(v => v.y)) * scale.y;
            return {x: maxX + DEL_R + 4, y: minY};
        }
        if (layer.rleMask) {
            // Fixed position: 20px inset from the top-right corner of the canvas
            const canvasW = layer.rleMask.size[1] * scale.x;
            return {x: canvasW - 20, y: 20};
        }
        return null;
    }
}
