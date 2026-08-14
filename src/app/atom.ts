import {atom} from "jotai";
import {Tool} from "@/app/types.ts";
import type {ImageSpacePoint} from "@/canvas/types.ts";
import defaultAnnotationOptions from "@/data/annotation-options.json";

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
    // The 5 fields below store an option `value` from AnnotationOptions.
    // Plain string (not a union) because the option lists are backend-driven.
    relief: string | null;
    birefringence: string | null;
    cleavage: string | null;
    crystalSystem: string | null;
    pleochroism: string | null;
    extinctionAngle: string;
    notes: string;
}

export interface LocalizedLabel {
    fr: string;
    en: string;
}

export interface AnnotationOption {
    value: string;
    label: LocalizedLabel;
}

export interface MineralOption extends AnnotationOption {
    group: string;
}

export interface AnnotationOptions {
    version: number;
    mineralGroups: AnnotationOption[];
    minerals: MineralOption[];
    properties: {
        relief: AnnotationOption[];
        birefringence: AnnotationOption[];
        cleavage: AnnotationOption[];
        pleochroism: AnnotationOption[];
        crystalSystem: AnnotationOption[];
    };
}

// Bundled fallback — replaced at runtime by GET /api/annotation-options
export const annotationOptionsAtom = atom<AnnotationOptions>(
    defaultAnnotationOptions as AnnotationOptions,
);

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

export interface SlicPrompt {
    type: string;
    bbox: Box;
}

export type ActiveImage = {
    id: string;
    path: string;
    url: string;
    width: number;
    height: number;
};

export const activeToolAtom = atom<Tool>("select-add");
export const promptsAtom = atom<Prompt[]>([]);
export const activeImage = atom<ActiveImage | null>(null);
export const slicPromptsAtom = atom<SlicPrompt | undefined>(undefined);
export const masksAtom = atom<Mask[]>([]);
export const currentMaskAtom = atom<number>(0);
export const editorOnAtom = atom<boolean>(false);

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

function readLocalEnum<T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
): T {
    try {
        const v = localStorage.getItem(key);
        return allowed.includes(v as T) ? (v as T) : fallback;
    } catch {
        return fallback;
    }
}

export const preserveZoomAtom = atom<boolean>(
    readLocalBool("preserveZoom", true),
);

// How the toolbar clusters grouped tools. Purely visual — see tool-groups.ts.
export const TOOLBAR_LAYOUTS = ["separators", "pods", "flyout"] as const;
export type ToolbarLayout = (typeof TOOLBAR_LAYOUTS)[number];

export const toolbarLayoutAtom = atom<ToolbarLayout>(
    readLocalEnum("toolbarLayout", TOOLBAR_LAYOUTS, "separators"),
);
export const customizeOpenAtom = atom<boolean>(false);
export const showShortcutsAtom = atom<boolean>(false);
export const minimapVisibleAtom = atom<boolean>(true);
export const borderOnlyAtom = atom<boolean>(false);
export const cursorHudVisibleAtom = atom<boolean>(true);

export interface ActivePair {
    pairsCode: string;
    sampleId: string;
}

export const activePairAtom = atom<ActivePair | null>(null);

export const pendingAnnotationsAtom = atom<Mask[] | null>(null);

// Wipe all project-scoped state. Trigger when landing on the home page so
// switching projects (A → home → B) doesn't carry A's masks, SLIC overlay,
// refine mode, filter, etc. into B. UI preferences (preserveZoom, minimap,
// HUD, border-only, shortcuts) are intentionally preserved.
export const resetProjectStateAtom = atom(null, (_get, set) => {
    set(activeToolAtom, "select-add");
    set(promptsAtom, []);
    set(activeImage, null);
    set(slicPromptsAtom, undefined);
    set(masksAtom, []);
    set(currentMaskAtom, 0);
    set(editorOnAtom, false);
    set(filterGammaCombinationAtom, {filter: null, gamma: null});
    set(loadedFilterGammaConfigAtom, {filters: [], gammas: []});
    set(refineModeAtom, 0);
    set(subtractModeAtom, false);
    set(activeImageSizeAtom, null);
    set(slicOverlayAtom, null);
    set(pendingAnnotationsAtom, null);
});
