import {useState} from "react";
import {useAtom, useAtomValue} from "jotai";
import {useParams} from "react-router-dom";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import {activeImageSizeAtom, masksAtom} from "@/app/atom.ts";
import {canvasToRLE, mergeToCanvas} from "@/canvas/utils/maskMerge.ts";
import useActiveImage from "@/common/components/image/editor/useActiveImage.ts";
import useFilterGamma from "@/common/components/filter-gamma-selector/useFilterGamma.ts";

type State = [
    save: () => Promise<boolean>,
    status: {saving: boolean; error: string | null},
];

export default function useSaveAnnotation(): State {
    const {pairsCode = "", sampleId = ""} = useParams<{
        pairsCode: string;
        sampleId: string;
    }>();
    const masks = useAtomValue(masksAtom);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageSize] = useAtom(activeImageSizeAtom);
    const [activeImage] = useActiveImage();
    const [combination] = useFilterGamma();

    function generateActiveImageAnnotation() {
        if (!imageSize) {
            return;
        }

        const filename = activeImage.path.split(/[\\/]/).pop();
        const image = {
            id: 1,
            file_name: filename,
            width: imageSize.w,
            height: imageSize.h,
        };

        const filterValue = Number(combination.filter);

        const metadata = {
            lightning_modality: combination.filter,
            gamma:
                filterValue === 1 ? "add" : filterValue === -1 ? "sous" : "na",
            rotation: 45,
        };

        const license = {
            name: "Attribution-NonCommercial",
            url: "http://creativecommons.org/licenses/by-nc/2.0/",
        };

        const annotations = masks.map((m) => {
            const canvas = mergeToCanvas(m, imageSize.w, imageSize.h);
            const rle = canvasToRLE(canvas);
            const {mineralIds, ...annotationWithoutMineralIds} =
                m.annotation ?? {};
            return {
                id: m.id,
                // annotation: m.annotation,
                segmentation: rle,
                mineralIds,
                ...annotationWithoutMineralIds,
            };
        });

        const imageAnnotationJson = {
            metadata,
            license,
            image,
            annotations,
        };

        return imageAnnotationJson;
    }

    async function save(): Promise<boolean> {
        if (!pairsCode || !sampleId) {
            return false;
        }
        setSaving(true);
        setError(null);
        try {
            const activeImagaAnnotationJson = generateActiveImageAnnotation();
            const res = await fetch(
                `${IMAGE_API_ENDPOINT}/api/annotations/save`,
                {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        pairsCode,
                        sampleId,
                        data: activeImagaAnnotationJson,
                    }),
                },
            );
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue");
            return false;
        } finally {
            setSaving(false);
        }
    }

    return [save, {saving, error}];
}
