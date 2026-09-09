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

/**
 * `current` is read-only, so opening a batch asks where it stands rather than
 * consuming a task. It only falls through to `next` if that call fails —
 * otherwise resuming would skip whatever was left half-finished.
 */
export function useBatchStep() {
    return useMutation({
        mutationFn: async ({
            batchId,
            direction,
        }: {
            batchId: string;
            direction: "current" | "next" | "prev";
        }) => {
            if (direction !== "current") {
                return batchService[direction](batchId);
            }
            try {
                return await batchService.current(batchId);
            } catch {
                return batchService.next(batchId);
            }
        },
    });
}
