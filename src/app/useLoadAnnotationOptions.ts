import {useEffect} from "react";
import {useSetAtom} from "jotai";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import {annotationOptionsAtom, type AnnotationOptions} from "@/app/atom.ts";

// Fetches the backend option lists once at startup. On any failure the
// bundled fallback in annotationOptionsAtom is kept.
export default function useLoadAnnotationOptions(): void {
    const setOptions = useSetAtom(annotationOptionsAtom);

    useEffect(() => {
        let cancelled = false;
        fetch(`${IMAGE_API_ENDPOINT}/api/annotation-options`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: AnnotationOptions) => {
                if (!cancelled && Array.isArray(data?.minerals)) {
                    setOptions(data);
                }
            })
            .catch(() => {
                // network/parse failure — keep the bundled fallback
            });
        return () => {
            cancelled = true;
        };
    }, [setOptions]);
}
