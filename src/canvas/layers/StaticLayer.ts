export class StaticLayer {
    private img: HTMLImageElement | null = null;

    constructor(private readonly canvas: HTMLCanvasElement) {}

    resize(w: number, h: number): void {
        this.canvas.width = w;
        this.canvas.height = h;
        this.redraw();
    }

    setImage(img: HTMLImageElement): void {
        this.img = img;
        this.redraw();
    }

    redraw(): void {
        const ctx = this.canvas.getContext("2d");
        if (!ctx || !this.img) return;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
    }
}
