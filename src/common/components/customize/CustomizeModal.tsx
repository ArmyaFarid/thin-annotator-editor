import React from "react";
import {useAtom} from "jotai";
import {
    borderOnlyAtom,
    customizeOpenAtom,
    TOOLBAR_LAYOUTS,
    type ToolbarLayout,
} from "@/app/atom.ts";
import useToolbarLayout from "@/common/components/annotator-toolbar/useToolbarLayout.ts";
import useLanguage from "@/i18n/useLanguage.ts";
import {LANGS, t, type Lang, type TranslationKey} from "@/i18n/index.ts";

const LAYOUT_LABEL_KEYS: Record<ToolbarLayout, TranslationKey> = {
    separators: "layoutSeparators",
    pods: "layoutPods",
    flyout: "layoutFlyout",
};

const LAYOUT_HINT_KEYS: Record<ToolbarLayout, TranslationKey> = {
    separators: "layoutSeparatorsHint",
    pods: "layoutPodsHint",
    flyout: "layoutFlyoutHint",
};

const LANG_LABELS: Record<Lang, string> = {
    fr: "Français",
    en: "English",
};

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({title, children}) => (
    <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            {title}
        </span>
        {children}
    </div>
);

interface ChoiceProps {
    label: string;
    hint?: string;
    selected: boolean;
    onSelect: () => void;
}

// Options sit side by side, each filling an equal share of the row. The row is
// too tight for a description, so the longer explanation rides on `title`.
const Choice: React.FC<ChoiceProps> = ({label, hint, selected, onSelect}) => (
    <button
        onClick={onSelect}
        title={hint}
        aria-pressed={selected}
        className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            selected
                ? "border-[#4FC3F7]/50 bg-[#4FC3F7]/10 text-[#4FC3F7]"
                : "border-white/15 text-white/70 hover:bg-white/5 hover:text-white"
        }`}>
        {label}
    </button>
);

export const CustomizeModal: React.FC = () => {
    const [open, setOpen] = useAtom(customizeOpenAtom);
    const [layout, setLayout] = useToolbarLayout();
    const [lang, setLanguage] = useLanguage();
    const [borderOnly, setBorderOnly] = useAtom(borderOnlyAtom);

    if (!open) {
        return null;
    }

    return (
        <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-5">
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

                <Section title={t("language")}>
                    <div className="flex flex-row gap-2">
                        {LANGS.map((value) => (
                            <Choice
                                key={value}
                                label={LANG_LABELS[value]}
                                selected={lang === value}
                                onSelect={() => setLanguage(value)}
                            />
                        ))}
                    </div>
                </Section>

                <Section title={t("toolbarLayout")}>
                    <div className="flex flex-row gap-2">
                        {TOOLBAR_LAYOUTS.map((value) => (
                            <Choice
                                key={value}
                                label={t(LAYOUT_LABEL_KEYS[value])}
                                hint={t(LAYOUT_HINT_KEYS[value])}
                                selected={layout === value}
                                onSelect={() => setLayout(value)}
                            />
                        ))}
                    </div>
                </Section>

                <Section title={t("maskDisplay")}>
                    <div className="flex flex-row gap-2">
                        <Choice
                            label={t("fill")}
                            selected={!borderOnly}
                            onSelect={() => setBorderOnly(false)}
                        />
                        <Choice
                            label={t("borders")}
                            selected={borderOnly}
                            onSelect={() => setBorderOnly(true)}
                        />
                    </div>
                </Section>
            </div>
        </div>
    );
};
