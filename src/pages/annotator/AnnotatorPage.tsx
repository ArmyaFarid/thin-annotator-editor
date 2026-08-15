import {useEffect, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {useAtom} from "jotai";
import {toast} from "sonner";
import {ChevronLeftIcon} from "@heroicons/react/24/outline";
import PageLayout from "@/layouts/PageLayout.tsx";
import {Toolbar} from "@/common/components/annotator-toolbar/Toolbar.tsx";
import {ImageEditor} from "@/common/components/image/editor/ImageEditor.tsx";
import {AnnotationPanel} from "@/common/components/annotation-panel/AnnotationPanel.tsx";
import FilterGammaSelector from "@/common/components/filter-gamma-selector/FilterGammaSelector.tsx";
import {ZoomPreferenceToggle} from "@/common/components/zoom-preference/ZoomPreferenceToggle.tsx";
import {RestoreDraftBanner} from "@/common/components/restore-draft/RestoreDraftBanner.tsx";
import {RestoreAnnotationsModal} from "@/common/components/restore-annotations/RestoreAnnotationsModal.tsx";
import useAutosaveDraft from "@/app/useAutosaveDraft.ts";
import useLoadProject from "@/pages/annotator/useLoadProject.ts";
import {useSaveProject} from "@/lib/services/api/project/hooks.ts";
import {activePairAtom} from "@/app/atom.ts";
import {t} from "@/i18n/index.ts";
import {Tooltip} from "@/common/components/ui/Tooltip.tsx";

export default function AnnotatorPage() {
    useAutosaveDraft();
    const navigate = useNavigate();
    const location = useLocation();
    const {pairsCode: urlPairsCode, sampleId: urlSampleId} = useParams<{
        pairsCode: string;
        sampleId: string;
    }>();
    const [activePair, setActivePair] = useAtom(activePairAtom);

    // URL is source of truth — sync into atom so other consumers stay in sync
    useEffect(() => {
        if (urlPairsCode && urlSampleId) {
            setActivePair({pairsCode: urlPairsCode, sampleId: urlSampleId});
        }
    }, [urlPairsCode, urlSampleId]);

    // URL params take priority; fall back to atom (e.g. after a page refresh on /annotate)
    const pairsCode = urlPairsCode || activePair?.pairsCode || "";
    const sampleId = urlSampleId || activePair?.sampleId || "";

    // pick-folder already loaded annotations into the atom — skip both restores
    const isPickFolder =
        (location.state as {source?: string} | null)?.source === "pick-folder";
    const refetchAnnotations = useLoadProject(
        pairsCode,
        sampleId,
        isPickFolder,
    );

    const [showFinishModal, setShowFinishModal] = useState(false);
    const {mutateAsync: saveAnnotations, isPending: savingProject} =
        useSaveProject({pairsCode, sampleId});

    async function handleSaveAndLeave() {
        try {
            await saveAnnotations();
            toast.success(t("projectSaved"));
            navigate("/");
        } catch {
            toast.error(t("projectSaveError"));
        }
    }

    return (
        <PageLayout>
            <RestoreDraftBanner
                pairsCode={pairsCode}
                sampleId={sampleId}
                onDiscard={refetchAnnotations}
            />
            <RestoreAnnotationsModal />
            {showFinishModal ? (
                <div
                    onClick={() => setShowFinishModal(false)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-7 w-full max-w-sm flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-semibold text-white">
                                {t("finishTitle")}
                            </span>
                            <span className="text-xs text-white/55 leading-relaxed">
                                {t("finishConfirm")}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveAndLeave}
                                disabled={savingProject}
                                className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                                {savingProject ? t("saving") : t("finishSave")}
                            </button>
                            <button
                                onClick={() => navigate("/")}
                                disabled={savingProject}
                                className="flex-1 py-2 rounded-lg text-white/50 border border-white/15 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
                                {t("finishDiscard")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="w-full flex flex-row justify-between items-center">
                <Tooltip content={t("openNewProjectTooltip")} side="bottom">
                    <button
                        onClick={() => setShowFinishModal(true)}
                        className="flex items-center gap-1 bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeftIcon className="w-3 h-3" />
                        {t("openNewProject")}
                    </button>
                </Tooltip>
                <span className="text-xs text-white/40 font-mono">
                    {pairsCode} / {sampleId}
                </span>
                <Tooltip content={t("finishTooltip")} side="bottom">
                    <button
                        onClick={() => setShowFinishModal(true)}
                        className="bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {t("finish")}
                    </button>
                </Tooltip>
            </div>
            <div className="w-full flex flex-row gap-2 items-stretch flex-1 min-h-0">
                <div className="flex-none">
                    <Toolbar />
                </div>

                <div className="flex-1 relative bg-secondary border border-white/20 rounded-md overflow-hidden">
                    <FilterGammaSelector />
                    <ImageEditor pairsCode={pairsCode} sampleId={sampleId} />
                    <ZoomPreferenceToggle />
                </div>

                <div className="w-72 h-full min-h-0">
                    <AnnotationPanel />
                </div>
            </div>
        </PageLayout>
    );
}
