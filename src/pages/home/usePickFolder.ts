import {useState} from "react";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import type {Mask} from "@/app/atom.ts";

interface PickFolderResult {
    pairsCode: string;
    sampleId: string;
    annotations: Mask[] | null;
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
            return (await res.json()) as PickFolderResult;
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue");
            return null;
        } finally {
            setLoading(false);
        }
    }

    return [trigger, {loading, error}];
}
