import React from "react";
import usePreserveZoom from "@/canvas/usePreserveZoom.ts";
import {t} from "@/i18n/index.ts";

export const ZoomPreferenceToggle: React.FC = () => {
    const [preserveZoom, setPreserveZoom] = usePreserveZoom();

    return (
        <button
            onClick={() => setPreserveZoom(!preserveZoom)}
            title={preserveZoom ? t("zoomLockedTitle") : t("zoomResetTitle")}
            className={`absolute bottom-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-colors backdrop-blur-sm ${
                preserveZoom
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                    : "bg-white/5 text-muted-foreground border-white/15 hover:bg-white/10 hover:text-foreground"
            }`}>
            <LockIcon locked={preserveZoom} />
            {preserveZoom ? t("zoomLocked") : t("zoomReset")}
        </button>
    );
};

function LockIcon({locked}: {locked: boolean}) {
    return locked ? (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="1.5" y="4.5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="5.5" cy="7.5" r="0.8" fill="currentColor" />
        </svg>
    ) : (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="1.5" y="4.5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.5 4.5V3a2 2 0 0 1 4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="5.5" cy="7.5" r="0.8" fill="currentColor" />
        </svg>
    );
}
