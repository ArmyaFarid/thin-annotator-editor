import axios from "axios";
import {IMAGE_API_ENDPOINT} from "@/app/AppConfig.tsx";

// Single axios instance for the REST backend. No auth interceptor — the app is
// served locally by the Python package and there is nothing to authenticate.
// GraphQL does NOT go through here; Relay owns that transport.
const api = axios.create({
    baseURL: IMAGE_API_ENDPOINT,
    headers: {"Content-Type": "application/json"},
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
