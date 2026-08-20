import type {ActiveImage, Mask} from "@/app/atom.ts";
import type {FilterGammaCombination} from "@/app/atom.ts";
import {canvasToRLE, mergeToCanvas} from "@/canvas/utils/maskMerge.ts";
import type {CocoDocumentDTO} from "@/lib/services/api/annotations/dto.ts";

export interface CocoBuildInput {
    masks: Mask[];
    imageSize: {w: number; h: number};
    activeImage: ActiveImage;
    combination: FilterGammaCombination;
}

/**
 * Flattens each mask's layers into a single RLE and assembles the export
 * document. Moved verbatim from useSaveAnnotation — behaviour unchanged.
 */
export function masksToCocoDocument({
    masks,
    imageSize,
    activeImage,
    combination,
}: CocoBuildInput): CocoDocumentDTO {
    const filename = activeImage.path.split(/[\\/]/).pop();
    const image = {
        file_name: filename,
        width: imageSize.w,
        height: imageSize.h,
    };

    const filterValue = Number(combination.gamma);

    const metadata = {
        lightning_modality: combination.filter,
        gamma: filterValue === 1 ? "add" : filterValue === -1 ? "sous" : "na",
        rotation: 45,
    };

    const license = {
        name: "Attribution-NonCommercial",
        url: "http://creativecommons.org/licenses/by-nc/2.0/",
    };

    const annotations = masks.map((m) => {
        const canvas = mergeToCanvas(m, imageSize.w, imageSize.h);
        const rle = canvasToRLE(canvas);
        const {mineralIds, ...annotationWithoutMineralIds} = m.annotation ?? {};
        return {
            id: m.id,
            segmentation: rle,
            mineralIds,
            ...annotationWithoutMineralIds,
        };
    });

    return {metadata, license, image, annotations};
}
