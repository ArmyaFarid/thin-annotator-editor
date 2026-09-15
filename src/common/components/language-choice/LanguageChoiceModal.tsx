import React from "react";
import useLanguage from "@/i18n/useLanguage.ts";
import {LANGS, type Lang} from "@/i18n/index.ts";

// The one screen that cannot use t(): it is shown before a language exists, so
// every label is written in both. Blocking, like the profile step that follows.

const LABELS: Record<Lang, {name: string; prompt: string}> = {
    fr: {name: "Français", prompt: "Choisissez votre langue"},
    en: {name: "English", prompt: "Choose your language"},
};

export const LanguageChoiceModal: React.FC = () => {
    const [, setLanguage] = useLanguage();

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-7 w-full max-w-sm flex flex-col gap-5">
                <div className="flex flex-col gap-1 text-center">
                    {LANGS.map((value) => (
                        <span
                            key={value}
                            className="text-sm font-semibold text-white">
                            {LABELS[value].prompt}
                        </span>
                    ))}
                </div>
                <div className="flex flex-col gap-2">
                    {LANGS.map((value) => (
                        <button
                            key={value}
                            onClick={() => setLanguage(value)}
                            className="py-2.5 rounded-lg border border-white/15 text-sm font-medium text-white/80 hover:bg-[#4FC3F7]/10 hover:border-[#4FC3F7]/50 hover:text-[#4FC3F7] transition-colors">
                            {LABELS[value].name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
