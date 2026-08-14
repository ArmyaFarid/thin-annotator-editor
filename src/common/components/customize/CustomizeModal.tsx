import React from "react";
import {useAtom} from "jotai";
import {customizeOpenAtom, TOOLBAR_LAYOUTS, type ToolbarLayout} from "@/app/atom.ts";
import useToolbarLayout from "@/common/components/annotator-toolbar/useToolbarLayout.ts";
import {t} from "@/i18n/index.ts";

const LAYOUT_LABELS: Record<ToolbarLayout, () => string> = {
    separators: () => t("layoutSeparators"),
    pods: () => t("layoutPods"),
    flyout: () => t("layoutFlyout"),
};

const LAYOUT_HINTS: Record<ToolbarLayout, () => string> = {
    separators: () => t("layoutSeparatorsHint"),
    pods: () => t("layoutPodsHint"),
    flyout: () => t("layoutFlyoutHint"),
};

export const CustomizeModal: React.FC = () => {
    const [open, setOpen] = useAtom(customizeOpenAtom);
    const [layout, setLayout] = useToolbarLayout();

    if (!open) {
        return null;
    }

    return (
        <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                        {t("customizeTitle")}
                    </span>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label={t("close")}
                        className="text-white/40 hover:text-white text-lg leading-none px-1">
                        ×
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        {t("toolbarLayout")}
                    </span>
                    {TOOLBAR_LAYOUTS.map((value) => (
                        <button
                            key={value}
                            onClick={() => setLayout(value)}
                            aria-pressed={layout === value}
                            className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                                layout === value
                                    ? "border-[#4FC3F7]/50 bg-[#4FC3F7]/10"
                                    : "border-white/15 hover:bg-white/5"
                            }`}>
                            <span
                                className={`text-xs font-medium ${layout === value ? "text-[#4FC3F7]" : "text-white/80"}`}>
                                {LAYOUT_LABELS[value]()}
                            </span>
                            <span className="text-[10px] text-white/40">
                                {LAYOUT_HINTS[value]()}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
