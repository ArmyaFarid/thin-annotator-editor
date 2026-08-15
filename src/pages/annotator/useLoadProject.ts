import {useEffect, useMemo} from "react";
import {useAtom, useAtomValue} from "jotai";
import {masksAtom, pendingAnnotationsAtom} from "@/app/atom.ts";
import {loadDraft} from "@/app/persistence.ts";
import {useProject} from "@/lib/services/api/project/hooks.ts";

/**
 * Page-level adapter over the project query: decides *whether* the backend copy
 * should be loaded at all, and routes the result into the restore-prompt atom.
 *
 * The conditions stay here rather than in the service because they are about
 * what the user is currently doing, not about the resource.
 *
 * Returns a refetch callback used after the draft banner is dismissed.
 */
export default function useLoadProject(
    pairsCode: string,
    sampleId: string,
    skip: boolean,
): () => void {
    const masks = useAtomValue(masksAtom);
    const [pending, setPending] = useAtom(pendingAnnotationsAtom);

    // Memoized: loadDraft parses and validates the stored document, which can
    // be hundreds of KB of RLE, and this runs on every render of the page.
    const hasDraft = useMemo(
        () => loadDraft(pairsCode, sampleId) !== null,
        [pairsCode, sampleId],
    );

    // Don't ask the backend when something already supersedes its copy:
    // pick-folder just imported, a restore prompt is open, work is in progress,
    // or a local draft is newer than the last save.
    const enabled = !skip && pending === null && masks.length === 0 && !hasDraft;

    const {data, refetch} = useProject({pairsCode, sampleId}, enabled);

    useEffect(() => {
        if (data && data.length > 0) {
            setPending(data);
        }
    }, [data, setPending]);

    return () => {
        refetch();
    };
}
