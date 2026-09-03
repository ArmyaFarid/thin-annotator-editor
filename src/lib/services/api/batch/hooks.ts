import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {batchService} from "@/lib/services/api/batch/service.ts";

export const batchesKey = ["batches"] as const;

export function useBatches() {
    return useQuery({
        queryKey: batchesKey,
        queryFn: () => batchService.list(),
    });
}

export function useCreateBatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => batchService.create(),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: batchesKey});
        },
    });
}

export function useBatchStep() {
    return useMutation({
        mutationFn: ({
            batchId,
            direction,
        }: {
            batchId: string;
            direction: "next" | "prev";
        }) =>
            direction === "next"
                ? batchService.next(batchId)
                : batchService.prev(batchId),
    });
}
