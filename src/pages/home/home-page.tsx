import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {useSetAtom} from "jotai";
import {
    ChevronDownIcon,
    FolderOpenIcon,
    RectangleStackIcon,
    Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
    activePairAtom,
    pendingAnnotationsAtom,
    resetTaskStateAtom,
} from "@/app/atom.ts";
import {clearHistoryAtom} from "@/app/history.ts";
import {clearDraft} from "@/app/persistence.ts";
import {t} from "@/i18n/index.ts";
import {AnnotatorBadge} from "@/common/components/annotator-profile/AnnotatorBadge.tsx";
import {EmptyFolderError} from "@/lib/services/api/folder/service.ts";
import {useOpenTaskFromFolder} from "@/lib/services/api/task/hooks.ts";
import {
    useBatches,
    useBatchStep,
    useCreateBatch,
} from "@/lib/services/api/batch/hooks.ts";
import {
    BatchEndpointError,
    NoMatchingTaskError,
    type Batch,
} from "@/lib/services/api/batch/service.ts";

interface OptionCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    hint?: string;
    action?: string;
    disabled?: boolean;
    badge?: string;
    loading?: boolean;
    loadingLabel?: string;
    onAction?: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
    icon,
    title,
    description,
    hint,
    action,
    disabled,
    badge,
    loading,
    loadingLabel,
    onAction,
}) => (
    <div
        className={`flex flex-col gap-3 p-5 rounded-lg border bg-secondary/40 ${
            disabled ? "border-white/5 opacity-50" : "border-white/10"
        }`}>
        <div className="flex items-center gap-2">
            <span className="text-blue-400">{icon}</span>
            <h2 className="text-sm font-semibold text-white/90">{title}</h2>
            {badge ? (
                <span className="ml-auto text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                    {badge}
                </span>
            ) : null}
        </div>
        <p className="text-xs text-white/60 leading-relaxed flex-1">
            {description}
        </p>
        {hint ? <p className="text-[11px] text-white/35">{hint}</p> : null}
        {action ? (
            <button
                onClick={onAction}
                disabled={disabled || loading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                <FolderOpenIcon className="w-4 h-4" />
                {loading ? loadingLabel : action}
            </button>
        ) : null}
    </div>
);

interface DisclosureProps {
    title: string;
    children: React.ReactNode;
}

const Disclosure: React.FC<DisclosureProps> = ({title, children}) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="w-full max-w-2xl bg-secondary/40 border border-white/10 rounded-lg">
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="w-full flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white/80 hover:text-white transition-colors">
                <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${open ? "" : "-rotate-90"}`}
                />
                {title}
            </button>
            {open ? <div className="px-5 pb-5">{children}</div> : null}
        </div>
    );
};

export default function HomePage() {
    const navigate = useNavigate();
    const setActivePair = useSetAtom(activePairAtom);
    const setPendingAnnotations = useSetAtom(pendingAnnotationsAtom);
    const resetTaskState = useSetAtom(resetTaskStateAtom);
    const clearHistory = useSetAtom(clearHistoryAtom);

    const {
        mutateAsync: openTaskFromFolder,
        isPending: openingTask,
        error: openError,
    } = useOpenTaskFromFolder();
    const {
        mutateAsync: createBatch,
        isPending: creatingBatch,
        error: createError,
    } = useCreateBatch();
    const {data: batches, error: batchesError} = useBatches();
    const {mutateAsync: stepBatch, isPending: startingBatch} = useBatchStep();

    // Always land on a clean slate — wipe any state leaked from a previous
    // task (masks, SLIC overlay, refine mode, filter selection, history).
    useEffect(() => {
        resetTaskState();
        clearHistory();
    }, [resetTaskState, clearHistory]);

    async function handleOpenOne() {
        let result;
        try {
            result = await openTaskFromFolder();
        } catch {
            return;
        }
        clearDraft(result.pairsCode, result.sampleId);
        setActivePair({pairsCode: result.pairsCode, sampleId: result.sampleId});
        setPendingAnnotations(result.annotations ?? null);
        navigate(`/annotate/${result.pairsCode}/${result.sampleId}`, {
            state: {source: "pick-folder"},
        });
    }

    async function handleCreateBatch() {
        try {
            await createBatch();
        } catch {
            /* surfaced through createError */
        }
    }

    async function handleStartBatch(batch: Batch) {
        let position;
        try {
            position = await stepBatch({
                batchId: batch.id,
                direction: "current",
            });
        } catch {
            return;
        }
        if (position.kind === "done") {
            toast.success(t("batchComplete"));
            return;
        }
        const task = position.task;
        setActivePair({pairsCode: task.pairsCode, sampleId: task.sampleId});
        setPendingAnnotations(task.annotations ?? null);
        navigate(
            `/annotate/${task.pairsCode}/${task.sampleId}?batch=${batch.id}`,
            {state: {source: "batch", task}},
        );
    }

    return (
        <div className="relative flex-1 overflow-y-auto">
            <div className="absolute top-2 right-2 z-10">
                <AnnotatorBadge />
            </div>
            <div className="flex flex-col items-center gap-6 px-4 py-8">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-xl font-semibold text-white">
                        {t("appTitle")}
                    </h1>
                    <p className="text-sm text-white/50">{t("homeChoose")}</p>
                </div>

                <div className="w-full max-w-4xl grid gap-4 md:grid-cols-3">
                    <OptionCard
                        icon={<Squares2X2Icon className="w-5 h-5" />}
                        title={t("optionProjectTitle")}
                        description={t("optionProjectDesc")}
                        badge={t("comingSoon")}
                        disabled
                    />
                    <OptionCard
                        icon={<RectangleStackIcon className="w-5 h-5" />}
                        title={t("optionBatchTitle")}
                        description={t("optionBatchDesc")}
                        hint={t("optionBatchHint")}
                        action={t("optionBatchAction")}
                        loading={creatingBatch}
                        loadingLabel={t("batchCreating")}
                        onAction={handleCreateBatch}
                    />
                    <OptionCard
                        icon={<FolderOpenIcon className="w-5 h-5" />}
                        title={t("optionSingleTitle")}
                        description={t("optionSingleDesc")}
                        hint={t("optionSingleHint")}
                        action={t("optionSingleAction")}
                        loading={openingTask}
                        loadingLabel={t("picking")}
                        onAction={handleOpenOne}
                    />
                </div>

                {createError ? (
                    <p className="text-xs text-red-400 max-w-2xl text-center">
                        {createError instanceof NoMatchingTaskError
                            ? t("batchNoMatchingTask")
                            : createError instanceof BatchEndpointError
                              ? t("batchBackendUnavailable")
                              : t("batchCreateError")}
                    </p>
                ) : null}
                {openError ? (
                    <p className="text-xs text-red-400">
                        {openError instanceof EmptyFolderError
                            ? t("noImagesInFolder")
                            : t("importFailed")}
                    </p>
                ) : null}

                <div className="w-full max-w-2xl flex flex-col gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                        {t("batchesHeading")}
                    </h2>
                    {batches && batches.length > 0 ? (
                        batches.map((b: Batch) => (
                            <div
                                key={b.id}
                                className="flex items-center gap-3 bg-secondary/40 border border-white/10 rounded-lg px-4 py-3">
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm text-white/90 truncate">
                                        {b.name}
                                    </span>
                                    <span className="text-[11px] text-white/35 truncate font-mono">
                                        {b.rootPath}
                                    </span>
                                </div>
                                <span className="text-xs text-white/50 shrink-0">
                                    {b.taskCount} {t("batchTaskCount")}
                                </span>
                                <button
                                    onClick={() => handleStartBatch(b)}
                                    disabled={startingBatch}
                                    className="shrink-0 px-4 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium">
                                    {t("batchStart")}
                                </button>
                            </div>
                        ))
                    ) : (
                        <p
                            className={`text-xs bg-secondary/40 border rounded-lg px-4 py-3 ${
                                batchesError
                                    ? "text-red-400 border-red-500/20"
                                    : "text-white/35 border-white/10"
                            }`}>
                            {batchesError
                                ? t("batchBackendUnavailable")
                                : t("batchesEmpty")}
                        </p>
                    )}
                </div>

                <Disclosure title={t("batchStructureTitle")}>
                    <div className="space-y-2">
                        <p className="text-xs text-white/70">
                            {t("batchStructureBody")}
                        </p>
                        <code className="block text-xs text-white/80 bg-black/30 rounded px-2 py-1">
                            {t("batchStructureExample")}
                        </code>
                        <p className="text-xs text-white/50">
                            {t("batchStructureNote")}
                        </p>
                    </div>
                </Disclosure>

                <Disclosure title={t("importInstructionsTitle")}>
                    <ImportInstructions />
                </Disclosure>
            </div>
        </div>
    );
}

function ImportInstructions() {
    return (
        <div className="space-y-4 text-sm text-white/70">
            <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t("importStructureHeading")}
                </h3>
                <p>{t("importStructureBody")}</p>
                <code className="block mt-1 text-xs text-white/80 bg-black/30 rounded px-2 py-1">
                    {t("importStructureExample")}
                </code>
            </section>

            <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t("importFormatsHeading")}
                </h3>
                <p>{t("importFormatsBody")}</p>
            </section>

            <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t("importNamingHeading")}
                </h3>
                <code className="block text-xs text-white/80 bg-black/30 rounded px-2 py-1">
                    {t("importNamingPattern")}
                </code>
                <p className="text-xs">
                    <span className="text-white/50">
                        {t("importNamingExampleLabel")}{" "}
                    </span>
                    <code className="text-white/80">
                        {t("importNamingExample")}
                    </code>
                </p>
                <ul className="list-disc list-inside text-xs space-y-0.5 marker:text-white/30">
                    <li>{t("importNamingMod")}</li>
                    <li>{t("importNamingComp")}</li>
                    <li>{t("importNamingRot")}</li>
                    <li>{t("importNamingPrefix")}</li>
                </ul>
            </section>

            <section className="space-y-1 pt-1 border-t border-white/10">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400/80">
                    {t("importTipHeading")}
                </h3>
                <p className="text-xs">{t("importTipBody")}</p>
            </section>
        </div>
    );
}
