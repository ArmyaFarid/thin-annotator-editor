import {useEffect, useRef} from "react";
import {useAtomValue} from "jotai";
import {masksAtom} from "@/app/atom.ts";
import {saveDraft} from "@/app/persistence.ts";

const DEBOUNCE_MS = 800;

export default function useAutosaveDraft(): void {
    const masks = useAtomValue(masksAtom);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            saveDraft(masks);
        }, DEBOUNCE_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [masks]);
}
