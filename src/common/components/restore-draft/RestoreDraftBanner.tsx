import React, {useState} from "react";
import {useSetAtom} from "jotai";
import {masksAtom, sessionIdAtom} from "@/app/atom.ts";
import {loadDraft, clearDraft} from "@/app/persistence.ts";
import {t} from "@/i18n/index.ts";

export const RestoreDraftBanner: React.FC = () => {
    const [draft] = useState(() => loadDraft());
    const [dismissed, setDismissed] = useState(false);
    const setMasks = useSetAtom(masksAtom);
    const setSessionId = useSetAtom(sessionIdAtom);

    if (!draft || dismissed) return null;

    function handleContinue() {
        setMasks(draft!.masks);
        setSessionId(draft!.sessionId);
        setDismissed(true);
    }

    function handleDiscard() {
        clearDraft();
        setDismissed(true);
    }

    return (
        <div className="flex items-center gap-3 px-3 py-2 bg-[#2A2A2A] border border-white/15 rounded-md text-xs text-white/70 shrink-0">
            <span className="flex-1">{t("draftFound")}</span>
            <button
                onClick={handleContinue}
                className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors font-medium">
                {t("draftContinue")}
            </button>
            <button
                onClick={handleDiscard}
                className="px-2.5 py-1 rounded text-white/40 border border-white/15 hover:bg-white/5 transition-colors">
                {t("draftDiscard")}
            </button>
        </div>
    );
};
