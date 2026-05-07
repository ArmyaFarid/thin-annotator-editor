import React from "react";
import {useAtom, useSetAtom} from "jotai";
import {pendingAnnotationsAtom, masksAtom} from "@/app/atom.ts";
import {t} from "@/i18n/index.ts";

export const RestoreAnnotationsModal: React.FC = () => {
    const [pending, setPending] = useAtom(pendingAnnotationsAtom);
    const setMasks = useSetAtom(masksAtom);

    if (!pending) return null;

    function handleRestore() {
        setMasks(pending!);
        setPending(null);
    }

    function handleDiscard() {
        setPending(null);
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-7 w-full max-w-sm flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-white">{t("restoreTitle")}</span>
                    <span className="text-xs text-white/55 leading-relaxed">{t("restoreFound")}</span>
                    <span className="text-xs text-white/35">
                        {pending.length} annotation{pending.length > 1 ? "s" : ""}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRestore}
                        className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-sm font-medium">
                        {t("restoreYes")}
                    </button>
                    <button
                        onClick={handleDiscard}
                        className="flex-1 py-2 rounded-lg text-white/50 border border-white/15 hover:bg-white/5 transition-colors text-sm">
                        {t("restoreNo")}
                    </button>
                </div>
            </div>
        </div>
    );
};
