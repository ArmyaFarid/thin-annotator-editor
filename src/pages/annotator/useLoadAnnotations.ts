import {useEffect} from "react";
import {useAtom, useAtomValue} from "jotai";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import {masksAtom, pendingAnnotationsAtom, type Mask} from "@/app/atom.ts";

export default function useLoadAnnotations(pairsCode: string, sampleId: string): void {
    const masks = useAtomValue(masksAtom);
    const [pending, setPending] = useAtom(pendingAnnotationsAtom);

    useEffect(() => {
        if (!pairsCode || !sampleId) return;
        // skip if annotations already loaded (via pick-folder) or masks already set
        if (pending !== null || masks.length > 0) return;

        async function fetchAnnotations() {
            try {
                const res = await fetch(
                    `${IMAGE_API_ENDPOINT}/api/annotations/load?pairsCode=${encodeURIComponent(pairsCode)}&sampleId=${encodeURIComponent(sampleId)}`,
                );
                if (!res.ok) return;
                const data = await res.json() as {annotations: Mask[] | null};
                if (data.annotations && data.annotations.length > 0) {
                    setPending(data.annotations);
                }
            } catch {
                // silent — no saved annotations is a normal state
            }
        }

        fetchAnnotations();
    }, [pairsCode, sampleId]);
}
