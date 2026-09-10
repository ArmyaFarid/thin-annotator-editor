import React, {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {useSaveTask} from "@/lib/services/api/task/hooks.ts";
import {recordIdleForcedExit, resumeFromIdle} from "@/telemetry/index.ts";
import useIdlePrompt from "@/telemetry/useIdlePrompt.ts";
import useAttention from "@/common/components/idle-prompt/useAttention.ts";
import {t} from "@/i18n/index.ts";

// The one place telemetry reaches the annotator. It lives in the app rather
// than in src/telemetry so the module stays passive and deletable: without it
// the atom is simply never read.

interface IdlePromptProps {
    pairsCode: string;
    sampleId: string;
}

export const IdlePrompt: React.FC<IdlePromptProps> = ({
    pairsCode,
    sampleId,
}) => {
    const prompt = useIdlePrompt();
    const navigate = useNavigate();
    const {mutateAsync: saveTask} = useSaveTask({pairsCode, sampleId});
    const [, tick] = useState(0);
    const leavingRef = useRef(false);

    useAttention(prompt !== null, `⚠ ${t("idleTitle")}`);

    // Derived during render, never held in state: a countdown kept in state is
    // one commit stale, which read as "already expired" and left instantly.
    const remainingMs = prompt
        ? Math.max(0, prompt.deadlineWallMs - Date.now())
        : 0;

    useEffect(() => {
        if (!prompt) {
            leavingRef.current = false;
            return;
        }
        const timer = setInterval(() => tick((count) => count + 1), 500);
        return () => clearInterval(timer);
    }, [prompt]);

    useEffect(() => {
        if (!prompt || remainingMs > 0 || leavingRef.current) {
            return;
        }
        leavingRef.current = true;
        recordIdleForcedExit();
        // A backend hiccup must not cost the annotator the grain they were on,
        // so a failed save keeps the editor open — same rule as Finish.
        saveTask()
            .then(() => navigate("/"))
            .catch(() => {
                toast.error(t("idleSaveFailed"));
                leavingRef.current = false;
            });
    }, [prompt, remainingMs, saveTask, navigate]);

    if (!prompt) {
        return null;
    }

    const seconds = Math.ceil(remainingMs / 1000);
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-7 w-full max-w-sm flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-white">
                        {t("idleTitle")}
                    </span>
                    <span className="text-xs text-white/55 leading-relaxed">
                        {t("idleBody")}
                    </span>
                    <span className="text-xs text-amber-400 tabular-nums">
                        {t("idleCountdown")} {Math.floor(seconds / 60)}:
                        {String(seconds % 60).padStart(2, "0")}
                    </span>
                </div>
                <button
                    onClick={resumeFromIdle}
                    disabled={remainingMs <= 0}
                    className="py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                    {t("idleStay")}
                </button>
            </div>
        </div>
    );
};
