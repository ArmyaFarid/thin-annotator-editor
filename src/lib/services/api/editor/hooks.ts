import {
    useMutation,
    useQuery,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query";
import type {RLEMask} from "@/app/atom.ts";
import type {
    Pairs,
    PointsInput,
    SlicInput,
    SlicLabelMapResult,
} from "@/lib/services/api/editor/domain.ts";
import {editorService} from "@/lib/services/api/editor/service.ts";
import type {TaskRef} from "@/lib/services/api/task/service.ts";

// Explicit return types: on this TypeScript version TanStack's inference
// collapses `data` to `any`.

export const pairsKey = (pairsCode: string, sampleId: string) =>
    ["pairs", pairsCode, sampleId] as const;


export function usePairs({
    pairsCode,
    sampleId,
}: TaskRef): UseQueryResult<Pairs> {
    return useQuery({
        queryKey: pairsKey(pairsCode, sampleId),
        queryFn: () => editorService.pairs({pairsCode, sampleId}),
        staleTime: 0,
        refetchOnMount: "always",
        throwOnError: true,
    });
}

export function useAddPoints(): UseMutationResult<
    RLEMask | null,
    Error,
    PointsInput
> {
    return useMutation({mutationFn: editorService.addPoints});
}

export function useSlicLabelMap(): UseMutationResult<
    SlicLabelMapResult,
    Error,
    SlicInput
> {
    return useMutation({mutationFn: editorService.slicLabelMap});
}
