import {atom} from 'jotai';
import {Tool} from '@/app/types.ts';
import type {ImageSpacePoint} from '@/canvas/types.ts';

export interface RLEMask {
    counts: string;
    size: [number, number];
}

export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PolygonAnnotation {
    kind: "polygon";
    id: number;
    vertices: ImageSpacePoint[];
    fillColor: string;
    strokeColor: string;
}

export interface MaskLayer {
    id: number;
    source?: "sam" | "manual";
    rleMask?: RLEMask;
    canvasShape?: PolygonAnnotation;
    layerKind?: "fill" | "hole";
}

export interface MineralAnnotation {
    // Ordered hypotheses: index 0 = most probable, 2 = least probable. Duplicates allowed.
    mineralIds: [string | null, string | null, string | null];
    observedColor: string;
    relief: "faible" | "moyen" | "élevé" | null;
    birefringence: "faible" | "moyen" | "élevé" | "très élevé" | null;
    cleavage: "aucun" | "indistinct" | "bon" | "parfait" | null;
    crystalSystem: "cubique" | "tétragonal" | "orthorhombique" | "monoclinique" | "triclinique" | "hexagonal" | null;
    pleochroism: "aucun" | "faible" | "fort" | null;
    extinctionAngle: string;
    notes: string;
}

export interface Mask {
    id: number;
    label: string;
    layers: MaskLayer[];
    point_labels: number[];
    point_coords: [number, number][];
    color: {r: number; g: number; b: number; a: number};
    annotation?: MineralAnnotation;
}

export interface Prompt {
    id: number;
    type: string;
    point_labels: number;
    point_coords: [number, number];
    bbox?: Box;
}

export const activeToolAtom = atom<Tool>('select-add');
export const promptsAtom = atom<Prompt[]>([]);
export const masksAtom = atom<Mask[]>([]);
export const currentMaskAtom = atom<number>(0);
export const editorOnAtom = atom<boolean>(false);
export const sessionIdAtom = atom<string | undefined>(undefined);

export type FilterGammaCombination = {
    filter: string | null;
    gamma: number | null;
};

export const filterGammaCombinationAtom = atom<FilterGammaCombination>({
    filter: null,
    gamma: null,
});

export type LoadedFilterGammaConfig = {
    filters: string[];
    gammas: number[];
};

export const loadedFilterGammaConfigAtom = atom<LoadedFilterGammaConfig>({
    filters: [],
    gammas: [],
});

// 0 = off, >0 = objectId being refined
export const refineModeAtom = atom<number>(0);
export const subtractModeAtom = atom<boolean>(false);
export const activeImageSizeAtom = atom<{w: number; h: number} | null>(null);

export interface SlicSuperpixel {
    id: number;
    rle: RLEMask;
}

export interface SlicOverlayState {
    bbox: {x: number; y: number; w: number; h: number};
    superpixels: SlicSuperpixel[];
    targetMaskId: number;
}

export const slicOverlayAtom = atom<SlicOverlayState | null>(null);

function readLocalBool(key: string, fallback: boolean): boolean {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v === "true";
    } catch {
        return fallback;
    }
}

export const preserveZoomAtom = atom<boolean>(readLocalBool("preserveZoom", true));
export const showShortcutsAtom = atom<boolean>(false);
export const minimapVisibleAtom = atom<boolean>(true);
