import {useCallback, useEffect, useRef, useState} from "react";
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
import {useSaveTask} from "@/lib/services/api/task/hooks.ts";
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
    const {mutateAsync: saveTask, isPending: saving} = useSaveTask({
        pairsCode,
        sampleId,
    });

    const [position, setPosition] = useState<BatchTask | null>(
        (location.state as {task?: BatchTask} | null)?.task ?? null,
    );

    const goTo = useCallback(
        (task: BatchTask, replace: boolean) => {
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
                {state: {source: "batch", task}, replace},
            );
        },
        [
            batchId,
            navigate,
            resetTaskState,
            clearHistory,
            setActivePair,
            setPendingAnnotations,
        ],
    );

    // A reload loses the router state that carried the position, so ask the
    // backend where the batch stands. `current` does not consume a task, and
    // it is authoritative if the URL disagrees — someone may have edited it.
    const restoredRef = useRef(false);
    useEffect(() => {
        if (!batchId || position !== null || restoredRef.current) {
            return;
        }
        restoredRef.current = true;
        step({batchId, direction: "current"})
            .then((result) => {
                if (result.kind === "done") {
                    toast.success(t("batchComplete"));
                    navigate("/");
                    return;
                }
                const task = result.task;
                if (
                    task.pairsCode === pairsCode &&
                    task.sampleId === sampleId
                ) {
                    setPosition(task);
                    return;
                }
                goTo(task, true);
            })
            .catch(() => {
                toast.error(t("batchBackendUnavailable"));
            });
    }, [batchId, position, pairsCode, sampleId, step, navigate, goTo]);

    const move = useCallback(
        async (direction: "next" | "prev") => {
            if (!batchId) {
                return;
            }
            saveDraft(pairsCode, sampleId, masks);

            // Nothing drawn means nothing to persist, and the backend rejects
            // a save with no mask. Stay put on any other failure: moving would
            // leave the backend believing a task was handled whose work never
            // arrived.
            if (masks.length > 0) {
                try {
                    await saveTask();
                    if (direction === "next") {
                        await exportAll();
                    }
                } catch {
                    toast.error(t("batchStepError"));
                    return;
                }
            }

            let result;
            try {
                result = await step({batchId, direction});
            } catch {
                toast.error(t("batchStepError"));
                return;
            }

            if (result.kind === "done") {
                toast.success(t("batchComplete"));
                navigate("/");
                return;
            }
            goTo(result.task, false);
        },
        [
            batchId,
            pairsCode,
            sampleId,
            masks,
            saveTask,
            exportAll,
            step,
            navigate,
            goTo,
        ],
    );

    return {
        active: batchId !== null,
        position,
        moving: stepping || saving || exporting,
        goPrev: () => void move("prev"),
        goNext: () => void move("next"),
    };
}
