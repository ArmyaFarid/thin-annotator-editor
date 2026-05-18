import type {Scale} from "@/canvas/types.ts";
import type {Prompt, Mask as MaskData} from "@/app/atom.ts";
import {Keypoint} from "@/canvas/annotations/Keypoint.ts";
import {BoundingBox} from "@/canvas/annotations/BoundingBox.ts";
import {Mask} from "@/canvas/annotations/Mask.ts";

function maskSig(m: MaskData): string {
    return m.layers.map(l => {
        const kind = l.layerKind ?? "fill";
        if (l.rleMask) return `${kind}:${l.rleMask.counts}`;
        if (l.canvasShape) {
            const vStr = l.canvasShape.vertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(";");
            return `${kind}:poly-${l.id}-${vStr}`;
        }
        return `empty-${l.id}`;
    }).join("|");
}

export class DataLayer {
    private prompts: Prompt[] = [];
    private masks: MaskData[] = [];
    private scale: Scale = {x: 1, y: 1};
    private pxRatio: {x: number; y: number} = {x: 1, y: 1};
    private zoom = 1;
    private maskCache = new Map<number, {obj: Mask; sig: string}>();
    private currentMaskId: number = 0;
    private borderOnly = false;

    constructor(private readonly canvas: HTMLCanvasElement) {}

    resize(w: number, h: number, pxRatio?: {x: number; y: number}): void {
        this.canvas.width = w;
        this.canvas.height = h;
        if (pxRatio) this.pxRatio = pxRatio;
        this.render();
    }

    setScale(scale: Scale): void {
        this.scale = scale;
    }

    setPxRatio(pxRatio: {x: number; y: number}): void {
        this.pxRatio = pxRatio;
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
        this.render();
    }

    setCurrentMaskId(id: number): void {
        this.currentMaskId = id;
        this.render();
    }

    setBorderOnly(b: boolean): void {
        this.borderOnly = b;
        for (const entry of this.maskCache.values()) {
            entry.obj.setBorderOnly(b);
        }
        this.render();
    }

    setPrompts(prompts: Prompt[]): void {
        this.prompts = prompts;
        this.render();
    }

    setMasks(masks: MaskData[]): void {
        const incoming = new Set(masks.map(m => m.id));
        for (const id of this.maskCache.keys()) {
            if (!incoming.has(id)) this.maskCache.delete(id);
        }
        for (const m of masks) {
            const sig = maskSig(m);
            const entry = this.maskCache.get(m.id);
            if (!entry || entry.sig !== sig) {
                const obj = new Mask(m.id, m.layers, m.color);
                obj.setBorderOnly(this.borderOnly);
                this.maskCache.set(m.id, {obj, sig});
            }
        }
        this.masks = masks;
        this.render();
    }

    render(): void {
        const ctx = this.canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.scale(this.pxRatio.x, this.pxRatio.y);

        const hasActive = this.currentMaskId !== 0;
        for (const m of this.masks) {
            const entry = this.maskCache.get(m.id);
            if (!entry) continue;
            const isActive = m.id === this.currentMaskId;
            const state = isActive ? "active" : "idle";
            ctx.save();
            if (hasActive && !isActive) ctx.globalAlpha = 0.3;
            entry.obj.render(ctx, state, this.scale, this.zoom);
            ctx.restore();
        }

        for (const p of this.prompts) {
            if (p.bbox) {
                new BoundingBox(p.id, p.bbox.left, p.bbox.top, p.bbox.width, p.bbox.height).render(ctx, "idle", this.scale, this.zoom);
            } else {
                const label = p.point_labels === 1 ? 1 : 0;
                new Keypoint(p.id, p.point_coords[0], p.point_coords[1], label).render(ctx, "idle", this.scale, this.zoom);
            }
        }

        ctx.restore();
    }
}
