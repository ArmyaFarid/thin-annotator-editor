import {atom} from "jotai";
import {getLang, type Lang, type TranslationKey} from "@/i18n/index.ts";
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
    rotation: number | null;
};

export const filterGammaCombinationAtom = atom<FilterGammaCombination>({
    filter: null,
    gamma: null,
    rotation: null,
});

// Every lighting variant of the current field of view, bridged out of the
// getPairs query so the export can loop over all of them without switching the
// active image.
export interface AcquiredImage {
    image: ActiveImage;
    combination: FilterGammaCombination;
}

export const acquiredImagesAtom = atom<AcquiredImage[]>([]);

// One acquired image, reduced to the parameters that identify it. The panel
// builds its options from these, so only combinations the backend actually
// sent are selectable.
export type AcquisitionVariant = {
    filter: string;
    gamma: number | null;
    rotation: number | null;
};

export type LoadedFilterGammaConfig = {
    variants: AcquisitionVariant[];
};

export const loadedFilterGammaConfigAtom = atom<LoadedFilterGammaConfig>({
    variants: [],
});

// 0 = off, >0 = objectId being refined
export const refineModeAtom = atom<number>(0);
export const subtractModeAtom = atom<boolean>(false);
export const activeImageSizeAtom = atom<{w: number; h: number} | null>(null);

export interface SlicSuperpixel {
    id: number;
    rle: RLEMask;
}

// The SLIC segmentation of one bbox, as returned by computeSlicImageGetLabelMap:
// one label per pixel, 0 = outside the segmented region, 1..n = segment id.
// `w`/`h` are the map's own dimensions and may be smaller than the requested
// bbox when it was clipped at the image edge; `x`/`y` place it in image coords.
export interface SlicLabelMap {
    labels: Uint16Array;
    w: number;
    h: number;
    x: number;
    y: number;
}

export interface SlicOverlayState {
    bbox: {x: number; y: number; w: number; h: number};
    labelMap: SlicLabelMap;
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

// Rank ascends with expertise so the number doubles as a confidence weight:
// `rank > other.rank` reads as "more expert". The reverse convention inverts
// every comparison.
export const ANNOTATOR_LEVELS = [
    {id: "outside-domain", rank: 0, labelKey: "levelOutsideDomain"},
    {id: "trainee", rank: 1, labelKey: "levelTrainee"},
    {id: "mid-expert", rank: 2, labelKey: "levelMidExpert"},
    {id: "expert", rank: 3, labelKey: "levelExpert"},
] as const satisfies readonly {
    id: string;
    rank: number;
    labelKey: TranslationKey;
}[];

export type AnnotatorLevel = (typeof ANNOTATOR_LEVELS)[number]["id"];

// The id is what gets persisted and sent, so adding a level later renumbers
// ranks only — stored profiles keep their meaning.
export function levelRank(id: AnnotatorLevel): number {
    return ANNOTATOR_LEVELS.find((l) => l.id === id)?.rank ?? 0;
}

export interface AnnotatorProfile {
    version: 1;
    fullName: string;
    username: string;
    level: AnnotatorLevel;
}

export const ANNOTATOR_PROFILE_KEY = "annotatorProfile";

// Null rather than a half-built profile: a malformed record should send the
// user back through the form, not ride on every request as junk.
function readStoredProfile(): AnnotatorProfile | null {
    try {
        const raw = localStorage.getItem(ANNOTATOR_PROFILE_KEY);
        if (!raw) {
            return null;
        }
        const p = JSON.parse(raw) as Partial<AnnotatorProfile>;
        const known = ANNOTATOR_LEVELS.some((l) => l.id === p.level);
        if (
            typeof p.fullName !== "string" ||
            typeof p.username !== "string" ||
            p.fullName.trim() === "" ||
            p.username.trim() === "" ||
            !known
        ) {
            return null;
        }
        return {
            version: 1,
            fullName: p.fullName,
            username: p.username,
            level: p.level as AnnotatorLevel,
        };
    } catch {
        return null;
    }
}

export const annotatorProfileAtom = atom<AnnotatorProfile | null>(
    readStoredProfile(),
);
export const profileModalOpenAtom = atom<boolean>(false);

// Mirrors the active language held in i18n. The root subscribes to it, so
// changing it re-renders the tree and every `t()` returns the new language.
export const langAtom = atom<Lang>(getLang());
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

// Wipe all task-scoped state. Trigger when landing on the home page so
// switching tasks (A → home → B) doesn't carry A's masks, SLIC overlay,
// refine mode, filter, etc. into B. UI preferences (preserveZoom, minimap,
// HUD, border-only, shortcuts) are intentionally preserved.
export const resetTaskStateAtom = atom(null, (_get, set) => {
    set(activeToolAtom, "select-add");
    set(promptsAtom, []);
    set(activeImage, null);
    set(slicPromptsAtom, undefined);
    set(masksAtom, []);
    set(currentMaskAtom, 0);
    set(editorOnAtom, false);
    set(filterGammaCombinationAtom, {
        filter: null,
        gamma: null,
        rotation: null,
    });
    set(loadedFilterGammaConfigAtom, {variants: []});
    set(refineModeAtom, 0);
    set(subtractModeAtom, false);
    set(activeImageSizeAtom, null);
    set(slicOverlayAtom, null);
    set(pendingAnnotationsAtom, null);
});
