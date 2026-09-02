import {useAtom} from "jotai";
import {
    annotatorProfileAtom,
    ANNOTATOR_PROFILE_KEY,
    type AnnotatorProfile,
} from "@/app/atom.ts";

export default function useAnnotatorProfile(): [
    AnnotatorProfile | null,
    (profile: AnnotatorProfile) => void,
] {
    const [profile, setAtom] = useAtom(annotatorProfileAtom);

    function set(next: AnnotatorProfile) {
        setAtom(next);
        try {
            localStorage.setItem(ANNOTATOR_PROFILE_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }
    }

    return [profile, set];
}
