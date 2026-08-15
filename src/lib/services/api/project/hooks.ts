import {useMutation, useQuery} from "@tanstack/react-query";
import {useAtomValue} from "jotai";
import {masksAtom} from "@/app/atom.ts";
import {projectService, type ProjectRef} from "@/lib/services/api/project/service.ts";

export const projectKey = (pairsCode: string, sampleId: string) =>
    ["project", pairsCode, sampleId] as const;

/**
 * Saved annotations for one sample.
 *
 * Keying by sample is what fixes the stale-response bug: an in-flight request
 * for the previous sample can no longer write into the newer one, because its
 * result belongs to a different cache entry.
 *
 * `enabled` carries the conditions the old hook applied by hand — don't fetch
 * when the caller already has state that supersedes the backend copy.
 */
export function useProject(
    {pairsCode, sampleId}: ProjectRef,
    enabled: boolean,
) {
    return useQuery({
        queryKey: projectKey(pairsCode, sampleId),
        queryFn: () => projectService.load({pairsCode, sampleId}),
        enabled: enabled && pairsCode !== "" && sampleId !== "",
    });
}

/** Saves the current masks for a sample. */
export function useSaveProject({pairsCode, sampleId}: ProjectRef) {
    const masks = useAtomValue(masksAtom);
    return useMutation({
        mutationFn: () => projectService.save({pairsCode, sampleId, masks}),
    });
}
