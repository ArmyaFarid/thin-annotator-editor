import type {EngineCallbacks, ImageSpacePoint, View} from "@/canvas/types.ts";
import type {MaskLayer} from "@/app/atom.ts";
import {theme} from "@/canvas/canvas-theme.ts";

interface VertexRef {
    layerId: number;
    idx: number;
}

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

    isActive(): boolean {
        return this.objectId !== 0;
    }
    isDragging(): boolean {
        return this.dragVertex !== null;
    }

    tryMouseDown(p: ImageSpacePoint): boolean {
        if (!this.objectId) return false;
        const hitR = theme.editor.hitPx / this.zoom;

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
        const hitR = theme.editor.hitPx / this.zoom;

        if (this.dragVertex) {
            const {layerId, idx} = this.dragVertex;
            const layer = this.layers.find((l) => l.id === layerId);
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
            this.layers = this.layers.map((l) => {
                if (l.id !== layerId || !l.canvasShape) return l;
                return {...l, canvasShape: {...l.canvasShape, vertices: updated}};
            });
            this.tempVertices.delete(layerId);
        }
        this.dragVertex = null;
        return true;
    }

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
            ctx.strokeStyle = theme.editor.dragOutlineColor;
            ctx.lineWidth = theme.editor.dragOutlineWidth / z;
            ctx.stroke();
            ctx.restore();
        }
    }

    renderOverlay(ctx: CanvasRenderingContext2D, view: View): void {
        if (!this.objectId) return;
        for (const layer of this.layers) {
            this.renderLayerOverlay(ctx, layer, view);
        }
    }

    private renderLayerOverlay(
        ctx: CanvasRenderingContext2D,
        layer: MaskLayer,
        view: View,
    ): void {
        const verts = this.getVertices(layer);

        if (verts) {
            for (let i = 0; i < verts.length; i++) {
                const sx = verts[i].x * view.zoom + view.panX;
                const sy = verts[i].y * view.zoom + view.panY;
                const hovered =
                    this.hoverVertex?.layerId === layer.id &&
                    this.hoverVertex.idx === i;
                const dragged =
                    this.dragVertex?.layerId === layer.id &&
                    this.dragVertex.idx === i;
                const radius =
                    dragged || hovered
                        ? theme.editor.vertexRadius + 2
                        : theme.editor.vertexRadius;

                ctx.save();
                ctx.beginPath();
                ctx.arc(sx, sy, radius, 0, Math.PI * 2);
                ctx.fillStyle = dragged
                    ? theme.editor.vertexFillDrag
                    : hovered
                      ? theme.editor.vertexFillHover
                      : theme.editor.vertexFill;
                ctx.fill();
                ctx.strokeStyle = theme.editor.vertexStroke;
                ctx.lineWidth = theme.editor.vertexStrokeWidth;
                ctx.stroke();
                ctx.restore();
            }
        }

        const d = this.delPos(layer);
        if (d) {
            const sx = d.x * view.zoom + view.panX;
            const sy = d.y * view.zoom + view.panY;
            const hovered = this.hoverDelete === layer.id;
            const cross = theme.editor.deleteCrossArm;
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy, theme.editor.deleteRadius, 0, Math.PI * 2);
            ctx.fillStyle = hovered
                ? theme.editor.deleteFillHover
                : theme.editor.deleteFill;
            ctx.fill();
            ctx.strokeStyle = theme.editor.deleteStroke;
            ctx.lineWidth = theme.editor.deleteStrokeWidth;
            ctx.stroke();
            ctx.strokeStyle = theme.editor.deleteCrossStroke;
            ctx.lineWidth = theme.editor.deleteCrossStrokeWidth;
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

    private delPos(layer: MaskLayer): {x: number; y: number} | null {
        const z = this.zoom;
        if (layer.canvasShape?.kind === "polygon") {
            const verts = this.getVertices(layer) ?? layer.canvasShape.vertices;
            const maxX = Math.max(...verts.map((v) => v.x));
            const minY = Math.min(...verts.map((v) => v.y));
            const offset =
                (theme.editor.deleteRadius + theme.editor.deleteOffsetFromMaxX) / z;
            return {x: maxX + offset, y: minY};
        }
        if (layer.rleMask) {
            const maskW = layer.rleMask.size[1];
            const inset = theme.editor.rleDeleteInset / z;
            return {x: maskW - inset, y: inset};
        }
        return null;
    }
}
