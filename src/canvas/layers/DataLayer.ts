import type {Scale} from "@/canvas/types.ts";
import type {Prompt, Mask as MaskData} from "@/app/atom.ts";
import {Keypoint} from "@/canvas/annotations/Keypoint.ts";
import {BoundingBox} from "@/canvas/annotations/BoundingBox.ts";
import {Mask} from "@/canvas/annotations/Mask.ts";

function maskSig(m: MaskData): string {
    return m.layers.map(l => {
        const vStr = l.canvasShape.vertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(";");
        return `poly-${l.id}-${vStr}`;
    }).join("|");
}

export class DataLayer {
    private prompts: Prompt[] = [];
    private masks: MaskData[] = [];
    private scale: Scale = {x: 1, y: 1};
    private maskCache = new Map<number, {obj: Mask; sig: string}>();
    private currentMaskId: number = 0;

    constructor(private readonly canvas: HTMLCanvasElement) {}

    resize(w: number, h: number): void {
        this.canvas.width = w;
        this.canvas.height = h;
        this.render();
    }

    setScale(scale: Scale): void {
        this.scale = scale;
    }

    setCurrentMaskId(id: number): void {
        this.currentMaskId = id;
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
                this.maskCache.set(m.id, {obj: new Mask(m.id, m.layers, m.color), sig});
            }
        }
        this.masks = masks;
        this.render();
    }

    render(): void {
        const ctx = this.canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const hasActive = this.currentMaskId !== 0;
        for (const m of this.masks) {
            const entry = this.maskCache.get(m.id);
            if (!entry) continue;
            const isActive = m.id === this.currentMaskId;
            const state = isActive ? "active" : "idle";
            ctx.save();
            if (hasActive && !isActive) ctx.globalAlpha = 0.3;
            entry.obj.render(ctx, state, this.scale);
            ctx.restore();
        }

        for (const p of this.prompts) {
            if (p.bbox) {
                new BoundingBox(p.id, p.bbox.left, p.bbox.top, p.bbox.width, p.bbox.height).render(ctx, "idle", this.scale);
            } else {
                const label = p.point_labels === 1 ? 1 : 0;
                new Keypoint(p.id, p.point_coords[0], p.point_coords[1], label).render(ctx, "idle", this.scale);
            }
        }
    }
}
