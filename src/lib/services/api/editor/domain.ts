import type {
    AcquiredImage,
    AcquisitionVariant,
    ActiveImage,
    Box,
    Prompt,
    SlicOverlayState,
} from "@/app/atom.ts";

export interface Pairs {
    variants: AcquisitionVariant[];
    acquiredImages: AcquiredImage[];
}

export interface PointsInput {
    image: ActiveImage;
    prompts: Prompt[];
}

export interface SlicInput {
    image: ActiveImage;
    bbox: Box;
}

/** The overlay minus its target, which only the caller knows. */
export type SlicLabelMapResult = Omit<SlicOverlayState, "targetMaskId">;
