import axios from "axios";
import {getDefaultStore} from "jotai";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";
import {
    annotatorProfileAtom,
    levelRank,
    type AnnotatorProfile,
} from "@/app/atom.ts";

// Single axios instance for the REST backend. No auth interceptor — the app is
// served locally by the Python package and there is nothing to authenticate.
// GraphQL does NOT go through here; Relay owns that transport.
const api = axios.create({
    baseURL: IMAGE_API_ENDPOINT,
    headers: {"Content-Type": "application/json"},
});

// A header rather than a body field, so it rides on GET too and no DTO or
// service has to know about it.
// Backend: json.loads(base64.b64decode(request.headers["X-Annotator"])).
function encodeAnnotatorHeader(profile: AnnotatorProfile): string {
    const json = JSON.stringify({
        username: profile.username,
        fullName: profile.fullName,
        level: profile.level,
        levelRank: levelRank(profile.level),
    });
    // btoa is Latin-1 only, so an accented name throws. UTF-8 bytes first.
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary);
}

// The atom, not localStorage, so the header cannot lag a profile just changed.
api.interceptors.request.use((config) => {
    const profile = getDefaultStore().get(annotatorProfileAtom);
    if (profile) {
        config.headers.set("X-Annotator", encodeAnnotatorHeader(profile));
    }
    return config;
});

export default api;

// Normalizes anything thrown by a service into a message fit for a toast.
// Callers that need to branch on a specific failure should test the error
// class instead (see EmptyFolderError in services/api/folder).
export function errorMessage(e: unknown, fallback: string): string {
    if (axios.isAxiosError(e)) {
        return e.response ? `HTTP ${e.response.status}` : e.message;
    }
    return e instanceof Error ? e.message : fallback;
}
