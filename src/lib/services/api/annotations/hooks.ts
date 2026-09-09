import {useMutation} from "@tanstack/react-query";
import {useAtomValue} from "jotai";
import {
    acquiredImagesAtom,
    activeImageSizeAtom,
    masksAtom,
} from "@/app/atom.ts";
import useActiveImage from "@/common/components/image/editor/useActiveImage.ts";
import useFilterGamma from "@/common/components/filter-gamma-selector/useFilterGamma.ts";
import {annotationsService} from "@/lib/services/api/annotations/service.ts";

export class NoActiveImageError extends Error {
    constructor() {
        super("no active image to export");
        this.name = "NoActiveImageError";
    }
}

/** Exports the current image's annotations as a COCO document. */
export function useExportAnnotation({
    pairsCode,
    sampleId,
}: {
    pairsCode: string;
    sampleId: string;
}) {
    const masks = useAtomValue(masksAtom);
    const imageSize = useAtomValue(activeImageSizeAtom);
    const [activeImage] = useActiveImage();
    const [combination] = useFilterGamma();

    return useMutation({
        mutationFn: () => {
            if (!imageSize || !activeImage) {
                throw new NoActiveImageError();
            }
            return annotationsService.export({
                pairsCode,
                sampleId,
                masks,
                imageSize,
                activeImage,
                combination,
            });
        },
    });
}

/**
 * Exports the same masks once per lighting variant of the field of view.
 *
 * The masks describe the field of view rather than one variant, so each
 * document differs only by its image and filter/gamma — no image switching is
 * needed. Sequential rather than parallel: the backend writes one file per
 * call and a batch move depends on all of them having landed.
 */
export function useExportAllImages({
    pairsCode,
    sampleId,
}: {
    pairsCode: string;
    sampleId: string;
}) {
    const masks = useAtomValue(masksAtom);
    const acquired = useAtomValue(acquiredImagesAtom);

    return useMutation({
        mutationFn: async () => {
            if (acquired.length === 0) {
                throw new NoActiveImageError();
            }
            for (const {image, combination} of acquired) {
                await annotationsService.export({
                    pairsCode,
                    sampleId,
                    masks,
                    imageSize: {w: image.width, h: image.height},
                    activeImage: image,
                    combination,
                });
            }
        },
    });
}
