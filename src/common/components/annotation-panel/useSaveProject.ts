import {useState} from "react";
import {useAtomValue} from "jotai";
import {useParams} from "react-router-dom";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import {masksAtom} from "@/app/atom.ts";
import {t} from "@/i18n/index.ts";

type State = [
    save: () => Promise<boolean>,
    status: {saving: boolean; error: string | null},
];

export default function useSaveProject(): State {
    const {pairsCode = "", sampleId = ""} = useParams<{
        pairsCode: string;
        sampleId: string;
    }>();
    const masks = useAtomValue(masksAtom);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save(): Promise<boolean> {
        if (!pairsCode || !sampleId) {
            return false;
        }
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${IMAGE_API_ENDPOINT}/api/project/save`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({pairsCode, sampleId, data: masks}),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : t("unknownError"));
            return false;
        } finally {
            setSaving(false);
        }
    }

    return [save, {saving, error}];
}
