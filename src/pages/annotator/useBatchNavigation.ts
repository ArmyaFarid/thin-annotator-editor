import {useCallback, useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {useAtomValue, useSetAtom} from "jotai";
import {toast} from "sonner";
import {
    activePairAtom,
    masksAtom,
    pendingAnnotationsAtom,
    resetTaskStateAtom,
} from "@/app/atom.ts";
import {clearHistoryAtom} from "@/app/history.ts";
import {saveDraft} from "@/app/persistence.ts";
import {useBatchStep} from "@/lib/services/api/batch/hooks.ts";
import type {BatchTask} from "@/lib/services/api/batch/service.ts";
import {useExportAllImages} from "@/lib/services/api/annotations/hooks.ts";
import {t} from "@/i18n/index.ts";

export interface BatchNavigation {
    active: boolean;
    position: BatchTask | null;
    moving: boolean;
    goPrev: () => void;
    goNext: () => void;
}

export default function useBatchNavigation(
    pairsCode: string,
    sampleId: string,
): BatchNavigation {
    const navigate = useNavigate();
    const location = useLocation();
    const batchId = new URLSearchParams(location.search).get("batch");

    const masks = useAtomValue(masksAtom);
    const setActivePair = useSetAtom(activePairAtom);
    const setPendingAnnotations = useSetAtom(pendingAnnotationsAtom);
    const resetTaskState = useSetAtom(resetTaskStateAtom);
    const clearHistory = useSetAtom(clearHistoryAtom);

    const {mutateAsync: step, isPending: stepping} = useBatchStep();
    const {mutateAsync: exportAll, isPending: exporting} = useExportAllImages({
        pairsCode,
        sampleId,
    });

    // Seeded by whoever navigated here, so the counter is right before the
    // first move; refreshed from every response afterwards.
    const [position, setPosition] = useState<BatchTask | null>(
        (location.state as {task?: BatchTask} | null)?.task ?? null,
    );

    useEffect(() => {
        const seeded = (location.state as {task?: BatchTask} | null)?.task;
        if (seeded) {
            setPosition(seeded);
        }
    }, [location.state]);

    const move = useCallback(
        async (direction: "next" | "prev") => {
            if (!batchId) {
                return;
            }
            saveDraft(pairsCode, sampleId, masks);

            if (direction === "next") {
                try {
                    await exportAll();
                } catch {
                    // Stay put: advancing would leave the backend believing a
                    // task was handled whose annotations never arrived.
                    toast.error(t("batchStepError"));
                    return;
                }
            }

            let task;
            try {
                task = await step({batchId, direction});
            } catch {
                toast.error(t("batchStepError"));
                return;
            }

            resetTaskState();
            clearHistory();
            setActivePair({
                pairsCode: task.pairsCode,
                sampleId: task.sampleId,
            });
            setPendingAnnotations(task.annotations ?? null);
            setPosition(task);
            navigate(
                `/annotate/${task.pairsCode}/${task.sampleId}?batch=${batchId}`,
                {state: {source: "batch", task}},
            );
        },
        [
            batchId,
            pairsCode,
            sampleId,
            masks,
            exportAll,
            step,
            resetTaskState,
            clearHistory,
            setActivePair,
            setPendingAnnotations,
            navigate,
        ],
    );

    return {
        active: batchId !== null,
        position,
        moving: stepping || exporting,
        goPrev: () => void move("prev"),
        goNext: () => void move("next"),
    };
}
