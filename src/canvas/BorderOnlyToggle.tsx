import React from "react";
import {useAtom} from "jotai";
import {borderOnlyAtom} from "@/app/atom.ts";
import {t} from "@/i18n/index.ts";

export const BorderOnlyToggle: React.FC = () => {
    const [borderOnly, setBorderOnly] = useAtom(borderOnlyAtom);

    return (
        <button
            onClick={() => setBorderOnly(!borderOnly)}
            title={borderOnly ? t("showFill") : t("showBordersOnly")}
            className={`absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-colors backdrop-blur-sm ${
                borderOnly
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-white/5 text-muted-foreground border-white/15 hover:bg-white/10 hover:text-foreground"
            }`}>
            <BorderIcon />
            {borderOnly ? t("borders") : t("fill")}
        </button>
    );
};

function BorderIcon() {
    return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="1.5" y="1.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}
