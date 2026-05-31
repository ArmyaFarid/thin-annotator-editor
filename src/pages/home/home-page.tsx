import {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useSetAtom} from "jotai";
import {FolderOpenIcon} from "@heroicons/react/24/outline";
import {
    activePairAtom,
    pendingAnnotationsAtom,
    resetProjectStateAtom,
} from "@/app/atom.ts";
import {clearHistoryAtom} from "@/app/history.ts";
import {clearDraft} from "@/app/persistence.ts";
import {t} from "@/i18n/index.ts";
import usePickFolder from "@/pages/home/usePickFolder.ts";

export default function HomePage() {
    const navigate = useNavigate();
    const setActivePair = useSetAtom(activePairAtom);
    const setPendingAnnotations = useSetAtom(pendingAnnotationsAtom);
    const resetProjectState = useSetAtom(resetProjectStateAtom);
    const clearHistory = useSetAtom(clearHistoryAtom);
    const [pickFolder, {loading, error}] = usePickFolder();

    // Always land on a clean slate — wipe any state leaked from a previous
    // project (masks, SLIC overlay, refine mode, filter selection, history).
    useEffect(() => {
        resetProjectState();
        clearHistory();
    }, [resetProjectState, clearHistory]);

    async function handleOpen() {
        const result = await pickFolder();
        if (!result) return;

        clearDraft(result.pairsCode, result.sampleId);
        setActivePair({pairsCode: result.pairsCode, sampleId: result.sampleId});
        setPendingAnnotations(result.annotations ?? null);
        navigate(`/annotate/${result.pairsCode}/${result.sampleId}`, {state: {source: "pick-folder"}});
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8">
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-xl font-semibold text-white">{t("appTitle")}</h1>
                <p className="text-sm text-white/50">{t("appSubtitle")}</p>
            </div>

            <ImportInstructions />

            <button
                onClick={handleOpen}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                <FolderOpenIcon className="w-4 h-4" />
                {loading ? t("picking") : t("openFolder")}
            </button>
            {error ? (
                <p className="text-xs text-red-400">{error}</p>
            ) : null}
        </div>
    );
}

function ImportInstructions() {
    return (
        <div className="w-full max-w-lg bg-secondary/40 border border-white/10 rounded-lg p-5 space-y-4 text-sm text-white/70">
            <h2 className="font-semibold text-white/90">
                {t("importInstructionsTitle")}
            </h2>

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
                    <span className="text-white/50">{t("importNamingExampleLabel")} </span>
                    <code className="text-white/80">{t("importNamingExample")}</code>
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
