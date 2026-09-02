import React from "react";
import {useAtomValue, useSetAtom} from "jotai";
import {UserCircleIcon} from "@heroicons/react/24/outline";
import {annotatorProfileAtom, profileModalOpenAtom} from "@/app/atom.ts";
import {t} from "@/i18n/index.ts";

export const AnnotatorBadge: React.FC = () => {
    const profile = useAtomValue(annotatorProfileAtom);
    const setOpen = useSetAtom(profileModalOpenAtom);

    if (!profile) {
        return null;
    }

    return (
        <button
            onClick={() => setOpen(true)}
            title={t("profileBadgeTooltip")}
            className="flex items-center gap-1.5 bg-secondary/80 border border-white/15 px-2.5 py-1 rounded-full text-xs text-white/70 hover:text-white hover:border-white/30 transition-colors">
            <UserCircleIcon className="w-4 h-4 shrink-0" />
            {profile.username}
        </button>
    );
};
