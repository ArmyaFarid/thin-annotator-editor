import {useMutation} from "@tanstack/react-query";
import {useAtomValue} from "jotai";
import {acquiredImagesAtom, masksAtom} from "@/app/atom.ts";
import {annotationsService} from "@/lib/services/api/annotations/service.ts";

export class NoActiveImageError extends Error {
    constructor() {
        super("no active image to export");
        this.name = "NoActiveImageError";
    }
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
