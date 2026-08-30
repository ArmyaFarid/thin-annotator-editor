import type {InteractionState, View} from "@/canvas/types.ts";
import type {ObjectEditor} from "@/canvas/ObjectEditor.ts";
import {theme} from "@/canvas/canvas-theme.ts";
import {drawPixelGrid} from "@/canvas/zoomPan.ts";

export class DynamicLayer {
    private state: InteractionState = {type: "idle"};
    private view: View = {zoom: 1, panX: 0, panY: 0};
    private dpr = 1;
    private rafId = 0;
    private editor: ObjectEditor | null = null;
    private naturalSize: {w: number; h: number} | null = null;
    private cursor: {x: number; y: number} | null = null;
    private hudVisible = true;

    constructor(private readonly canvas: HTMLCanvasElement) {
        this.canvas.addEventListener("mousemove", (e) => {
            const r = this.canvas.getBoundingClientRect();
            this.cursor = {x: e.clientX - r.left, y: e.clientY - r.top};
        });
        this.canvas.addEventListener("mouseleave", () => {
            this.cursor = null;
        });
    }

    setEditor(editor: ObjectEditor): void {
        this.editor = editor;
    }

    setNaturalSize(size: {w: number; h: number}): void {
        this.naturalSize = size;
    }

    setHudVisible(visible: boolean): void {
        this.hudVisible = visible;
    }

    resize(cssW: number, cssH: number, dpr: number): void {
        this.dpr = dpr;
        this.canvas.width = Math.max(1, Math.round(cssW * dpr));
        this.canvas.height = Math.max(1, Math.round(cssH * dpr));
        this.canvas.style.width = `${cssW}px`;
        this.canvas.style.height = `${cssH}px`;
    }

    setView(view: View): void {
        this.view = view;
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
        if (!ctx) {
            return;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const {zoom, panX, panY} = this.view;
        const d = this.dpr;

        // ============ Document pass ============
        ctx.setTransform(zoom * d, 0, 0, zoom * d, panX * d, panY * d);
        this.renderDoc(ctx, zoom);
        this.editor?.renderDoc(ctx);

        // ============ Overlay pass ============
        ctx.setTransform(d, 0, 0, d, 0, 0);

        this.drawPixelGrid(ctx);

        this.renderOverlay(ctx);
        this.editor?.renderOverlay(ctx, this.view);
        this.drawCursorHud(ctx);
    }

    // Discrete HUD at the top-left showing the cursor's image-pixel position.
    // Red background when the cursor is outside the image bounds.
    private drawCursorHud(ctx: CanvasRenderingContext2D): void {
        if (!this.hudVisible || !this.cursor || !this.naturalSize) {
            return;
        }
        const {zoom, panX, panY} = this.view;
        const imgX = (this.cursor.x - panX) / zoom;
        const imgY = (this.cursor.y - panY) / zoom;
        const outside =
            imgX < 0 ||
            imgY < 0 ||
            imgX > this.naturalSize.w ||
            imgY > this.naturalSize.h;

        const text = `${imgX.toFixed(0)} × ${imgY.toFixed(0)} px`;

        ctx.save();
        ctx.font = theme.cursorHud.font;
        const padX = theme.cursorHud.padX;
        const w = ctx.measureText(text).width + padX * 2;
        const h = theme.cursorHud.height;
        const x = theme.cursorHud.marginX;
        const y = theme.cursorHud.marginY;

        ctx.fillStyle = outside
            ? theme.cursorHud.bgOutside
            : theme.cursorHud.bg;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = theme.cursorHud.text;
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + padX, y + h / 2 + 1);
        ctx.restore();
    }

    private renderDoc(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.state.type === "bbox-drawing") {
            const {start, current} = this.state;
            const x = Math.min(start.x, current.x);
            const y = Math.min(start.y, current.y);
            const w = Math.abs(current.x - start.x);
            const h = Math.abs(current.y - start.y);
            const [dashA, dashB] = theme.bboxDrawing.dash;

            ctx.save();
            ctx.fillStyle = theme.bboxDrawing.fill;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = theme.bboxDrawing.stroke;
            ctx.lineWidth = theme.bboxDrawing.lineWidth / zoom;
            ctx.setLineDash([dashA / zoom, dashB / zoom]);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        }

        if (this.state.type === "freeform-drawing") {
            const {points, color, width, subtract} = this.state;
            if (points.length >= 2) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);

                for (let i = 1; i < points.length - 1; i++) {
                    const curr = points[i];
                    const next = points[i + 1];
                    ctx.quadraticCurveTo(
                        curr.x,
                        curr.y,
                        (curr.x + next.x) / 2,
                        (curr.y + next.y) / 2,
                    );
                }

                const last = points[points.length - 1];
                ctx.lineTo(last.x, last.y);

                ctx.strokeStyle = color;
                ctx.lineWidth = width / zoom;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                if (subtract) {
                    const [dashA, dashB] = theme.freeformDrawing.subtractDash;
                    ctx.setLineDash([dashA / zoom, dashB / zoom]);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        if (this.state.type === "polygon-drawing") {
            const {vertices, cursor, subtract} = this.state;
            if (vertices.length > 0 && cursor) {
                const strokeColor = subtract
                    ? theme.polygonDrawing.strokeSubtract
                    : theme.polygonDrawing.strokeAdd;
                const fillColor = subtract
                    ? theme.polygonDrawing.fillSubtract
                    : theme.polygonDrawing.fillAdd;

                ctx.save();

                if (vertices.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(vertices[0].x, vertices[0].y);
                    for (let i = 1; i < vertices.length; i++) {
                        ctx.lineTo(vertices[i].x, vertices[i].y);
                    }
                    ctx.closePath();
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < vertices.length; i++) {
                    ctx.lineTo(vertices[i].x, vertices[i].y);
                }
                ctx.lineTo(cursor.x, cursor.y);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = theme.polygonDrawing.lineWidth / zoom;
                if (subtract) {
                    const [dashA, dashB] = theme.polygonDrawing.subtractDash;
                    ctx.setLineDash([dashA / zoom, dashB / zoom]);
                }
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.restore();
            }
        }
    }

    private renderOverlay(ctx: CanvasRenderingContext2D): void {
        if (this.state.type === "polygon-drawing") {
            const {vertices, cursor, subtract} = this.state;
            if (vertices.length === 0 || !cursor) {
                return;
            }

            const strokeColor = subtract
                ? theme.polygonDrawing.strokeSubtract
                : theme.polygonDrawing.strokeAdd;
            const {zoom, panX, panY} = this.view;

            ctx.save();
            for (const v of vertices) {
                const sx = v.x * zoom + panX;
                const sy = v.y * zoom + panY;
                ctx.beginPath();
                ctx.arc(
                    sx,
                    sy,
                    theme.polygonDrawing.vertexDotRadius,
                    0,
                    Math.PI * 2,
                );
                ctx.fillStyle = strokeColor;
                ctx.fill();
            }

            const first = vertices[0];
            const fsx = first.x * zoom + panX;
            const fsy = first.y * zoom + panY;
            const csx = cursor.x * zoom + panX;
            const csy = cursor.y * zoom + panY;
            const distPx = Math.hypot(csx - fsx, csy - fsy);
            if (
                vertices.length >= 3 &&
                distPx < theme.polygonDrawing.closeThresholdPx
            ) {
                ctx.beginPath();
                ctx.arc(
                    fsx,
                    fsy,
                    theme.polygonDrawing.closeIndicatorRadius,
                    0,
                    Math.PI * 2,
                );
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = theme.polygonDrawing.closeIndicatorLineWidth;
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    private drawPixelGrid(ctx: CanvasRenderingContext2D): void {
        drawPixelGrid(
            ctx,
            this.view,
            this.dpr,
            this.canvas.width,
            this.canvas.height,
        );
    }
}
