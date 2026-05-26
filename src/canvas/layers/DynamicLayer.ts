import type {InteractionState, View} from "@/canvas/types.ts";
import type {ObjectEditor} from "@/canvas/ObjectEditor.ts";

const POLYGON_CLOSE_PX = 15;

export class DynamicLayer {
    private state: InteractionState = {type: "idle"};
    private view: View = {zoom: 1, panX: 0, panY: 0};
    private dpr = 1;
    private rafId = 0;
    private editor: ObjectEditor | null = null;
    private naturalSize: {w: number; h: number} | null = null;
    private cursor: {x: number; y: number} | null = null;

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

    // Small HUD at the top-left showing the cursor's position on the image.
    // Red when the cursor is outside the image bounds.
    private drawCursorHud(ctx: CanvasRenderingContext2D): void {
        if (!this.cursor || !this.naturalSize) {
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

        let lines: string[];
        if (outside) {
            lines = ["Hors de l'image"];
        } else {
            const pctX = (imgX / this.naturalSize.w) * 100;
            const pctY = (imgY / this.naturalSize.h) * 100;
            lines = [
                `Position : ${imgX.toFixed(0)} × ${imgY.toFixed(0)} px`,
                `${pctX.toFixed(0)} % depuis la gauche  ·  ${pctY.toFixed(0)} % depuis le haut`,
            ];
        }

        ctx.save();
        ctx.font = "12px ui-monospace, monospace";
        const padX = 10;
        const padY = 7;
        const lineH = 16;
        const maxTextW = Math.max(
            ...lines.map((line) => ctx.measureText(line).width),
        );
        const w = maxTextW + padX * 2;
        const h = lineH * lines.length + padY * 2;
        const x = 8;
        const y = 8;

        ctx.fillStyle = outside
            ? "rgba(220, 38, 38, 0.92)"
            : "rgba(0, 0, 0, 0.78)";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "white";
        ctx.textBaseline = "top";
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x + padX, y + padY + i * lineH);
        }
        ctx.restore();
    }

    private renderDoc(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.state.type === "bbox-drawing") {
            const {start, current} = this.state;
            const x = Math.min(start.x, current.x);
            const y = Math.min(start.y, current.y);
            const w = Math.abs(current.x - start.x);
            const h = Math.abs(current.y - start.y);

            ctx.save();
            ctx.fillStyle = "rgba(79,195,247,0.1)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = "#4FC3F7";
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([6 / zoom, 3 / zoom]);
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
                    ctx.setLineDash([8 / zoom, 5 / zoom]);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        if (this.state.type === "polygon-drawing") {
            const {vertices, cursor, subtract} = this.state;
            if (vertices.length > 0 && cursor) {
                const strokeColor = subtract ? "#EF4444" : "#F59E0B";
                const fillColor = subtract
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(245,158,11,0.08)";

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
                ctx.lineWidth = 2 / zoom;
                if (subtract) {
                    ctx.setLineDash([8 / zoom, 5 / zoom]);
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

            const strokeColor = subtract ? "#EF4444" : "#F59E0B";
            const {zoom, panX, panY} = this.view;

            ctx.save();
            for (const v of vertices) {
                const sx = v.x * zoom + panX;
                const sy = v.y * zoom + panY;
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fillStyle = strokeColor;
                ctx.fill();
            }

            const first = vertices[0];
            const fsx = first.x * zoom + panX;
            const fsy = first.y * zoom + panY;
            const csx = cursor.x * zoom + panX;
            const csy = cursor.y * zoom + panY;
            const distPx = Math.hypot(csx - fsx, csy - fsy);
            if (vertices.length >= 3 && distPx < POLYGON_CLOSE_PX) {
                ctx.beginPath();
                ctx.arc(fsx, fsy, 9, 0, Math.PI * 2);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // Dans DynamicLayer.ts

    private drawPixelGrid(ctx: CanvasRenderingContext2D): void {
        // 1. Le seuil : On n'affiche la grille que si le zoom est suffisamment grand (ex: > 15x)
        if (this.view.zoom < 12) {
            return;
        }

        ctx.save();

        // Une couleur très subtile pour la grille
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();

        // 2. Décalage de départ (modulo)
        // On multiplie par DPR si ton canvas est géré en pixels physiques
        const z = this.view.zoom * this.dpr;
        const startX = (this.view.panX * this.dpr) % z;
        const startY = (this.view.panY * this.dpr) % z;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // 3. Lignes verticales
        for (let x = startX; x < w; x += z) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }

        // 4. Lignes horizontales
        for (let y = startY; y < h; y += z) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }

        ctx.stroke();
        ctx.restore();
    }
}
