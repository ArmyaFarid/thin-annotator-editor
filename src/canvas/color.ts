export function hslToRgb(h: number, s: number, l: number): {r: number; g: number; b: number} {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
        r: Math.floor(f(0) * 255),
        g: Math.floor(f(8) * 255),
        b: Math.floor(f(4) * 255),
    };
}

export function getDistinctColor(index: number, alpha = 0.6): {r: number; g: number; b: number; a: number} {
    const goldenAngle = 137.508;
    const hue = (index * goldenAngle) % 360;
    const lightness = index % 2 === 0 ? 60 : 35;
    const saturation = 80;
    const rgb = hslToRgb(hue, saturation, lightness);
    return {...rgb, a: alpha};
}

export function rgbaString(r: number, g: number, b: number, a: number): string {
    return `rgba(${r},${g},${b},${a})`;
}
