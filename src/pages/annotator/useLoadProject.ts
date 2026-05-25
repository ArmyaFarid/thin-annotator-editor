import {useCallback, useEffect} from "react";
import {useAtom, useAtomValue} from "jotai";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import {masksAtom, pendingAnnotationsAtom, type Mask} from "@/app/atom.ts";
import {loadDraft} from "@/app/persistence.ts";

export default function useLoadProject(
    pairsCode: string,
    sampleId: string,
    skip: boolean,
): () => void {
    const masks = useAtomValue(masksAtom);
    const [pending, setPending] = useAtom(pendingAnnotationsAtom);

    const fetchAnnotations = useCallback(async () => {
        if (!pairsCode || !sampleId) {
            return;
        }
        try {
            const res = await fetch(
                `${IMAGE_API_ENDPOINT}/api/project/load?pairsCode=${encodeURIComponent(pairsCode)}&sampleId=${encodeURIComponent(sampleId)}`,
            );
            if (!res.ok) {
                return;
            }
            const data = (await res.json()) as {annotations: Mask[] | null};
            if (data.annotations && data.annotations.length > 0) {
                setPending(data.annotations);
            }
        } catch {
            // silent — no saved annotations is a normal state
        }
    }, [pairsCode, sampleId, setPending]);

    useEffect(() => {
        if (skip) {
            return;
        }
        if (!pairsCode || !sampleId) {
            return;
        }
        if (pending !== null || masks.length > 0) {
            return;
        }
        if (loadDraft(pairsCode, sampleId) !== null) {
            return;
        } // localStorage is more recent than backend save
        fetchAnnotations();
    }, [pairsCode, sampleId, skip]);

    return fetchAnnotations;
}
