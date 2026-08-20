import {useMutation} from "@tanstack/react-query";
import {useAtomValue} from "jotai";
import {activeImageSizeAtom, masksAtom} from "@/app/atom.ts";
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
