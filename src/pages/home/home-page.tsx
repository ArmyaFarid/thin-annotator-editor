import {useNavigate} from "react-router-dom";
import {useSetAtom} from "jotai";
import {FolderOpenIcon} from "@heroicons/react/24/outline";
import {activePairAtom, pendingAnnotationsAtom} from "@/app/atom.ts";
import {clearDraft} from "@/app/persistence.ts";
import {t} from "@/i18n/index.ts";
import usePickFolder from "@/pages/home/usePickFolder.ts";

export default function HomePage() {
    const navigate = useNavigate();
    const setActivePair = useSetAtom(activePairAtom);
    const setPendingAnnotations = useSetAtom(pendingAnnotationsAtom);
    const [pickFolder, {loading, error}] = usePickFolder();

    async function handleOpen() {
        const result = await pickFolder();
        if (!result) return;

        clearDraft();
        setActivePair({pairsCode: result.pairsCode, sampleId: result.sampleId});
        setPendingAnnotations(result.annotations ?? null);
        navigate(`/annotate/${result.pairsCode}/${result.sampleId}`);
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-xl font-semibold text-white">{t("appTitle")}</h1>
                <p className="text-sm text-white/50">{t("appSubtitle")}</p>
            </div>
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
