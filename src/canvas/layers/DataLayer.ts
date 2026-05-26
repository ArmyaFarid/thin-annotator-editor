import type {View} from "@/canvas/types.ts";
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
    private view: View = {zoom: 1, panX: 0, panY: 0};
    private dpr = 1;
    private naturalSize: {w: number; h: number} | null = null;
    private maskCache = new Map<number, {obj: Mask; sig: string}>();
    private currentMaskId: number = 0;
    private borderOnly = false;

    constructor(private readonly canvas: HTMLCanvasElement) {}

    resize(cssW: number, cssH: number, dpr: number): void {
        this.dpr = dpr;
        this.canvas.width = Math.max(1, Math.round(cssW * dpr));
        this.canvas.height = Math.max(1, Math.round(cssH * dpr));
        this.canvas.style.width = `${cssW}px`;
        this.canvas.style.height = `${cssH}px`;
        this.render();
    }

    setView(view: View): void {
        this.view = view;
        this.render();
    }

    setNaturalSize(size: {w: number; h: number}): void {
        this.naturalSize = size;
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

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const {zoom, panX, panY} = this.view;
        const d = this.dpr;
        ctx.setTransform(zoom * d, 0, 0, zoom * d, panX * d, panY * d);

        const hasActive = this.currentMaskId !== 0;
        for (const m of this.masks) {
            const entry = this.maskCache.get(m.id);
            if (!entry) continue;
            const isActive = m.id === this.currentMaskId;
            const state = isActive ? "active" : "idle";
            ctx.save();
            if (hasActive && !isActive) ctx.globalAlpha = 0.3;
            entry.obj.renderWithNatural(ctx, state, zoom, this.naturalSize);
            ctx.restore();
        }

        for (const p of this.prompts) {
            if (p.bbox) {
                new BoundingBox(p.id, p.bbox.left, p.bbox.top, p.bbox.width, p.bbox.height).render(ctx, "idle", zoom);
            } else {
                const label = p.point_labels === 1 ? 1 : 0;
                new Keypoint(p.id, p.point_coords[0], p.point_coords[1], label).render(ctx, "idle", zoom);
            }
        }
    }
}
