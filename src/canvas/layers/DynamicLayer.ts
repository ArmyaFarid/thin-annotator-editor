import type {InteractionState, Scale} from "@/canvas/types.ts";
import type {ObjectEditor} from "@/canvas/ObjectEditor.ts";

const POLYGON_CLOSE_PX = 15;

export class DynamicLayer {
    private state: InteractionState = {type: "idle"};
    private scale: Scale = {x: 1, y: 1};
    private pxRatio: {x: number; y: number} = {x: 1, y: 1};
    private zoom = 1;
    private rafId = 0;
    private editor: ObjectEditor | null = null;

    constructor(private readonly canvas: HTMLCanvasElement) {}

    setEditor(editor: ObjectEditor): void {
        this.editor = editor;
    }

    resize(w: number, h: number, pxRatio?: {x: number; y: number}): void {
        this.canvas.width = w;
        this.canvas.height = h;
        if (pxRatio) this.pxRatio = pxRatio;
    }

    setScale(scale: Scale): void {
        this.scale = scale;
    }

    setPxRatio(pxRatio: {x: number; y: number}): void {
        this.pxRatio = pxRatio;
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
    }

    setInteractionState(state: InteractionState): void {
        this.state = state;
    }

    startLoop(): void {
        const tick = () => {
            this.render();
            this.rafId = requestAnimationFrame(tick);
        };
        this.rafId = requestAnimationFrame(tick);
    }

    stopLoop(): void {
        cancelAnimationFrame(this.rafId);
    }

    private render(): void {
        const ctx = this.canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.scale(this.pxRatio.x, this.pxRatio.y);
        const s = this.scale;
        // Widget sizes are divided by zoom so they stay constant on screen.
        const z = this.zoom;

        if (this.state.type === "bbox-drawing") {
            const {start, current} = this.state;
            const x = Math.min(start.x, current.x) * s.x;
            const y = Math.min(start.y, current.y) * s.y;
            const w = Math.abs(current.x - start.x) * s.x;
            const h = Math.abs(current.y - start.y) * s.y;

            ctx.save();
            ctx.fillStyle = "rgba(79,195,247,0.1)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = "#4FC3F7";
            ctx.lineWidth = 2 / z;
            ctx.setLineDash([6 / z, 3 / z]);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        }

        if (this.state.type === "freeform-drawing") {
            const {points, color, width, subtract} = this.state;
            if (points.length >= 2) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(points[0].x * s.x, points[0].y * s.y);

                for (let i = 1; i < points.length - 1; i++) {
                    const curr = points[i];
                    const next = points[i + 1];
                    ctx.quadraticCurveTo(
                        curr.x * s.x,
                        curr.y * s.y,
                        ((curr.x + next.x) / 2) * s.x,
                        ((curr.y + next.y) / 2) * s.y,
                    );
                }

                const last = points[points.length - 1];
                ctx.lineTo(last.x * s.x, last.y * s.y);

                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                if (subtract) ctx.setLineDash([8, 5]);
                ctx.stroke();
                ctx.restore();
            }
        }

        if (this.state.type === "polygon-drawing") {
            const {vertices, cursor, subtract} = this.state;
            if (vertices.length > 0 && cursor) {
                const strokeColor = subtract ? "#EF4444" : "#F59E0B";
                const fillColor = subtract ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)";

                ctx.save();

                if (vertices.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(vertices[0].x * s.x, vertices[0].y * s.y);
                    for (let i = 1; i < vertices.length; i++) {
                        ctx.lineTo(vertices[i].x * s.x, vertices[i].y * s.y);
                    }
                    ctx.closePath();
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.moveTo(vertices[0].x * s.x, vertices[0].y * s.y);
                for (let i = 1; i < vertices.length; i++) {
                    ctx.lineTo(vertices[i].x * s.x, vertices[i].y * s.y);
                }
                ctx.lineTo(cursor.x * s.x, cursor.y * s.y);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2 / z;
                if (subtract) ctx.setLineDash([8 / z, 5 / z]);
                ctx.stroke();
                ctx.setLineDash([]);

                for (const v of vertices) {
                    ctx.beginPath();
                    ctx.arc(v.x * s.x, v.y * s.y, 4 / z, 0, Math.PI * 2);
                    ctx.fillStyle = strokeColor;
                    ctx.fill();
                }

                const first = vertices[0];
                const distPx = Math.hypot(
                    (cursor.x - first.x) * s.x,
                    (cursor.y - first.y) * s.y,
                );
                if (vertices.length >= 3 && distPx < POLYGON_CLOSE_PX / z) {
                    ctx.beginPath();
                    ctx.arc(first.x * s.x, first.y * s.y, 9 / z, 0, Math.PI * 2);
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 3 / z;
                    ctx.setLineDash([]);
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        // Editing overlay always renders on top of drawing previews
        this.editor?.render(ctx, this.scale);

        ctx.restore();
    }
}
