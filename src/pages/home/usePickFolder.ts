import {useState} from "react";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import type {Mask} from "@/app/atom.ts";
import {t} from "@/i18n/index.ts";

interface PickFolderResult {
    pairsCode: string;
    sampleId: string;
    annotations: Mask[] | null;
    image_count: number;
}

type State = [
    trigger: () => Promise<PickFolderResult | null>,
    status: {loading: boolean; error: string | null},
];

export default function usePickFolder(): State {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function trigger(): Promise<PickFolderResult | null> {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${IMAGE_API_ENDPOINT}/api/pick-folder`, {
                method: "POST",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as PickFolderResult;
            if (data.image_count === 0) {
                setError(t("noImagesInFolder"));
                return null;
            }
            return data;
        } catch {
            setError(t("importFailed"));
            return null;
        } finally {
            setLoading(false);
        }
    }

    return [trigger, {loading, error}];
}
