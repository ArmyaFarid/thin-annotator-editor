import api from "@/lib/services/api/axios.ts";
import type {AnnotationOptions} from "@/app/atom.ts";

// The wire shape is the domain shape here — the backend serves exactly the
// structure of src/data/annotation-options.json — so there is no mapper, only
// a shape check strong enough to reject a wrong-endpoint or HTML error page.
function isAnnotationOptions(v: unknown): v is AnnotationOptions {
    const o = v as AnnotationOptions;
    return Array.isArray(o?.minerals) && Array.isArray(o?.mineralGroups);
}

export const optionsService = {
    get: async (): Promise<AnnotationOptions> => {
        const res = await api.get<unknown>("/api/annotation-options");
        if (!isAnnotationOptions(res.data)) {
            throw new Error("annotation-options: unexpected payload");
        }
        return res.data;
    },
};
