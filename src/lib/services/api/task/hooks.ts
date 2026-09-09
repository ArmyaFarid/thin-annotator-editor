import {useMutation, useQuery} from "@tanstack/react-query";
import {useAtomValue} from "jotai";
import {masksAtom} from "@/app/atom.ts";
import {taskService, type TaskRef} from "@/lib/services/api/task/service.ts";

export const taskKey = (pairsCode: string, sampleId: string) =>
    ["task", pairsCode, sampleId] as const;

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
export function useTask({pairsCode, sampleId}: TaskRef, enabled: boolean) {
    return useQuery({
        queryKey: taskKey(pairsCode, sampleId),
        queryFn: () => taskService.load({pairsCode, sampleId}),
        enabled: enabled && pairsCode !== "" && sampleId !== "",
    });
}

/** Saves the current masks for a sample. */
export function useSaveTask({pairsCode, sampleId}: TaskRef) {
    const masks = useAtomValue(masksAtom);
    return useMutation({
        mutationFn: () => taskService.save({pairsCode, sampleId, masks}),
    });
}

export function useOpenTaskFromFolder() {
    return useMutation({
        mutationFn: () => taskService.openTaskFromFolder(),
    });
}
