import React, {useEffect, useState} from "react";
import {useAtom} from "jotai";
import {
    ANNOTATOR_LEVELS,
    profileModalOpenAtom,
    type AnnotatorLevel,
} from "@/app/atom.ts";
import useAnnotatorProfile from "@/common/components/annotator-profile/useAnnotatorProfile.ts";
import {t} from "@/i18n/index.ts";

interface FieldProps {
    label: string;
    value: string;
    placeholder: string;
    onChange: (v: string) => void;
}

const Field: React.FC<FieldProps> = ({label, value, placeholder, onChange}) => (
    <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            {label}
        </span>
        <input
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#4FC3F7]/50"
        />
    </label>
);

interface LevelChoiceProps {
    label: string;
    hint: string;
    selected: boolean;
    onSelect: () => void;
}

const LevelChoice: React.FC<LevelChoiceProps> = ({
    label,
    hint,
    selected,
    onSelect,
}) => (
    <button
        type="button"
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

// Blocking until a profile exists, so every request can assume one.
export const AnnotatorProfileModal: React.FC = () => {
    const [profile, setProfile] = useAnnotatorProfile();
    const [open, setOpen] = useAtom(profileModalOpenAtom);

    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [level, setLevel] = useState<AnnotatorLevel>("trainee");
    const [error, setError] = useState(false);

    const required = profile === null;
    const visible = required || open;

    // Refill on open, so a cancelled edit does not reappear as a draft.
    useEffect(() => {
        if (!visible) {
            return;
        }
        setFullName(profile?.fullName ?? "");
        setUsername(profile?.username ?? "");
        setLevel(profile?.level ?? "trainee");
        setError(false);
    }, [visible, profile]);

    if (!visible) {
        return null;
    }

    function close() {
        if (!required) {
            setOpen(false);
        }
    }

    function submit() {
        const name = fullName.trim();
        const user = username.trim();
        if (name === "" || user === "") {
            setError(true);
            return;
        }
        setProfile({version: 1, fullName: name, username: user, level});
        setOpen(false);
    }

    return (
        <div
            onClick={close}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1C1C1C] border border-white/15 rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                        {required ? t("profileTitle") : t("profileEditTitle")}
                    </span>
                    {required ? null : (
                        <button
                            onClick={close}
                            aria-label={t("close")}
                            className="text-white/40 hover:text-white text-lg leading-none px-1">
                            ×
                        </button>
                    )}
                </div>

                {required ? (
                    <p className="text-xs text-white/50 -mt-3">
                        {t("profileSubtitle")}
                    </p>
                ) : null}

                <Field
                    label={t("profileFullName")}
                    value={fullName}
                    placeholder={t("profileFullNamePlaceholder")}
                    onChange={setFullName}
                />
                <Field
                    label={t("profileUsername")}
                    value={username}
                    placeholder={t("profileUsernamePlaceholder")}
                    onChange={setUsername}
                />

                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        {t("profileLevel")}
                    </span>
                    <div className="flex gap-1.5">
                        {ANNOTATOR_LEVELS.map((l) => (
                            <LevelChoice
                                key={l.id}
                                label={t(l.labelKey)}
                                hint={t(`${l.labelKey}Hint`)}
                                selected={level === l.id}
                                onSelect={() => setLevel(l.id)}
                            />
                        ))}
                    </div>
                </div>

                {error ? (
                    <p className="text-xs text-red-400">
                        {t("profileRequired")}
                    </p>
                ) : null}

                <button
                    onClick={submit}
                    className="px-5 py-2 rounded-lg bg-[#4FC3F7] text-black font-medium text-sm hover:bg-[#4FC3F7]/90 transition-colors">
                    {required ? t("profileStart") : t("profileSave")}
                </button>
            </div>
        </div>
    );
};
