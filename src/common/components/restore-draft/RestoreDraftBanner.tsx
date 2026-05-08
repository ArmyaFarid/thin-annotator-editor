import React, {useState} from "react";
import {useSetAtom} from "jotai";
import {masksAtom} from "@/app/atom.ts";
import {loadDraft, clearDraft} from "@/app/persistence.ts";
import {t} from "@/i18n/index.ts";

interface RestoreDraftBannerProps {
    pairsCode: string;
    sampleId: string;
    onDiscard?: () => void;
}

export const RestoreDraftBanner: React.FC<RestoreDraftBannerProps> = ({pairsCode, sampleId, onDiscard}) => {
    const [draft] = useState(() => loadDraft(pairsCode, sampleId));
    const [resolved, setResolved] = useState(false);
    const setMasks = useSetAtom(masksAtom);

    if (!draft || resolved) return null;

    function handleContinue() {
        setMasks(draft!.masks);
        setResolved(true);
    }

    function handleDiscard() {
        clearDraft(pairsCode, sampleId);
        setResolved(true);
        onDiscard?.();
    }

    const count = draft.masks.length;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-7 w-full max-w-sm flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-white">{t("draftTitle")}</span>
                    <span className="text-xs text-white/55 leading-relaxed">{t("draftFound")}</span>
                    {count > 0 ? (
                        <span className="text-xs text-white/35">
                            {count} annotation{count > 1 ? "s" : ""}
                        </span>
                    ) : null}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleContinue}
                        className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-sm font-medium">
                        {t("draftContinue")}
                    </button>
                    <button
                        onClick={handleDiscard}
                        className="flex-1 py-2 rounded-lg text-white/50 border border-white/15 hover:bg-white/5 transition-colors text-sm">
                        {t("draftDiscard")}
                    </button>
                </div>
            </div>
        </div>
    );
};
