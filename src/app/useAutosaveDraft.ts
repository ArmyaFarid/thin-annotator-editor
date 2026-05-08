import {useEffect, useRef} from "react";
import {useAtomValue} from "jotai";
import {masksAtom, activePairAtom} from "@/app/atom.ts";
import {saveDraft} from "@/app/persistence.ts";

const DEBOUNCE_MS = 800;

export default function useAutosaveDraft(): void {
    const masks = useAtomValue(masksAtom);
    const activePair = useAtomValue(activePairAtom);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!activePair?.pairsCode || !activePair?.sampleId) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            saveDraft(activePair.pairsCode, activePair.sampleId, masks);
        }, DEBOUNCE_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [masks, activePair]);
}
